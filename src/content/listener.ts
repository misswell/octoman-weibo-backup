// Content script: 轻量辅助，从当前页面 URL/DOM 里尽力提取 uid

function uidFromUrl(): string {
  try {
    const url = location.href;
    let m = url.match(/weibo\.com\/u\/(\d{5,})/);
    if (m) return m[1];
    m = url.match(/weibo\.cn\/u\/(\d{5,})/);
    if (m) return m[1];
    m = url.match(/m\.weibo\.cn\/profile\/(\d{5,})/);
    if (m) return m[1];
    return '';
  } catch {
    return '';
  }
}

function uidFromDom(): string {
  try {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="uid"], meta[property="og:uid"]',
    );
    if (meta?.content && /^\d+$/.test(meta.content)) return meta.content;
    const cfg = (window as unknown as Record<string, unknown>).$CONFIG as
      | Record<string, unknown>
      | undefined;
    if (cfg) {
      if (cfg.oid && /^\d+$/.test(String(cfg.oid))) return String(cfg.oid);
      if (cfg.uid && /^\d+$/.test(String(cfg.uid))) return String(cfg.uid);
    }
  } catch {
    // ignore
  }
  return '';
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (!req) return false;
  if (req.type === 'detect_uid') {
    sendResponse({ uid: uidFromUrl() || uidFromDom() || '' });
    return false;
  }
  return false;
});
