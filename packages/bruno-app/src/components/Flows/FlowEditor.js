import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateItemFlow } from 'providers/ReduxStore/slices/collections';
import {
  IconPlus,
  IconDeviceFloppy,
  IconPlayerPlay,
  IconTrash,
  IconX,
  IconSearch,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  IconCheck,
  IconSettings,
  IconRoute,
  IconLoader2,
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconRotate2,
  IconUpload
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { flattenItems, findEnvironmentInCollection } from 'utils/collections';
import { interpolate, interpolateObject } from '@usebruno/common';
import path, { getRelativePathWithinBasePath, normalizePath } from 'utils/common/path';
import MultipartFileChipsCell from 'components/MultipartFileChipsCell';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import { getMultipartAutoContentType } from 'utils/common/multipartContentType';
import Auth from 'components/RequestPane/Auth';
import Vars from 'components/RequestPane/Vars';
import Assertions from 'components/RequestPane/Assertions';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import Documentation from 'components/Documentation/index';
import CodeEditor from 'components/CodeEditor';
import SingleLineEditor from 'components/SingleLineEditor';
import EditableTable from 'components/EditableTable';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uuid = () => Math.random().toString(36).substring(2, 10);

const METHOD_COLORS = {
  GET: '#16a34a',
  POST: '#ea580c',
  PUT: '#2563eb',
  PATCH: '#0284c7',
  DELETE: '#dc2626',
  HEAD: '#7c3aed',
  OPTIONS: '#6b7280',
  FLOW: '#6366f1'
};

const buildDirectoryTree = (items) => {
  const root = { name: 'Root', isFolder: true, children: [], files: [] };

  for (const item of items) {
    const parts = item.relativePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let folderNode = current.children.find((c) => c.name === part && c.isFolder);
      if (!folderNode) {
        folderNode = { name: part, isFolder: true, children: [], files: [] };
        current.children.push(folderNode);
      }
      current = folderNode;
    }

    current.files.push(item);
  }

  return root;
};

const formatSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getStatusClass = (status) => {
  if (typeof status !== 'number') return 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/30';
  if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/30';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/30';
};

const fileBasename = (filePath) =>
  filePath ? path.basename(normalizePath(String(filePath))) : '';

// ─── Directory Node (Recursive) ───────────────────────────────────────────────

