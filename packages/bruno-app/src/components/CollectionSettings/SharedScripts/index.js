import React, { useState, useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import Button from 'ui/Button';
import { IconTrash, IconPlus, IconFileCode, IconDeviceFloppy } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import path from 'utils/common/path';
import toast from 'react-hot-toast';

const SharedScripts = ({ collection }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // Load scripts from collection object in Redux
  const sharedScripts = collection.sharedScripts || [];

  const [selectedScriptUid, setSelectedScriptUid] = useState(sharedScripts[0]?.uid || null);
  const [editorContent, setEditorContent] = useState('');
  const [newScriptName, setNewScriptName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedScript = sharedScripts.find((s) => s.uid === selectedScriptUid);

  useEffect(() => {
    if (selectedScript) {
      setEditorContent(selectedScript.content || '');
    } else {
      setEditorContent('');
    }
  }, [selectedScriptUid, selectedScript]);

  // Keep selection valid
  useEffect(() => {
    if (sharedScripts.length > 0 && !sharedScripts.find((s) => s.uid === selectedScriptUid)) {
      setSelectedScriptUid(sharedScripts[0].uid);
    }
  }, [sharedScripts, selectedScriptUid]);

  const handleSave = async () => {
    if (!selectedScript) return;

    try {
      const { ipcRenderer } = window;
      if (ipcRenderer) {
        await ipcRenderer.invoke('renderer:write-file-content', {
          pathname: selectedScript.pathname,
          content: editorContent
        });
        toast.success(`Saved script ${selectedScript.name}`);
      }
    } catch (err) {
      toast.error(`Failed to save script: ${err.message}`);
    }
  };

  const handleCreate = async () => {
    const trimmed = newScriptName.trim();
    if (!trimmed) {
      toast.error('Script name cannot be empty');
      return;
    }
    const nameRegex = /^[\w-.]*$/;
    if (!nameRegex.test(trimmed)) {
      toast.error('Invalid script name. Use letters, numbers, -, _, .');
      return;
    }

    if (sharedScripts.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Script with this name already exists');
      return;
    }

    try {
      const { ipcRenderer } = window;
      if (ipcRenderer) {
        const scriptPath = path.join(collection.pathname, '.bruno', 'scripts', `${trimmed}.js`);
        await ipcRenderer.invoke('renderer:write-file-content', {
          pathname: scriptPath,
          content: '// Write your helper functions here\nmodule.exports = {\n  // helper: () => {}\n};\n'
        });
        setNewScriptName('');
        setIsCreating(false);
        setSelectedScriptUid(trimmed);
        toast.success(`Created script ${trimmed}`);
      }
    } catch (err) {
      toast.error(`Failed to create script: ${err.message}`);
    }
  };

  const handleDelete = async (script) => {
    if (!confirm(`Are you sure you want to delete script ${script.name}?`)) {
      return;
    }

    try {
      const { ipcRenderer } = window;
      if (ipcRenderer) {
        await ipcRenderer.invoke('renderer:delete-item', script.pathname, 'file');
        toast.success(`Deleted script ${script.name}`);
      }
    } catch (err) {
      toast.error(`Failed to delete script: ${err.message}`);
    }
  };

  return (
    <StyledWrapper className="flex w-full h-full border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-zinc-900" style={{ height: 'calc(100vh - 270px)' }}>
      {/* Left side: List of scripts */}
      <div className="w-1/4 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-muted tracking-wider">Shared Scripts</span>
          <button
            onClick={() => setIsCreating(true)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            title="Add new script"
          >
            <IconPlus size={18} />
          </button>
        </div>

        {isCreating && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Script name"
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-zinc-800 outline-none w-full"
              value={newScriptName}
              onChange={(e) => setNewScriptName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-2 justify-end">
              <Button size="xs" color="secondary" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button size="xs" onClick={handleCreate}>Create</Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {sharedScripts.length === 0 ? (
            <div className="p-4 text-xs text-muted text-center">No shared scripts found.</div>
          ) : (
            <div className="flex flex-col">
              {sharedScripts.map((script) => (
                <div
                  key={script.uid}
                  onClick={() => setSelectedScriptUid(script.uid)}
                  className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                    selectedScriptUid === script.uid ? 'bg-gray-100 dark:bg-zinc-800 font-semibold text-yellow-600' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <IconFileCode size={14} className="text-gray-400" />
                    <span className="truncate">{script.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(script);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Editor */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
        {selectedScript ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <div className="flex flex-col truncate max-w-[70%]">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{selectedScript.name}.js</span>
                <span className="text-[10px] text-muted truncate">{selectedScript.pathname}</span>
              </div>
              <Button size="sm" onClick={handleSave} className="flex items-center gap-1">
                <IconDeviceFloppy size={14} />
                <span>Save</span>
              </Button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <CodeEditor
                collection={collection}
                docKey={`shared-script:${selectedScriptUid}`}
                value={editorContent}
                theme={displayedTheme}
                onEdit={setEditorContent}
                mode="javascript"
                onSave={handleSave}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
                showHintsFor={['req', 'bru']}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted">
            <IconFileCode size={48} className="text-gray-300 dark:text-gray-700 mb-2" />
            <span>Select or create a script to edit</span>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default SharedScripts;
