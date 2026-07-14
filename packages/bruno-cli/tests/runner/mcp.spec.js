const { handler } = require('../../src/commands/mcp');
const { PassThrough } = require('stream');

describe('mcp command', () => {
  let originalStdin, originalStdout;
  let mockStdin, mockStdout;

  beforeEach(() => {
    originalStdin = process.stdin;
    originalStdout = process.stdout;
    mockStdin = new PassThrough();
    mockStdout = new PassThrough();

    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
      configurable: true
    });
    Object.defineProperty(process, 'stdout', {
      value: mockStdout,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      configurable: true
    });
    Object.defineProperty(process, 'stdout', {
      value: originalStdout,
      configurable: true
    });
  });

  it('should handle initialize request', (done) => {
    mockStdout.on('data', (chunk) => {
      try {
        const resp = JSON.parse(chunk.toString().trim());
        expect(resp.jsonrpc).toBe('2.0');
        expect(resp.id).toBe(1);
        expect(resp.result.serverInfo.name).toBe('bruno-mcp');
        done();
      } catch (err) {
        done(err);
      }
    });

    handler({}).then(() => {
      mockStdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      }) + '\n');
    });
  });

  it('should handle tools/list request', (done) => {
    mockStdout.on('data', (chunk) => {
      try {
        const resp = JSON.parse(chunk.toString().trim());
        expect(resp.jsonrpc).toBe('2.0');
        expect(resp.id).toBe(2);
        expect(Array.isArray(resp.result.tools)).toBe(true);
        const toolNames = resp.result.tools.map((t) => t.name);
        expect(toolNames).toContain('list_collection_items');
        expect(toolNames).toContain('run_request');
        expect(toolNames).toContain('run_folder');
        expect(toolNames).toContain('get_flow_details');
        expect(toolNames).toContain('run_flow');
        expect(toolNames).toContain('get_bruno_templates');
        done();
      } catch (err) {
        done(err);
      }
    });

    handler({}).then(() => {
      mockStdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      }) + '\n');
    });
  });

  it('should handle get_bruno_templates tool call', (done) => {
    mockStdout.on('data', (chunk) => {
      try {
        const resp = JSON.parse(chunk.toString().trim());
        expect(resp.jsonrpc).toBe('2.0');
        expect(resp.id).toBe(3);
        expect(resp.result.content).toBeDefined();
        const templates = JSON.parse(resp.result.content[0].text);
        expect(templates.bru_http_request).toBeDefined();
        expect(templates.bru_graphql_request).toBeDefined();
        expect(templates.bruflow).toBeDefined();
        done();
      } catch (err) {
        done(err);
      }
    });

    handler({}).then(() => {
      mockStdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'get_bruno_templates',
          arguments: {}
        }
      }) + '\n');
    });
  });
});
