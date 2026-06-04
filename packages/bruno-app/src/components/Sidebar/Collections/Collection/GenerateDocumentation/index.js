import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { cloneDeep } from 'lodash';
import jsyaml from 'js-yaml';
import jsesc from 'jsesc';
import toast from 'react-hot-toast';
import { IconBook, IconCheck, IconAlertTriangle, IconLoader2 } from '@tabler/icons';

import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';
import demoImage from './demo.png';
import { useApp } from 'providers/App';
import { transformCollectionToSaveToExportAsFile, findCollectionByUid, areItemsLoading } from 'utils/collections/index';
import { brunoToOpenCollection } from '@usebruno/converters';
import { sanitizeName } from 'utils/common/regex';
import { escapeHtml } from 'utils/response';
import path from 'utils/common/path';

const CDN_BASE_URL = 'https://cdn.opencollection.com';

const FEATURES = [
  'Standalone HTML file - no server required',
  'Interactive API playground',
  'Host on any static file server'
];

const buildHtmlDocument = (collectionName, escapedYamlContent) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${collectionName} - API Documentation</title>
    <style>
        body { margin: 0; padding: 0; }
        #opencollection-container { width: 100vw; height: 100vh; }
    </style>
    <link rel="stylesheet" href="${CDN_BASE_URL}/docs.css">
    <script src="${CDN_BASE_URL}/docs.js"></script>
    <script>
        if (typeof window !== 'undefined') {
            if (!window.__brunoLoadLocalModule) {
                window.__brunoLoadLocalModule = function(mod) {
                    return 'module.exports = () => ({});';
                };
            }
            if (!window.require) {
                const dummy = new Proxy(() => {}, {
                    get: () => dummy,
                    apply: () => dummy
                });
                window.require = () => dummy;
            }
        }
    </script>
</head>
<body>
    <div id="opencollection-container"></div>
    <script>
        const collectionData = ${escapedYamlContent};
        new window.OpenCollection({
            target: document.getElementById('opencollection-container'),
            opencollection: collectionData,
            theme: 'light'
        });
    </script>
