// MV3 共用配置项与 chrome.storage 包装
const STORAGE_DEFAULTS = {
  PER_PAGE: '500', // 每多少条微博合并为一个 HTML
  COMMENT_ROW: '1', // 1 显示转评赞栏，2 不显示
  PIC_SHOW: '1', // 1 缩略图，2 大图
  DELAY_PAGE: '1.2' // 翻页节奏上限（秒），实际等待会随机抖动
};

const STORAGE_KEYS = Object.keys(STORAGE_DEFAULTS);

function configGet(key) {
  return new Promise(resolve => {
    chrome.storage.local.get([key], items => {
      const value = items && items[key];
      resolve(value === undefined || value === null ? STORAGE_DEFAULTS[key] : value);
    });
  });
}

function configGetAll() {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEYS, items => {
      const merged = { ...STORAGE_DEFAULTS, ...(items || {}) };
      resolve(merged);
    });
  });
}

function configSet(data) {
  return new Promise(resolve => {
    chrome.storage.local.set(data, () => resolve(true));
  });
}

function ensureDefaults() {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEYS, items => {
      const patch = {};
      for (const key of STORAGE_KEYS) {
        if (items[key] === undefined || items[key] === null || items[key] === '') {
          patch[key] = STORAGE_DEFAULTS[key];
        }
      }
      if (Object.keys(patch).length === 0) {
        resolve(items);
        return;
      }
      chrome.storage.local.set(patch, () => resolve({ ...items, ...patch }));
    });
  });
}

(function attachToGlobal(target) {
  target.configGet = configGet;
  target.configGetAll = configGetAll;
  target.configSet = configSet;
  target.ensureDefaults = ensureDefaults;
  target.STORAGE_DEFAULTS = STORAGE_DEFAULTS;
  target.STORAGE_KEYS = STORAGE_KEYS;
})(typeof self !== 'undefined' ? self : this);
