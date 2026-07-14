import React, { useState, useMemo } from 'react';
import {
  IconFileCode,
  IconGitBranch,
  IconRoute,
  IconLoader2,
  IconSearch,
  IconChevronRight,
  IconChevronDown,
  IconArrowLeft,
  IconX
} from '@tabler/icons';
import path from 'utils/common/path';

const NODE_TYPES = [
  {
    type: 'apiNode',
    icon: IconFileCode,
    label: 'API Request',
    color: '#6366f1',
    bg: 'bg-indigo-50 dark:bg-indigo-950',
    border: 'border-indigo-200 dark:border-indigo-800',
    iconColor: 'text-indigo-500',
    description: 'Gọi một HTTP/GraphQL API trong collection'
  },
  {
    type: 'conditionNode',
    icon: IconGitBranch,
    label: 'If / Else',
    color: '#f59e0b',
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
    description: 'Rẽ nhánh dựa trên điều kiện hoặc JavaScript'
  },
  {
    type: 'loopNode',
    icon: IconRoute,
    label: 'For Each Loop',
    color: '#8b5cf6',
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-500',
    description: 'Lặp qua từng phần tử trong một mảng kết quả'
  },
  {
    type: 'delayNode',
    icon: IconLoader2,
    label: 'Delay',
    color: '#64748b',
    bg: 'bg-slate-50 dark:bg-slate-950',
    border: 'border-slate-200 dark:border-slate-700',
    iconColor: 'text-slate-400',
    description: 'Chờ một khoảng thời gian trước khi tiếp tục'
  },
  {
    type: 'subflowNode',
    icon: IconRoute,
    label: 'Sub-flow',
    color: '#10b981',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-500',
    description: 'Chạy một visual flow khác trong collection này'
  }
];

const METHOD_COLORS = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  HEAD: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  OPTIONS: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
};

// Builds a folder tree from flat list of requests with relativePath
const buildFolderTree = (requests) => {
  const tree = {};
  for (const req of requests) {
    const dir = path.dirname(req.relativePath);
    const folder = dir === '.' ? '(root)' : dir;
    if (!tree[folder]) tree[folder] = [];
    tree[folder].push(req);
  }
  return tree;
};

const AddNodeModal = ({ onClose, onAdd, availableRequests }) => {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});

  const filteredRequests = useMemo(() => {
    if (!search.trim()) return availableRequests;
    const q = search.toLowerCase();
    return availableRequests.filter(
      (r) => r.name.toLowerCase().includes(q) || r.relativePath.toLowerCase().includes(q)
    );
  }, [availableRequests, search]);

  const folderTree = useMemo(() => buildFolderTree(filteredRequests), [filteredRequests]);

  const toggleFolder = (folder) => {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleSelectNodeType = (type) => {
    if (type === 'apiNode') {
      setStep(2);
    } else {
      onAdd({ type });
    }
  };

  const handleSelectRequest = (req) => {
    onAdd({
      type: 'apiNode',
      name: req.name,
      method: req.request?.method || 'GET',
      url: req.request?.url || '',
      requestPathname: req.relativePath,
      requestUid: req.uid
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[520px] max-h-[80vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 mr-1"
              >
                <IconArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {step === 1 ? 'Thêm Node' : 'Chọn API Request'}
              </h2>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                {step === 1
                  ? 'Chọn loại node muốn thêm vào flow'
                  : 'Chọn một API request từ collection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Step 1 – Chọn loại node */}
        {step === 1 && (
          <div className="p-4 grid grid-cols-2 gap-3">
            {NODE_TYPES.map(({ type, icon: Icon, label, bg, border, iconColor, description }) => (
              <button
                key={type}
                onClick={() => handleSelectNodeType(type)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 ${bg} ${border} text-left hover:scale-[1.02] transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400`}
              >
                <div className={`p-2 rounded-lg bg-white/60 dark:bg-black/30 ${iconColor} flex-shrink-0`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 – Chọn API */}
        {step === 2 && (
          <>
            {/* Search */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
                <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Tìm kiếm API theo tên hoặc đường dẫn..."
                  className="flex-1 bg-transparent outline-none text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Folder Tree */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {Object.keys(folderTree).length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  Không tìm thấy API nào
                </div>
              ) : (
                Object.entries(folderTree).map(([folder, requests]) => {
                  const isExpanded = expandedFolders[folder] !== false; // default expanded
                  return (
                    <div key={folder} className="mb-1">
                      {/* Folder header */}
                      <button
                        onClick={() => toggleFolder(folder)}
                        className="w-full flex items-center gap-1.5 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 rounded hover:bg-gray-50 dark:hover:bg-zinc-800"
                      >
                        {isExpanded
                          ? <IconChevronDown size={11} />
                          : <IconChevronRight size={11} />}
                        <span className="truncate">{folder}</span>
                        <span className="ml-auto text-[9px] font-normal">{requests.length}</span>
                      </button>

                      {/* Requests */}
                      {isExpanded && (
                        <div className="ml-3 border-l border-gray-100 dark:border-zinc-800 pl-2 mb-1">
                          {requests.map((req) => {
                            const method = req.request?.method || 'GET';
                            return (
                              <button
                                key={req.uid}
                                onClick={() => handleSelectRequest(req)}
                                className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-200 dark:hover:border-indigo-800 border border-transparent text-left group transition-colors"
                              >
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${METHOD_COLORS[method] || METHOD_COLORS.GET}`}>
                                  {method}
                                </span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 truncate">
                                  {req.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddNodeModal;
