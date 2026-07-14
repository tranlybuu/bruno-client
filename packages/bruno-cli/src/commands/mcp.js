const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const os = require('os');
const { forOwn, cloneDeep } = require('lodash');
const { getRunnerSummary } = require('@usebruno/common/runner');
const { runSingleRequest } = require('../runner/run-single-request');
const { getEnvVars, getOptions } = require('../utils/bru');
const { parseEnvironmentJson } = require('../utils/environment');
const { parseDotEnv, parseEnvironment, parseRequest, stringifyRequest } = require('@usebruno/filestore');
const { getSystemProxy } = require('@usebruno/requests');
const { exists, isDirectory } = require('../utils/filesystem');
const { getCollectionFormat, findItemInCollection, createCollectionJsonFromPathname, getCallStack, FORMAT_CONFIG } = require('../utils/collection');

const command = 'mcp';
const desc = 'Start an MCP (Model Context Protocol) server over stdio';

const builder = (yargs) => {
  yargs
    .option('insecure', {
      type: 'boolean',
      description: 'Allow insecure server connections',
      default: false
    })
    .option('noproxy', {
      type: 'boolean',
      description: 'Disable all proxy settings',
      default: false
    });
};

// Stdout/Stderr log interception helpers
let isIntercepting = false;
let interceptedLogs = [];

let savedStdoutWrite = null;
let savedStderrWrite = null;
let savedConsoleLog = null;
let savedConsoleError = null;
let savedConsoleWarn = null;

