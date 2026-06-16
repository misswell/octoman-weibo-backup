// MV3 service worker: 直接抓 m.weibo.cn 接口, 组合 HTML 并通过 chrome.downloads 保存

importScripts('utils/config.js');

const TASKS = new Map();
let LAST_PROGRESS = null;
let LAST_VERIFY = null;
const ALARM_PREFIX = 'wb_retry_';
const TASK_STORE_KEY = 'wb_tasks_v2';
const QUEUE_STORE_KEY = 'wb_queue_v1';
const DOWNLOAD_DIR = 'WeiboBackup';
const DOWNLOAD_FILENAME_QUEUE = [];

// ========== 下载队列 ==========
// QUEUE: 有序数组，存储 uid 顺序
// QUEUE_STATES: Map<uid, 'active'|'paused'|'waiting'>
let QUEUE = [];
let QUEUE_STATES = new Map();
let QUEUE_RUNNING = false;
let QUEUE_INITIALIZED = false;



// 保存队列状态
// Check if any queue item is currently active
function hasActiveTask() {
  for (const uid of QUEUE) {
    if (QUEUE_STATES.get(uid) === 'active') return true;
  }
  return false;
}

function persistQueue() {
  try {
    const dump = {
      queue: QUEUE.slice(),
      states: {}
    };
    for (const [uid, state] of QUEUE_STATES.entries()) {
      dump.states[uid] = state;
    }
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [QUEUE_STORE_KEY]: dump });
    }
  } catch (_) {}
}

// 恢复队列状态
async function restoreQueue() {
  if (!chrome.storage || !chrome.storage.local) return;
  return new Promise(resolve => {
    chrome.storage.local.get([QUEUE_STORE_KEY], items => {
      const dump = items && items[QUEUE_STORE_KEY];
      if (dump) {
        QUEUE = dump.queue || [];
        QUEUE_STATES = new Map();
        if (dump.states) {
          for (const uid of Object.keys(dump.states)) {
            QUEUE_STATES.set(uid, dump.states[uid]);
          }
        }
      }
      if (!QUEUE_INITIALIZED) {
        // First restore after service worker restart: tasks are actually stopped.
        // Set them all to 'paused' so user can manually resume.
        for (const uid of QUEUE) {
          QUEUE_STATES.set(uid, 'paused');
        }
        QUEUE_INITIALIZED = true;
      }
      QUEUE_RUNNING = hasActiveTask();
      resolve();
    });
  });
}

// 获取队列信息（给 popup 用）
function getQueueInfo() {
  const items = QUEUE.map(uid => {
    const t = TASKS.get(uid);
    const state = QUEUE_STATES.get(uid) || 'waiting';
    return {
      uid: uid,
      username: (t && t.username) || uid,
      avatar: (t && t.avatar) || '',
      total: (t && t.total) || 0,
      num: (t && t.num) || 0,
      state: state,
      tip: (t && t.tip) || '',
      step: (t && t.step) || ''
    };
  });
  return { items: items, running: QUEUE_RUNNING };
}

// 将 uid 加入队列尾部
function enqueueUid(uid) {
  if (!QUEUE.includes(uid)) {
    QUEUE.push(uid);
    QUEUE_STATES.set(uid, hasActiveTask() ? 'waiting' : 'active');
    persistQueue();
    broadcastQueue();
  }
}

// 从队列移除 uid
function dequeueUid(uid) {
  const idx = QUEUE.indexOf(uid);
  if (idx !== -1) {
    QUEUE.splice(idx, 1);
    QUEUE_STATES.delete(uid);
    persistQueue();
    broadcastQueue();
  }
}

// 暂停队列中的任务
function pauseQueueItem(uid) {
  const state = QUEUE_STATES.get(uid);
  if (state === 'active') {
    QUEUE_STATES.set(uid, 'paused');
    QUEUE_RUNNING = false;
    // 停止任务
    const task = TASKS.get(uid);
    if (task) {
      task.stopped = true;
      if (task.timer) clearTimeout(task.timer);
      persistTasks();
    }
    // 取消重试定时器
    try { chrome.alarms.clear(ALARM_PREFIX + uid); } catch (_) {}
    persistQueue();
    broadcastQueue();
    // 尝试启动下一个等待中的任务
    processQueue();
  } else if (state === 'waiting' || state === 'active') {
    QUEUE_STATES.set(uid, 'paused');
    persistQueue();
    broadcastQueue();
  }
}

