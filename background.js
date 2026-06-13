// MV3 service worker: 直接抓 m.weibo.cn 接口, 组合 HTML 并通过 chrome.downloads 保存

importScripts('utils/config.js');

const TASKS = new Map();
let LAST_PROGRESS = null;
const ALARM_PREFIX = 'wb_retry_';
const TASK_STORE_KEY = 'wb_tasks_v1';
const DOWNLOAD_DIR = 'WeiboBackup';
const DOWNLOAD_FILENAME_QUEUE = [];

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
        stopped: !!t.stopped
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
  const base = Number.isFinite(configured) && configured >= 0 ? configured : 1.2;
  const min = Math.max(0.35, base * 0.2);
  const max = Math.max(0.65, base * 0.9);
  let seconds = randomBetween(min, max);
  const roll = Math.random();

  if (roll < 0.08) {
    seconds += randomBetween(1.6, 4.8);
  } else if (roll < 0.24) {
    seconds += randomBetween(0.4, 1.3);
  }

  return Math.round(seconds * 1000);
}

async function fetchJSON(url, params) {
  const usp = new URLSearchParams(params || {});
  const full = usp.toString() ? url + '?' + usp.toString() : url;
  let res;
  try {
    res = await fetch(full, {
      credentials: 'include',
      referrer: 'https://m.weibo.cn/',
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'MWeibo-Pwa': '1'
      }
    });
  } catch (e) {
    // 网络层错误（DNS / 连接被拒 / 超时 等）
    throw new Error('NETWORK: ' + (e.message || 'fetch failed'));
  }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function broadcast(message) {
  try {
    chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
  } catch (_) {}
}

function pushProgress(payload) {
  LAST_PROGRESS = payload;
  broadcast({ type: 'wei_process', data: payload });
}

function pushFail(text) {
  broadcast({ type: 'wei_fail', data: text });
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
    const msg = (res && (res.msg || res.errno)) ? '微博接口拒绝(' + (res.msg || res.errno) + ')，请确认已登录 m.weibo.cn 并重试' : '无法获取用户资料,可能未登录或 UID 无效';
    throw new Error(msg);
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
  if (!res || res.ok !== 1) throw new Error('接口返回异常');
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
  const batchSize = 3;
  for (let i = 0; i < mblogs.length; i += batchSize) {
    const batch = mblogs.slice(i, i + batchSize);
    await Promise.all(batch.map(m => maybeExpandLong(m).catch(() => {})));
    if (i + batchSize < mblogs.length) {
      await wait(randomBetween(80, 260));
    }
  }
}

// ---------- 倒退重试 ----------
// 根据已重试次数计算下次重试等待分钟数（递增退避）
function nextRetryMinutes(task) {
  // retry 从 0 开始计数。第 0 次网络异常 → 等 1 分钟，第 1 次 → 2 分，第 2 次 → 4 分，最多 30 分钟
  const backoff = [1, 2, 4, 8, 15, 30];
  const idx = Math.min(task.retry || 0, backoff.length - 1);
  return backoff[idx];
}

// 网络失败 / 接口异常 统一处理
function handlePageError(task) {
  task.retry = (task.retry || 0) + 1;
  const mins = nextRetryMinutes(task);
  const tip = mins + '分钟后自动重试（第' + task.retry + '次）';
  pushProgress({ uid: task.uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: tip });
  scheduleRetry(task.uid, mins);
}

async function runLoop(uid) {
  const task = TASKS.get(uid);
  if (!task || task.stopped) return;

  let data;
  try {
    data = await fetchPage(task.containerid, task.page, task.uid);
  } catch (err) {
    // 如果是网络层错误，保留已抓取的微博数不变，仅递增退避重试
    if (err && err.message && err.message.startsWith('NETWORK:')) {
      handlePageError(task);
    } else {
      // 接口业务错误（ok != 1 等）
      handlePageError(task);
    }
    return;
  }

  if (task.stopped) return; // 可能在等待期间被结束

  const cards = (data.cards || []).filter(c => c && c.card_type === 9 && c.mblog);
  if (data.cardlistInfo && data.cardlistInfo.total) task.total = data.cardlistInfo.total;

  if (cards.length === 0) {
    task.retry += 1;
    const finishPer = task.total ? task.num / task.total : 1;
    if (
      task.retry >= 5 ||
      (task.retry === 4 && finishPer > 0.85) ||
      (task.retry === 3 && finishPer > 0.9) ||
      (task.retry === 2 && finishPer > 0.92) ||
      (task.retry === 1 && finishPer > 0.95)
    ) {
      await flushTask(task, '_finish');
      pushProgress({ uid: uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: '完成' });
      task.stopped = true;
      TASKS.delete(uid);
      clearTaskStore(uid);
    } else {
      const mins = nextRetryMinutes(task);
      pushProgress({ uid: uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: mins + '分钟后重试（第' + task.retry + '次）' });
      scheduleRetry(uid, mins);
    }
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

  pushProgress({ uid: uid, name: task.username, avatar: task.avatar, num: task.num, total: task.total, tip: '下载中' });

  persistTasks();
  task.timer = setTimeout(() => runLoop(uid), nextPageDelayMs(opts.DELAY_PAGE));
}

// 全新开始
async function startTask(uid, forceRestart) {
  // 如果该 uid 有未完成任务且未要求强制重启，直接从断点继续
  await restoreTasks();
  const existing = TASKS.get(uid);
  if (existing && !forceRestart) {
    // 继续已有任务
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
    pushProgress({ uid: uid, name: existing.username, avatar: existing.avatar, num: existing.num, total: existing.total, tip: '继续备份中' });
    runLoop(uid);
    return;
  }

  // 清理旧任务
  if (existing) {
    if (existing.timer) clearTimeout(existing.timer);
    existing.stopped = true;
    TASKS.delete(uid);
  }

  let profile;
  try {
    profile = await fetchProfile(uid);
  } catch (err) {
    pushFail((err && err.message) || '获取用户失败');
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
  pushProgress({ uid: profile.uid, name: profile.username, avatar: profile.avatar, num: 0, total: profile.total, tip: '开始' });
  runLoop(profile.uid);
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
    if (!item || !item.url || item.url.indexOf('data:text/html') !== 0) return;
    const filename = DOWNLOAD_FILENAME_QUEUE.shift();
    if (!filename) return;
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
