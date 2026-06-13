// 共享配置项与 chrome.storage 包装

export const STORAGE_DEFAULTS: Record<string, unknown> = {
  PER_PAGE: '500',
  COMMENT_ROW: '1', // 1 显示转评赞栏，2 不显示
  PIC_SHOW: '1',    // 1 缩略图，2 大图
  DELAY_PAGE: '3',  // 翻页基础间隔（秒）
};

export const STORAGE_KEYS = Object.keys(STORAGE_DEFAULTS);

export function configGet(key: string): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (items) => {
      const value = items && items[key];
      resolve(value === undefined || value === null ? STORAGE_DEFAULTS[key] as string : String(value));
    });
  });
}

export function configGetAll(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS, (items) => {
      const merged: Record<string, unknown> = { ...STORAGE_DEFAULTS };
      for (const k of STORAGE_KEYS) {
        if (items && items[k] !== undefined && items[k] !== null && items[k] !== '') {
          merged[k] = String(items[k]);
        }
      }
      resolve(merged);
    });
  });
}

export function configSet(data: Record<string, unknown>): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve(true));
  });
}

export function ensureDefaults(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS, (items) => {
      const patch: Record<string, unknown> = {};
      for (const key of STORAGE_KEYS) {
        if (items[key] === undefined || items[key] === null || items[key] === '') {
          patch[key] = STORAGE_DEFAULTS[key];
        }
      }
      if (Object.keys(patch).length === 0) {
        resolve({ ...STORAGE_DEFAULTS, ...items });
        return;
      }
      chrome.storage.local.set(patch, () => resolve({ ...STORAGE_DEFAULTS, ...items, ...patch }));
    });
  });
}