// 恢复队列中的任务
function resumeQueueItem(uid) {
  const state = QUEUE_STATES.get(uid);
  if (state === 'paused') {
    QUEUE_STATES.set(uid, 'waiting');
    persistQueue();
    broadcastQueue();
    processQueue();
  }
}

// 广播队列状态
function broadcastQueue() {
  broadcast({ type: 'wei_queue', data: getQueueInfo() });
}

// 处理队列：取出一个等待中的任务开始执行
function processQueue() {
  // 如果已有任务在运行，不启动新任务
  if (QUEUE_RUNNING) return;
  
  // 找到第一个 waiting 或 active 的任务
  for (const uid of QUEUE) {
    const state = QUEUE_STATES.get(uid);
    if (state === 'waiting' || state === 'active') {
      QUEUE_RUNNING = true;
      QUEUE_STATES.set(uid, 'active');
      persistQueue();
      broadcastQueue();
      // 启动任务
      startTaskInternal(uid);
      return;
    }
  }
  
  // 没有可执行任务
  broadcastQueue();
}

// 任务完成后的回调
function onTaskComplete(uid) {
  QUEUE_RUNNING = false;
  dequeueUid(uid);
  // 启动队列中的下一个任务
  processQueue();
}

function removeQueuedFilename(filename) {
  const index = DOWNLOAD_FILENAME_QUEUE.indexOf(filename);
  if (index !== -1) DOWNLOAD_FILENAME_QUEUE.splice(index, 1);
}

function persistTasks() {
  try {
    const dump = {};
    for (const [uid, t] of TASKS.entries()) {
      dump[uid] = {
        uid: t.uid,
        username: t.username,
        avatar: t.avatar,
        total: t.total,
        containerid: t.containerid,
        page: t.page,
        num: t.num,
        htmlIndex: t.htmlIndex,
        retry: t.retry,
        cards: t.cards,
        stopped: !!t.stopped,
        tip: t.tip || '',
        step: t.step || ''
      };
    }
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [TASK_STORE_KEY]: dump });
    }
  } catch (_) {}
}

async function restoreTasks() {
  if (!chrome.storage || !chrome.storage.local) return;
  return new Promise(resolve => {
    chrome.storage.local.get([TASK_STORE_KEY], items => {
      const dump = items && items[TASK_STORE_KEY];
      if (dump) {
        for (const uid of Object.keys(dump)) {
          if (!TASKS.has(uid)) {
            const t = Object.assign({}, dump[uid]);
            t.timer = null;
            TASKS.set(uid, t);
          }
        }
      }
      resolve();
    });
  });
}

function pad(num, n) {
  let s = String(num);
  while (s.length < (n || 2)) s = '0' + s;
  return s;
}

function safeDownloadName(name, fallback) {
  const cleaned = String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '');
  return cleaned || String(fallback || 'weibo');
}

