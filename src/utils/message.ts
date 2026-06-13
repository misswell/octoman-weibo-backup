// Chrome runtime message 工具

export interface WeiProcessData {
  uid?: string;
  name?: string;
  avatar?: string;
  num?: number;
  total?: number | string;
  tip?: string;
}

export interface WeiMessage {
  type: 'wei_process' | 'wei_fail' | string;
  data?: WeiProcessData | string;
}

export function sendMessage<T = unknown>(type: string, data?: unknown): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, data }, (res) => {
      void chrome.runtime.lastError;
      resolve(res as T);
    });
  });
}

export function broadcast(message: WeiMessage): void {
  try {
    chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
  } catch {
    // popup may not be open
  }
}
