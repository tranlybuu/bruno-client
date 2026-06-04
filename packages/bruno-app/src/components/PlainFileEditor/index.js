import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateFileContent, setFileContent } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import CodeEditor from 'components/CodeEditor';
import { IconLoader2, IconDeviceFloppy, IconEye, IconEyeOff } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import Markdown from 'components/MarkDown';

const getMode = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'json':
      return 'application/json';
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'html':
      return 'htmlmixed';
    case 'css':
      return 'css';
    case 'md':
      return 'markdown';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'text/plain';
  }
};

const PlainFileEditor = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme, theme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [loading, setLoading] = useState(item.fileContent === undefined);
  const [error, setError] = useState(null);

  const [showPreview, setShowPreview] = useState(true);
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [dragging, setDragging] = useState(false);
  const mainSectionRef = useRef(null);

  const fileContent = item.draft ? item.draft.fileContent : item.fileContent;
  const hasChanges = item.draft && item.draft.fileContent !== item.fileContent;

  const filename = item.name || '';
  const ext = filename.split('.').pop().toLowerCase();
  const isMarkdown = ext === 'md';
  const isHtml = ext === 'html';
  const isMarkdownOrHtml = isMarkdown || isHtml;

  const startDragging = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging || !mainSectionRef.current) return;
      const rect = mainSectionRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.max(10, Math.min(newWidth, 90)));
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (item.fileContent !== undefined) {
      setLoading(false);
      return;
    }

    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:read-file-content', { pathname: item.pathname })
      .then((content) => {
        dispatch(setFileContent({
          collectionUid: collection.uid,
          itemUid: item.uid,
          content
        }));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to read file');
        setLoading(false);
      });
  }, [item.pathname, item.fileContent, collection.uid, item.uid, dispatch]);

  const handleSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 opacity-50">
        <IconLoader2 size={20} className="animate-spin" />
        <span>Loading file...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <StyledWrapper className={`flex flex-col h-full w-full relative ${dragging ? 'dragging' : ''}`}>
      {/* Editor & Preview Header */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0 bg-transparent">
        <span className="text-xs font-semibold text-neutral-500">{item.name}</span>
        <div className="flex items-center gap-2">
          {isMarkdownOrHtml && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-1 rounded"
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          )}
          {hasChanges && (
            <button
              onClick={handleSave}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-1 rounded"
              title="Save file"
            >
              <IconDeviceFloppy size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main split view */}
      <div ref={mainSectionRef} className="flex flex-grow relative h-full overflow-hidden">
        <div className="relative h-full" style={{ width: isMarkdownOrHtml && showPreview ? `${leftWidth}%` : '100%' }}>
          <CodeEditor
            collection={collection}
            item={item}
            theme={displayedTheme}
            value={fileContent || ''}
            onEdit={(val) => {
              dispatch(updateFileContent({
                collectionUid: collection.uid,
                itemUid: item.uid,
                content: val
              }));
            }}
            onSave={handleSave}
            mode={getMode(item.name)}
            enableVariableHighlighting={false}
            enableBrunoVarInfo={false}
          />
        </div>

        {isMarkdownOrHtml && showPreview && (
          <div
            className="dragbar-wrapper"
            onMouseDown={startDragging}
          >
            <div className="dragbar-handle" />
          </div>
        )}

        {isMarkdownOrHtml && showPreview && (
          <div
            className="flex-grow h-full overflow-auto"
            style={{
              width: `${100 - leftWidth}%`,
              pointerEvents: dragging ? 'none' : 'auto'
            }}
          >
            {isMarkdown && (
              <div className="h-full overflow-y-auto p-4 bg-white dark:bg-neutral-900">
                <Markdown content={fileContent} collectionPath={collection.pathname} onDoubleClick={() => {}} />
              </div>
            )}
            {isHtml && (
              <iframe
                srcDoc={fileContent || ''}
                sandbox="allow-scripts"
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              />
            )}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default PlainFileEditor;
