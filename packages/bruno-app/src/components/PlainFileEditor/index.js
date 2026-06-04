import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateFileContent, setFileContent } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import CodeEditor from 'components/CodeEditor';
import { IconLoader2, IconDeviceFloppy } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

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

  const fileContent = item.draft ? item.draft.fileContent : item.fileContent;
  const hasChanges = item.draft && item.draft.fileContent !== item.fileContent;

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
    <StyledWrapper className="flex flex-col h-full w-full relative">
      <div className="flex-grow relative h-full">
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
        {hasChanges && (
          <IconDeviceFloppy
            onClick={handleSave}
            color={theme.draftColor}
            strokeWidth={1.5}
            size={22}
            className="absolute right-0 top-0 m-4 cursor-pointer opacity-100 z-10"
          />
        )}
      </div>
    </StyledWrapper>
  );
};

export default PlainFileEditor;
