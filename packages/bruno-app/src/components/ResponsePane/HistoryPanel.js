import React from 'react';
import classnames from 'classnames';
import { useTheme } from 'providers/Theme';
import { IconCheck, IconHistory } from '@tabler/icons';
import StyledWrapper from './HistoryPanel/StyledWrapper';

const getMethodColorClass = (method = '') => {
  method = method.toLocaleLowerCase();
  return classnames('method-badge mr-2 px-1.5 py-0.5 rounded text-xs font-semibold uppercase', {
    'method-get': method === 'get',
    'method-post': method === 'post',
    'method-put': method === 'put',
    'method-delete': method === 'delete',
    'method-patch': method === 'patch',
    'method-head': method === 'head',
    'method-options': method === 'options'
  });
};

const getStatusColorClass = (status) => {
  if (!status) return 'text-muted';
  if (status >= 200 && status < 300) return 'status-success';
  if (status >= 300 && status < 400) return 'status-redirect';
  return 'status-error';
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const RenderHeaders = ({ headers }) => {
  if (!headers) return <div className="text-muted italic">No headers</div>;

  const headerEntries = Array.isArray(headers)
    ? headers
    : Object.entries(headers).map(([name, value]) => ({ name, value }));

  if (headerEntries.length === 0) {
    return <div className="text-muted italic">No headers</div>;
  }

  return (
    <div className="flex flex-col gap-1 font-mono text-[11px] max-h-40 overflow-y-auto bg-black/10 dark:bg-black/30 p-2 rounded border border-gray-700/10">
      {headerEntries.map((h, index) => (
        <div key={index} className="flex gap-2">
          <span className="text-muted font-semibold shrink-0">{h.name || h.key}:</span>
          <span className="break-all whitespace-pre-wrap">{String(h.value)}</span>
        </div>
      ))}
    </div>
  );
};

const RenderBody = ({ body }) => {
  if (!body) return <div className="text-muted italic">No body</div>;

  let formatted = '';
  if (typeof body === 'object') {
    try {
      formatted = JSON.stringify(body, null, 2);
    } catch {
      formatted = String(body);
    }
  } else {
    try {
      const parsed = JSON.parse(body);
      formatted = JSON.stringify(parsed, null, 2);
    } catch {
      formatted = String(body);
    }
  }

  return (
    <pre className="overflow-x-auto p-2 bg-black/10 dark:bg-black/30 rounded font-mono text-[11px] whitespace-pre-wrap max-h-60 overflow-y-auto border border-gray-700/10">
      {formatted}
    </pre>
  );
};

const HistoryPanel = ({ item, collection, onSelectSession }) => {
  const { theme } = useTheme();
  const history = item.history || [];
  const selectedHistoryId = item.selectedHistoryId;

  const handleSelect = (historyId) => {
    if (selectedHistoryId === historyId) {
      onSelectSession(null);
    } else {
      onSelectSession(historyId);
    }
  };

  const getResponseSize = (response) => {
    if (typeof response.size === 'number') return response.size;
    if (!response.dataBuffer) return 0;
    try {
      const buffer = Buffer.from(response.dataBuffer, 'base64');
      return buffer.length;
    } catch {
      return 0;
    }
  };

  return (
    <StyledWrapper className="flex flex-col h-full w-full p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <div className="flex items-center">
          <IconHistory className="mr-2 text-muted" size={20} strokeWidth={1.5} />
          <h2 className="text-sm font-semibold">Session History</h2>
        </div>
        <span className="text-xs text-muted">
          Showing up to last 10 runs
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted text-sm gap-2">
            <IconHistory size={32} strokeWidth={1} />
            <span>No runs in history yet. Send a request to see past sessions.</span>
          </div>
        ) : (
          history.map((entry) => {
            const isSelected = selectedHistoryId === entry.id;
            const size = getResponseSize(entry.response || {});
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div
                key={entry.id}
                className={classnames('history-item flex flex-col p-3 rounded transition', {
                  active: isSelected
                })}
              >
                {/* Header row containing main info */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleSelect(entry.id)}
                >
                  <div className="flex items-center overflow-hidden mr-4">
                    <div className="flex items-center justify-center w-6 mr-1">
                      {isSelected && (
                        <IconCheck className="check-icon" size={16} strokeWidth={2.5} />
                      )}
                    </div>
                    <span className={getMethodColorClass(entry.request?.method)}>
                      {entry.request?.method || 'GET'}
                    </span>
                    <span className="truncate text-sm font-medium url-text" title={entry.request?.url}>
                      {entry.request?.url}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted">
                    <span className={classnames('font-medium', getStatusColorClass(entry.response?.status))}>
                      {entry.response?.status || 'Error'}
                    </span>
                    <span>{entry.response?.duration ? `${entry.response.duration} ms` : '-'}</span>
                    <span>{formatSize(size)}</span>
                    <span>{timeStr}</span>
                  </div>
                </div>

                {/* Details Section when expanded */}
                {isSelected && (
                  <div className="session-details mt-3 pt-3 border-t border-gray-700/20 flex flex-col md:flex-row gap-4">
                    {/* Request Column */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-muted uppercase mb-2 border-b pb-1 border-gray-700/10">Request</div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="text-[10px] text-muted mb-1 font-semibold uppercase">URL</div>
                          <div className="font-mono text-xs break-all bg-black/5 p-1.5 rounded border border-gray-700/5">{entry.request?.url}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted mb-1 font-semibold uppercase">Headers</div>
                          <RenderHeaders headers={entry.request?.headers} />
                        </div>
                        <div>
                          <div className="text-[10px] text-muted mb-1 font-semibold uppercase">Body</div>
                          <RenderBody body={entry.request?.data} />
                        </div>
                      </div>
                    </div>

                    {/* Response Column */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-muted uppercase mb-2 border-b pb-1 border-gray-700/10">Response</div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-[10px] text-muted font-semibold uppercase mr-1">Status:</span>
                            <span className={classnames('font-mono text-xs font-semibold', getStatusColorClass(entry.response?.status))}>
                              {entry.response?.status || 'Error'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted font-semibold uppercase mr-1">Duration:</span>
                            <span className="font-mono text-xs">{entry.response?.duration ? `${entry.response.duration} ms` : '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted font-semibold uppercase mr-1">Size:</span>
                            <span className="font-mono text-xs">{formatSize(size)}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted mb-1 font-semibold uppercase">Headers</div>
                          <RenderHeaders headers={entry.response?.headers} />
                        </div>
                        <div>
                          <div className="text-[10px] text-muted mb-1 font-semibold uppercase">Body</div>
                          {entry.response?.error ? (
                            <div className="text-xs text-red-500 font-mono bg-red-500/10 p-2 rounded border border-red-500/20">{entry.response.error}</div>
                          ) : (
                            <RenderBody body={entry.response?.data} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </StyledWrapper>
  );
};

export default HistoryPanel;
