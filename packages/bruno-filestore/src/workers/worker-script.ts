import { parentPort } from 'node:worker_threads';
import { parseBruRequest, stringifyBruRequest } from '../formats/bru';
import { parseYmlItem, stringifyYmlItem } from '../formats/yml';
import { CollectionFormat } from '../types';
import { DEFAULT_COLLECTION_FORMAT } from '../constants';

interface WorkerMessage {
  taskType: 'parse' | 'stringify';
  data: {
    data: any;
    format?: CollectionFormat;
  };
}

parentPort?.on('message', async (message: WorkerMessage) => {
  try {
    const { taskType, data: messageData } = message;
    const { data, format = DEFAULT_COLLECTION_FORMAT } = messageData;
    let result: any;

    if (taskType === 'parse') {
      const trimmed = data ? data.trim() : '';
      if (format === 'yml') {
        try {
          result = parseYmlItem(data);
        } catch (e) {
          if (trimmed.startsWith('meta {') || trimmed.startsWith('meta\n{')) {
            result = parseBruRequest(data);
          } else {
            throw e;
          }
        }
      } else {
        try {
          result = parseBruRequest(data);
        } catch (e) {
          if (trimmed.startsWith('info:') || trimmed.startsWith('meta:')) {
            result = parseYmlItem(data);
          } else {
            throw e;
          }
        }
      }
    } else if (taskType === 'stringify') {
      if (format === 'yml') {
        result = stringifyYmlItem(data);
      } else {
        result = stringifyBruRequest(data);
      }
    } else {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    parentPort?.postMessage(result);
  } catch (error: any) {
    console.error('Worker error:', error);
    parentPort?.postMessage({ error: error?.message });
  }
});
