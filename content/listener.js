// 现版本逻辑全部走 m.weibo.cn 接口，content script 只做轻量的辅助：
// 当 popup 主动询问时，从当前页面 URL/DOM 里尽力提取 uid。

function uidFromUrl() {
  try {
    const url = location.href;
    let m = url.match(/weibo\.com\/u\/(\d{5,})/);
    if (m) return m[1];
    m = url.match(/weibo\.cn\/u\/(\d{5,})/);
    if (m) return m[1];
    m = url.match(/m\.weibo\.cn\/profile\/(\d{5,})/);
    if (m) return m[1];
    return '';
  } catch (_) {
    return '';
  }
}

function uidFromDom() {
  try {
    const meta = document.querySelector('meta[name="uid"], meta[property="og:uid"]');
    if (meta && meta.content && /^\d+$/.test(meta.content)) return meta.content;
    const cfg = window.$CONFIG || {};
    if (cfg.oid && /^\d+$/.test(cfg.oid)) return cfg.oid;
    if (cfg.uid && /^\d+$/.test(cfg.uid)) return cfg.uid;
  } catch (_) {}
  return '';
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (!req) return false;
  if (req.type === 'detect_uid') {
    sendResponse({ uid: uidFromUrl() || uidFromDom() || '' });
    return false;
  }
  return false;
});