function startIntercepting() {
  interceptedLogs = [];
  isIntercepting = true;

  savedStdoutWrite = process.stdout.write;
  savedStderrWrite = process.stderr.write;
  savedConsoleLog = console.log;
  savedConsoleError = console.error;
  savedConsoleWarn = console.warn;

  process.stdout.write = (chunk, encoding, callback) => {
    interceptedLogs.push(chunk.toString());
    if (typeof callback === 'function') callback();
    return true;
  };

  process.stderr.write = (chunk, encoding, callback) => {
    interceptedLogs.push(chunk.toString());
    if (typeof callback === 'function') callback();
    return true;
  };

  console.log = (...args) => {
    interceptedLogs.push(args.map((a) => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
  };

  console.error = (...args) => {
    interceptedLogs.push('[ERROR] ' + args.map((a) => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
  };

  console.warn = (...args) => {
    interceptedLogs.push('[WARN] ' + args.map((a) => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
  };
}

function stopIntercepting() {
  isIntercepting = false;
  process.stdout.write = savedStdoutWrite;
  process.stderr.write = savedStderrWrite;
  console.log = savedConsoleLog;
  console.error = savedConsoleError;
  console.warn = savedConsoleWarn;

  savedStdoutWrite = null;
  savedStderrWrite = null;
  savedConsoleLog = null;
  savedConsoleError = null;
  savedConsoleWarn = null;

  return interceptedLogs.join('');
}

// Send JSON-RPC response to stdout
function sendJsonRpc(msg) {
  const write = isIntercepting ? savedStdoutWrite : process.stdout.write;
  write.call(process.stdout, JSON.stringify(msg) + '\n');
}

// Helper to load environment variables from a file (copied from run.js)
const loadEnvFromFile = (filePath, nameOverride) => {
  const fileExt = path.extname(filePath).toLowerCase();
  let result = {};

  if (fileExt === '.json') {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    const normalizedEnv = parseEnvironmentJson(parsed);
    result = getEnvVars(normalizedEnv);
    const rawName = normalizedEnv?.name;
    const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
    result.__name__ = trimmedName || path.basename(filePath, '.json');
  } else if (fileExt === '.yml' || fileExt === '.yaml') {
    const content = fs.readFileSync(filePath, 'utf8');
    const envJson = parseEnvironment(content, { format: 'yml' });
    result = getEnvVars(envJson);
    result.__name__ = nameOverride || path.basename(filePath, fileExt);
  } else {
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const envJson = parseEnvironment(content, { format: 'bru' });
    result = getEnvVars(envJson);
    result.__name__ = nameOverride || path.basename(filePath, '.bru');
  }

  return result;
};

// Resolve workspace global environments
const findWorkspacePath = (startPath) => {
  let currentPath = startPath;
  while (currentPath !== path.dirname(currentPath)) {
    const workspaceYmlPath = path.join(currentPath, 'workspace.yml');
    if (fs.existsSync(workspaceYmlPath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
};

// Resolves env, .env, and global env variables for a run
const resolveEnvironment = async (collectionPath, collection, envName, envVarsOverrides, globalEnvName) => {
  let envVars = {};

  // Load env file if configured
  if (envName) {
    const envExt = FORMAT_CONFIG[collection.format].ext;
    const collectionEnvFilePath = path.join(collectionPath, 'environments', `${envName}${envExt}`);
    if (fs.existsSync(collectionEnvFilePath)) {
      try {
        const collectionEnvVars = loadEnvFromFile(collectionEnvFilePath, envName);
        envVars = { ...envVars, ...collectionEnvVars };
      } catch (err) {
        console.error(`Failed to parse Environment file: ${err.message}`);
      }
    }
  }

  // Apply overrides
  if (envVarsOverrides && typeof envVarsOverrides === 'object') {
    for (const [key, value] of Object.entries(envVarsOverrides)) {
      envVars[key] = String(value);
    }
  }

  // Load global environments
  let globalEnvVars = {};
  if (globalEnvName) {
    const workspacePath = findWorkspacePath(collectionPath);
    if (workspacePath) {
      const globalEnvFilePath = path.join(workspacePath, 'environments', `${globalEnvName}.yml`);
      if (fs.existsSync(globalEnvFilePath)) {
        try {
          const globalEnvContent = fs.readFileSync(globalEnvFilePath, 'utf8');
          const globalEnvJson = parseEnvironment(globalEnvContent, { format: 'yml' });
          globalEnvVars = getEnvVars(globalEnvJson);
          globalEnvVars.__name__ = globalEnvName;
        } catch (err) {
          console.error(`Failed to parse global environment: ${err.message}`);
        }
      }
    }
  }

  // Load .env file at root
  const dotEnvPath = path.join(collectionPath, '.env');
  const processEnvVars = { ...process.env };
  if (fs.existsSync(dotEnvPath)) {
    try {
      const content = fs.readFileSync(dotEnvPath, 'utf8');
      const jsonData = parseDotEnv(content);
      forOwn(jsonData, (value, key) => {
        processEnvVars[key] = value;
      });
    } catch (err) {
      console.error(`Failed to parse .env file: ${err.message}`);
    }
  }

  return { envVars, globalEnvVars, processEnvVars };
};

// Recursively find Bruno collections (folders with bruno.json or opencollection.yml)
function findCollections(dir, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  const results = [];
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    // Check if current directory is a Bruno collection
    const isCollection = files.some((f) => f.isFile() && (f.name === 'bruno.json' || f.name === 'opencollection.yml'));
    if (isCollection) {
      let name = path.basename(dir);
      try {
        const brunoJsonPath = path.join(dir, 'bruno.json');
        if (fs.existsSync(brunoJsonPath)) {
          const content = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));
          if (content && content.name) {
            name = content.name;
          }
        }
      } catch (err) {
        // Fallback to directory name
      }
      return [{
        name,
        path: dir
      }];
    }

    for (const file of files) {
      if (file.isDirectory()) {
        const name = file.name;
        if (name.startsWith('.') || name === 'node_modules' || name === 'bower_components' || name === 'dist' || name === 'build') {
          continue;
        }
        const subResults = findCollections(path.join(dir, name), maxDepth, currentDepth + 1);
        results.push(...subResults);
      }
    }
  } catch (err) {
    // Ignore read errors
  }
  return results;
}

// Helpers for Session History Tracking
const getHistoryDir = () => {
  const dir = path.join(os.homedir(), '.bruno', 'mcp-history');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const saveSession = (sessionData) => {
  const dir = getHistoryDir();
  fs.writeFileSync(path.join(dir, `${sessionData.sessionId}.json`), JSON.stringify(sessionData, null, 2), 'utf8');
};

// Helper to build a .bru file representation from custom options
function buildBruContent(request) {
  const { method = 'GET', url, headers = {}, params = {}, body = {} } = request;

  // Convert headers object to Bruno array format
  const brunoHeaders = [];
  if (headers && typeof headers === 'object') {
    for (const [name, value] of Object.entries(headers)) {
      brunoHeaders.push({ name, value, enabled: true });
    }
  }

  // Convert query params object to Bruno array format
  const brunoParams = [];
  if (params && typeof params === 'object') {
    for (const [name, value] of Object.entries(params)) {
      brunoParams.push({ name, value, enabled: true });
    }
  }

  let bodyMode = 'none';
  let bodyJson = '{}';
  let bodyText = '';
  if (body && body.mode) {
    bodyMode = body.mode;
    if (bodyMode === 'json') {
      bodyJson = typeof body.content === 'object' ? JSON.stringify(body.content, null, 2) : String(body.content || '{}');
    } else {
      bodyText = String(body.content || '');
    }
  }

  const brunoRequestObj = {
    type: 'http-request',
    name: 'temp-request',
    seq: 1,
    request: {
      method: method.toUpperCase(),
      url,
      headers: brunoHeaders,
      params: brunoParams,
      auth: { mode: 'none' },
      body: {
        mode: bodyMode,
        json: bodyJson,
        text: bodyText
      }
    }
  };

  return stringifyRequest(brunoRequestObj, { format: 'bru' });
}

// Clean up any orphaned temp directories from previous crashed/killed sessions on startup
function cleanOldTempDirs() {
  try {
    const tmpDir = os.tmpdir();
    const files = fs.readdirSync(tmpDir);
    for (const file of files) {
      if (file.startsWith('bruno-mcp-test-')) {
        const fullPath = path.join(tmpDir, file);
        try {
          if (fs.rmSync) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else if (fs.rmdirSync) {
            fs.rmdirSync(fullPath, { recursive: true });
          }
        } catch (err) {
          // Ignore
        }
      }
    }
  } catch (err) {
    // Ignore
  }
}

// Start MCP server over stdio
const handler = async (argv) => {
  // Clean up any old left-overs first
  cleanOldTempDirs();

  // Use yargs settings for default options
  const options = getOptions();
  if (argv.insecure) {
    options['insecure'] = true;
  }
  if (argv.noproxy) {
    options['noproxy'] = true;
  }

  // Pre-fetch system proxy once (skip if noproxy is set)
  if (!options['noproxy']) {
    try {
      options['cachedSystemProxy'] = await getSystemProxy();
    } catch (error) {
      // Ignored
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch (err) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error: ' + err.message
        }
      });
      return;
    }

    try {
      await handleMessage(message);
    } catch (err) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id: message.id || null,
        error: {
          code: -32603,
          message: 'Internal error: ' + err.message
        }
      });
    }
  });

  // Handle standard JSON-RPC 2.0 messages
  async function handleMessage(message) {
    const { method, params, id } = message;

    if (method === 'initialize') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'bruno-mcp',
            version: '1.16.0'
          }
        }
      });
      return;
    }

    if (method === 'notifications/initialized') {
      return;
    }

    if (method === 'tools/list') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'list_collections',
              description: 'Recursively search for Bruno collections from a base directory. Returns a list of collections with their names and paths. Use this tool first to discover the available collections and their exact paths in your workspace.',
              inputSchema: {
                type: 'object',
                properties: {
                  path: {
                    type: 'string',
                    description: 'The base directory path to start searching from. Defaults to the current working directory (cwd) if not specified.'
                  }
                }
              }
            },
            {
              name: 'list_collection_items',
              description: 'Lists all folders, API request files (.bru), and environments inside a specified Bruno collection or its subdirectories. Use this tool to explore the structure of a collection, locate request paths, and find valid environments.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'The absolute or relative path to the root directory of the Bruno collection (e.g. "./packages/bruno-tests/collection").'
                  },
                  folderPath: {
                    type: 'string',
                    description: 'Optional relative path of the folder to list inside the collection (e.g. "auth" or "API/v1"). Omit or leave empty to list items at the root of the collection.'
                  }
                },
                required: ['collectionPath']
              }
            },
            {
              name: 'get_request_details',
              description: 'Retrieves the parsed structure of a single API request (.bru) file, containing its HTTP method, target URL, query parameters, headers, variables, script pre-requests/post-responses, assertions, and test specifications. Use this to understand a request before executing it.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'The absolute or relative path to the root directory of the Bruno collection.'
                  },
                  requestPath: {
                    type: 'string',
                    description: 'The relative path of the request file within the collection (e.g. "echo/echo json.bru"). Must end with ".bru".'
                  }
                },
                required: ['collectionPath', 'requestPath']
              }
            },
            {
              name: 'run_request',
              description: 'Runs/executes a single API request (.bru) in a specified Bruno collection. Returns full details of the request sent, response headers/status/body, scripting logs, assertion reports, and test execution results. Automatically generates a sessionId for session tracking.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'The absolute or relative path to the root directory of the Bruno collection.'
                  },
                  requestPath: {
                    type: 'string',
                    description: 'The relative path of the request file in the collection (e.g. "echo/echo json.bru"). Must end with ".bru".'
                  },
                  env: {
                    type: 'string',
                    description: 'Optional name of the collection environment to load variables from (e.g. "Local", "Prod"). Find available environments by running list_collection_items.'
                  },
                  envVars: {
                    type: 'object',
                    description: 'Optional key-value pairs of environment variable overrides to apply to this request execution.'
                  },
                  globalEnv: {
                    type: 'string',
                    description: 'Optional global environment name to load workspace-level global environments.'
                  }
                },
                required: ['collectionPath', 'requestPath']
              }
            },
            {
              name: 'run_folder',
              description: 'Executes all API requests inside a specified collection folder (equivalent to Collection Runner). Returns a summary of execution and full details of the request/response payloads, headers, bodies, assertions, and tests for every executed API. Automatically generates a sessionId.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'The absolute or relative path to the root directory of the Bruno collection.'
                  },
                  folderPath: {
                    type: 'string',
                    description: 'Relative path of the folder containing requests to execute. Use "." or omit to run the entire collection.'
                  },
                  recursive: {
                    type: 'boolean',
                    description: 'Whether to run requests in subfolders recursively. Defaults to true.'
                  },
                  env: {
                    type: 'string',
                    description: 'Optional name of the collection environment to load variables from.'
                  },
                  envVars: {
                    type: 'object',
                    description: 'Optional key-value pairs of environment variable overrides to apply.'
                  },
                  globalEnv: {
                    type: 'string',
                    description: 'Optional global environment name to load.'
                  },
                  delay: {
                    type: 'number',
                    description: 'Optional delay in milliseconds to wait between running each request.'
                  }
                },
                required: ['collectionPath']
              }
            },
            {
              name: 'list_sessions',
              description: 'Lists summaries of recent request/folder executions (history). Each summary contains the sessionId, timestamp, collection path, environment, and requests passed/failed counts.',
              inputSchema: {
                type: 'object',
                properties: {
                  limit: {
                    type: 'number',
                    description: 'Maximum number of recent session history items to return. Defaults to 20.'
                  }
                }
              }
            },
            {
              name: 'get_session',
              description: 'Retrieves the complete, raw execution log file of a previous request or folder runner session. Returns detailed request and response headers, status, bodies, test results, and assertions for all APIs executed in that session.',
              inputSchema: {
                type: 'object',
                properties: {
                  sessionId: {
                    type: 'string',
                    description: 'Unique session identifier (e.g. "session_1780556017486_l6s7c70").'
                  }
                },
                required: ['sessionId']
              }
            },
            {
              name: 'test_api',
              description: 'Call/test any arbitrary API/URL directly using Bruno\'s HTTP runner. Use this tool instead of curl or custom scripts to fetch or test third-party endpoints. It runs within a temporary sandbox and automatically cleans up afterwards without logging history.',
              inputSchema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    description: 'The target API endpoint URL (e.g. "https://httpbin.org/post").'
                  },
                  method: {
                    type: 'string',
                    description: 'The HTTP method (e.g. "GET", "POST", "PUT", "DELETE"). Defaults to "GET".'
                  },
                  headers: {
                    type: 'object',
                    description: 'Key-value pairs of request headers (e.g. {"Content-Type": "application/json"}).'
                  },
                  params: {
                    type: 'object',
                    description: 'Key-value pairs of URL query parameters (e.g. {"id": "123"}).'
                  },
                  body: {
                    type: 'object',
                    description: 'The request body configuration (optional).',
                    properties: {
                      mode: {
                        type: 'string',
                        description: 'The request body format: "json", "text", "xml", "form-url-encoded". Defaults to "none".'
                      },
                      content: {
                        type: 'string',
                        description: 'The raw string content or serialized object of the body payload.'
                      }
                    }
                  },
                  envVars: {
                    type: 'object',
                    description: 'Optional environment variables to inject for variable resolution inside the request.'
                  }
                },
                required: ['url', 'method']
              }
            },
            {
              name: 'get_flow_details',
              description: 'Retrieves the parsed structure of a visual flow (.bruflow) file, containing its version and steps list. Use this to inspect the execution flow and step overrides before running it.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'The absolute or relative path to the root directory of the Bruno collection.'
                  },
                  flowPath: {
                    type: 'string',
                    description: 'The relative path of the flow file within the collection (e.g. "auth/login_flow.bruflow"). Must end with ".bruflow".'
                  }
                },
                required: ['collectionPath', 'flowPath']
              }
            },
            {
              name: 'run_flow',
              description: 'Runs/executes a visual flow (.bruflow) in a specified Bruno collection. Executes all enabled steps in sequence, chaining response outputs, and returns full detailed execution summaries and step outputs. Automatically generates a sessionId.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'The absolute or relative path to the root directory of the Bruno collection.'
                  },
                  flowPath: {
                    type: 'string',
                    description: 'The relative path of the flow file in the collection (e.g. "auth/login_flow.bruflow"). Must end with ".bruflow".'
                  },
                  env: {
                    type: 'string',
                    description: 'Optional name of the collection environment to load variables from (e.g. "Local", "Prod").'
                  },
                  envVars: {
                    type: 'object',
                    description: 'Optional key-value pairs of environment variable overrides to apply.'
                  },
                  globalEnv: {
                    type: 'string',
                    description: 'Optional global environment name to load workspace-level global environments.'
                  }
                },
                required: ['collectionPath', 'flowPath']
              }
            },
            {
              name: 'get_bruno_templates',
              description: 'Retrieves syntax configuration, structure patterns, and complete templates for writing Bruno request files (.bru) and visual flow files (.bruflow). This provides structural reference, scripting examples, and variable interpolation syntax to construct standard Bruno files correctly. Note for .bruflow: To override a step\'s values (body, params, headers) from the original API, you MUST set `isOverrideEnabled: true` in the step. If `isOverrideEnabled` is false or missing, the `override` block will be ignored and not shown in the UI.',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          ]
        }
      });
      return;
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      let result;

      try {
        if (name === 'list_collections') {
          result = await handleListCollections(args);
        } else if (name === 'list_collection_items') {
          result = await handleListCollectionItems(args);
        } else if (name === 'get_request_details') {
          result = await handleGetRequestDetails(args);
        } else if (name === 'run_request') {
          result = await handleRunRequest(args);
        } else if (name === 'run_folder') {
          result = await handleRunFolder(args);
        } else if (name === 'list_sessions') {
          result = await handleListSessions(args);
        } else if (name === 'get_session') {
          result = await handleGetSession(args);
        } else if (name === 'test_api') {
          result = await handleTestApi(args);
        } else if (name === 'get_flow_details') {
          result = await handleGetFlowDetails(args);
        } else if (name === 'run_flow') {
          result = await handleRunFlow(args);
        } else if (name === 'get_bruno_templates') {
          result = await handleGetBrunoTemplates(args);
        } else {
          sendJsonRpc({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${name}`
            }
          });
          return;
        }

        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result
        });
      } catch (err) {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Error executing tool: ${err.message}`
              }
            ],
            isError: true
          }
        });
      }
      return;
    }

    // Default unknown message
    if (id !== undefined) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      });
    }
  }

  // Handle tool: list_collections
  async function handleListCollections(args) {
    const { path: startPath } = args || {};
    const resolvedPath = path.resolve(process.cwd(), startPath || '.');
    const collections = findCollections(resolvedPath);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(collections, null, 2)
        }
      ]
    };
  }

  // Handle tool: list_collection_items
  async function handleListCollectionItems(args) {
    const { collectionPath, folderPath } = args;
    if (!collectionPath) {
      throw new Error('Argument "collectionPath" is required.');
    }

    const resolvedCollectionPath = path.resolve(process.cwd(), collectionPath);
    const format = getCollectionFormat(resolvedCollectionPath);
    if (!format) {
      throw new Error(`The directory "${resolvedCollectionPath}" is not the root of a Bruno collection (bruno.json or opencollection.yml is missing).`);
    }

    const absoluteFolder = folderPath ? path.resolve(resolvedCollectionPath, folderPath) : resolvedCollectionPath;
    if (!absoluteFolder.startsWith(resolvedCollectionPath)) {
      throw new Error(`Folder path must be inside the collection directory.`);
    }

    if (!fs.existsSync(absoluteFolder)) {
      throw new Error(`Folder path does not exist: ${folderPath}`);
    }

    const { ext, collectionFile, folderFile } = FORMAT_CONFIG[format];
    const items = [];
    const files = fs.readdirSync(absoluteFolder, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(absoluteFolder, file.name);
      const relativePath = path.relative(resolvedCollectionPath, filePath);

      if (file.isDirectory()) {
        if (filePath === path.join(resolvedCollectionPath, 'environments') || file.name === '.git' || file.name === 'node_modules') {
          continue;
        }
        items.push({
          name: file.name,
          type: 'folder',
          relativePath
        });
      } else {
        if (file.name === collectionFile || file.name === folderFile) {
          continue;
        }
        const fileExt = path.extname(filePath);
        if (fileExt === ext) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const requestItem = parseRequest(content, { format });
            items.push({
              name: requestItem.name || file.name,
              type: 'request',
              relativePath,
              method: (requestItem.type === 'http-request' || requestItem.type === 'graphql-request') ? requestItem.request?.method : 'GRAPHQL',
              url: requestItem.request?.url || ''
            });
          } catch (err) {
            items.push({
              name: file.name,
              type: 'request',
              relativePath,
              error: err.message
            });
          }
        } else if (fileExt === '.bruflow') {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const name = file.name.substring(0, file.name.length - 8); // removes '.bruflow'
            items.push({
              name,
              type: 'flow',
              relativePath,
              method: 'FLOW',
              url: ''
            });
          } catch (err) {
            items.push({
              name: file.name,
              type: 'flow',
              relativePath,
              error: err.message
            });
          }
        }
      }
    }

    // Load environments if we are querying the root folder
    let environments = [];
    if (absoluteFolder === resolvedCollectionPath) {
      const environmentsPath = path.join(resolvedCollectionPath, 'environments');
      if (fs.existsSync(environmentsPath)) {
        try {
          const envFiles = fs.readdirSync(environmentsPath);
          for (const envFile of envFiles) {
            if (envFile.endsWith(ext)) {
              environments.push(path.basename(envFile, ext));
            }
          }
        } catch (err) {
          // Ignore
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ items, environments }, null, 2)
        }
      ]
    };
  }

  // Handle tool: get_request_details
  async function handleGetRequestDetails(args) {
    const { collectionPath, requestPath } = args;
    if (!collectionPath || !requestPath) {
      throw new Error('Arguments "collectionPath" and "requestPath" are required.');
    }

    const resolvedCollectionPath = path.resolve(process.cwd(), collectionPath);
    const format = getCollectionFormat(resolvedCollectionPath);
    if (!format) {
      throw new Error(`The directory "${resolvedCollectionPath}" is not the root of a Bruno collection (bruno.json or opencollection.yml is missing).`);
    }

    const absoluteRequestPath = path.resolve(resolvedCollectionPath, requestPath);
    if (!absoluteRequestPath.startsWith(resolvedCollectionPath)) {
      throw new Error(`Request path must be inside the collection directory.`);
    }

    if (!fs.existsSync(absoluteRequestPath)) {
      throw new Error(`Request file does not exist: ${requestPath}`);
    }

    const content = fs.readFileSync(absoluteRequestPath, 'utf8');
    const requestItem = parseRequest(content, { format });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(requestItem, null, 2)
        }
      ]
    };
  }

  // Handle tool: run_request
  async function handleRunRequest(args) {
    const { collectionPath, requestPath, env, envVars, globalEnv } = args;
    if (!collectionPath || !requestPath) {
      throw new Error('Arguments "collectionPath" and "requestPath" are required.');
    }

    const resolvedCollectionPath = path.resolve(process.cwd(), collectionPath);
    const format = getCollectionFormat(resolvedCollectionPath);
    if (!format) {
      throw new Error(`The directory "${resolvedCollectionPath}" is not the root of a Bruno collection (bruno.json or opencollection.yml is missing).`);
    }
    const collection = createCollectionJsonFromPathname(resolvedCollectionPath);
    const absolutePath = path.resolve(resolvedCollectionPath, requestPath);

    const item = findItemInCollection(collection, absolutePath);
    if (!item) {
      throw new Error(`Request file not found in collection: ${requestPath}`);
    }

    const { envVars: resolvedEnvVars, globalEnvVars, processEnvVars } = await resolveEnvironment(
      resolvedCollectionPath,
      collection,
      env,
      envVars,
      globalEnv
    );

    const runtimeVariables = {};
    const brunoConfig = collection.brunoConfig;
    const collectionRoot = collection.root;
    const runtime = 'quickjs';

    const runSingleRequestByPathname = async (relativeItemPathname) => {
      const ext = FORMAT_CONFIG[collection.format].ext;
      return new Promise(async (resolve, reject) => {
        let itemPathname = path.join(resolvedCollectionPath, relativeItemPathname);
        if (itemPathname && !itemPathname?.endsWith(ext)) {
          itemPathname = `${itemPathname}${ext}`;
        }
        const requestItem = cloneDeep(findItemInCollection(collection, itemPathname));
        if (requestItem) {
          const res = await runSingleRequest(
            requestItem,
            resolvedCollectionPath,
            runtimeVariables,
            resolvedEnvVars,
            processEnvVars,
            brunoConfig,
            collectionRoot,
            runtime,
            collection,
            runSingleRequestByPathname,
            globalEnvVars
          );
          resolve(res?.response);
        }
        reject(`bru.runRequest: invalid request path - ${itemPathname}`);
      });
    };

    startIntercepting();

    let result;
    try {
      result = await runSingleRequest(
        item,
        resolvedCollectionPath,
        runtimeVariables,
        resolvedEnvVars,
        processEnvVars,
        brunoConfig,
        collectionRoot,
        runtime,
        collection,
        runSingleRequestByPathname,
        globalEnvVars
      );
    } finally {
      const logs = stopIntercepting();
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const sessionData = {
        sessionId,
        timestamp: new Date().toISOString(),
        collectionPath: resolvedCollectionPath,
        type: 'request',
        requestPath,
        env,
        results: [
          {
            name: item.name,
            path: requestPath,
            request: result?.request ? {
              method: result.request.method,
              url: result.request.url,
              headers: result.request.headers,
              body: result.request.body
            } : null,
            response: result?.response && result.response.status !== 'skipped' && result.response.status !== 'error' ? {
              status: result.response.status,
              statusText: result.response.statusText,
              responseTime: result.response.responseTime,
              headers: result.response.headers,
              data: result.response.data
            } : null,
            error: result?.error,
            assertionResults: result?.assertionResults || [],
            testResults: result?.testResults || [],
            status: result?.response?.status || 'error'
          }
        ]
      };
      saveSession(sessionData);

      const outputText = `=== Session ID: ${sessionId} ===
        ` + formatOutput(result, logs);

      return {
        content: [
          {
            type: 'text',
            text: outputText
          }
        ],
        isError: result?.status === 'error' || result?.response?.status === 'skipped'
      };
    }
  }

  // Handle tool: run_folder
  async function handleRunFolder(args) {
    const { collectionPath, folderPath = './', recursive = true, env, envVars, globalEnv, delay = 0 } = args;
    if (!collectionPath) {
      throw new Error('Argument "collectionPath" is required.');
    }

    const resolvedCollectionPath = path.resolve(process.cwd(), collectionPath);
    const format = getCollectionFormat(resolvedCollectionPath);
    if (!format) {
      throw new Error(`The directory "${resolvedCollectionPath}" is not the root of a Bruno collection (bruno.json or opencollection.yml is missing).`);
    }
    const collection = createCollectionJsonFromPathname(resolvedCollectionPath);
    const absolutePath = path.resolve(resolvedCollectionPath, folderPath || './');

    const requestItems = getCallStack([absolutePath], collection, { recursive });
    if (!requestItems || !requestItems.length) {
      throw new Error(`No requests found in path: ${folderPath}`);
    }

    const { envVars: resolvedEnvVars, globalEnvVars, processEnvVars } = await resolveEnvironment(
      resolvedCollectionPath,
      collection,
      env,
      envVars,
      globalEnv
    );

    const runtimeVariables = {};
    const brunoConfig = collection.brunoConfig;
    const collectionRoot = collection.root;
    const runtime = 'quickjs';

    const runSingleRequestByPathname = async (relativeItemPathname) => {
      const ext = FORMAT_CONFIG[collection.format].ext;
      return new Promise(async (resolve, reject) => {
        let itemPathname = path.join(resolvedCollectionPath, relativeItemPathname);
        if (itemPathname && !itemPathname?.endsWith(ext)) {
          itemPathname = `${itemPathname}${ext}`;
        }
        const requestItem = cloneDeep(findItemInCollection(collection, itemPathname));
        if (requestItem) {
          const res = await runSingleRequest(
            requestItem,
            resolvedCollectionPath,
            runtimeVariables,
            resolvedEnvVars,
            processEnvVars,
            brunoConfig,
            collectionRoot,
            runtime,
            collection,
            runSingleRequestByPathname,
            globalEnvVars
          );
          resolve(res?.response);
        }
        reject(`bru.runRequest: invalid request path - ${itemPathname}`);
      });
    };

    startIntercepting();

    const results = [];
    try {
      let currentRequestIndex = 0;
      let nJumps = 0;

      while (currentRequestIndex < requestItems.length) {
        const requestItem = cloneDeep(requestItems[currentRequestIndex]);
        const { name, pathname } = requestItem;

        const start = process.hrtime();
        const result = await runSingleRequest(
          requestItem,
          resolvedCollectionPath,
          runtimeVariables,
          resolvedEnvVars,
          processEnvVars,
          brunoConfig,
          collectionRoot,
          runtime,
          collection,
          runSingleRequestByPathname,
          globalEnvVars
        );

        const isLastRun = currentRequestIndex === requestItems.length - 1;
        if (delay > 0 && !isLastRun) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        results.push({
          ...result,
          runDuration: process.hrtime(start)[0] + process.hrtime(start)[1] / 1e9,
          suitename: pathname.replace('.bru', ''),
          name,
          path: result.test?.filename || path.relative(resolvedCollectionPath, pathname)
        });

        if (result?.shouldStopRunnerExecution) {
          break;
        }

        const nextRequestName = result?.nextRequestName;
        if (nextRequestName !== undefined) {
          nJumps++;
          if (nJumps > 10000) {
            break;
          }
          if (nextRequestName === null) {
            break;
          }
          const nextRequestIdx = requestItems.findIndex((iter) => iter.name === nextRequestName);
          if (nextRequestIdx >= 0) {
            currentRequestIndex = nextRequestIdx;
          } else {
            currentRequestIndex++;
          }
        } else {
          currentRequestIndex++;
        }
      }
    } finally {
      const logs = stopIntercepting();
      const summary = getRunnerSummary(results);

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const sessionData = {
        sessionId,
        timestamp: new Date().toISOString(),
        collectionPath: resolvedCollectionPath,
        type: 'folder',
        folderPath,
        env,
        results: results.map((r) => ({
          name: r.name,
          path: r.path,
          request: r.request ? {
            method: r.request.method,
            url: r.request.url,
            headers: r.request.headers,
            body: r.request.body
          } : null,
          response: r.response && r.response.status !== 'skipped' && r.response.status !== 'error' ? {
            status: r.response.status,
            statusText: r.response.statusText,
            responseTime: r.response.responseTime,
            headers: r.response.headers,
            data: r.response.data
          } : null,
          error: r.error,
          assertionResults: r.assertionResults || [],
          testResults: r.testResults || [],
          status: r.response?.status || 'error'
        }))
      };
      saveSession(sessionData);

      const detailedResultsText = results.map((r) => {
        const reqStr = r.request ? `${r.request.method} ${r.request.url}` : 'N/A';
        const resStr = r.response && r.response.status !== 'skipped' && r.response.status !== 'error'
          ? `${r.response.status} ${r.response.statusText} (${r.response.responseTime}ms)`
          : `Response status: ${r.response?.status || 'N/A'}`;
        const asserts = (r.assertionResults || []).map((a) => `${a.status === 'pass' ? '✓' : '✕'} ${a.lhsExpr} ${a.rhsExpr}`).join('\n');
        const tests = (r.testResults || []).map((t) => `${t.status === 'pass' ? '✓' : '✕'} ${t.description}`).join('\n');
        let bodyStr = '';
        if (r.response?.data) {
          try {
            bodyStr = typeof r.response.data === 'object' ? JSON.stringify(r.response.data, null, 2) : String(r.response.data);
          } catch (_) {
            bodyStr = String(r.response.data);
          }
        }
        return `--- Request: ${r.name} ---
Path: ${r.path}
Request: ${reqStr}
Response: ${resStr}
Assertions:
${asserts || 'None'}
Tests:
${tests || 'None'}
${r.error ? `Error: ${r.error}\n` : ''}
Response Body:
${bodyStr || 'Empty'}`;
      }).join('\n\n');

      const outputText = `=== Session ID: ${sessionId} ===
=== Runner Executed ${results.length} requests ===
Summary:
- Total Requests: ${summary.totalRequests}
- Passed: ${summary.passedRequests}
- Failed: ${summary.failedRequests}
- Skipped: ${summary.skippedRequests}
- Errors: ${summary.errorRequests}

Assertions:
- Total: ${summary.totalAssertions}
- Passed: ${summary.passedAssertions}
- Failed: ${summary.failedAssertions}

=== Detailed API Execution Results ===
${detailedResultsText}

=== Terminal Logs ===
${logs}`;

      return {
        content: [
          {
            type: 'text',
            text: outputText
          }
        ],
        isError: summary.failedRequests > 0 || summary.errorRequests > 0
      };
    }
  }

  // Handle tool: list_sessions
  async function handleListSessions(args) {
    const { limit = 20 } = args || {};
    const dir = getHistoryDir();
    if (!fs.existsSync(dir)) {
      return {
        content: [{ type: 'text', text: '[]' }]
      };
    }

    const files = fs.readdirSync(dir);
    const sessions = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(path.join(dir, file), 'utf8');
          const data = JSON.parse(content);
          const totalRequests = data.results?.length || 0;
          const passed = data.results?.filter((r) => r.response?.status === 200 || r.status === 'pass' || (r.assertionResults && r.assertionResults.every((a) => a.status === 'pass') && r.testResults && r.testResults.every((t) => t.status === 'pass'))).length || 0;

          sessions.push({
            sessionId: data.sessionId,
            timestamp: data.timestamp,
            collectionPath: data.collectionPath,
            type: data.type || 'folder',
            folderPath: data.folderPath,
            requestPath: data.requestPath,
            env: data.env,
            summary: {
              totalRequests,
              passed,
              failed: totalRequests - passed
            }
          });
        } catch (err) {
          // Skip corrupt files
        }
      }
    }

    sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(sessions.slice(0, limit), null, 2)
        }
      ]
    };
  }

  // Handle tool: get_session
  async function handleGetSession(args) {
    const { sessionId } = args;
    if (!sessionId) {
      throw new Error('Argument "sessionId" is required.');
    }

    const dir = getHistoryDir();
    const filePath = path.join(dir, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  // Handle tool: test_api
  async function handleTestApi(args) {
    const { url, method = 'GET', headers = {}, params = {}, body = {}, envVars = {} } = args;
    if (!url) {
      throw new Error('Argument "url" is required.');
    }

    const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bruno-mcp-test-'));
    try {
      const brunoJson = {
        version: '1',
        name: 'Temp MCP Test Collection',
        type: 'collection',
        ignore: ['node_modules', '.git']
      };
      fs.writeFileSync(path.join(tempDir, 'bruno.json'), JSON.stringify(brunoJson, null, 2), 'utf8');

      const bruContent = buildBruContent({ method, url, headers, params, body });
      const requestFilename = 'request.bru';
      const requestPath = path.join(tempDir, requestFilename);
      fs.writeFileSync(requestPath, bruContent, 'utf8');

      const collection = createCollectionJsonFromPathname(tempDir);
      const item = findItemInCollection(collection, requestPath);
      if (!item) {
        throw new Error('Failed to create/locate temporary request item.');
      }

      const resolvedEnvVars = {};
      if (envVars && typeof envVars === 'object') {
        for (const [key, value] of Object.entries(envVars)) {
          resolvedEnvVars[key] = String(value);
        }
      }
      const processEnvVars = { ...process.env };
      const globalEnvVars = {};

      const runtimeVariables = {};
      const brunoConfig = collection.brunoConfig;
      const collectionRoot = collection.root;
      const runtime = 'quickjs';

      const runSingleRequestByPathname = async (relativeItemPathname) => {
        throw new Error('Nested request runs are not supported in test_api.');
      };

      startIntercepting();

      let result;
      try {
        result = await runSingleRequest(
          item,
          tempDir,
          runtimeVariables,
          resolvedEnvVars,
          processEnvVars,
          brunoConfig,
          collectionRoot,
          runtime,
          collection,
          runSingleRequestByPathname,
          globalEnvVars
        );
      } finally {
        const logs = stopIntercepting();
        const outputText = formatOutput(result, logs);

        return {
          content: [
            {
              type: 'text',
              text: outputText
            }
          ],
          isError: result?.status === 'error' || result?.response?.status === 'skipped'
        };
      }
    } finally {
      try {
        if (fs.rmSync) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } else if (fs.rmdirSync) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
      } catch (err) {
        // Ignore
      }
    }
  }

  async function handleGetFlowDetails(args) {
    const { collectionPath, flowPath } = args;
    if (!collectionPath || !flowPath) {
      throw new Error('Arguments "collectionPath" and "flowPath" are required.');
    }

    const resolvedCollectionPath = path.resolve(process.cwd(), collectionPath);
    const format = getCollectionFormat(resolvedCollectionPath);
    if (!format) {
      throw new Error(`The directory "${resolvedCollectionPath}" is not the root of a Bruno collection (bruno.json or opencollection.yml is missing).`);
    }

    const absoluteFlowPath = path.resolve(resolvedCollectionPath, flowPath);
    if (!absoluteFlowPath.startsWith(resolvedCollectionPath)) {
      throw new Error(`Flow path must be inside the collection directory.`);
    }

    if (!fs.existsSync(absoluteFlowPath)) {
      throw new Error(`Flow file does not exist: ${flowPath}`);
    }

    const content = fs.readFileSync(absoluteFlowPath, 'utf8');
    const flowData = JSON.parse(content);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(flowData, null, 2)
        }
      ]
    };
  }

  async function handleRunFlow(args) {
    const { collectionPath, flowPath, env, envVars, globalEnv } = args;
    if (!collectionPath || !flowPath) {
      throw new Error('Arguments "collectionPath" and "flowPath" are required.');
    }

    const resolvedCollectionPath = path.resolve(process.cwd(), collectionPath);
    const format = getCollectionFormat(resolvedCollectionPath);
    if (!format) {
      throw new Error(`The directory "${resolvedCollectionPath}" is not the root of a Bruno collection (bruno.json or opencollection.yml is missing).`);
    }
    const collection = createCollectionJsonFromPathname(resolvedCollectionPath);
    const absoluteFlowPath = path.resolve(resolvedCollectionPath, flowPath);

    if (!fs.existsSync(absoluteFlowPath)) {
      throw new Error(`Flow file does not exist: ${flowPath}`);
    }

    const content = fs.readFileSync(absoluteFlowPath, 'utf8');
    const flowData = JSON.parse(content);

    const flowItem = {
      pathname: absoluteFlowPath,
      type: 'flow-request',
      name: path.basename(flowPath, '.bruflow'),
      flow: flowData
    };

    const { envVars: resolvedEnvVars, globalEnvVars, processEnvVars } = await resolveEnvironment(
      resolvedCollectionPath,
      collection,
      env,
      envVars,
      globalEnv
    );

    const runtimeVariables = {};
    const brunoConfig = collection.brunoConfig;
    const collectionRoot = collection.root;
    const runtime = 'quickjs';

    const runSingleRequestByPathname = async (relativeItemPathname) => {
      const ext = FORMAT_CONFIG[collection.format].ext;
      return new Promise(async (resolve, reject) => {
        let itemPathname = path.join(resolvedCollectionPath, relativeItemPathname);
        if (itemPathname && !itemPathname?.endsWith(ext)) {
          itemPathname = `${itemPathname}${ext}`;
        }
        const requestItem = cloneDeep(findItemInCollection(collection, itemPathname));
        if (requestItem) {
          const res = await runSingleRequest(
            requestItem,
            resolvedCollectionPath,
            runtimeVariables,
            resolvedEnvVars,
            processEnvVars,
            brunoConfig,
            collectionRoot,
            runtime,
            collection,
            runSingleRequestByPathname,
            globalEnvVars
          );
          resolve(res?.response);
        }
        reject(`bru.runRequest: invalid request path - ${itemPathname}`);
      });
    };

    startIntercepting();

    let result;
    try {
      result = await runSingleRequest(
        flowItem,
        resolvedCollectionPath,
        runtimeVariables,
        resolvedEnvVars,
        processEnvVars,
        brunoConfig,
        collectionRoot,
        runtime,
        collection,
        runSingleRequestByPathname,
        globalEnvVars
      );
    } finally {
      const logs = stopIntercepting();
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const sessionData = {
        sessionId,
        timestamp: new Date().toISOString(),
        collectionPath: resolvedCollectionPath,
        type: 'flow',
        flowPath,
        env,
        results: result?.response?.data || []
      };
      saveSession(sessionData);

      const outputText = `=== Session ID: ${sessionId} ===\n` + formatOutput(result, logs);

      return {
        content: [
          {
            type: 'text',
            text: outputText
          }
        ],
        isError: result?.status === 'error' || result?.response?.status === 'skipped'
      };
    }
  }

  async function handleGetBrunoTemplates() {
    const templates = {
      bru_http_request: `meta {
  name: Get Repo Info
  type: http
  seq: 1
}

get {
  url: https://api.github.com/repos/usebruno/bruno
  body: none
  auth: none
}

headers {
  Accept: application/json
  User-Agent: Bruno
}

vars:pre-request {
  dummy_var: initial_val
}

vars:post-response {
  repo_name: {{res.body.name}}
}

script:pre-request {
  // JavaScript to run before request
  bru.setVar("pre_time", Date.now());
}

script:post-response {
  // JavaScript to run after response
  console.log("Status is " + res.status);
}

tests {
  test("Status is 200", function() {
    expect(res.getStatus()).to.eql(200);
  });
  test("Name is bruno", function() {
    expect(res.getBody().name).to.eql("bruno");
  });
}

docs {
  This gets repository information from GitHub API.
}`,
      bru_graphql_request: `meta {
  name: GraphQL Example
  type: graphql
  seq: 2
}

post {
  url: https://countries.trevorblades.com/
  body: graphql
  auth: none
}

body:graphql {
  query {
    country(code: "US") {
      name
      capital
      currency
    }
  }
}

body:graphql:vars {
  {
    "code": "US"
  }
}`,
      bruflow: `{
  "version": 2,
  "steps": [
    {
      "id": "764bb729-1065-4f40-84c4-fdf6a7e0ebc5",
      "name": "login",
      "requestPathname": "auth/login.bru",
      "method": "POST",
      "url": "https://api.example.com/auth/login",
      "enabled": true,
      "isOverrideEnabled": false,
      "override": {
        "params": [],
        "headers": [],
        "body": {
          "mode": "json",
          "json": "{\\n  \\"username\\": \\"admin\\",\\n  \\"password\\": \\"secret123\\"\\n}"
        }
      }
    },
    {
      "id": "e6a47738-f9b6-455b-80dc-b5297120df0f",
      "name": "get_profile",
      "requestPathname": "user/get-profile.bru",
      "method": "GET",
      "url": "https://api.example.com/user/profile",
      "enabled": true,
      "isOverrideEnabled": true,
      "override": {
        "params": [],
        "headers": [
          {
            "name": "Authorization",
            "value": "Bearer {{steps.login.body.token}}",
            "enabled": true
          }
        ],
        "body": {
          "mode": "none"
        }
      }
    }
  ]
}`
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(templates, null, 2)
        }
      ]
    };
  }

  function formatOutput(result, logs) {
    if (!result) {
      return `=== Execution Logs ===\n${logs}\n\nError: No result returned.`;
    }

    const { request, response, error, assertionResults = [], testResults = [] } = result;

    if (request && request.method === 'FLOW') {
      const flowResults = response?.data || [];
      const stepsSummary = flowResults.map((r) => {
        const stepStatusSymbol = r.status === 'pass' || r.status === 'success' ? '✓' : '✕';
        const reqInfo = r.request ? `[${r.request.method} ${r.request.url}]` : '';
        const resInfo = r.response ? `-> ${r.response.status} (${r.response.duration || 0}ms)` : '';
        return `${stepStatusSymbol} ${r.name} ${reqInfo} ${resInfo}${r.error ? `\n   Error: ${r.error}` : ''}`;
      }).join('\n');

      return `=== Execution Logs ===
${logs}
=== Flow Execution Summary ===
${stepsSummary || 'No steps executed'}

${error ? `=== Error ===\n${error}\n` : ''}`;
    }

    const reqStr = request ? `${request.method} ${request.url}` : '';
    const resStr = response && response.status !== 'skipped' && response.status !== 'error'
      ? `${response.status} ${response.statusText} (${response.responseTime}ms)`
      : `Response status: ${response?.status || 'N/A'}`;

    const asserts = assertionResults.map((a) => `${a.status === 'pass' ? '✓' : '✕'} ${a.lhsExpr} ${a.rhsExpr}`).join('\n');
    const tests = testResults.map((t) => `${t.status === 'pass' ? '✓' : '✕'} ${t.description}`).join('\n');

    let bodyStr = '';
    if (response?.data) {
      try {
        bodyStr = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data);
      } catch (_) {
        bodyStr = String(response.data);
      }
    }

    return `=== Execution Logs ===
${logs}
=== Request ===
${reqStr}

=== Response ===
${resStr}

=== Assertions ===
${asserts || 'None'}

=== Tests ===
${tests || 'None'}

${error ? `=== Error ===\n${error}\n` : ''}
=== Response Body ===
${bodyStr || 'Empty'}`;
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler
};
