import { IconTrash, IconWand } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import ToolHint from 'components/ToolHint/index';
import { get } from 'lodash';
import invert from 'lodash/invert';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateActiveWsMessageIndex } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { autoDetectLang } from 'utils/codemirror/lang-detect';
import { toastError } from 'utils/common/error';
import toast from 'react-hot-toast';
import { getWsConnectionStatus, queueWsMessage } from 'utils/network/index';
import { findEnvironmentInCollection } from 'utils/collections';
import { prettifyJsonString } from 'utils/common/index';
import xmlFormat from 'xml-formatter';
import WSRequestBodyMode from '../BodyMode/index';
import StyledWrapper from './StyledWrapper';

export const TYPE_BY_DECODER = {
  base64: 'binary',
  json: 'json',
  xml: 'xml'
};

export const DECODER_BY_TYPE = invert(TYPE_BY_DECODER);

export const SingleWSMessage = ({
  message,
  item,
  collection,
  index,
  methodType,
  handleRun,
  canClientSendMultipleMessages,
  isLast,
  showDeleteButton
}) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');

  const { name, content, type } = message;
  const [messageFormat, setMessageFormat] = useState(autoDetectLang(content));

  const onChangeDelay = (e) => {
    const val = parseInt(e.target.value, 10);
    const delayVal = isNaN(val) ? 0 : Math.max(0, val);
    const currentMessages = [...(body.ws || [])];

    currentMessages[index] = {
      ...currentMessages[index],
      delay: delayVal
    };

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onToggleSendOnConnect = (e) => {
    const currentMessages = [...(body.ws || [])];

    currentMessages[index] = {
      ...currentMessages[index],
      sendOnConnect: e.target.checked
    };

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onSendMessage = async () => {
    const status = await getWsConnectionStatus(item.uid);
    if (status?.status !== 'connected') {
      toast.error('WebSocket connection is not active. Please connect first.');
      return;
    }

    try {
      const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
      const result = await queueWsMessage(item, collection, environment, collection.runtimeVariables, index);
      if (result.success) {
        toast.success(`Message ${index + 1} sent`);
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const onFocus = () => {
    dispatch(updateActiveWsMessageIndex({
      uid: item.uid,
      activeWsMessageIndex: index
    }));
  };

  const onUpdateMessageType = (type) => {
    setMessageFormat(type);

    const currentMessages = [...(body.ws || [])];

    currentMessages[index] = {
      ...currentMessages[index],
      type: DECODER_BY_TYPE[type]
    };

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onEdit = (value) => {
    const currentMessages = [...(body.ws || [])];

    currentMessages[index] = {
      ...currentMessages[index],
      name: name ? name : `message ${index + 1}`,
      type: DECODER_BY_TYPE[messageFormat],
      content: value
    };

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const onDeleteMessage = () => {
    const currentMessages = [...(body.ws || [])];

    currentMessages.splice(index, 1);

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  let codeType = messageFormat;
  if (TYPE_BY_DECODER[type]) {
    codeType = TYPE_BY_DECODER[type];
  }

  const codemirrorMode = {
    text: 'application/text',
    xml: 'application/xml',
    json: 'application/ld+json'
  };

  const onPrettify = () => {
    if (codeType === 'json') {
      try {
        const prettyBodyJson = prettifyJsonString(content);
        const currentMessages = [...(body.ws || [])];
        currentMessages[index] = {
          ...currentMessages[index],
          name: name ? name : `message ${index + 1}`,
          content: prettyBodyJson
        };
        dispatch(updateRequestBody({
          content: currentMessages,
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid JSON format.'));
      }
    }

    if (codeType === 'xml') {
      try {
        const prettyBodyXML = xmlFormat(content, { collapseContent: true });

        const currentMessages = [...(body.ws || [])];
        currentMessages[index] = {
          ...currentMessages[index],
          name: name ? name : `message ${index + 1}`,
          content: prettyBodyXML
        };

        dispatch(updateRequestBody({
          content: currentMessages,
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid XML format.'));
      }
    }
  };

  const isSingleMessage = !canClientSendMultipleMessages || body.ws.length === 1;

  return (
    <StyledWrapper
      className={`message-container ${isSingleMessage ? 'single' : ''} ${isLast ? 'last' : ''}`}
    >
      <div className="message-toolbar">
        <span className="message-label">Message {index + 1}</span>
        <div className="toolbar-actions">
          <label className="flex items-center text-xs mr-3 cursor-pointer select-none gap-1">
            <input
              type="checkbox"
              checked={message.sendOnConnect !== false}
              onChange={onToggleSendOnConnect}
              className="mr-1"
            />
            Send on Connect
          </label>

          {!isSingleMessage && (
            <label className="flex items-center text-xs mr-3 select-none gap-1">
              Delay:
              <input
                type="number"
                min="0"
                step="1"
                value={message.delay ?? 0}
                onChange={onChangeDelay}
                className="w-12 px-1 py-0.5 border rounded text-xs text-center border-gray-300 dark:border-zinc-700 bg-transparent text-gray-900 dark:text-zinc-100"
                style={{ height: '20px' }}
              />
              s
            </label>
          )}

          <button
            onClick={onSendMessage}
            className="px-2 py-0.5 mr-2 rounded text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors"
          >
            Send
          </button>

          {showDeleteButton && (
            <ToolHint text="Delete message" toolhintId={`delete-msg-${index}`}>
              <button onClick={onDeleteMessage} className="toolbar-btn delete">
                <IconTrash size={16} strokeWidth={1.5} />
              </button>
            </ToolHint>
          )}
        </div>
      </div>
      <div className="editor-container relative">
        <div className="editor-floating-actions">
          <WSRequestBodyMode mode={messageFormat} onModeChange={onUpdateMessageType} />
          <ToolHint text="Format" toolhintId={`prettify-msg-${index}`}>
            <button onClick={onPrettify} className="toolbar-btn">
              <IconWand size={16} strokeWidth={1.5} />
            </button>
          </ToolHint>
        </div>
        <CodeEditor
          collection={collection}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={content}
          onEdit={onEdit}
          onRun={handleRun}
          onSave={onSave}
          onFocus={onFocus}
          mode={codemirrorMode[codeType] ?? 'text/plain'}
          enableVariableHighlighting={true}
        />
      </div>
    </StyledWrapper>
  );
};
