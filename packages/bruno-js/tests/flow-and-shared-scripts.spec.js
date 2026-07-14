const { describe, it, expect } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const Bru = require('../src/bru');
const ScriptRuntime = require('../src/runtime/script-runtime');
const FlowRunner = require('../src/runner/flow-runner');

describe('Shared Scripts & Flow Runner tests', () => {
  describe('bru.require', () => {
    it('should load custom CommonJS module in Node VM sandbox', async () => {
      // Create a temporary scripts directory inside tests
      const mockCollectionPath = path.join(__dirname, 'mock-collection');
      const scriptsDir = path.join(mockCollectionPath, '.bruno', 'scripts');

      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }

      // Write mock script
      const mockScriptPath = path.join(scriptsDir, 'mathHelper.js');
      fs.writeFileSync(mockScriptPath, 'module.exports = { add: (a, b) => a + b };');

      try {
        const bru = new Bru({
          collectionPath: mockCollectionPath
        });

        // Set up custom require in VM context
        const reqFn = (name) => {
          const resolved = path.join(scriptsDir, `${name}.js`);
          return require(resolved);
        };
        bru._customRequire = reqFn;

        const runtime = new ScriptRuntime({ runtime: 'nodevm' });

        // Execute script that loads and executes helper function
        const script = `
          const math = bru.require('mathHelper');
          bru.setVar('sum', math.add(10, 5));
        `;

        const envVariables = {};
        const runtimeVariables = {};

        await runtime.runRequestScript(
          script,
          { method: 'GET', url: 'http://localhost' },
          envVariables,
          runtimeVariables,
          mockCollectionPath,
          null,
          {}
        );

        // Check if variable was correctly set from require result
        expect(runtimeVariables['sum']).toBe(15);
      } finally {
        // Cleanup mock scripts
        if (fs.existsSync(mockScriptPath)) {
          fs.unlinkSync(mockScriptPath);
        }
        if (fs.existsSync(scriptsDir)) {
          fs.rmdirSync(scriptsDir);
        }
        if (fs.existsSync(path.join(mockCollectionPath, '.bruno'))) {
          fs.rmdirSync(path.join(mockCollectionPath, '.bruno'));
        }
        if (fs.existsSync(mockCollectionPath)) {
          fs.rmdirSync(mockCollectionPath);
        }
      }
    });
  });

  describe('FlowRunner', () => {
    it('should traverse nodes sequentially and call runRequestFn', async () => {
      const flowData = {
        nodes: [
          {
            id: 'node-1',
            type: 'apiNode',
            data: { requestUid: 'req-abc', name: 'Get Users', method: 'GET', url: '/users' }
          },
          {
            id: 'node-2',
            type: 'apiNode',
            data: { requestUid: 'req-def', name: 'Create User', method: 'POST', url: '/users' }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2'
          }
        ]
      };

      const executedRequests = [];
      const mockRunRequest = async (uid, overrideConfig) => {
        executedRequests.push({ uid, overrideConfig });
        return { status: 200, data: { id: 123 } };
      };

      const runner = new FlowRunner({
        collection: { items: [{ uid: 'req-abc', request: {} }, { uid: 'req-def', request: {} }] },
        collectionPath: '.'
      });

      await runner.run(flowData, mockRunRequest);

      expect(executedRequests.length).toBe(2);
      expect(executedRequests[0].uid).toBe('req-abc');
      expect(executedRequests[1].uid).toBe('req-def');
    });

    it('should branch flow using Condition node', async () => {
      const flowData = {
        nodes: [
          {
            id: 'node-api',
            type: 'apiNode',
            data: { requestUid: 'req-api', name: 'Check Status' }
          },
          {
            id: 'node-cond',
            type: 'conditionNode',
            data: { condition: 'res.status === 200' }
          },
          {
            id: 'node-success',
            type: 'apiNode',
            data: { requestUid: 'req-success', name: 'On Success' }
          },
          {
            id: 'node-fail',
            type: 'apiNode',
            data: { requestUid: 'req-fail', name: 'On Fail' }
          }
        ],
        edges: [
          { id: 'e1', source: 'node-api', target: 'node-cond' },
          { id: 'e2', source: 'node-cond', sourceHandle: 'true', target: 'node-success' },
          { id: 'e3', source: 'node-cond', sourceHandle: 'false', target: 'node-fail' }
        ]
      };

      const executedRequests = [];
      const mockRunRequest = async (uid) => {
        executedRequests.push(uid);
        if (uid === 'req-api') {
          return { status: 200, data: {} };
        }
        return { status: 200, data: {} };
      };

      const runner = new FlowRunner({
        collection: {
          items: [
            { uid: 'req-api', request: {} },
            { uid: 'req-success', request: {} },
            { uid: 'req-fail', request: {} }
          ]
        },
        collectionPath: '.'
      });

      await runner.run(flowData, mockRunRequest);

      // Should run req-api, then node-cond redirects to true handle -> req-success
      expect(executedRequests).toContain('req-api');
      expect(executedRequests).toContain('req-success');
      expect(executedRequests).not.toContain('req-fail');
    });

    it('should apply data mappings to target API node', async () => {
      const flowData = {
        nodes: [
          {
            id: 'node-1',
            type: 'apiNode',
            data: { requestUid: 'req-login', name: 'Login' }
          },
          {
            id: 'node-2',
            type: 'apiNode',
            data: { requestUid: 'req-get-profile', name: 'Get Profile' }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            data: {
              mappings: [
                { sourceExpr: 'res.data.token', targetType: 'header', targetName: 'Authorization' }
              ]
            }
          }
        ]
      };

      let capturedOverrideConfig = null;
      const mockRunRequest = async (uid, overrideConfig) => {
        if (uid === 'req-login') {
          return { status: 200, data: { token: 'secret-token-123' } };
        }
        if (uid === 'req-get-profile') {
          capturedOverrideConfig = overrideConfig;
          return { status: 200, data: {} };
        }
      };

      const runner = new FlowRunner({
        collection: {
          items: [
            { uid: 'req-login', request: {} },
            { uid: 'req-get-profile', request: { headers: [] } }
          ]
        },
        collectionPath: '.'
      });

      await runner.run(flowData, mockRunRequest);

      // Verify that Authorization header was successfully injected from Node 1 output
      expect(capturedOverrideConfig).not.toBeNull();
      const authHeader = capturedOverrideConfig.headers.find((h) => h.name === 'Authorization');
      expect(authHeader).toBeDefined();
      expect(authHeader.value).toBe('secret-token-123');
    });
  });
});
