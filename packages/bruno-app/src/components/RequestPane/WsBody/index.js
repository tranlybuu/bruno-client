import { get } from 'lodash';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { IconPlus } from '@tabler/icons';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from 'ui/Button';
import { uuid } from 'utils/common';
import StyledWrapper from './StyledWrapper';
import { SingleWSMessage } from './SingleWSMessage/index';

const WSBody = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const messagesContainerRef = useRef(null);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');

  const methodType = item.draft ? get(item, 'draft.request.methodType') : get(item, 'request.methodType');
  const canClientSendMultipleMessages = true;

  // Populate UIDs or initialize with an empty message if list is empty
  useEffect(() => {
    if (!body?.ws || !Array.isArray(body.ws) || body.ws.length === 0) {
      dispatch(updateRequestBody({
        content: [{
          uid: uuid(),
          name: 'message 1',
          content: '{}'
        }],
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
      return;
    }

    const hasMissingUid = body.ws.some((msg) => !msg.uid);
    if (hasMissingUid) {
      const updated = body.ws.map((msg) => msg.uid ? msg : { ...msg, uid: uuid() });
      dispatch(updateRequestBody({
        content: updated,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  }, [body?.ws, item.uid, collection.uid, dispatch]);

  // Auto-scroll to the latest message when messages are added
  useEffect(() => {
    if (messagesContainerRef.current && body?.ws?.length > 0) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [body?.ws?.length]);

  const addNewMessage = () => {
    const currentMessages = Array.isArray(body.ws) ? [...body.ws] : [];

    currentMessages.push({
      uid: uuid(),
      name: `message ${currentMessages.length + 1}`,
      content: '{}'
    });

    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const insertNewMessage = (insertIndex) => {
    const currentMessages = Array.isArray(body.ws) ? [...body.ws] : [];

    currentMessages.splice(insertIndex, 0, {
      uid: uuid(),
      name: `message ${currentMessages.length + 1}`,
      content: '{}'
    });

    // Synchronize default names
    const updatedMessages = currentMessages.map((msg, idx) => {
      if (/^message \d+$/i.test(msg.name)) {
        return {
          ...msg,
          name: `message ${idx + 1}`
        };
      }
      return msg;
    });

    dispatch(updateRequestBody({
      content: updatedMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  if (!body?.ws || !Array.isArray(body.ws)) {
    return (
      <StyledWrapper>
        <div className="empty-state">
          <p>No WebSocket messages available</p>
          <Button
            onClick={addNewMessage}
            variant="filled"
            color="secondary"
            size="sm"
            icon={<IconPlus size={14} strokeWidth={1.5} />}
          >
            Add Message
          </Button>
        </div>
      </StyledWrapper>
    );
  }

  const messagesToShow = body.ws.filter((_, index) => canClientSendMultipleMessages || index === 0);

  return (
    <StyledWrapper>
      <div
        ref={messagesContainerRef}
        className={`messages-container ${canClientSendMultipleMessages && messagesToShow.length > 1 ? 'multi' : 'single'}`}
      >
        {messagesToShow.map((message, index) => (
          <React.Fragment key={message.uid || index}>
            <SingleWSMessage
              message={message}
              item={item}
              collection={collection}
              index={index}
              methodType={methodType}
              handleRun={handleRun}
              canClientSendMultipleMessages={canClientSendMultipleMessages}
              isLast={index === messagesToShow.length - 1}
              showDeleteButton={messagesToShow.length > 1}
            />
            {index < messagesToShow.length - 1 && (
              <div className="insert-message-divider">
                <button
                  type="button"
                  className="insert-message-btn"
                  onClick={() => insertNewMessage(index + 1)}
                >
                  <IconPlus size={12} strokeWidth={2} />
                  <span>Insert Message</span>
                </button>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {canClientSendMultipleMessages && (
        <div className="add-message-footer">
          <Button
            onClick={addNewMessage}
            variant="filled"
            color="secondary"
            size="sm"
            fullWidth
            icon={<IconPlus size={14} strokeWidth={1.5} />}
          >
            Add Message
          </Button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default WSBody;
