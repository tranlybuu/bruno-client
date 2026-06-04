const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const { forOwn, cloneDeep } = require('lodash');
const { getRunnerSummary } = require('@usebruno/common/runner');
const { runSingleRequest } = require('../runner/run-single-request');
const { getEnvVars, getOptions } = require('../utils/bru');
const { parseEnvironmentJson } = require('../utils/environment');
const { parseDotEnv, parseEnvironment, parseRequest } = require('@usebruno/filestore');
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

// Start MCP server over stdio
const handler = async (argv) => {
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
              description: 'Recursively search for Bruno collections from the current directory. Returns a list of collections with their names and paths.',
              inputSchema: {
                type: 'object',
                properties: {
                  path: {
                    type: 'string',
                    description: 'Base directory path to start search. Defaults to current working directory.'
                  }
                }
              }
            },
            {
              name: 'list_collection_items',
              description: 'Lists folders, requests (.bru files), and environments inside a specified Bruno collection or subdirectory.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'Absolute or relative path to the Bruno collection directory.'
                  },
                  folderPath: {
                    type: 'string',
                    description: 'Relative path of the folder to list inside the collection (optional).'
                  }
                },
                required: ['collectionPath']
              }
            },
            {
              name: 'get_request_details',
              description: 'Get details of a single API request (.bru) in a collection, including its method, URL, headers, query parameters, variables, body, and scripts.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'Absolute or relative path to the Bruno collection directory.'
                  },
                  requestPath: {
                    type: 'string',
                    description: 'Relative path of the request file in the collection (e.g. "API/auth/login.bru").'
                  }
                },
                required: ['collectionPath', 'requestPath']
              }
            },
            {
              name: 'run_request',
              description: 'Run a single API request (.bru) in a specified Bruno collection.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'Absolute or relative path to the Bruno collection directory.'
                  },
                  requestPath: {
                    type: 'string',
                    description: 'Relative path of the request file in the collection (e.g. "API/auth/login.bru").'
                  },
                  env: {
                    type: 'string',
                    description: 'Name of the environment to use (optional)'
                  },
                  envVars: {
                    type: 'object',
                    description: 'Key-value pairs to override/set environment variables (optional)'
                  },
                  globalEnv: {
                    type: 'string',
                    description: 'Global environment name (optional)'
                  }
                },
                required: ['collectionPath', 'requestPath']
              }
            },
            {
              name: 'run_folder',
              description: 'Run all requests in a folder (equivalent to Collection Runner) in a specified Bruno collection.',
              inputSchema: {
                type: 'object',
                properties: {
                  collectionPath: {
                    type: 'string',
                    description: 'Absolute or relative path to the Bruno collection directory.'
                  },
                  folderPath: {
                    type: 'string',
                    description: 'Relative path to the folder. Use "." or leave blank to run the entire collection.'
                  },
                  recursive: {
                    type: 'boolean',
                    description: 'Whether to run requests in subfolders recursively. Defaults to true.'
                  },
                  env: {
                    type: 'string',
                    description: 'Name of the environment to use (optional)'
                  },
                  envVars: {
                    type: 'object',
                    description: 'Key-value pairs to override/set environment variables (optional)'
                  },
                  globalEnv: {
                    type: 'string',
                    description: 'Global environment name (optional)'
                  },
                  delay: {
                    type: 'number',
                    description: 'Delay in milliseconds between requests (optional)'
                  }
                },
                required: ['collectionPath']
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
        if (file.name === collectionFile || file.name === folderFile || path.extname(filePath) !== ext) {
          continue;
        }
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

      const outputText = `=== Runner Executed ${results.length} requests ===
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

Tests:
- Total: ${summary.totalTests}
- Passed: ${summary.passedTests}
- Failed: ${summary.failedTests}

=== Detailed Results ===
${results.map((r) => `[${r.name}] ${r.response?.status || 'Error'} (${r.response?.responseTime || 0}ms)`).join('\n')}

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

  function formatOutput(result, logs) {
    if (!result) {
      return `=== Execution Logs ===\n${logs}\n\nError: No result returned.`;
    }

    const { request, response, error, assertionResults = [], testResults = [] } = result;

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
