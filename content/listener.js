// 现版本逻辑全部走 m.weibo.cn 接口，content script 只做轻量的辅助：
// 当 popup 主动询问时，从当前页面 URL/DOM 里尽力提取 uid / 用户列表。

function normalizeName(name, uid) {
  return String(name || '')
    .trim()
    .replace(/的微博.*$/, '')
    .replace(/微博.*$/, '')
    .replace(/[\s_-]*微博个人主页.*$/, '')
    .replace(/[\s_-]*Weibo.*$/, '')
    .replace(/^@\s*/, '') || uid || '';
}

function uidFromHref(href) {
  if (!href) return '';
  let m = String(href).match(/(?:weibo\.com|weibo\.cn)\/u\/(\d{5,})/);
  if (m) return m[1];
  m = String(href).match(/(?:weibo\.com|weibo\.cn)\/(\d{5,})(?:[/?#]|$)/);
  if (m) return m[1];
  m = String(href).match(/m\.weibo\.cn\/profile\/(\d{5,})/);
  if (m) return m[1];
  m = String(href).match(/(?:^|\/)u\/(\d{5,})/);
  if (m) return m[1];
  m = String(href).match(/(?:^|\/)profile\/(\d{5,})/);
  if (m) return m[1];
  return '';
}

function uidFromUrl() {
  try {
    const url = location.href;
    return uidFromHref(url);
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

function nameFromElement(el, uid) {
  if (!el) return '';
  const name =
    el.getAttribute('title') ||
    el.getAttribute('aria-label') ||
    ((el.querySelector('span[title]') || {}).title) ||
    ((el.querySelector('img[alt]') || {}).alt) ||
    ((el.querySelector('img[title]') || {}).title) ||
    el.textContent ||
    '';
  return normalizeName(name, uid);
}

function nameFromPage(uid) {
  const link = uid ? document.querySelector('a[href*="/u/' + uid + '"], a[href*="/profile/' + uid + '"]') : null;
  return normalizeName(
    (link && nameFromElement(link, uid)) ||
    document.title ||
    '',
    uid
  );
}

function addUser(list, seen, uid, name) {
  uid = String(uid || '').trim();
  if (!/^\d{5,}$/.test(uid) || seen[uid]) return;
  seen[uid] = true;
  list.push({ uid: uid, name: normalizeName(name, uid) || uid });
}

function usersFromDom() {
  const list = [];
  const seen = {};
  const pageUid = uidFromUrl();
  if (pageUid) addUser(list, seen, pageUid, nameFromPage(pageUid));

  document.querySelectorAll('.WB_face .face a').forEach(a => {
    const img = a.querySelector('img');
    const usercard = (img && img.getAttribute('usercard')) || '';
    const cardUid = (usercard.match(/(?:^|&)id=(\d{5,})/) || [])[1];
    addUser(list, seen, cardUid || uidFromHref(a.href), nameFromElement(a, cardUid));
  });

  document.querySelectorAll('.vue-recycle-scroller__item-view').forEach(item => {
    const a = item.querySelector('header a[href*="/u/"], header a[href*="/profile/"], a[href*="/u/"], a[href*="/profile/"]');
    if (!a) return;
    const uid = uidFromHref(a.href || a.getAttribute('href'));
    addUser(list, seen, uid, nameFromElement(a, uid));
  });

  document.querySelectorAll('a[href*="/u/"], a[href*="/profile/"]').forEach(a => {
    const uid = uidFromHref(a.href || a.getAttribute('href'));
    addUser(list, seen, uid, nameFromElement(a, uid));
  });

  if (!list.length) {
    const domUid = uidFromDom();
    if (domUid) addUser(list, seen, domUid, nameFromPage(domUid));
  }

  return list.slice(0, 50);
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (!req) return false;
  if (req.type === 'detect_uid') {
    sendResponse({ uid: uidFromUrl() || uidFromDom() || '' });
    return false;
  }
  if (req.type === 'detect_users') {
    sendResponse({ users: usersFromDom() });
    return false;
  }
  return false;
});
