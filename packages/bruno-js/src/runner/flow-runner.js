const fs = require('fs');
const path = require('path');

class FlowRunner {
  constructor({ collection, runtime, envVariables, runtimeVariables, collectionPath }) {
    this.collection = collection;
    this.runtime = runtime;
    this.envVariables = envVariables || {};
    this.runtimeVariables = runtimeVariables || {};
    this.collectionPath = collectionPath;
    this.nodeOutputs = {}; // maps nodeId -> response or output
  }

  findRequestItem(requestUid, items = this.collection.items) {
    for (const item of items) {
      if (item.uid === requestUid) return item;
      if (item.items) {
        const found = this.findRequestItem(requestUid, item.items);
        if (found) return found;
      }
    }
    return null;
  }

  async run(flowData, runRequestFn) {
    const { nodes, edges } = flowData;
    if (!nodes || nodes.length === 0) return;

    // Find start nodes (nodes with no incoming edges)
    const startNodes = nodes.filter((node) =>
      !edges.some((edge) => edge.target === node.id)
    );

    if (startNodes.length === 0) {
      throw new Error('No start node found in flow (all nodes have incoming connections)');
    }

    // Run starting nodes
    for (const startNode of startNodes) {
      await this.executeNode(startNode, nodes, edges, runRequestFn);
    }
  }

  async executeNode(node, nodes, edges, runRequestFn) {
    console.log(`Executing node ${node.id} (${node.type})`);

    let nextNodeId = null;
    let nextHandleId = null;

    if (node.type === 'apiNode') {
      const requestUid = node.data.requestUid;
      if (requestUid) {
        const requestItem = this.findRequestItem(requestUid);
        if (requestItem) {
          // Deep copy request data to avoid polluting the original template
          const requestOverride = JSON.parse(JSON.stringify(requestItem.request || {}));

          // Evaluate mapping inputs from incoming edges
          const incomingEdges = edges.filter((edge) => edge.target === node.id);
          for (const edge of incomingEdges) {
            if (edge.data && edge.data.mappings) {
              const sourceNodeOutput = this.nodeOutputs[edge.source];
              if (sourceNodeOutput) {
                for (const mapping of edge.data.mappings) {
                  const { sourceExpr, targetType, targetName } = mapping;
                  if (sourceExpr && targetName) {
                    let mappedValue;
                    try {
                      // Evaluate source expression against source response
                      const fn = new Function('res', `return (${sourceExpr});`);
                      mappedValue = fn(sourceNodeOutput);
                    } catch (err) {
                      console.error(`Mapping evaluation failed for ${sourceExpr}: ${err.message}`);
                    }

                    if (mappedValue !== undefined) {
                      if (targetType === 'header') {
                        requestOverride.headers = requestOverride.headers || [];
                        const existingHeader = requestOverride.headers.find((h) => h.name.toLowerCase() === targetName.toLowerCase());
                        if (existingHeader) {
                          existingHeader.value = String(mappedValue);
                        } else {
                          requestOverride.headers.push({ name: targetName, value: String(mappedValue), enabled: true });
                        }
                      } else if (targetType === 'query') {
                        requestOverride.params = requestOverride.params || [];
                        const existingParam = requestOverride.params.find((p) => p.name === targetName);
                        if (existingParam) {
                          existingParam.value = String(mappedValue);
                        } else {
                          requestOverride.params.push({ name: targetName, value: String(mappedValue), enabled: true });
                        }
                      } else if (targetType === 'body') {
                        if (requestOverride.body && requestOverride.body.mode === 'json') {
                          try {
                            const bodyJson = JSON.parse(requestOverride.body.json || '{}');
                            bodyJson[targetName] = mappedValue;
                            requestOverride.body.json = JSON.stringify(bodyJson, null, 2);
                          } catch (err) {
                            console.error(`Failed to map body parameter: ${err.message}`);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // Execute with overridden request config
          const response = await runRequestFn(requestUid, requestOverride);
          this.nodeOutputs[node.id] = response;
        }
      }
    } else if (node.type === 'conditionNode') {
      const condition = node.data.condition || 'true';
      const evalContext = {
        res: this.getLastResponse(),
        outputs: this.nodeOutputs
      };

      let isTrue = false;
      try {
        const fn = new Function('context', `
          with(context) {
            return (${condition});
          }
        `);
        isTrue = !!fn(evalContext);
      } catch (err) {
        console.error(`Condition evaluation failed: ${err.message}`);
      }

      nextHandleId = isTrue ? 'true' : 'false';
    } else if (node.type === 'delayNode') {
      const delay = node.data.delay || 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else if (node.type === 'loopNode') {
      const loopOverExpr = node.data.loopOver || '[]';
      const evalContext = {
        res: this.getLastResponse(),
        outputs: this.nodeOutputs
      };

      let items = [];
      try {
        const fn = new Function('context', `
          with(context) {
            return (${loopOverExpr});
          }
        `);
        items = fn(evalContext) || [];
      } catch (err) {
        console.error(`Loop expression evaluation failed: ${err.message}`);
      }

      if (Array.isArray(items)) {
        const bodyEdge = edges.find((edge) => edge.source === node.id && edge.sourceHandle === 'body');
        if (bodyEdge) {
          const bodyStartNode = nodes.find((n) => n.id === bodyEdge.target);
          if (bodyStartNode) {
            for (const item of items) {
              this.runtimeVariables['loopItem'] = item;
              await this.executeNode(bodyStartNode, nodes, edges, runRequestFn);
            }
          }
        }
      }

      const nextEdge = edges.find((edge) => edge.source === node.id && edge.sourceHandle === 'next');
      if (nextEdge) {
        const nextNode = nodes.find((n) => n.id === nextEdge.target);
        if (nextNode) {
          await this.executeNode(nextNode, nodes, edges, runRequestFn);
        }
      }
      return;
    } else if (node.type === 'subflowNode') {
      const flowPath = node.data.flowPath;
      if (flowPath) {
        const absoluteFlowPath = path.join(this.collectionPath, flowPath);
        if (fs.existsSync(absoluteFlowPath)) {
          const content = fs.readFileSync(absoluteFlowPath, 'utf8');
          const subflowData = JSON.parse(content);

          const subflowRunner = new FlowRunner({
            collection: this.collection,
            runtime: this.runtime,
            envVariables: this.envVariables,
            runtimeVariables: { ...this.runtimeVariables },
            collectionPath: this.collectionPath
          });
          await subflowRunner.run(subflowData, runRequestFn);
          Object.assign(this.runtimeVariables, subflowRunner.runtimeVariables);
        }
      }
    }

    const outgoingEdges = edges.filter((edge) => edge.source === node.id);
    if (outgoingEdges.length > 0) {
      let targetEdge = null;
      if (nextHandleId) {
        targetEdge = outgoingEdges.find((edge) => edge.sourceHandle === nextHandleId);
      } else {
        targetEdge = outgoingEdges.find((edge) => edge.sourceHandle !== 'body' && edge.sourceHandle !== 'next');
      }

      if (targetEdge) {
        const nextNode = nodes.find((n) => n.id === targetEdge.target);
        if (nextNode) {
          await this.executeNode(nextNode, nodes, edges, runRequestFn);
        }
      }
    }
  }

  getLastResponse() {
    const apiOutputs = Object.values(this.nodeOutputs);
    return apiOutputs[apiOutputs.length - 1] || null;
  }
}

module.exports = FlowRunner;