function backupDownloadPath(filename) {
  return DOWNLOAD_DIR + '/' + safeDownloadName(filename, 'weibo.html');
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nextPageDelayMs(setting) {
  const configured = parseFloat(setting);
  const base = Number.isFinite(configured) && configured >= 1 ? configured : 4;
  // 核心间隔：base * 0.7 ~ base * 1.3，不低于 base 的一半
  let seconds = randomBetween(base * 0.7, base * 1.3);

  // 随机额外暂停模拟人类浏览行为
  const roll = Math.random();
  if (roll < 0.04) {
    seconds += randomBetween(10, 25);
  } else if (roll < 0.12) {
    seconds += randomBetween(4, 10);
  } else if (roll < 0.30) {
    seconds += randomBetween(1.5, 4);
  }

  return Math.round(seconds * 1000);
}

async function fetchJSON(url, params) {
  const usp = new URLSearchParams(params || {});
  const full = usp.toString() ? url + '?' + usp.toString() : url;

  // Read XSRF-TOKEN from weibo.cn cookie
  let xsrfToken = '';
  try {
    const cookie = await new Promise((resolve, reject) => {
      chrome.cookies.get({ url: 'https://m.weibo.cn', name: 'XSRF-TOKEN' }, c => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(c);
      });
    });
    xsrfToken = (cookie && cookie.value) || '';
  } catch (_) {}

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'MWeibo-Pwa': '1',
    Referer: 'https://m.weibo.cn/'
  };
  if (xsrfToken) {
    headers['X-XSRF-TOKEN'] = xsrfToken;
    headers['x-xsrf-token'] = xsrfToken;
  }

  let res;
  try {
    res = await fetch(full, {
      credentials: 'include',
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: headers
    });
  } catch (e) {
    throw new Error('NETWORK: ' + (e.message || 'fetch failed'));
  }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function pushProgress(payload) {
  LAST_PROGRESS = payload;
  if (payload && payload.uid) {
    const t = TASKS.get(payload.uid);
    if (t) {
      t.tip = payload.tip || '';
      t.step = payload.step || '';
    }
  }
  broadcast({ type: 'wei_process', data: payload });
}

