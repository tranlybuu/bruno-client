import React, { useState } from 'react';
import {
  IconX,
  IconExternalLink,
  IconLink,
  IconKey,
  IconList,
  IconCode,
  IconChevronDown,
  IconChevronRight
} from '@tabler/icons';

const METHOD_COLORS = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  HEAD: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  OPTIONS: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
};

const TABS = [
  { key: 'params', label: 'Params', icon: IconLink },
  { key: 'headers', label: 'Headers', icon: IconList },
  { key: 'body', label: 'Body', icon: IconCode },
  { key: 'auth', label: 'Auth', icon: IconKey }
];

const EmptyState = ({ text }) => (
  <div className="text-center py-6 text-[11px] text-gray-400 dark:text-zinc-600 italic border border-dashed border-gray-200 dark:border-zinc-700 rounded-lg">
    {text}
  </div>
);

const TableRow = ({ label, value, enabled }) => (
  <tr className={`border-b border-gray-50 dark:border-zinc-800 ${enabled === false ? 'opacity-40' : ''}`}>
    <td className="py-1.5 px-2 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 w-1/3">{label}</td>
    <td className="py-1.5 px-2 text-[10px] font-mono text-gray-600 dark:text-zinc-400 break-all">{value}</td>
  </tr>
);

const ParamsTab = ({ item }) => {
  const params = (item?.request?.params || []).filter((p) => p.name);
  return params.length === 0 ? (
    <EmptyState text="Không có query param" />
  ) : (
    <table className="w-full">
      <tbody>
        {params.map((p, i) => (
          <TableRow key={i} label={p.name} value={p.value} enabled={p.enabled} />
        ))}
      </tbody>
    </table>
  );
};

const HeadersTab = ({ item }) => {
  const headers = (item?.request?.headers || []).filter((h) => h.name);
  return headers.length === 0 ? (
    <EmptyState text="Không có header" />
  ) : (
    <table className="w-full">
      <tbody>
        {headers.map((h, i) => (
          <TableRow key={i} label={h.name} value={h.value} enabled={h.enabled} />
        ))}
      </tbody>
    </table>
  );
};

const BodyTab = ({ item }) => {
  const body = item?.request?.body;
  if (!body || body.mode === 'none') return <EmptyState text="Không có body" />;

  if (body.mode === 'json') {
    return (
      <pre className="text-[10px] font-mono bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 overflow-auto max-h-48 text-gray-700 dark:text-zinc-300">
        {body.json || '{}'}
      </pre>
    );
  }

  if (body.mode === 'formUrlEncoded' || body.mode === 'multipartForm') {
    const fields = body[body.mode === 'formUrlEncoded' ? 'formUrlEncoded' : 'multipartForm'] || [];
    return fields.length === 0 ? <EmptyState text="Không có trường form" /> : (
      <table className="w-full">
        <tbody>
          {fields.map((f, i) => (
            <TableRow key={i} label={f.name} value={f.value} enabled={f.enabled} />
          ))}
        </tbody>
      </table>
    );
  }

  if (body.mode === 'text' || body.mode === 'xml' || body.mode === 'sparql') {
    return (
      <pre className="text-[10px] font-mono bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 overflow-auto max-h-48 text-gray-700 dark:text-zinc-300">
        {body.text || body.xml || body.sparql || ''}
      </pre>
    );
  }

  return <EmptyState text={`Body mode: ${body.mode}`} />;
};

const AuthTab = ({ item }) => {
  const auth = item?.request?.auth;
  if (!auth || auth.mode === 'none' || auth.mode === 'inherit') {
    return <EmptyState text="Không có auth" />;
  }

  const pairs = [];
  if (auth.mode === 'basic') {
    pairs.push({ label: 'Type', value: 'Basic Auth' });
    pairs.push({ label: 'Username', value: auth.basic?.username || '' });
    pairs.push({ label: 'Password', value: '••••••••' });
  } else if (auth.mode === 'bearer') {
    pairs.push({ label: 'Type', value: 'Bearer Token' });
    pairs.push({ label: 'Token', value: auth.bearer?.token ? '••••••••' : '(empty)' });
  } else if (auth.mode === 'apikey') {
    pairs.push({ label: 'Type', value: 'API Key' });
    pairs.push({ label: 'Key', value: auth.apikey?.key || '' });
    pairs.push({ label: 'Value', value: auth.apikey?.value ? '••••••••' : '(empty)' });
    pairs.push({ label: 'In', value: auth.apikey?.placement || 'header' });
  } else if (auth.mode === 'oauth2') {
    pairs.push({ label: 'Type', value: 'OAuth 2.0' });
    pairs.push({ label: 'Grant Type', value: auth.oauth2?.grantType || '' });
    pairs.push({ label: 'Token URL', value: auth.oauth2?.accessTokenUrl || '' });
  } else {
    pairs.push({ label: 'Type', value: auth.mode });
  }

  return (
    <table className="w-full">
      <tbody>
        {pairs.map((p, i) => (
          <TableRow key={i} label={p.label} value={p.value} />
        ))}
      </tbody>
    </table>
  );
};

const TAB_COMPONENTS = {
  params: ParamsTab,
  headers: HeadersTab,
  body: BodyTab,
  auth: AuthTab
};

const ApiDetailPanel = ({ item, collectionPathname, onClose }) => {
  const [activeTab, setActiveTab] = useState('params');

  if (!item) return null;

  const method = item.request?.method || 'GET';
  const url = item.request?.url || '';
  const methodColor = METHOD_COLORS[method] || METHOD_COLORS.GET;

  const ActiveContent = TAB_COMPONENTS[activeTab] || (() => null);

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 flex flex-col h-full shadow-xl z-10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            API Details
          </span>
          <p className="text-xs font-bold text-gray-800 dark:text-gray-100 mt-0.5 truncate max-w-[190px]">
            {item.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
        >
          <IconX size={14} />
        </button>
      </div>

      {/* URL Row */}
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${methodColor}`}>
            {method}
          </span>
          <span className="text-[10px] font-mono text-gray-600 dark:text-zinc-400 truncate flex-1" title={url}>
            {url || '(no url)'}
          </span>
        </div>
        {item.pathname && (
          <p className="text-[9px] text-gray-400 dark:text-zinc-600 mt-1 truncate">
            {item.pathname.replace(collectionPathname + '/', '')}
          </p>
        )}
      </div>

      {/* Read-only notice */}
      <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/30 flex-shrink-0">
        <p className="text-[9px] text-amber-600 dark:text-amber-400">
          Read-only view. Mở tab request để chỉnh sửa.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1 px-3 py-2 text-[10px] font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500'
                : 'text-gray-400 dark:text-zinc-600 border-transparent hover:text-gray-600 dark:hover:text-zinc-400'
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        <ActiveContent item={item} />
      </div>
    </div>
  );
};

export default ApiDetailPanel;