const DirectoryNode = ({ node, onSelect, search }) => {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (search.trim()) {
      setIsOpen(true);
    }
  }, [search]);

  if (!node.isFolder) return null;

  if (node.children.length === 0 && node.files.length === 0) {
    return null;
  }

  return (
    <div className="dir-folder">
      {node.name !== 'Root' && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-1.5 py-1 px-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded hover:bg-gray-50 dark:hover:bg-zinc-800"
        >
          {isOpen ? <IconChevronDown size={11} /> : <IconChevronRight size={11} />}
          <span className="truncate">{node.name}</span>
          <span className="ml-auto font-normal text-[9px] bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
            {node.files.length + node.children.reduce((acc, c) => acc + c.files.length, 0)}
          </span>
        </button>
      )}
      {isOpen && (
        <div className={node.name !== 'Root' ? 'ml-3 pl-2 border-l border-gray-100 dark:border-zinc-800' : ''}>
          {node.children.map((child, idx) => (
            <DirectoryNode
              key={idx}
              node={child}
              onSelect={onSelect}
              search={search}
            />
          ))}
          {node.files.map((file) => {
            const isFlow = file.type === 'flow-request';
            const method = file.request?.method || (isFlow ? 'FLOW' : 'GET');
            return (
              <button
                key={file.uid}
                onClick={() => onSelect(file)}
                className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 text-left group transition-colors"
              >
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
                  style={{ backgroundColor: METHOD_COLORS[method] || '#6b7280' }}
                >
                  {method}
                </span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 truncate">
                  {file.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── API Picker Modal ──────────────────────────────────────────────────────────

const ApiPickerModal = ({ availableRequests, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return availableRequests;
    const q = search.toLowerCase();
    return availableRequests.filter(
      (r) => r.name.toLowerCase().includes(q) || r.relativePath.toLowerCase().includes(q)
    );
  }, [availableRequests, search]);

  const tree = useMemo(() => buildDirectoryTree(filtered), [filtered]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[480px] max-h-[70vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Select API Request / Flow</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><IconX size={15} /></button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
            <IconSearch size={13} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search API or Flow..."
              className="flex-1 bg-transparent outline-none text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {tree.children.length === 0 && tree.files.length === 0 && (
            <div className="text-center py-10 text-xs text-gray-400 italic font-medium">No results found</div>
          )}
          <DirectoryNode node={tree} onSelect={onSelect} search={search} />
        </div>
      </div>
    </div>
  );
};

// ─── Headers Editor ────────────────────────────────────────────────────────────

const HeadersEditor = ({ step, onChange, collection, item }) => {
  const { storedTheme } = useTheme();
  const headers = step.override?.headers || [];

  const handleHeadersChange = (updatedHeaders) => {
    onChange({ ...step, override: { ...step.override, headers: updatedHeaders } });
  };

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '30%',
      render: ({ value, onChange: onCellChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onChange={(newValue) => onCellChange(newValue.replace(/[\r\n]/g, ''))}
          collection={collection}
          item={item}
          placeholder={!value ? 'Name' : ''}
          showHintsFor={['req', 'res', 'bru', 'steps']}
        />
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ value, onChange: onCellChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onChange={onCellChange}
          collection={collection}
          item={item}
          placeholder={!value ? 'Value' : ''}
          showHintsFor={['req', 'res', 'bru', 'steps']}
        />
      )
    }
  ];

  return (
    <div className="flex flex-col gap-2 animate-in fade-in duration-100 w-full mt-2" style={{ padding: '0 8px' }}>
      <div className="text-[11px] text-gray-400 mb-2">
        Configure Headers override when running Flow. Use syntax like <code>{'{{steps.step1.body.token}}'}</code> or <code>{'{{steps[\'Login Step\'].body.token}}'}</code>.
      </div>
      <EditableTable
        tableId={`flow-headers-${step.id}`}
        columns={columns}
        rows={headers}
        onChange={handleHeadersChange}
        defaultRow={{ name: '', value: '', enabled: true }}
        reorderable={false}
      />
    </div>
  );
};

// ─── Params Editor ─────────────────────────────────────────────────────────────

const ParamsEditor = ({ step, onChange, collection, item }) => {
  const { storedTheme } = useTheme();
  const params = step.override?.params || [];

  const handleParamsChange = (updatedParams) => {
    onChange({ ...step, override: { ...step.override, params: updatedParams } });
  };

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '30%',
      render: ({ value, onChange: onCellChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onChange={(newValue) => onCellChange(newValue.replace(/[\r\n]/g, ''))}
          collection={collection}
          item={item}
          placeholder={!value ? 'Name' : ''}
          showHintsFor={['req', 'res', 'bru', 'steps']}
        />
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ value, onChange: onCellChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onChange={onCellChange}
          collection={collection}
          item={item}
          placeholder={!value ? 'Value' : ''}
          showHintsFor={['req', 'res', 'bru', 'steps']}
        />
      )
    }
  ];

  return (
    <div className="flex flex-col gap-2 animate-in fade-in duration-100 w-full mt-2" style={{ padding: '0 8px' }}>
      <div className="text-[11px] text-gray-400 mb-2">
        Configure Query Parameters override. Use similar syntax to Headers override.
      </div>
      <EditableTable
        tableId={`flow-params-${step.id}`}
        columns={columns}
        rows={params}
        onChange={handleParamsChange}
        defaultRow={{ name: '', value: '', enabled: true, type: 'query' }}
        reorderable={false}
      />
    </div>
  );
};

// ─── Body Editor ───────────────────────────────────────────────────────────────

const BodyEditor = ({ step, onChange, collection, item, preferences }) => {
  const dispatch = useDispatch();
  const { displayedTheme, storedTheme } = useTheme();
  const body = step.override?.body || { mode: 'none' };

  const updateBodyMode = (mode) => {
    onChange({
      ...step,
      override: {
        ...step.override,
        body: { ...body, mode }
      }
    });
  };

  const updateBodyValue = (key, val) => {
    onChange({
      ...step,
      override: {
        ...step.override,
        body: { ...body, [key]: val }
      }
    });
  };

  const handleBrowseFiles = (row) => {
    dispatch(browseFiles([], ['multiSelections']))
      .then((filePaths) => {
        if (!Array.isArray(filePaths) || filePaths.length === 0) return;

        const processedPaths = filePaths.map((filePath) => {
          return getRelativePathWithinBasePath(collection.pathname, filePath);
        });

        const currentParams = body.multipartForm || [];
        const existingParam = currentParams.find((p) => p.uid === row.uid);
        const existingValue = existingParam && existingParam.type === 'file' && Array.isArray(existingParam.value)
          ? existingParam.value
          : [];
        const seen = new Set(existingValue);
        const merged = [...existingValue];
        const skipped = [];
        for (const p of processedPaths) {
          if (!seen.has(p)) {
            seen.add(p);
            merged.push(p);
          } else {
            skipped.push(p);
          }
        }

        if (skipped.length === 1) {
          toast(`"${fileBasename(skipped[0])}" is already added`);
        } else if (skipped.length > 1) {
          toast(`${skipped.length} files are already added — skipped`);
        }

        const autoContentType = getMultipartAutoContentType(merged);

        let updatedParams;
        if (existingParam) {
          updatedParams = currentParams.map((p) => {
            if (p.uid === row.uid) {
              return { ...p, type: 'file', value: merged, contentType: autoContentType };
            }
            return p;
          });
        } else {
          updatedParams = [
            ...currentParams,
            { uid: row.uid, name: row.name || '', enabled: true, type: 'file', value: merged, contentType: autoContentType }
          ];
        }
        updateBodyValue('multipartForm', updatedParams);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleRemoveFile = (row, filePathToRemove) => {
    const currentParams = body.multipartForm || [];
    const target = currentParams.find((p) => p.uid === row.uid);
    if (!target || target.type !== 'file') return;
    const currentValue = Array.isArray(target.value)
      ? target.value
      : (target.value ? [target.value] : []);
    const nextValue = currentValue.filter((p) => p !== filePathToRemove);

    const updatedParams = currentParams.map((p) => {
      if (p.uid !== row.uid) return p;
      if (nextValue.length === 0) {
        return { ...p, type: 'text', value: '', contentType: '' };
      }
      return { ...p, type: 'file', value: nextValue, contentType: getMultipartAutoContentType(nextValue) };
    });
    updateBodyValue('multipartForm', updatedParams);
  };

  const handleValueChange = (row, newValue, onChange) => {
    const currentParams = body.multipartForm || [];
    const existingParam = currentParams.find((p) => p.uid === row.uid);
    if (existingParam) {
      const updatedParams = currentParams.map((p) => {
        if (p.uid === row.uid) {
          return { ...p, type: 'text', value: newValue };
        }
        return p;
      });
      updateBodyValue('multipartForm', updatedParams);
    } else {
      onChange(newValue);
    }
  };

  const getFileList = (filePaths) => {
    if (!filePaths || (Array.isArray(filePaths) && filePaths.length === 0)) {
      return [];
    }
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    return paths.filter((v) => v != null && v !== '');
  };

  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-100 mt-2 w-full h-full" style={{ padding: '0 8px' }}>
      <div className="flex gap-2 items-center flex-shrink-0">
        <label className="lbl" style={{ marginBottom: 0 }}>Body Mode:</label>
        <select
          className="fselect"
          style={{ width: '140px' }}
          value={body.mode || 'none'}
          onChange={(e) => updateBodyMode(e.target.value)}
        >
          <option value="none">No Body</option>
          <option value="json">JSON</option>
          <option value="text">Text</option>
          <option value="xml">XML</option>
          <option value="formUrlEncoded">Form URL Encoded</option>
          <option value="multipartForm">Multipart Form</option>
          <option value="graphql">GraphQL</option>
        </select>
      </div>

      {body.mode === 'json' && (
        <div className="flex flex-col gap-1 w-full flex-1 min-h-[200px]">
          <label className="lbl">JSON Body Override</label>
          <CodeEditor
            collection={collection}
            docKey={`body-json-${step.id}`}
            value={body.json || ''}
            theme={displayedTheme}
            font={preferences?.font?.codeFont || 'default'}
            fontSize={preferences?.font?.codeFontSize}
            onEdit={(val) => updateBodyValue('json', val)}
            mode="javascript"
            showHintsFor={['req', 'res', 'bru', 'steps']}
          />
        </div>
      )}

      {body.mode === 'text' && (
        <div className="flex flex-col gap-1 w-full flex-1 min-h-[200px]">
          <label className="lbl">Text Body Override</label>
          <CodeEditor
            collection={collection}
            docKey={`body-text-${step.id}`}
            value={body.text || ''}
            theme={displayedTheme}
            font={preferences?.font?.codeFont || 'default'}
            fontSize={preferences?.font?.codeFontSize}
            onEdit={(val) => updateBodyValue('text', val)}
            mode="text/plain"
            showHintsFor={['req', 'res', 'bru', 'steps']}
          />
        </div>
      )}

      {body.mode === 'xml' && (
        <div className="flex flex-col gap-1 w-full flex-1 min-h-[200px]">
          <label className="lbl">XML Body Override</label>
          <CodeEditor
            collection={collection}
            docKey={`body-xml-${step.id}`}
            value={body.xml || ''}
            theme={displayedTheme}
            font={preferences?.font?.codeFont || 'default'}
            fontSize={preferences?.font?.codeFontSize}
            onEdit={(val) => updateBodyValue('xml', val)}
            mode="application/xml"
            showHintsFor={['req', 'res', 'bru', 'steps']}
          />
        </div>
      )}

      {body.mode === 'formUrlEncoded' && (
        <div className="w-full">
          <EditableTable
            tableId={`flow-form-${step.id}`}
            columns={[
              {
                key: 'name',
                name: 'Name',
                isKeyField: true,
                placeholder: 'Name',
                width: '30%',
                render: ({ value, onChange: onCellChange }) => (
                  <SingleLineEditor
                    value={value || ''}
                    theme={storedTheme}
                    onChange={(newValue) => onCellChange(newValue.replace(/[\r\n]/g, ''))}
                    collection={collection}
                    item={item}
                    placeholder={!value ? 'Name' : ''}
                    showHintsFor={['req', 'res', 'bru', 'steps']}
                  />
                )
              },
              {
                key: 'value',
                name: 'Value',
                placeholder: 'Value',
                render: ({ value, onChange: onCellChange }) => (
                  <SingleLineEditor
                    value={value || ''}
                    theme={storedTheme}
                    onChange={onCellChange}
                    collection={collection}
                    item={item}
                    placeholder={!value ? 'Value' : ''}
                    showHintsFor={['req', 'res', 'bru', 'steps']}
                  />
                )
              }
            ]}
            rows={body.formUrlEncoded || []}
            onChange={(rows) => updateBodyValue('formUrlEncoded', rows)}
            defaultRow={{ name: '', value: '', enabled: true }}
            reorderable={false}
          />
        </div>
      )}

      {body.mode === 'multipartForm' && (
        <div className="w-full">
          <EditableTable
            tableId={`flow-multipart-${step.id}`}
            columns={[
              {
                key: 'name',
                name: 'Key',
                isKeyField: true,
                placeholder: 'Key',
                width: '30%',
                render: ({ value, onChange: onCellChange }) => (
                  <SingleLineEditor
                    value={value || ''}
                    theme={storedTheme}
                    onChange={(newValue) => onCellChange(newValue.replace(/[\r\n]/g, ''))}
                    collection={collection}
                    item={item}
                    placeholder={!value ? 'Key' : ''}
                    showHintsFor={['req', 'res', 'bru', 'steps']}
                  />
                )
              },
              {
                key: 'value',
                name: 'Value',
                placeholder: 'Value',
                width: '35%',
                render: ({ row, value, onChange: onCellChange }) => {
                  const files = row.type === 'file' ? getFileList(value) : [];
                  if (files.length > 0) {
                    return (
                      <MultipartFileChipsCell
                        files={files}
                        onRemove={(filePath) => handleRemoveFile(row, filePath)}
                        onAdd={() => handleBrowseFiles(row)}
                      />
                    );
                  }

                  return (
                    <div className="value-cell">
                      <div className="flex-1">
                        <SingleLineEditor
                          value={value || ''}
                          theme={storedTheme}
                          onChange={(newValue) => handleValueChange(row, newValue, onCellChange)}
                          collection={collection}
                          item={item}
                          placeholder={!value ? 'Value' : ''}
                          showHintsFor={['req', 'res', 'bru', 'steps']}
                        />
                      </div>
                      <button
                        data-testid="multipart-file-upload"
                        className="upload-btn ml-1"
                        onClick={() => handleBrowseFiles(row)}
                        title="Select File"
                      >
                        <IconUpload size={16} />
                      </button>
                    </div>
                  );
                }
              },
              {
                key: 'contentType',
                name: 'Content-Type',
                placeholder: 'Auto',
                width: '20%',
                render: ({ value, onChange: onCellChange }) => (
                  <SingleLineEditor
                    value={value || ''}
                    theme={storedTheme}
                    placeholder={!value ? 'Auto' : ''}
                    onChange={onCellChange}
                    collection={collection}
                    showHintsFor={['req', 'res', 'bru', 'steps']}
                  />
                )
              }
            ]}
            rows={body.multipartForm || []}
            onChange={(rows) => updateBodyValue('multipartForm', rows)}
            defaultRow={{ name: '', value: '', contentType: '', type: 'text', enabled: true }}
            reorderable={false}
          />
        </div>
      )}

      {body.mode === 'graphql' && (
        <div className="flex flex-col gap-3 w-full flex-1 min-h-[300px]">
          <div className="flex flex-col gap-1 w-full flex-1 min-h-[150px]">
            <label className="lbl">GraphQL Query Override</label>
            <CodeEditor
              collection={collection}
              docKey={`body-graphql-query-${step.id}`}
              value={body.graphql?.query || ''}
              theme={displayedTheme}
              font={preferences?.font?.codeFont || 'default'}
              fontSize={preferences?.font?.codeFontSize}
              onEdit={(val) => updateBodyValue('graphql', { ...(body.graphql || {}), query: val })}
              mode="graphql"
              showHintsFor={['req', 'res', 'bru', 'steps']}
            />
          </div>
          <div className="flex flex-col gap-1 w-full h-[150px]">
            <label className="lbl">GraphQL Variables Override (JSON)</label>
            <CodeEditor
              collection={collection}
              docKey={`body-graphql-variables-${step.id}`}
              value={body.graphql?.variables || ''}
              theme={displayedTheme}
              font={preferences?.font?.codeFont || 'default'}
              fontSize={preferences?.font?.codeFontSize}
              onEdit={(val) => updateBodyValue('graphql', { ...(body.graphql || {}), variables: val })}
              mode="application/ld+json"
              showHintsFor={['req', 'res', 'bru', 'steps']}
            />
          </div>
        </div>
      )}

      {body.mode === 'none' && (
        <div className="empty-hint">No body override.</div>
      )}
    </div>
  );
};

// ─── Info Tab ──────────────────────────────────────────────────────────────────

const InfoTab = ({ reqItem }) => {
  if (!reqItem) return <div className="empty-hint animate-in fade-in duration-100">No API request selected.</div>;

  const request = reqItem.request || {};
  const params = (request.params || []).filter((p) => p.name && p.enabled !== false);
  const headers = (request.headers || []).filter((h) => h.name && h.enabled !== false);

  return (
    <div className="flex flex-col gap-3 text-xs animate-in fade-in duration-100">
      <div>
        <div className="section-label">Original Endpoint</div>
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded-md border border-gray-200 dark:border-zinc-700">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: METHOD_COLORS[request.method] || '#6b7280' }}
          >
            {request.method || 'GET'}
          </span>
          <span className="font-mono truncate flex-1 text-[11px] text-gray-700 dark:text-zinc-300">{request.url || '(no url)'}</span>
        </div>
      </div>

      {headers.length > 0 && (
        <div>
          <div className="section-label">Original Headers ({headers.length})</div>
          <table className="info-table">
            <tbody>
              {headers.map((h, i) => (
                <tr key={i}><td>{h.name}</td><td>{h.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {params.length > 0 && (
        <div>
          <div className="section-label">Original Query Params ({params.length})</div>
          <table className="info-table">
            <tbody>
              {params.map((p, i) => (
                <tr key={i}><td>{p.name}</td><td>{p.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Response Tab ──────────────────────────────────────────────────────────────

const ResponseTab = ({ response }) => {
  const [subTab, setSubTab] = useState('body');

  if (!response) return <div className="empty-hint animate-in fade-in duration-100">No response received yet.</div>;

  const isJson = typeof response.body === 'object' && response.body !== null;
  const formattedBody = isJson ? JSON.stringify(response.body, null, 2) : String(response.body || '');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedBody);
    toast.success('Copied body to clipboard!');
  };

  return (
    <div className="flex flex-col gap-4 text-xs h-full animate-in fade-in duration-100">
      {/* Metrics Row */}
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-zinc-800 pb-3 flex-shrink-0">
        <div className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getStatusClass(response.status)}`}>
          {response.status} {response.statusText || ''}
        </div>
        <div className="text-gray-500 dark:text-zinc-400">
          Duration: <span className="font-mono font-semibold">{response.duration !== undefined ? `${response.duration} ms` : '-'}</span>
        </div>
        <div className="text-gray-500 dark:text-zinc-400">
          Size: <span className="font-mono font-semibold">{formatSize(response.size)}</span>
        </div>
      </div>

      {/* Sub-tabs for Response Body vs Headers */}
      <div className="flex gap-4 border-b border-gray-50 dark:border-zinc-900 flex-shrink-0">
        <button
          onClick={() => setSubTab('body')}
          className={`pb-1.5 font-bold ${subTab === 'body' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Response Body
        </button>
        <button
          onClick={() => setSubTab('headers')}
          className={`pb-1.5 font-bold ${subTab === 'headers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Headers ({response.headers ? Object.keys(response.headers).length : 0})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {subTab === 'body' && (
          <div className="relative group min-h-[100px]">
            <button
              onClick={copyToClipboard}
              className="absolute right-2 top-2 px-2 py-1 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-[10px] text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Copy
            </button>
            <pre className="text-[11px] font-mono bg-gray-50 dark:bg-zinc-950 p-3 rounded-lg border border-gray-150 dark:border-zinc-900 overflow-auto max-h-[350px] leading-relaxed text-gray-700 dark:text-zinc-300">
              {formattedBody || <span className="italic text-gray-400">Response body is empty</span>}
            </pre>
          </div>
        )}

        {subTab === 'headers' && (
          <table className="info-table w-full">
            <tbody>
              {response.headers && Object.entries(response.headers).map(([k, v]) => (
                <tr key={k}>
                  <td className="font-semibold text-gray-400 w-1/3 py-1.5 pr-2 break-all">{k}</td>
                  <td className="font-mono text-gray-600 dark:text-zinc-300 py-1.5 break-all">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Main FlowEditor ───────────────────────────────────────────────────────────

const FlowEditor = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // Read global environment variables from Redux store
  const globals = useSelector((state) => {
    const ge = state.globalEnvironments;
    const activeUid = ge?.activeGlobalEnvironmentUid;
    if (!activeUid) return {};
    const env = ge?.globalEnvironments?.find((e) => e.uid === activeUid);
    if (!env?.variables) return {};
    const vars = {};
    env.variables.forEach((v) => {
      if (v.enabled !== false) {
        vars[v.name] = v.value;
      }
    });
    return vars;
  });

  // Read collection-level runtimeVariables from Redux store
  const collectionRuntimeVars = useSelector((state) => {
    const col = state.collections?.collections?.find((c) => c.uid === collection.uid);
    return col?.runtimeVariables || {};
  });

  const [steps, setSteps] = useState([]);
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [activeTab, setActiveTab] = useState('headers');
  const [showApiPicker, setShowApiPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState(null); // 'add' | 'edit'
  const [running, setRunning] = useState(false);
  const [stepStates, setStepStates] = useState({});
  const [stepResponses, setStepResponses] = useState({});

  const [showRunner, setShowRunner] = useState(false);
  const [runTrace, setRunTrace] = useState([]);
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [runnerFilter, setRunnerFilter] = useState('all');
  const [runnerTab, setRunnerTab] = useState('response');

  // Resizable list panel
  const DEFAULT_LIST_WIDTH = 380;
  const [listPanelWidth, setListPanelWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem('flow-editor-list-width'), 10);
    return !isNaN(saved) ? saved : DEFAULT_LIST_WIDTH;
  });
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(0);

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = listPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev) => {
      if (!isDraggingRef.current) return;
      const delta = ev.clientX - dragStartXRef.current;
      const newWidth = Math.max(220, Math.min(720, dragStartWidthRef.current + delta));
      setListPanelWidth(newWidth);
    };

    const onMouseUp = (ev) => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const delta = ev.clientX - dragStartXRef.current;
      const finalWidth = Math.max(220, Math.min(720, dragStartWidthRef.current + delta));
      localStorage.setItem('flow-editor-list-width', String(finalWidth));
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const stopRequestedRef = useRef(false);

  const handleStop = () => {
    stopRequestedRef.current = true;
    toast.error('Flow execution stopped by user');
  };

  const allItems = useMemo(() => flattenItems(collection.items || []), [collection.items]);

  const availableRequests = useMemo(() => {
    return allItems
      .filter((i) => i.type && ['http-request', 'graphql-request', 'flow-request'].includes(i.type))
      .map((req) => {
        const relativePath = path.relative(collection.pathname, req.pathname);
        return { ...req, relativePath };
      });
  }, [allItems, collection.pathname]);

  const lastSeenFlowRef = useRef(item.flow);

  // Load steps from store
  useEffect(() => {
    const flow = item.flow;
    if (flow && Array.isArray(flow.steps)) {
      setSteps(flow.steps);
      if (flow.steps.length > 0 && !selectedStepId) {
        setSelectedStepId(flow.steps[0].id);
      }
    } else {
      setSteps([]);
    }
    lastSeenFlowRef.current = flow;
  }, [item.uid]);

  // Synchronize steps when item.flow changes in the Redux store (e.g. edited by agent on disk)
  useEffect(() => {
    if (item.flow !== lastSeenFlowRef.current) {
      lastSeenFlowRef.current = item.flow;
      const flow = item.flow;
      if (flow && Array.isArray(flow.steps)) {
        setSteps(flow.steps);
        if (flow.steps.length > 0 && !selectedStepId) {
          setSelectedStepId(flow.steps[0].id);
        }
      } else {
        setSteps([]);
      }
    }
  }, [item.flow]);

  // ── Save action ──
  const doSave = useCallback(async (stepsToSave) => {
    try {
      const { ipcRenderer } = window;
      if (!ipcRenderer) return;

      const flow = { version: 2, steps: stepsToSave };

      await ipcRenderer.invoke('renderer:write-file-content', {
        pathname: item.pathname,
        content: JSON.stringify(flow, null, 2)
      });

      dispatch(updateItemFlow({
        itemUid: item.uid,
        collectionUid: collection.uid,
        flow
      }));

      toast.success('Flow saved!');
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    }
  }, [item.pathname, item.uid, collection.uid, dispatch]);

  const handleSave = useCallback(() => doSave(steps), [doSave, steps]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doSave(steps);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [doSave, steps]);

  // ── Step management ──
  const addStep = (req) => {
    const isFlow = req.type === 'flow-request';
    const newStep = {
      id: uuid(),
      name: req.name,
      requestPathname: req.relativePath,
      method: req.request?.method || (isFlow ? 'FLOW' : 'GET'),
      url: req.request?.url || '',
      enabled: true,
      isOverrideEnabled: false,
      // Pre-populate overrides with original request parameters
      override: {
        params: (req.request?.params || []).map((p) => ({ ...p })),
        headers: (req.request?.headers || []).map((h) => ({ ...h })),
        body: req.request?.body ? JSON.parse(JSON.stringify(req.request.body)) : { mode: 'none' }
      }
    };
    const updated = [...steps, newStep];
    setSteps(updated);
    setSelectedStepId(newStep.id);
    setActiveTab('headers');
  };

  const deleteStep = (stepId) => {
    const updated = steps.filter((s) => s.id !== stepId);
    setSteps(updated);
    if (selectedStepId === stepId) {
      setSelectedStepId(updated.length > 0 ? updated[updated.length - 1].id : null);
    }
    doSave(updated);
  };

  const toggleStepEnabled = (stepId) => {
    const updated = steps.map((s) => s.id === stepId ? { ...s, enabled: !s.enabled } : s);
    setSteps(updated);
    doSave(updated);
  };

  const updateStep = (updatedStep) => {
    setSteps((prev) => prev.map((s) => s.id === updatedStep.id ? updatedStep : s));
  };

  const handleScriptEdit = (value, type) => {
    if (!selectedStep) return;
    const updatedStep = {
      ...selectedStep,
      script: {
        ...(selectedStep.script || {}),
        [type]: value
      }
    };
    updateStep(updatedStep);
  };

  const changeStepApi = (stepId, req) => {
    const isFlow = req.type === 'flow-request';
    setSteps((prev) => prev.map((s) => s.id === stepId ? {
      ...s,
      name: req.name,
      requestPathname: req.relativePath,
      method: req.request?.method || (isFlow ? 'FLOW' : 'GET'),
      url: req.request?.url || '',
      override: {
        params: (req.request?.params || []).map((p) => ({ ...p })),
        headers: (req.request?.headers || []).map((h) => ({ ...h })),
        body: req.request?.body ? JSON.parse(JSON.stringify(req.request.body)) : { mode: 'none' }
      }
    } : s));
  };

  const handleResetStep = () => {
    if (!selectedStep || !selectedReqItem) return;
    const isFlow = selectedReqItem.type === 'flow-request';
    const updatedStep = {
      ...selectedStep,
      method: selectedReqItem.request?.method || (isFlow ? 'FLOW' : 'GET'),
      url: selectedReqItem.request?.url || '',
      override: {
        params: (selectedReqItem.request?.params || []).map((p) => ({ ...p })),
        headers: (selectedReqItem.request?.headers || []).map((h) => ({ ...h })),
        body: selectedReqItem.request?.body ? JSON.parse(JSON.stringify(selectedReqItem.request.body)) : { mode: 'none' }
      }
    };
    updateStep(updatedStep);
    const updatedSteps = steps.map((s) => s.id === updatedStep.id ? updatedStep : s);
    doSave(updatedSteps);
    toast.success('Đã reset cấu hình bước về mặc định!');
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId) || null;
  const selectedStepIndex = steps.findIndex((s) => s.id === selectedStepId);

  const selectedReqItem = useMemo(() => {
    if (!selectedStep?.requestPathname) return null;
    return allItems.find((i) => {
      const rel = path.relative(collection.pathname, i.pathname);
      return rel === selectedStep.requestPathname;
    }) || null;
  }, [selectedStep, allItems, collection.pathname]);

  const moveStep = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const updated = [...steps];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      setSteps(updated);
      doSave(updated);
    } else if (direction === 'down' && index < steps.length - 1) {
      const updated = [...steps];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      setSteps(updated);
      doSave(updated);
    }
  };

  // ── Run flow ──
  const renderRequestTab = (req) => {
    if (!req) return <div className="no-data">No request information</div>;

    const headers = req.headers || [];
    const bodyMode = req.body?.mode || 'none';
    let bodyContent = null;

    if (bodyMode === 'json' && req.body?.json) {
      bodyContent = req.body.json;
    } else if (bodyMode === 'text' && req.body?.text) {
      bodyContent = req.body.text;
    } else if (bodyMode === 'xml' && req.body?.xml) {
      bodyContent = req.body.xml;
    } else if (bodyMode === 'sparql' && req.body?.sparql) {
      bodyContent = req.body.sparql;
    } else if (bodyMode === 'formUrlEncoded' && req.body?.formUrlEncoded) {
      bodyContent = JSON.stringify(req.body.formUrlEncoded.filter((h) => h.name && h.enabled !== false), null, 2);
    } else if (bodyMode === 'multipartForm' && req.body?.multipartForm) {
      bodyContent = JSON.stringify(req.body.multipartForm.filter((h) => h.name && h.enabled !== false), null, 2);
    }

    return (
      <div className="tab-pane request-pane animate-in fade-in duration-100">
        <div className="request-section">
          <div className="section-title">Request URL</div>
          <pre className="url-pre">
            <span className={`method-badge-small ${req.method}`} style={{ backgroundColor: METHOD_COLORS[req.method] || '#6b7280' }}>
              {req.method}
            </span>
            <span className="url-text">{req.url || '(no url)'}</span>
          </pre>
        </div>

        {headers.filter((h) => h.name && h.enabled !== false).length > 0 && (
          <div className="request-section">
            <div className="section-title">Request Headers</div>
            <table className="headers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {headers.filter((h) => h.name && h.enabled !== false).map((h, idx) => (
                  <tr key={idx}>
                    <td>{h.name}</td>
                    <td>{h.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bodyContent && (
          <div className="request-section">
            <div className="section-title">Request Body ({bodyMode})</div>
            <pre className="body-pre">{bodyContent}</pre>
          </div>
        )}

        {!bodyContent && bodyMode !== 'none' && (
          <div className="request-section">
            <div className="section-title">Request Body</div>
            <div className="no-data">Body mode: {bodyMode} (Trống)</div>
          </div>
        )}
      </div>
    );
  };

  const buildExecutionPlan = useCallback((stepsList, depth = 0, parentPath = '') => {
    const plan = [];
    for (const step of stepsList) {
      if (!step.enabled) continue;

      const reqItem = allItems.find((i) => {
        const rel = path.relative(collection.pathname, i.pathname);
        return rel === step.requestPathname;
      });

      const stepPath = parentPath ? `${parentPath}/${step.name}` : step.name;

      if (!reqItem) {
        plan.push({
          id: step.id,
          name: step.name,
          step,
          reqItem: null,
          depth,
          parentPath,
          status: 'fail',
          error: new Error(`API not found: ${step.requestPathname}`)
        });
        continue;
      }

      if (reqItem.type === 'flow-request') {
        if (depth >= 3) {
          throw new Error(`Subflow "${step.name}" nesting exceeds the maximum limit of 3 layers!`);
        }
        plan.push({
          id: step.id,
          name: step.name,
          step,
          reqItem,
          depth,
          parentPath,
          isFlowGroup: true,
          status: 'pending'
        });

        const subSteps = reqItem.flow?.steps || [];
        const childPlan = buildExecutionPlan(subSteps, depth + 1, stepPath);
        plan.push(...childPlan);
      } else {
        plan.push({
          id: step.id,
          name: step.name,
          step,
          reqItem,
          depth,
          parentPath,
          status: 'pending'
        });
      }
    }
    return plan;
  }, [allItems, collection.pathname]);

  const ensureAllStepsLoaded = useCallback(async (initialSteps) => {
    const queue = [...initialSteps];
    const visited = new Set();
    let iterations = 0;
    const maxIterations = 100;
    const { loadRequestViaWorker } = require('providers/ReduxStore/slices/collections/actions');

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      const step = queue.shift();
      if (!step || !step.enabled) continue;

      const storeState = window.store?.getState?.();
      const latestCol = storeState?.collections?.collections?.find((c) => c.uid === collection.uid);
      const latestAllItems = latestCol ? flattenItems(latestCol.items || []) : allItems;

      let reqItem = latestAllItems.find((i) => {
        const rel = path.relative(collection.pathname, i.pathname);
        return rel === step.requestPathname;
      });

      if (!reqItem) continue;

      if (visited.has(reqItem.uid)) continue;
      visited.add(reqItem.uid);

      if (reqItem.partial) {
        try {
          await dispatch(loadRequestViaWorker({ collectionUid: collection.uid, pathname: reqItem.pathname }));

          let loaded = false;
          for (let check = 0; check < 30; check++) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            const updatedState = window.store?.getState?.();
            const updatedCol = updatedState?.collections?.collections?.find((c) => c.uid === collection.uid);
            const updatedAllItems = updatedCol ? flattenItems(updatedCol.items || []) : latestAllItems;
            const tempItem = updatedAllItems.find((i) => i.uid === reqItem.uid);
            if (tempItem && !tempItem.partial) {
              reqItem = tempItem;
              loaded = true;
              break;
            }
          }
          if (!loaded) {
            console.warn(`Timeout waiting for request file to load: ${reqItem.pathname}`);
          }
        } catch (e) {
          console.error('Failed to load partial request: ', e);
        }
      }

      if (reqItem && reqItem.type === 'flow-request') {
        const subSteps = reqItem.flow?.steps || [];
        queue.push(...subSteps);
      }
    }
  }, [allItems, collection.pathname, dispatch]);

  const handleRun = async () => {
    if (running || steps.length === 0) return;
    setRunning(true);
    stopRequestedRef.current = false;
    setShowRunner(true);
    setStepStates({});
    setStepResponses({});

    const { loadRequestViaWorker } = require('providers/ReduxStore/slices/collections/actions');

    try {
      // Step 1: Recursively ensure all partial requests/subflows are fully loaded from disk
      await ensureAllStepsLoaded(steps);

      const activeEnvironment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
      const envVars = {};
      if (activeEnvironment && activeEnvironment.variables) {
        activeEnvironment.variables.forEach((v) => {
          if (v.enabled !== false) {
            envVars[v.name] = v.value;
          }
        });
      }

      // Step 2: Build the execution plan
      const plan = buildExecutionPlan(steps);
      setRunTrace(plan);
      setSelectedTraceId(plan[0]?.id || null);

      const stepOutputs = {};

      const resolveTemplate = (str, ctx) => interpolate(str, ctx);
      const resolveObject = (obj, ctx) => interpolateObject(obj, ctx);

      const updatePlanItem = (id, updates) => {
        setRunTrace((prev) =>
          prev.map((item) => {
            if (item.id === id) {
              if (updates.status !== undefined && item.step) {
                setStepStates((prevStates) => ({ ...prevStates, [item.step.id]: updates.status }));
              }
              if (updates.response !== undefined && item.step) {
                setStepResponses((prevResponses) => ({ ...prevResponses, [item.step.id]: updates.response }));
              }
              return { ...item, ...updates };
            }
            return item;
          })
        );
      };

      for (let idx = 0; idx < plan.length; idx++) {
        if (stopRequestedRef.current) {
          for (let s = idx; s < plan.length; s++) {
            if (plan[s].status === 'pending' || plan[s].status === 'running') {
              updatePlanItem(plan[s].id, { status: 'skipped' });
            }
          }
          throw new Error('Flow stopped by user');
        }

        const item = plan[idx];

        if (item.error) {
          updatePlanItem(item.id, { status: 'fail' });
          throw item.error;
        }

        if (item.isFlowGroup) {
          updatePlanItem(item.id, { status: 'running' });
          updatePlanItem(item.id, { status: 'success' });
          continue;
        }

        updatePlanItem(item.id, { status: 'running' });

        const reqItem = item.reqItem;
        const clonedItem = JSON.parse(JSON.stringify(reqItem));
        delete clonedItem.draft;

        // Fetch the latest runtimeVariables from Redux store at each step
        // so that dynamic variables set by previous steps' scripts are inherited.
        const storeState = window.store?.getState?.();
        const latestCol = storeState?.collections?.collections?.find((c) => c.uid === collection.uid);
        const latestRuntimeVars = latestCol?.runtimeVariables || {};

        const latestActiveEnv = latestCol ? findEnvironmentInCollection(latestCol, latestCol.activeEnvironmentUid) : null;
        const latestEnvVars = {};
        if (latestActiveEnv && latestActiveEnv.variables) {
          latestActiveEnv.variables.forEach((v) => {
            if (v.enabled !== false) {
              latestEnvVars[v.name] = v.value;
            }
          });
        }

        const resolutionContext = {
          ...globals,
          ...latestEnvVars,
          ...latestRuntimeVars,
          process: {
            env: collectionRuntimeVars?.process?.env || {}
          },
          steps: stepOutputs
        };
        const overrides = item.step.isOverrideEnabled ? (item.step.override || {}) : {};
        const resolvedOverrides = resolveObject(overrides, resolutionContext);

        clonedItem.request = clonedItem.request || {};
        if (item.step.url !== undefined) {
          clonedItem.request.url = item.step.url;
        }
        if (item.step.method !== undefined) {
          clonedItem.request.method = item.step.method;
        }
        if (resolvedOverrides.headers) {
          clonedItem.request.headers = resolvedOverrides.headers;
        }
        if (resolvedOverrides.params) {
          clonedItem.request.params = resolvedOverrides.params;
        }
        if (resolvedOverrides.body) {
          clonedItem.request.body = resolvedOverrides.body;
        }
        if (item.step.script) {
          clonedItem.request.script = item.step.script;
        }
        if (item.step.tests) {
          clonedItem.request.tests = item.step.tests;
        }
        if (item.step.vars) {
          clonedItem.request.vars = item.step.vars;
        }
        if (item.step.assertions) {
          clonedItem.request.assertions = item.step.assertions;
        }

        const resolvedRequest = resolveObject(clonedItem.request, resolutionContext);

        const urlParts = (resolvedRequest.url || '').split('?');
        const urlQueryParams = [];
        if (urlParts[1]) {
          const searchParams = new URLSearchParams(urlParts[1]);
          for (const [name, value] of searchParams.entries()) {
            urlQueryParams.push({ name, value, type: 'query', enabled: true });
          }
        }

        const queryParams = resolvedRequest.params || [];
        const allQueryParams = [...urlQueryParams];

        for (const p of queryParams) {
          if (p.type === 'query' || !p.type) {
            const existing = allQueryParams.find((x) => x.name === p.name);
            if (existing) {
              existing.value = p.value;
              existing.enabled = p.enabled;
            } else {
              allQueryParams.push(p);
            }
          }
        }

        const queryStr = allQueryParams
          .filter((p) => p.enabled !== false && p.name)
          .map((p) => `${p.name}=${p.value}`)
          .join('&');

        if (queryStr) {
          resolvedRequest.url = urlParts[0] + '?' + queryStr;
        } else {
          resolvedRequest.url = urlParts[0];
        }

        clonedItem.request = resolvedRequest;

        try {
          const { sendRequest } = require('providers/ReduxStore/slices/collections/actions');
          await dispatch(sendRequest(clonedItem, collection.uid));

          let response = null;
          let testResults = [];
          let preRequestTestResults = [];
          let postResponseTestResults = [];
          let assertionResults = [];
          const storeState = window.store?.getState?.();
          if (storeState) {
            const col = storeState.collections.collections.find((c) => c.uid === collection.uid);
            if (col) {
              const it = flattenItems(col.items).find((x) => x.uid === reqItem.uid);
              if (it) {
                response = it.response;
                testResults = it.testResults || [];
                preRequestTestResults = it.preRequestTestResults || [];
                postResponseTestResults = it.postResponseTestResults || [];
                assertionResults = it.assertionResults || [];
              }
            }
          }

          if (!response) {
            const failedRes = {
              status: 'Error',
              statusText: 'No response received',
              duration: '-',
              size: 0,
              body: 'Step did not return response.'
            };
            updatePlanItem(item.id, { status: 'fail', response: failedRes, resolvedRequest });
            throw new Error(`Step "${item.name}": did not return response`);
          }

          if (response.isError) {
            const failedRes = {
              status: response.status || 'Connection Error',
              statusText: response.error || 'Request failed',
              duration: response.duration || 0,
              size: response.size || 0,
              body: response.data || response.error || 'Request failed',
              headers: response.headers || {}
            };
            updatePlanItem(item.id, {
              status: 'fail',
              response: failedRes,
              testResults,
              preRequestTestResults,
              postResponseTestResults,
              assertionResults,
              resolvedRequest
            });
            throw new Error(`Step "${item.name}": ${response.error || 'request failed'}`);
          }

          const ctxResponse = {
            status: response.status,
            headers: response.headers,
            body: response.data,
            data: response.data,
            duration: response.duration,
            size: response.size
          };

          stepOutputs[item.name] = ctxResponse;
          stepOutputs[`step${idx + 1}`] = ctxResponse;

          const anyTestFailed
            = (testResults || []).some((t) => t.status !== 'pass')
              || (preRequestTestResults || []).some((t) => t.status !== 'pass')
              || (postResponseTestResults || []).some((t) => t.status !== 'pass')
              || (assertionResults || []).some((t) => t.status !== 'pass');

          if (anyTestFailed) {
            updatePlanItem(item.id, {
              status: 'fail',
              response: ctxResponse,
              testResults,
              preRequestTestResults,
              postResponseTestResults,
              assertionResults,
              resolvedRequest
            });
            throw new Error(`Step "${item.name}": test assertions failed`);
          }

          updatePlanItem(item.id, {
            status: 'success',
            response: ctxResponse,
            testResults,
            preRequestTestResults,
            postResponseTestResults,
            assertionResults,
            resolvedRequest
          });
        } catch (err) {
          const currentPathParts = item.parentPath ? item.parentPath.split('/') : [];
          let tempPath = '';
          for (const part of currentPathParts) {
            tempPath = tempPath ? `${tempPath}/${part}` : part;
            const parentGroup = plan.find(
              (p) => p.isFlowGroup && (p.parentPath ? `${p.parentPath}/${p.name}` : p.name) === tempPath
            );
            if (parentGroup) {
              updatePlanItem(parentGroup.id, { status: 'fail' });
            }
          }

          for (let s = idx + 1; s < plan.length; s++) {
            updatePlanItem(plan[s].id, { status: 'skipped' });
          }
          throw err;
        }
      }
      toast.success('Flow executed successfully!');
    } catch (err) {
      toast.error(`Flow failed: ${err.message}`);
      setRunTrace((prev) =>
        prev.map((t) => {
          if (t.status === 'running') {
            return { ...t, status: 'fail' };
          }
          if (t.status === 'pending') {
            return { ...t, status: 'skipped' };
          }
          return t;
        })
      );
    } finally {
      setRunning(false);
    }
  };

  const handleRunSingleStep = async (stepToRun) => {
    if (running) return;
    setRunning(true);
    setStepStates((prev) => ({ ...prev, [stepToRun.id]: 'running' }));

    const { loadRequestViaWorker } = require('providers/ReduxStore/slices/collections/actions');

    try {
      await ensureAllStepsLoaded([stepToRun]);

      const storeState = window.store?.getState?.();
      const latestCol = storeState?.collections?.collections?.find((c) => c.uid === collection.uid);
      const latestAllItems = latestCol ? flattenItems(latestCol.items || []) : allItems;

      let reqItem = latestAllItems.find((i) => {
        const rel = path.relative(collection.pathname, i.pathname);
        return rel === stepToRun.requestPathname;
      });

      if (!reqItem) {
        throw new Error(`API Request not found for: ${stepToRun.requestPathname}`);
      }

      if (reqItem.partial) {
        await dispatch(loadRequestViaWorker({ collectionUid: collection.uid, pathname: reqItem.pathname }));
        let loaded = false;
        for (let check = 0; check < 30; check++) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          const updatedState = window.store?.getState?.();
          const updatedCol = updatedState?.collections?.collections?.find((c) => c.uid === collection.uid);
          const updatedAllItems = updatedCol ? flattenItems(updatedCol.items || []) : latestAllItems;
          const tempItem = updatedAllItems.find((i) => i.uid === reqItem.uid);
          if (tempItem && !tempItem.partial) {
            reqItem = tempItem;
            loaded = true;
            break;
          }
        }
        if (!loaded) {
          throw new Error(`Timeout loading request details for: ${reqItem.pathname}`);
        }
      }

      const latestRuntimeVars = latestCol?.runtimeVariables || {};
      const latestActiveEnv = latestCol ? findEnvironmentInCollection(latestCol, latestCol.activeEnvironmentUid) : null;
      const latestEnvVars = {};
      if (latestActiveEnv && latestActiveEnv.variables) {
        latestActiveEnv.variables.forEach((v) => {
          if (v.enabled !== false) {
            latestEnvVars[v.name] = v.value;
          }
        });
      }

      const stepOutputs = {};
      steps.forEach((s, idx) => {
        const resp = stepResponses[s.id];
        if (resp) {
          stepOutputs[s.name] = resp;
          stepOutputs[`step${idx + 1}`] = resp;
        }
      });

      const resolutionContext = {
        ...globals,
        ...latestEnvVars,
        ...latestRuntimeVars,
        process: {
          env: collectionRuntimeVars?.process?.env || {}
        },
        steps: stepOutputs
      };

      const resolveObject = (obj, ctx) => interpolateObject(obj, ctx);
      const overrides = stepToRun.isOverrideEnabled ? (stepToRun.override || {}) : {};
      const resolvedOverrides = resolveObject(overrides, resolutionContext);

      const clonedItem = JSON.parse(JSON.stringify(reqItem));
      delete clonedItem.draft;

      clonedItem.request = clonedItem.request || {};
      if (stepToRun.url !== undefined) {
        clonedItem.request.url = stepToRun.url;
      }
      if (stepToRun.method !== undefined) {
        clonedItem.request.method = stepToRun.method;
      }
      if (resolvedOverrides.headers) {
        clonedItem.request.headers = resolvedOverrides.headers;
      }
      if (resolvedOverrides.params) {
        clonedItem.request.params = resolvedOverrides.params;
      }
      if (resolvedOverrides.body) {
        clonedItem.request.body = resolvedOverrides.body;
      }
      if (stepToRun.script) {
        clonedItem.request.script = stepToRun.script;
      }
      if (stepToRun.tests) {
        clonedItem.request.tests = stepToRun.tests;
      }
      if (stepToRun.vars) {
        clonedItem.request.vars = stepToRun.vars;
      }
      if (stepToRun.assertions) {
        clonedItem.request.assertions = stepToRun.assertions;
      }

      const resolvedRequest = resolveObject(clonedItem.request, resolutionContext);

      const urlParts = (resolvedRequest.url || '').split('?');
      const urlQueryParams = [];
      if (urlParts[1]) {
        const searchParams = new URLSearchParams(urlParts[1]);
        for (const [name, value] of searchParams.entries()) {
          urlQueryParams.push({ name, value, type: 'query', enabled: true });
        }
      }

      const queryParams = resolvedRequest.params || [];
      const allQueryParams = [...urlQueryParams];

      for (const p of queryParams) {
        if (p.type === 'query' || !p.type) {
          const existing = allQueryParams.find((x) => x.name === p.name);
          if (existing) {
            existing.value = p.value;
            existing.enabled = p.enabled;
          } else {
            allQueryParams.push(p);
          }
        }
      }

      const queryStr = allQueryParams
        .filter((p) => p.enabled !== false && p.name)
        .map((p) => `${p.name}=${p.value}`)
        .join('&');

      if (queryStr) {
        resolvedRequest.url = urlParts[0] + '?' + queryStr;
      } else {
        resolvedRequest.url = urlParts[0];
      }

      clonedItem.request = resolvedRequest;

      const { sendRequest } = require('providers/ReduxStore/slices/collections/actions');
      await dispatch(sendRequest(clonedItem, collection.uid));

      let response = null;
      const finalState = window.store?.getState?.();
      if (finalState) {
        const col = finalState.collections.collections.find((c) => c.uid === collection.uid);
        if (col) {
          const it = flattenItems(col.items).find((x) => x.uid === reqItem.uid);
          if (it) {
            response = it.response;
          }
        }
      }

      if (!response) {
        throw new Error('No response received');
      }

      if (response.isError) {
        const failedRes = {
          status: response.status || 'Connection Error',
          statusText: response.error || 'Request failed',
          duration: response.duration || 0,
          size: response.size || 0,
          body: response.data || response.error || 'Request failed',
          headers: response.headers || {}
        };
        setStepResponses((prev) => ({ ...prev, [stepToRun.id]: failedRes }));
        setStepStates((prev) => ({ ...prev, [stepToRun.id]: 'fail' }));
        toast.error(`Step "${stepToRun.name}" failed: ${response.error || 'request failed'}`);
      } else {
        const ctxResponse = {
          status: response.status,
          headers: response.headers,
          body: response.data,
          data: response.data,
          duration: response.duration,
          size: response.size
        };
        setStepResponses((prev) => ({ ...prev, [stepToRun.id]: ctxResponse }));
        setStepStates((prev) => ({ ...prev, [stepToRun.id]: 'success' }));
        setSelectedStepId(stepToRun.id);
        setActiveTab('response');
        toast.success(`Step "${stepToRun.name}" executed successfully!`);
      }
    } catch (err) {
      setStepStates((prev) => ({ ...prev, [stepToRun.id]: 'fail' }));
      toast.error(`Error running step: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  // Determine configuration tabs list dynamically based on response presence
  const tabsConfig = useMemo(() => {
    if (!selectedStep) return [];

    // Helper to get property from selectedReqItem (draft or raw)
    const getReqProperty = (pathStr) => {
      if (!selectedReqItem) return null;
      const obj = selectedReqItem.draft ? selectedReqItem.draft : selectedReqItem;
      return pathStr.split('.').reduce((acc, part) => acc?.[part], obj);
    };

    const base = [
      { key: 'headers', label: 'Headers', count: (selectedStep.override?.headers || []).filter((h) => h.name).length },
      { key: 'params', label: 'Params', count: (selectedStep.override?.params || []).filter((p) => p.name).length },
      { key: 'body', label: 'Body' }
    ];

    if (selectedReqItem) {
      // Auth
      const auth = getReqProperty('request.auth');
      const hasAuth = auth && auth.mode && auth.mode !== 'none';
      base.push({ key: 'auth', label: 'Auth', active: hasAuth });

      // Vars
      const reqVars = getReqProperty('request.vars.req') || [];
      const resVars = getReqProperty('request.vars.res') || [];
      const varsCount = (Array.isArray(reqVars) ? reqVars : []).filter((v) => v.enabled && v.name).length
        + (Array.isArray(resVars) ? resVars : []).filter((v) => v.enabled && v.name).length;
      base.push({ key: 'vars', label: 'Vars', count: varsCount });

      // Script
      const script = getReqProperty('request.script') || {};
      const hasScript = (script.req && script.req.trim().length > 0) || (script.res && script.res.trim().length > 0);
      base.push({ key: 'script', label: 'Script', active: hasScript });

      // Assertions
      const assertions = getReqProperty('request.assertions') || [];
      const assertionsCount = (Array.isArray(assertions) ? assertions : []).filter((a) => a.enabled && a.lhsExpr).length;
      base.push({ key: 'assert', label: 'Assert', count: assertionsCount });

      // Tests
      const testsScript = getReqProperty('request.tests');
      const hasTestsScript = typeof testsScript === 'string' && testsScript.trim().length > 0;
      base.push({ key: 'tests', label: 'Tests', active: hasTestsScript });

      // Docs
      const docs = getReqProperty('request.docs');
      const hasDocs = typeof docs === 'string' && docs.trim().length > 0;
      base.push({ key: 'docs', label: 'Docs', active: hasDocs });
    }

    base.push({ key: 'info', label: 'Info' });

    if (stepResponses[selectedStep.id]) {
      base.push({ key: 'response', label: 'Response' });
    }

    return base;
  }, [selectedStep, selectedReqItem, stepResponses]);

  // Handle switching tabs dynamically if response is received and active tab is none of the above
  useEffect(() => {
    if (selectedStepId && stepResponses[selectedStepId] && activeTab === 'headers') {
      // Auto switch or keep current is fine. No force redirect to let users explore.
    }
  }, [selectedStepId, stepResponses]);

  return (
    <StyledWrapper>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <IconRoute size={16} color="#6366f1" />
          <span className="toolbar-title">{item.name}</span>
          <span className="toolbar-count">{steps.length} API Step{steps.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="toolbar-right">
          <button className="toolbar-btn btn-ghost" onClick={handleSave}>
            <IconDeviceFloppy size={13} />
            Save
            <kbd>⌘S</kbd>
          </button>
          {showRunner && (
            <button className="toolbar-btn btn-ghost" onClick={() => setShowRunner(false)}>
              <IconSettings size={13} />
              Editor
            </button>
          )}
          {!showRunner && runTrace.length > 0 && (
            <button className="toolbar-btn btn-ghost" onClick={() => setShowRunner(true)}>
              <IconRoute size={13} />
              Results
            </button>
          )}
          {running ? (
            <button
              className="toolbar-btn"
              onClick={handleStop}
              style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c', color: '#fff' }}
            >
              <IconX size={13} />
              Stop
            </button>
          ) : (
            <button className="toolbar-btn btn-primary" onClick={handleRun} disabled={steps.length === 0}>
              <IconPlayerPlay size={13} />
              Run
            </button>
          )}
        </div>
      </div>

      {/* Main UI body */}
      <div className="body">
        {!showRunner && (
          <div
            className={`list-panel ${selectedStepId ? 'with-panel' : ''}`}
            style={selectedStepId ? { flex: `0 0 ${listPanelWidth}px`, width: listPanelWidth } : undefined}
          >
            <div className="list-header">
              <span style={{ textAlign: 'right', paddingRight: 8 }}>#</span>
              <span style={{ textAlign: 'center' }} />
              <span style={{ textAlign: 'center' }} />
              <span>Method</span>
              <span>Name</span>
              <span />
              <span />
              <span />
            </div>

            <div className="list-body">
              {steps.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
                  No steps configured yet. Add a new step to build your API flow.
                </div>
              )}
              {steps.map((step, idx) => {
                const state = stepStates[step.id];
                const isSelected = selectedStepId === step.id;
                const method = step.method || 'GET';
                const color = METHOD_COLORS[method] || '#6b7280';

                return (
                  <div
                    key={step.id}
                    onClick={() => {
                      setSelectedStepId(step.id);
                      setShowRunner(false);
                    }}
                    className={`step-row ${isSelected && !showRunner ? 'selected' : ''} ${state ? `state-${state}` : ''}`}
                  >
                    {/* # */}
                    <span className="row-num">{idx + 1}</span>

                    {/* Up/Down Arrows */}
                    <div className="row-arrows">
                      <button
                        className="arrow-btn"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(idx, 'up');
                        }}
                      >
                        <IconArrowUp size={11} />
                      </button>
                      <button
                        className="arrow-btn"
                        disabled={idx === steps.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(idx, 'down');
                        }}
                      >
                        <IconArrowDown size={11} />
                      </button>
                    </div>

                    {/* Checkbox (enabled) */}
                    <div
                      className="row-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStepEnabled(step.id);
                      }}
                    >
                      <div className={`checkbox ${step.enabled ? 'checked' : ''}`}>
                        {step.enabled && <IconCheck size={11} color="white" strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Method */}
                    <div className="row-method">
                      <span className={`method-badge ${method}`} style={{ backgroundColor: color }}>
                        {method}
                      </span>
                    </div>

                    {/* Name */}
                    <div className={`row-name ${!step.enabled ? 'disabled' : ''}`}>{step.name}</div>

                    {/* Status */}
                    <div className="row-status-col">
                      {state && (
                        <div className="status-icon">
                          {state === 'running' && <IconLoader2 size={15} className="animate-spin text-blue-500" />}
                          {state === 'success' && <IconCircleCheck size={15} className="text-green-500" />}
                          {state === 'fail' && <IconCircleX size={15} className="text-red-500" />}
                        </div>
                      )}
                    </div>

                    {/* Play Button */}
                    <div
                      className="row-play-col"
                      title="Run this step individually"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunSingleStep(step);
                      }}
                    >
                      <IconPlayerPlay size={14} />
                    </div>

                    {/* Delete Button */}
                    <div
                      className="row-delete-col"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStep(step.id);
                      }}
                    >
                      <IconTrash size={14} />
                    </div>
                  </div>
                );
              })}

              {/* Add Step row */}
              <div
                className="add-step-row"
                onClick={() => {
                  setPickerMode('add');
                  setShowApiPicker(true);
                }}
              >
                <IconPlus size={14} />
                Add step
              </div>
            </div>

            {/* Drag handle for resizing list panel */}
            {selectedStepId && (
              <div
                className="list-panel-resize-handle"
                onMouseDown={handleResizeMouseDown}
                title="Drag to resize"
              />
            )}
          </div>
        )}

        {showRunner ? (
          <div className="runner-container animate-in fade-in duration-150" style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {/* Left Pane: Steps Tree */}
            <div className="runner-left-panel">
              <div className="runner-left-header">
                <div className="runner-filters">
                  <span className="filter-label">Filter by:</span>
                  {['all', 'passed', 'failed', 'skipped'].map((f) => {
                    const count = runTrace.filter((t) => {
                      if (t.isFlowGroup) return false;
                      if (f === 'all') return true;
                      if (f === 'passed') return t.status === 'success';
                      if (f === 'failed') return t.status === 'fail';
                      if (f === 'skipped') return t.status === 'skipped' || t.status === 'pending';
                      return false;
                    }).length;
                    return (
                      <button
                        key={f}
                        className={`filter-btn ${runnerFilter === f ? 'active' : ''}`}
                        onClick={() => setRunnerFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)} <span className="filter-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="runner-left-body">
                {(() => {
                  const stepNumbering = {};
                  const indices = [];
                  for (const t of runTrace) {
                    const d = t.depth || 0;
                    indices[d] = (indices[d] || 0) + 1;
                    indices.length = d + 1;
                    stepNumbering[t.id] = indices.join('.');
                  }

                  const filteredTrace = runTrace.filter((item) => {
                    if (item.isFlowGroup) return true;
                    if (runnerFilter === 'all') return true;
                    if (runnerFilter === 'passed') return item.status === 'success';
                    if (runnerFilter === 'failed') return item.status === 'fail';
                    if (runnerFilter === 'skipped') return item.status === 'skipped' || item.status === 'pending';
                    return true;
                  });

                  if (filteredTrace.length === 0) {
                    return <div className="no-data">No steps match the filter</div>;
                  }

                  return filteredTrace.map((item) => {
                    const isTraceSelected = selectedTraceId === item.id;
                    const failedPreRequest = (item.preRequestTestResults || []).filter((t) => t.status !== 'pass');
                    const failedPostResponse = (item.postResponseTestResults || []).filter((t) => t.status !== 'pass');
                    const failedTestScripts = (item.testResults || []).filter((t) => t.status !== 'pass');
                    const failedAssertions = (item.assertionResults || []).filter((t) => t.status !== 'pass');

                    const hasFailedTests
                      = failedPreRequest.length > 0
                        || failedPostResponse.length > 0
                        || failedTestScripts.length > 0
                        || failedAssertions.length > 0;

                    if (item.isFlowGroup) {
                      return (
                        <div
                          key={item.id}
                          className={`runner-step-row flow-group-row ${isTraceSelected ? 'selected' : ''} ${item.status}`}
                          style={{ paddingLeft: `${item.depth * 20 + 16}px`, position: 'relative' }}
                          onClick={() => setSelectedTraceId(item.id)}
                        >
                          {Array.from({ length: item.depth }).map((_, dIdx) => (
                            <span
                              key={dIdx}
                              className={`tree-connector ${dIdx === item.depth - 1 ? 'last' : ''}`}
                              style={{ left: `${dIdx * 20 + 16}px` }}
                            />
                          ))}

                          {/* Status Icon */}
                          <div className="status-icon">
                            {item.status === 'running' && <IconLoader2 size={15} className="animate-spin text-blue-500" />}
                            {item.status === 'success' && <IconCircleCheck size={15} className="text-green-500" />}
                            {item.status === 'fail' && <IconCircleX size={15} className="text-red-500" />}
                            {item.status === 'skipped' && <span className="skipped-dot" />}
                            {item.status === 'pending' && <span className="pending-dot" />}
                          </div>

                          {/* Index Number */}
                          <span className="runner-step-num">
                            {stepNumbering[item.id]}.
                          </span>

                          {/* Method Badge */}
                          <span className="method-badge FLOW" style={{ backgroundColor: METHOD_COLORS.FLOW || '#6366f1' }}>
                            FLOW
                          </span>

                          {/* Name */}
                          <span className="step-name truncate flex-1 font-semibold" style={{ color: '#6366f1' }}>
                            {item.name}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id} className="runner-step-wrapper">
                        <div
                          className={`runner-step-row ${isTraceSelected ? 'selected' : ''} ${item.status}`}
                          style={{ paddingLeft: `${item.depth * 20 + 16}px`, position: 'relative' }}
                          onClick={() => setSelectedTraceId(item.id)}
                        >
                          {Array.from({ length: item.depth }).map((_, dIdx) => (
                            <span
                              key={dIdx}
                              className={`tree-connector ${dIdx === item.depth - 1 ? 'last' : ''}`}
                              style={{ left: `${dIdx * 20 + 16}px` }}
                            />
                          ))}

                          {/* Status Icon */}
                          <div className="status-icon">
                            {item.status === 'running' && <IconLoader2 size={15} className="animate-spin text-blue-500" />}
                            {item.status === 'success' && <IconCircleCheck size={15} className="text-green-500" />}
                            {item.status === 'fail' && <IconCircleX size={15} className="text-red-500" />}
                            {item.status === 'skipped' && <span className="skipped-dot" />}
                            {item.status === 'pending' && <span className="pending-dot" />}
                          </div>

                          {/* Index Number */}
                          <span className="runner-step-num">
                            {stepNumbering[item.id]}.
                          </span>

                          {/* Method Badge */}
                          <span className={`method-badge ${item.step.method}`} style={{ backgroundColor: METHOD_COLORS[item.step.method] || '#6b7280' }}>
                            {item.step.method}
                          </span>

                          {/* Name */}
                          <span className="step-name truncate flex-1">{item.name}</span>

                          {/* Status Code Badge */}
                          {item.response && (
                            <span className={`status-code ${item.status === 'success' ? 'success' : 'fail'}`}>
                              {item.response.status}
                            </span>
                          )}
                        </div>
                        {/* Test results nested under step */}
                        {hasFailedTests && (
                          <div className="runner-step-tests" style={{ paddingLeft: `${(item.depth * 20) + 36}px` }}>
                            {failedPreRequest.map((t, tIdx) => (
                              <div key={`pre-${tIdx}`} className={`test-result-row ${t.status}`}>
                                <span className="test-status-icon">✗</span>
                                <span className="test-name truncate flex-1">[Pre-Request] {t.description}</span>
                              </div>
                            ))}
                            {failedPostResponse.map((t, tIdx) => (
                              <div key={`post-${tIdx}`} className={`test-result-row ${t.status}`}>
                                <span className="test-status-icon">✗</span>
                                <span className="test-name truncate flex-1">[Post-Response] {t.description}</span>
                              </div>
                            ))}
                            {failedTestScripts.map((t, tIdx) => (
                              <div key={`test-${tIdx}`} className={`test-result-row ${t.status}`}>
                                <span className="test-status-icon">✗</span>
                                <span className="test-name truncate flex-1">{t.description}</span>
                              </div>
                            ))}
                            {failedAssertions.map((t, tIdx) => (
                              <div key={`assert-${tIdx}`} className={`test-result-row ${t.status}`}>
                                <span className="test-status-icon">✗</span>
                                <span className="test-name truncate flex-1">[Assertion] {t.lhsExpr}: {t.rhsExpr}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Pane: Selected Trace details */}
            <div className="runner-right-panel">
              {(() => {
                const selectedTraceItem = runTrace.find((t) => t.id === selectedTraceId);
                if (!selectedTraceItem) {
                  return (
                    <div className="empty-panel">
                      <div className="ep-icon">🔍</div>
                      <p>Select a step on the left to view response details & timeline.</p>
                    </div>
                  );
                }

                const res = selectedTraceItem.response;
                const preRequestTests = selectedTraceItem.preRequestTestResults || [];
                const postResponseTests = selectedTraceItem.postResponseTestResults || [];
                const testScripts = selectedTraceItem.testResults || [];
                const assertions = selectedTraceItem.assertionResults || [];
                const totalTestsCount = preRequestTests.length + postResponseTests.length + testScripts.length + assertions.length;

                return (
                  <div className="runner-detail-view">
                    <div className="trace-header">
                      <div className="trace-title-row">
                        <span className="trace-name">{selectedTraceItem.stepPath || selectedTraceItem.step.name}</span>
                        {res && (
                          <div className="trace-meta">
                            <span className={`status-tag ${selectedTraceItem.status}`}>
                              {res.status} {res.statusText}
                            </span>
                            <span className="meta-item">{res.duration}ms</span>
                            <span className="meta-item">{res.size} B</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="trace-tabs">
                      {[
                        { key: 'request', label: 'Request' },
                        { key: 'response', label: 'Response' },
                        { key: 'headers', label: 'Headers' },
                        { key: 'timeline', label: 'Timeline' },
                        { key: 'tests', label: `Tests (${totalTestsCount})` }
                      ].map((t) => (
                        <button
                          key={t.key}
                          className={`trace-tab ${runnerTab === t.key ? 'active' : ''}`}
                          onClick={() => setRunnerTab(t.key)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab Content */}
                    <div className="trace-body">
                      {runnerTab === 'request' && renderRequestTab(selectedTraceItem.resolvedRequest)}

                      {runnerTab === 'response' && (
                        <div className="tab-pane response-pane">
                          {res ? (
                            <pre className="response-pre">
                              {typeof res.body === 'object' ? JSON.stringify(res.body, null, 2) : String(res.body)}
                            </pre>
                          ) : (
                            <div className="no-data">No response yet</div>
                          )}
                        </div>
                      )}

                      {runnerTab === 'headers' && (
                        <div className="tab-pane headers-pane">
                          {res && res.headers ? (
                            <table className="headers-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(res.headers).map(([k, v]) => (
                                  <tr key={k}>
                                    <td>{k}</td>
                                    <td>{v}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="no-data">No response headers</div>
                          )}
                        </div>
                      )}

                      {runnerTab === 'timeline' && (
                        <div className="tab-pane timeline-pane">
                          {selectedTraceItem.timeline && selectedTraceItem.timeline.length > 0 ? (
                            <div className="timeline-list">
                              {selectedTraceItem.timeline.map((line, lIdx) => (
                                <div key={lIdx} className="timeline-line">
                                  {line}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="no-data">No timeline information</div>
                          )}
                        </div>
                      )}

                      {runnerTab === 'tests' && (
                        <div className="tab-pane tests-pane">
                          {totalTestsCount > 0 ? (
                            <div className="tests-list">
                              {preRequestTests.map((t, idx) => (
                                <div key={`pre-${idx}`} className={`test-item ${t.status}`}>
                                  <span className="icon">{t.status === 'pass' ? '✓' : '✗'}</span>
                                  <div className="details">
                                    <div className="description">[Pre-Request] {t.description}</div>
                                    {t.error && <div className="error">{t.error}</div>}
                                  </div>
                                </div>
                              ))}
                              {postResponseTests.map((t, idx) => (
                                <div key={`post-${idx}`} className={`test-item ${t.status}`}>
                                  <span className="icon">{t.status === 'pass' ? '✓' : '✗'}</span>
                                  <div className="details">
                                    <div className="description">[Post-Response] {t.description}</div>
                                    {t.error && <div className="error">{t.error}</div>}
                                  </div>
                                </div>
                              ))}
                              {testScripts.map((t, idx) => (
                                <div key={`test-${idx}`} className={`test-item ${t.status}`}>
                                  <span className="icon">{t.status === 'pass' ? '✓' : '✗'}</span>
                                  <div className="details">
                                    <div className="description">{t.description}</div>
                                    {t.error && <div className="error">{t.error}</div>}
                                  </div>
                                </div>
                              ))}
                              {assertions.map((t, idx) => (
                                <div key={`assert-${idx}`} className={`test-item ${t.status}`}>
                                  <span className="icon">{t.status === 'pass' ? '✓' : '✗'}</span>
                                  <div className="details">
                                    <div className="description">[Assertion] {t.lhsExpr}: {t.rhsExpr}</div>
                                    {t.error && <div className="error">{t.error}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="no-data">No test cases executed</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <>
            {/* Right side config panel */}
            {selectedStepId && selectedStep ? (
              <div className="config-panel" style={{ position: 'relative' }}>
                <div className="config-header">
                  <div className="config-title flex items-center gap-2">
                    <input
                      type="text"
                      className="finput font-bold text-gray-900 dark:text-gray-100"
                      style={{ fontSize: '14px', border: '1px solid transparent', background: 'transparent', padding: '2px 4px', width: '250px', outline: 'none' }}
                      value={selectedStep.name || ''}
                      onChange={(e) => {
                        updateStep({ ...selectedStep, name: e.target.value });
                      }}
                      onBlur={(e) => {
                        doSave(steps.map((s) => s.id === selectedStep.id ? { ...s, name: e.target.value } : s));
                      }}
                      title="Click to rename step"
                    />
                  </div>
                  <button
                    className="config-api-btn"
                    onClick={() => {
                      setPickerMode('edit');
                      setShowApiPicker(true);
                    }}
                  >
                    {selectedStep.requestPathname || 'Select API Request…'}
                  </button>
                  {selectedStep.requestPathname && (
                    <div className="config-api-url">
                      <span
                        className="method-badge"
                        style={{ backgroundColor: METHOD_COLORS[selectedStep.method] || '#6b7280' }}
                      >
                        {selectedStep.method}
                      </span>
                      <span className="api-url-text">{selectedStep.url || '(no url)'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2" style={{ position: 'absolute', right: 16, top: 16 }}>
                    {selectedStep.isOverrideEnabled && (
                      <button
                        className="config-reset-btn flex items-center gap-1.5 px-2 py-1 text-[11px] text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        onClick={handleResetStep}
                        title="Reset overrides to original API configuration"
                      >
                        <IconRotate2 size={13} />
                        <span className="font-medium">Reset Override</span>
                      </button>
                    )}
                    <div
                      className="config-close-btn"
                      style={{ position: 'static' }}
                      onClick={() => setSelectedStepId(null)}
                    >
                      <IconX size={14} />
                    </div>
                  </div>
                </div>

                {selectedReqItem?.type === 'flow-request' ? (
                  <div className="subflow-details-panel animate-in fade-in duration-100">
                    <div className="subflow-steps-title">
                      Các bước trong Sub-flow ({selectedReqItem.flow?.steps?.length || 0} bước)
                    </div>
                    <div className="subflow-steps-list">
                      {(selectedReqItem.flow?.steps || []).map((subStep, sIdx) => {
                        const subMethod = subStep.method || 'GET';
                        const subColor = METHOD_COLORS[subMethod] || '#6b7280';
                        return (
                          <div key={subStep.id || sIdx} className="subflow-step-item">
                            <span className="subflow-step-num">{sIdx + 1}</span>
                            <span
                              className="method-badge text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0 text-center"
                              style={{ backgroundColor: subColor, width: '48px' }}
                            >
                              {subMethod}
                            </span>
                            <div className="subflow-step-name-col">
                              <div className="subflow-step-name">{subStep.name}</div>
                              <div className="subflow-step-path">{subStep.requestPathname}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Override Toggle */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0 bg-gray-50/50 dark:bg-zinc-900/50">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="cursor-pointer rounded border-gray-300"
                          checked={selectedStep.isOverrideEnabled || false}
                          onChange={(e) => {
                            const updatedStep = { ...selectedStep, isOverrideEnabled: e.target.checked };
                            updateStep(updatedStep);
                            doSave(steps.map((s) => s.id === selectedStep.id ? updatedStep : s));
                          }}
                        />
                        <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Enable Configuration Overrides (Headers, Params, Body)</span>
                      </label>
                      <span className="text-[10px] text-gray-400 italic">Enable to override values from the original API.</span>
                    </div>

                    {!selectedStep.isOverrideEnabled ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                        <IconSettings size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium mb-1">Override is disabled</p>
                        <p className="text-xs">Enable the option above to configure Headers, Params, or Body for this step.</p>
                      </div>
                    ) : (
                      <>
                        {/* Tabs */}
                        <div className="config-tabs">
                          {tabsConfig.map(({ key, label, count, active }) => (
                            <button
                              key={key}
                              className={`config-tab ${activeTab === key ? 'active' : ''}`}
                              onClick={() => setActiveTab(key)}
                            >
                              {label}
                              {count !== undefined && count > 0 && <span className="tab-badge ml-1">{count}</span>}
                              {active && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                            </button>
                          ))}
                        </div>

                        {/* Tab content */}
                        <div className="config-body">
                          {activeTab === 'headers' && <HeadersEditor step={selectedStep} onChange={updateStep} collection={collection} item={selectedReqItem} />}
                          {activeTab === 'params' && <ParamsEditor step={selectedStep} onChange={updateStep} collection={collection} item={selectedReqItem} />}
                          {activeTab === 'body' && <BodyEditor step={selectedStep} onChange={updateStep} collection={collection} item={selectedReqItem} preferences={preferences} />}

                          {activeTab === 'auth' && <Auth item={selectedReqItem} collection={collection} />}
                          {activeTab === 'vars' && <Vars item={selectedReqItem} collection={collection} />}
                          {activeTab === 'script' && (
                            <div className="w-full h-full flex flex-col">
                              <Tabs defaultValue="post-response">
                                <TabsList>
                                  <TabsTrigger value="pre-request">Pre Request</TabsTrigger>
                                  <TabsTrigger value="post-response">Post Response</TabsTrigger>
                                </TabsList>
                                <TabsContent value="pre-request" className="mt-2" dataTestId="pre-request-script-editor">
                                  <CodeEditor
                                    collection={collection}
                                    docKey={`script:pre-request-${selectedStep.id}`}
                                    value={selectedStep.script?.req || ''}
                                    theme={displayedTheme}
                                    font={preferences?.font?.codeFont || 'default'}
                                    fontSize={preferences?.font?.codeFontSize}
                                    onEdit={(val) => handleScriptEdit(val, 'req')}
                                    mode="javascript"
                                    showHintsFor={['req', 'bru']}
                                  />
                                </TabsContent>
                                <TabsContent value="post-response" className="mt-2" dataTestId="post-response-script-editor">
                                  <CodeEditor
                                    collection={collection}
                                    docKey={`script:post-response-${selectedStep.id}`}
                                    value={selectedStep.script?.res || ''}
                                    theme={displayedTheme}
                                    font={preferences?.font?.codeFont || 'default'}
                                    fontSize={preferences?.font?.codeFontSize}
                                    onEdit={(val) => handleScriptEdit(val, 'res')}
                                    mode="javascript"
                                    showHintsFor={['req', 'res', 'bru']}
                                  />
                                </TabsContent>
                              </Tabs>
                            </div>
                          )}
                          {activeTab === 'assert' && <Assertions item={selectedReqItem} collection={collection} />}
                          {activeTab === 'tests' && (
                            <div className="w-full h-full flex flex-col mt-2">
                              <CodeEditor
                                collection={collection}
                                docKey={`tests-${selectedStep.id}`}
                                value={selectedStep.tests || ''}
                                theme={displayedTheme}
                                font={preferences?.font?.codeFont || 'default'}
                                fontSize={preferences?.font?.codeFontSize}
                                onEdit={(val) => {
                                  const updatedStep = { ...selectedStep, tests: val };
                                  updateStep(updatedStep);
                                }}
                                mode="javascript"
                                showHintsFor={['req', 'res', 'bru']}
                              />
                            </div>
                          )}
                          {activeTab === 'docs' && <Documentation item={selectedReqItem} collection={collection} />}

                          {activeTab === 'info' && <InfoTab reqItem={selectedReqItem} />}
                          {activeTab === 'response' && <ResponseTab response={stepResponses[selectedStep.id]} />}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-panel">
                <div className="ep-icon">⚡</div>
                <p>Select a step from the left list or add a new step to begin configuration.</p>
              </div>
            )}
          </>
        )}
      </div>

      {showApiPicker && (
        <ApiPickerModal
          availableRequests={availableRequests}
          onSelect={(req) => {
            if (pickerMode === 'edit' && selectedStepId) {
              changeStepApi(selectedStepId, req);
            } else {
              addStep(req);
            }
          }}
          onClose={() => {
            setShowApiPicker(false);
            setPickerMode(null);
          }}
        />
      )}
    </StyledWrapper>
  );
};

export default FlowEditor;