</body>
</html>`;

const CollectionNotFound = ({ onClose }) => (
  <Modal size="md" title="Generate Documentation" confirmText="Close" handleConfirm={onClose} hideCancel>
    <StyledWrapper className="w-[500px]">
      <div className="flex items-center gap-2 text-warning">
        <IconAlertTriangle size={16} className="shrink-0" />
        <span>Collection not found. It may have been deleted or is no longer available.</span>
      </div>
    </StyledWrapper>
  </Modal>
);

const GenerateDocumentation = ({ onClose, collectionUid }) => {
  const { version } = useApp();
  const collection = useSelector((state) =>
    findCollectionByUid(state.collections.collections, collectionUid)
  );

  const isLoading = useMemo(
    () => (collection ? areItemsLoading(collection) : false),
    [collection]
  );

  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!collection) return;

    const baseName = sanitizeName(collection.name);
    const ext = '.html';
    const baseDocName = `${baseName}-documentation`;

    const findUniqueName = async () => {
      let currentName = `${baseDocName}${ext}`;
      let counter = 1;
      const { ipcRenderer } = window;

      while (true) {
        const fullPath = path.join(collection.pathname, currentName);
        const exists = await ipcRenderer.invoke('renderer:file-exists', { pathname: fullPath });
        if (!exists) {
          setFileName(currentName);
          break;
        }
        currentName = `${baseDocName}-${counter}${ext}`;
        counter++;
      }
    };

    findUniqueName();
  }, [collection]);

  const handleGenerate = useCallback(async () => {
    if (!fileName || !fileName.trim()) {
      toast.error('File name cannot be empty');
      return;
    }

    try {
      const collectionCopy = cloneDeep(collection);
      const transformedCollection = transformCollectionToSaveToExportAsFile(collectionCopy);
      const openCollection = brunoToOpenCollection(transformedCollection);

      openCollection.extensions = {
        ...openCollection.extensions,
        bruno: {
          ...openCollection.extensions?.bruno,
          exportedAt: new Date().toISOString(),
          exportedUsing: version ? `Bruno/${version}` : 'Bruno'
        }
      };

      // Wrap scripts in try-catch to prevent browser sandbox crashes for Node-specific code (e.g. require)
      // and inject a local module mock loader inside the VM context.
      const processScripts = (items) => {
        if (!items || !Array.isArray(items)) return;
        items.forEach((item) => {
          // Folder level scripts
          if (item.request && item.request.scripts) {
            item.request.scripts.forEach((script) => {
              if (script.code) {
                script.code = `if (typeof globalThis !== 'undefined') {\n  globalThis.__brunoLoadLocalModule = function(mod) {\n    return 'module.exports = () => ({});';\n  };\n}\ntry {\n${script.code}\n} catch (e) {\n  console.warn("Folder script error caught in documentation playground:", e);\n}`;
              }
            });
          }
          // Request level scripts
          if (item.runtime && item.runtime.scripts) {
            item.runtime.scripts.forEach((script) => {
              if (script.code) {
                script.code = `if (typeof globalThis !== 'undefined') {\n  globalThis.__brunoLoadLocalModule = function(mod) {\n    return 'module.exports = () => ({});';\n  };\n}\ntry {\n${script.code}\n} catch (e) {\n  console.warn("Request script error caught in documentation playground:", e);\n}`;
              }
            });
          }
          if (item.items) {
            processScripts(item.items);
          }
        });
      };

      if (openCollection.request && openCollection.request.scripts) {
        openCollection.request.scripts.forEach((script) => {
          if (script.code) {
            script.code = `if (typeof globalThis !== 'undefined') {\n  globalThis.__brunoLoadLocalModule = function(mod) {\n    return 'module.exports = () => ({});';\n  };\n}\ntry {\n${script.code}\n} catch (e) {\n  console.warn("Collection script error caught in documentation playground:", e);\n}`;
          }
        });
      }
      processScripts(openCollection.items);

      const yamlContent = jsyaml.dump(openCollection, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });

      // jsesc handles all edge cases: Unicode, special chars, quotes, template literals, etc.
      let escapedYaml = jsesc(yamlContent, { quotes: 'double', wrap: true });

      // Escape closing tags to prevent HTML parser from breaking out of the script block
      escapedYaml = escapedYaml.replace(/<\//g, '<\\/');

      const htmlContent = buildHtmlDocument(
        escapeHtml(collection.name),
        escapedYaml
      );

      const targetPath = path.join(collection.pathname, fileName.trim());
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:write-file-content', { pathname: targetPath, content: htmlContent });

      toast.success('Documentation generated successfully');
      onClose();
    } catch (error) {
      console.error('Error generating documentation:', error);
      toast.error('Failed to generate documentation');
    }
  }, [collection, version, onClose, fileName]);

  if (!collection) {
    return <CollectionNotFound onClose={onClose} />;
  }

  return (
    <Modal
      size="md"
      title="Generate Documentation"
      confirmText={isLoading ? 'Loading...' : 'Generate'}
      cancelText="Cancel"
      handleConfirm={isLoading ? undefined : handleGenerate}
      handleCancel={onClose}
      confirmDisabled={isLoading}
    >
      <StyledWrapper className="w-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <IconLoader2 size={20} className="animate-spin" />
            <span>Loading collection...</span>
          </div>
        ) : (
          <div className="content">
            <h3 className="title flex items-center gap-2 mt-2 font-medium">
              <IconBook size={18} />
              <span>Interactive API Documentation</span>
            </h3>
            <p className="description mb-4">
              Generate a standalone HTML file in the collection directory.
            </p>

            <div className="flex flex-col mb-4">
              <label htmlFor="fileName" className="block font-medium text-sm">
                File Name
              </label>
              <input
                id="file-name"
                type="text"
                name="fileName"
                className="block textbox mt-2 w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={(e) => setFileName(e.target.value)}
                value={fileName}
                placeholder="e.g. SLM-documentation.html"
              />
            </div>

            <div className="preview-container relative mb-4">
              <span className="preview-label absolute">Sample Output</span>
              <img src={demoImage} alt="Documentation preview" className="preview-image" />
            </div>

            <ul className="features flex flex-col list-none gap-2 p-0 mb-4">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <IconCheck size={16} className="check-icon flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <p className="note m-0">
              The generated file loads OpenCollection's JavaScript and CSS files from a CDN, which requires an internet connection.
            </p>
          </div>
        )}
      </StyledWrapper>
    </Modal>
  );
};

export default GenerateDocumentation;