function pushFail(text) {
  broadcast({ type: 'wei_fail', data: text });
}
function pushVerify(url, text) {
  LAST_VERIFY = { url: url, text: text || '微博接口需要验证，请点击以下链接完成验证后重试' };
  try { chrome.storage.local.set({ wb_verify: LAST_VERIFY }); } catch(_) {}
  broadcast({ type: 'wei_verify', data: LAST_VERIFY });
  openCaptchaTab(url);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fixMediaUrl(text) {
  return String(text || '')
    .replace(/="\/\//g, '="https://')
    .replace(/='\/\//g, "='https://")
    .replace(/href="\/status/g, 'href="https://m.weibo.cn/status')
    .replace(/href="\/n/g, 'href="https://m.weibo.cn/n')
    .replace(/<a data-url=/g, '<a target="_blank" data-url=');
}

function htmlHead(title) {
  return '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0">\n<title>' + escapeHtml(title || 'Document') + '</title>\n<link rel="stylesheet" href="https://h5.sinaimg.cn/marvel/v1.4.5/css/card/cards.css">\n<link rel="stylesheet" href="https://h5.sinaimg.cn/marvel/v1.4.5/css/lib/base.css">\n<style>[class*=m-imghold]>a>img{z-index:0;height:100%;position:absolute;}</style>\n</head>\n<body>\n<div id="app" class="m-container-max"><div style="height:100%;">';
}

function htmlFoot() {
  return '</div></div></body></html>';
}

function htmlPics(pics, picture) {
  if (!pics || !pics.length) return '';
  let s = '<div class="weibo-media-wraps weibo-media media-b"><ul class="m-auto-list">';
  for (const p of pics) {
    const large = (p.large && p.large.url) || p.url;
    const thumb = p.url;
    const src = picture === '1' ? thumb : large;
    s += '<li class="m-auto-box"><div class="m-img-box m-imghold-square">';
    s += '<a target="_blank" href="' + (large || '') + '"><img src="' + (src || '') + '"></a>';
    s += '</div></li>';
  }
  s += '</ul></div>';
  return s;
}

function htmlCard(mblog, opts) {
  if (!mblog) return '';
  const text = fixMediaUrl(mblog.text || '');
  const picsHtml = mblog.pic_num > 0 ? htmlPics(mblog.pics, opts.picture) : '';

  let retweet = '';
  if (mblog.retweeted_status) {
    const rtw = mblog.retweeted_status;
    const rtxt = fixMediaUrl(rtw.text || '');
    const rname = (rtw.user && rtw.user.screen_name) || '';
    const rprofile = (rtw.user && rtw.user.profile_url) || '';
    const rpics = rtw.pic_num > 0 ? htmlPics(rtw.pics, opts.picture) : '';
    retweet = '<div class="weibo-rp"><div class="weibo-text"><span><a href="' + rprofile + '">@' + escapeHtml(rname) + '</a>:</span><span>' + rtxt + '</span></div>' + (rpics ? '<div>' + rpics + '</div>' : '') + '</div>';
  }

  let footer = '';
  if (opts.comment === '1') {
    footer = '<footer class="m-ctrl-box m-box-center-a">'
      + '<div class="m-diy-btn m-box-col m-box-center m-box-center-a"><i class="m-font m-font-forward"></i><h4>' + (mblog.reposts_count || 0) + '</h4></div>'
      + '<span class="m-line-gradient"></span>'
      + '<div class="m-diy-btn m-box-col m-box-center m-box-center-a"><i class="m-font m-font-comment"></i><h4>' + (mblog.comments_count || 0) + '</h4></div>'
      + '<span class="m-line-gradient"></span>'
      + '<div class="m-diy-btn m-box-col m-box-center m-box-center-a"><i class="m-icon m-icon-like"></i><h4>' + (mblog.attitudes_count || 0) + '</h4></div>'
      + '</footer>';
  }

  const detailUrl = mblog.idstr ? ('https://m.weibo.cn/detail/' + mblog.idstr) : '#';
  const avatar = (mblog.user && mblog.user.profile_image_url) || '';
  const name = (mblog.user && mblog.user.screen_name) || '';

  return '<div class="card m-panel card9 weibo-member"><div class="card-wrap"><div class="card-main">'
    + '<header class="weibo-top m-box m-avatar-box">'
    + '<a class="m-img-box" href="' + detailUrl + '" target="_blank"><img src="' + avatar + '"><i class="m-icon m-icon-goldv-static"></i></a>'
    + '<div class="m-box-col m-box-dir m-box-center"><div class="m-text-box"><a>'
    + '<h3 class="m-text-cut">' + escapeHtml(name) + '<i class="m-icon m-icon-vipl7"></i></h3></a>'
    + '<h4 class="m-text-cut"><span class="time">' + escapeHtml(mblog.created_at || '') + '</span><span class="from">' + (mblog.source ? '来自 ' + mblog.source : '') + '</span></h4>'
    + '</div></div>'
    + '</header>'
    + '<article class="weibo-main"><div class="weibo-og"><div class="weibo-text">' + text + '</div><div>' + picsHtml + '</div></div>'
    + retweet
    + '</article>'
    + footer
    + '</div></div></div>';
}

async function downloadHTML(filename, content) {
  const b64 = btoa(unescape(encodeURIComponent(content)));
  const dataUrl = 'data:text/html;charset=utf-8;base64,' + b64;
  return new Promise((resolve, reject) => {
    DOWNLOAD_FILENAME_QUEUE.push(filename);
    chrome.downloads.download(
      { url: dataUrl, filename: filename, saveAs: false, conflictAction: 'uniquify' },
      id => {
        if (chrome.runtime.lastError) {
          removeQueuedFilename(filename);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          setTimeout(() => removeQueuedFilename(filename), 30000);
          resolve(id);
        }
      }
    );
  });
}

async function flushTask(task, suffix) {
  if (!task.cards.length) return;
  const opts = await configGetAll();
  const parts = [htmlHead(task.username)];
  for (const m of task.cards) parts.push(htmlCard(m, { picture: opts.PIC_SHOW, comment: opts.COMMENT_ROW }));
  parts.push(htmlFoot());
  const html = parts.join('');
  const n = task.total > 50000 ? 3 : 2;
  const filename = backupDownloadPath(safeDownloadName(task.username, task.uid) + '_' + pad(task.htmlIndex, n) + (suffix || '') + '.html');
  try {
    await downloadHTML(filename, html);
  } catch (err) {
    console.warn('download fail', err);
  }
  task.cards = [];
  task.htmlIndex += 1;
}

async function fetchProfile(uid) {
  const res = await fetchJSON('https://m.weibo.cn/api/container/getIndex', {
    type: 'uid',
    value: uid,
    containerid: '100505' + uid
  });
  if (!res || res.ok !== 1) {
    const errno = res && res.errno;
    const msg = (res && (res.msg || res.errno)) ? String(res.msg || res.errno) : '';
    const captchaUrl = (res && res.url) || '';
    // -100: captcha/verification needed
    if (errno === '-100' || errno === -100 || String(errno) === '-100') {
      const backUrl = encodeURIComponent('https://m.weibo.cn/u/' + uid);
      const verifyUrl = captchaUrl ? (captchaUrl + backUrl) : ('https://m.weibo.cn/login?backURL=' + backUrl);
      pushVerify(verifyUrl, '微博需要验证码，请点击链接完成验证后重试');
      throw new Error('微博需要验证码，请先完成验证');
    }
    // Other auth/verify errors (20003, 20010, 20021 etc.)
    if (errno === 20003 || errno === 20010 || errno === 20021 || (msg && /login|verify|验证|登录/.test(msg))) {
      const backUrl = encodeURIComponent('https://m.weibo.cn/u/' + uid);
      const verifyUrl = captchaUrl ? (captchaUrl + backUrl) : ('https://m.weibo.cn/login?backURL=' + backUrl);
      pushVerify(verifyUrl, '微博接口需要验证，请点击链接登录后重试');
      throw new Error('微博接口拒绝(' + msg + ')，请先完成验证');
    }
    const errText = msg ? '微博接口拒绝(' + msg + ')，请确认已登录 m.weibo.cn 并重试' : '无法获取用户资料,可能未登录或 UID 无效';
    throw new Error(errText);
  }
  const u = res.data && res.data.userInfo;
  if (!u || !u.id) throw new Error('用户资料不完整');
  const total = parseInt(u.statuses_count, 10) || 0;
  return {
    uid: String(u.id),
    username: u.screen_name || String(u.id),
    avatar: u.profile_image_url || u.avatar_hd || '',
    total: total,
    containerid: '107603' + u.id
  };
}

async function fetchPage(containerid, page, uid) {
  const res = await fetchJSON('https://m.weibo.cn/api/container/getIndex', {
    type: 'uid',
    value: uid || '',
    containerid: containerid,
    page_type: '03',
    page: page
  });
  if (!res || res.ok !== 1) {
    const errno = res && res.errno;
    const msg = (res && (res.msg || res.errno)) ? String(res.msg || res.errno) : '';
    const captchaUrl = (res && res.url) || '';
    // -100: captcha/verification needed
    if (errno === '-100' || errno === -100 || String(errno) === '-100') {
      const backUrl = encodeURIComponent('https://m.weibo.cn/u/' + uid);
      const verifyUrl = captchaUrl ? (captchaUrl + backUrl) : ('https://m.weibo.cn/login?backURL=' + backUrl);
      pushVerify(verifyUrl, '微博需要验证码，请点击链接完成验证后重试');
      throw new Error('微博需要验证码，请先完成验证');
    }
    if (errno === 20003 || errno === 20010 || errno === 20021 || (msg && /login|verify|验证|登录/.test(msg))) {
      const backUrl = encodeURIComponent('https://m.weibo.cn/u/' + uid);
      const verifyUrl = captchaUrl ? (captchaUrl + backUrl) : ('https://m.weibo.cn/login?backURL=' + backUrl);
      pushVerify(verifyUrl, '微博接口需要验证，请点击链接登录后重试');
      throw new Error('微博接口拒绝，请先完成验证');
    }
    // ok===0 with empty cards means user has no more posts - mark complete
    if (res && res.ok === 0) {
      const pageData = res.data || {};
      const rawCards = pageData.cards;
      // Only mark complete when cards is an actual empty array (not missing/undefined)
      if (Array.isArray(rawCards) && rawCards.length === 0) {
        return { __COMPLETE: true, cards: [] };
      }
    }
    throw new Error('接口返回异常: ' + (msg || '未知错误'));
  }
  return res.data || {};
}

async function fetchLongText(idstr) {
  try {
    const res = await fetchJSON('https://m.weibo.cn/statuses/extend', { id: idstr });
    if (res && res.ok === 1 && res.data && res.data.longTextContent) {
      return res.data.longTextContent;
    }
  } catch (_) {}
  return null;
}

async function maybeExpandLong(mblog) {
  if (!mblog) return;
  if (mblog.isLongText && mblog.idstr) {
    const long = await fetchLongText(mblog.idstr);
    if (long) mblog.text = long;
  }
  if (mblog.retweeted_status && mblog.retweeted_status.isLongText && mblog.retweeted_status.idstr) {
    const long = await fetchLongText(mblog.retweeted_status.idstr);
    if (long) mblog.retweeted_status.text = long;
  }
}

async function expandLongTexts(mblogs) {
  const batchSize = 2;
  for (let i = 0; i < mblogs.length; i += batchSize) {
    const batch = mblogs.slice(i, i + batchSize);
    await Promise.all(batch.map(m => maybeExpandLong(m).catch(() => {})));
    if (i + batchSize < mblogs.length) {
      await wait(randomBetween(500, 1500));
    }
  }
}

// ---------- 倒退重试 ----------
// 根据已重试次数计算下次重试等待分钟数（递增退避）
function nextRetryMinutes(task) {
  // retry 从 0 开始计数。第 0 次网络异常 → 等 1 分钟，第 1 次 → 2 分，第 2 次 → 4 分，最多 30 分钟
  const backoff = [5, 10, 20, 30, 60, 120];
  const idx = Math.min(task.retry || 0, backoff.length - 1);
  const mins = backoff[idx];
  return Math.round(mins * (1 + Math.random() * 0.3));
}

// 网络失败 / 接口异常 统一处理
function handlePageError(task) {
  task.retry = (task.retry || 0) + 1;
  const mins = nextRetryMinutes(task);
  const tip = mins + '分钟后自动重试（第' + task.retry + '次）';
  pushProgress({ uid: task.uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: tip, step: '等待重试' });
  scheduleRetry(task.uid, mins);
}

async function runLoop(uid) {
  const task = TASKS.get(uid);
  if (!task || task.stopped) return;
  task.step = '准备请求第' + task.page + '页';

  // 初始随机延迟（首次 2~6s，后续 0.5~2s）
  if (task.page === 1) {
    await wait(randomBetween(2000, 6000));
  }

  let data;
  try {
    data = await fetchPage(task.containerid, task.page, task.uid);
  } catch (err) {
    const errMsg = (err && err.message) || '';
    if (/验证|登录|verify|login/i.test(errMsg)) {
      pushFail(errMsg || '接口需要验证');
      task.step = '需要验证';
      pauseQueueItem(uid);
    } else if (errMsg.startsWith('NETWORK:')) {
      task.step = '网络异常';
      handlePageError(task);
    } else {
      task.step = '请求失败';
      handlePageError(task);
    }
    return;
  }

  if (task.stopped) return; // 可能在等待期间被结束

    // fetchPage signals completion when ok===0 with no more content
  if (data && data.__COMPLETE) {
    await flushTask(task, '_finish');
    pushProgress({ uid: uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: '完成' });
    task.stopped = true;
    TASKS.delete(uid);
    clearTaskStore(uid);
    onTaskComplete(uid);
    return;
  }

  const cards = (data.cards || []).filter(c => c && c.card_type === 9 && c.mblog);
  if (data.cardlistInfo && data.cardlistInfo.total) task.total = data.cardlistInfo.total;

  if (cards.length === 0) {
    // No more post cards (card_type===9) — all visible posts downloaded
    // This covers: ok===0 with empty cards, or ok===1 with only non-post cards (e.g. card_type:58 notice)
    await flushTask(task, '_finish');
    pushProgress({ uid: uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: '完成' });
    task.stopped = true;
    TASKS.delete(uid);
    clearTaskStore(uid);
    onTaskComplete(uid);
    return;
  }

  // 成功拉到数据 → 重置网络重试计数
  task.retry = 0;
  task.num += cards.length;

  const mblogs = cards.map(c => c.mblog);
  await expandLongTexts(mblogs);

  task.cards.push(...mblogs);
  task.page += 1;

  const opts = await configGetAll();
  const perPage = parseInt(opts.PER_PAGE, 10) || 500;
  if (task.cards.length >= perPage) {
    await flushTask(task, '');
  }

  pushProgress({ uid: uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: '下载中', step: '第' + task.page + '页' });

  persistTasks();
  task.timer = setTimeout(() => runLoop(uid), nextPageDelayMs(opts.DELAY_PAGE));
}

// 全新开始

async function startTaskInternal(uid) {
  await restoreTasks();
  const existing = TASKS.get(uid);
  if (existing) {
    if (existing.stopped) existing.stopped = false;
    if (existing.timer) clearTimeout(existing.timer);
    try {
      const profile = await fetchProfile(uid);
      existing.username = profile.username;
      existing.avatar = profile.avatar;
      existing.total = profile.total || existing.total;
      existing.containerid = profile.containerid || existing.containerid;
      persistTasks();
    } catch (_) {}
    pushProgress({ uid: uid, name: existing.username, avatar: existing.avatar, num: existing.num, total: existing.total, tip: '继续备份中', step: '获取资料' });
    runLoop(uid);
    return;
  }

  let profile;
  try {
    profile = await fetchProfile(uid);
  } catch (err) {
    const errMsg = (err && err.message) || '获取用户失败';
    pushFail(errMsg);
    if (/验证|登录|login|verify/i.test(errMsg)) {
      pauseQueueItem(uid);
    } else {
      onTaskComplete(uid);
    }
    return;
  }
  const task = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    total: profile.total,
    containerid: profile.containerid,
    page: 1,
    num: 0,
    htmlIndex: 1,
    retry: 0,
    cards: [],
    timer: null,
    stopped: false
  };
  TASKS.set(profile.uid, task);
  persistTasks();
  pushProgress({ uid: profile.uid, name: profile.username, avatar: profile.avatar, num: 0, total: profile.total, tip: '开始', step: '获取资料' });
  runLoop(profile.uid);
}

async function startTask(uid, forceRestart) {
  await restoreTasks();
  await restoreQueue();

  const existing = TASKS.get(uid);

  if (existing && !forceRestart) {
    enqueueUid(uid);
    if (!hasActiveTask()) {
      processQueue();
    }
    return;
  }

  if (existing) {
    if (existing.timer) clearTimeout(existing.timer);
    existing.stopped = true;
    TASKS.delete(uid);
  }

  let profile;
  try {
    profile = await fetchProfile(uid);
  } catch (err) {
    const errMsg = (err && err.message) || '获取用户失败';
    pushFail(errMsg);
    if (/验证|登录|verify|login/i.test(errMsg)) {
      pauseQueueItem(uid);
    }
    return;
  }

  const task = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    total: profile.total,
    containerid: profile.containerid,
    page: 1,
    num: 0,
    htmlIndex: 1,
    retry: 0,
    cards: [],
    timer: null,
    stopped: false
  };
  TASKS.set(profile.uid, task);
  persistTasks();
  pushProgress({ uid: profile.uid, name: profile.username, avatar: profile.avatar, num: 0, total: profile.total, tip: '已入队', step: '获取资料' });

  enqueueUid(profile.uid);
  if (!hasActiveTask()) {
    processQueue();
  }
}



async function removeQueueItem(uid) {
  const task = TASKS.get(uid);
  if (task) {
    task.stopped = true;
    if (task.timer) clearTimeout(task.timer);
    try { await flushTask(task, '_finish'); } catch (_) {}
    TASKS.delete(uid);
    clearTaskStore(uid);
  }

  const state = QUEUE_STATES.get(uid);
  if (state === 'active') {
    QUEUE_RUNNING = false;
  }

  dequeueUid(uid);

  processQueue();
}
async function stopAll() {
  for (const [uid, task] of TASKS.entries()) {
    task.stopped = true;
    if (task.timer) clearTimeout(task.timer);
    try { await flushTask(task, '_finish'); } catch (_) {}
    pushProgress({ uid: uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: '完成' });
  }
  TASKS.clear();
  persistTasks();
}

// 查询某 uid 是否有未完成任务（给 popup 用）
async function getTaskState(uid) {
  await restoreTasks();
  const t = TASKS.get(uid);
  if (t && !t.stopped) {
    return {
      hasTask: true,
      name: t.username,
      avatar: t.avatar,
      num: t.num,
      total: t.total
    };
  }
  return { hasTask: false };
}

function clearTaskStore(uid) {
  if (!chrome.storage || !chrome.storage.local) return;
  chrome.storage.local.get([TASK_STORE_KEY], items => {
    const dump = items && items[TASK_STORE_KEY];
    if (dump) {
      delete dump[uid];
      chrome.storage.local.set({ [TASK_STORE_KEY]: dump });
    }
  });
}

// ---------- Message handling ----------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return false;
  switch (request.type) {
    case 'wei_save': {
      const uid = request.data && request.data.uid;
      if (!uid) {
        pushFail('请提供 UID');
      } else {
        startTask(String(uid).trim(), !!request.data.forceRestart);
      }
      sendResponse('ok');
      return false;
    }
    case 'stop_all':
      stopAll();
      sendResponse('ok');
      return false;
    case 'last_process':
      if (LAST_PROGRESS) broadcast({ type: 'wei_process', data: LAST_PROGRESS });
      sendResponse('ok');
      return false;
    case 'get_task_state': {
      const uid = request.data && request.data.uid;
      if (uid) {
        getTaskState(uid).then(state => sendResponse(state));
        return true; // async
      }
      sendResponse({ hasTask: false });
      return false;
    }
    case 'get_queue':
      if (QUEUE_INITIALIZED) {
        sendResponse(getQueueInfo());
        return false;
      }
      restoreQueue().then(() => {
        restoreTasks().then(() => {
          sendResponse(getQueueInfo());
        });
      });
      return true; // async
    case 'get_verify':
      sendResponse(LAST_VERIFY || null);
      return false;
    case 'clear_verify':
      LAST_VERIFY = null;
      try { chrome.storage.local.remove('wb_verify'); } catch(_) {}
      sendResponse('ok');
      return false;
    case 'queue_pause': {
      const uid = request.data && request.data.uid;
      if (uid) pauseQueueItem(String(uid));
      sendResponse('ok');
      return false;
    }
    case 'queue_resume': {
      const uid = request.data && request.data.uid;
      if (uid) resumeQueueItem(String(uid));
      sendResponse('ok');
      return false;
    }
    case 'queue_remove': {
      const uid = request.data && request.data.uid;
      if (uid) {
        removeQueueItem(String(uid)).then(() => sendResponse('ok'));
        return true;
      }
      sendResponse('ok');
      return false;
    }
    case 'option':
      chrome.runtime.openOptionsPage();
      sendResponse('ok');
      return false;
    default:
      return false;
  }
});

if (chrome.downloads && chrome.downloads.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // Only handle our own extension's downloads (data:text/html = our backup HTML)
    if (!item || !item.url || item.url.indexOf('data:text/html') !== 0) {
      // Not our download - return false to avoid interfering with other extensions
      return false;
    }
    const filename = DOWNLOAD_FILENAME_QUEUE.shift();
    if (!filename) {
      return false;
    }
    // Check filename starts with our download directory to avoid conflict
    suggest({ filename: filename, conflictAction: 'uniquify' });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

ensureDefaults();

function scheduleRetry(uid, minutes) {
  try {
    chrome.alarms.create(ALARM_PREFIX + uid, { delayInMinutes: minutes });
  } catch (_) {
    setTimeout(() => runLoop(uid), minutes * 60 * 1000);
  }
}

if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener(alarm => {
    if (!alarm || !alarm.name) return;
    if (alarm.name.indexOf(ALARM_PREFIX) === 0) {
      const uid = alarm.name.slice(ALARM_PREFIX.length);
      restoreTasks().then(() => {
        if (TASKS.has(uid)) runLoop(uid);
      });
    }
  });
}
function broadcast(msg) {
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch(e) {
    // Popup may not be open, ignore
  }
}

function openCaptchaTab(url) {
  try {
    chrome.tabs.create({ url: url, active: true });
  } catch(_) {}
}
