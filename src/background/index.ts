// MV3 service worker: 直接抓 m.weibo.cn 接口, 组合 HTML 并通过 chrome.downloads 保存
import { configGetAll, ensureDefaults } from '../utils/config';
import type { WeiProcessData } from '../utils/message';

interface WBUser {
  id: number;
  screen_name: string;
  profile_image_url: string;
  profile_url: string;
}

interface WBPic {
  url: string;
  large?: { url: string };
}

interface WBStatus {
  idstr: string;
  text: string;
  pics: WBPic[];
  pic_num: number;
  isLongText?: boolean;
  retweeted_status?: WBStatus;
  user?: WBUser;
}

interface WBCard {
  card_type: number;
  mblog: WBStatus;
}

interface WBPageData {
  cards: WBCard[];
  cardlistInfo?: { total: number };
}

interface WBProfileData {
  uid: string;
  username: string;
  avatar: string;
  total: number;
  containerid: string;
}

interface Task {
  uid: string;
  username: string;
  avatar: string;
  total: number;
  containerid: string;
  page: number;
  num: number;
  htmlIndex: number;
  retry: number;
  cards: WBStatus[];
  timer: ReturnType<typeof setTimeout> | null;
  stopped: boolean;
}

const TASKS = new Map<string, Task>();
let LAST_PROGRESS: WeiProcessData | null = null;
const ALARM_PREFIX = 'wb_retry_';
const TASK_STORE_KEY = 'wb_tasks_v1';

// --- Persistence ---
function persistTasks() {
  try {
    const dump: Record<string, Record<string, unknown>> = {};
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
      };
    }
    if (chrome.storage && chrome.storage.session) {
      chrome.storage.session.set({ [TASK_STORE_KEY]: dump });
    }
  } catch {
    // ignore
  }
}

async function restoreTasks() {
  if (!chrome.storage || !chrome.storage.session) return;
  return new Promise<void>((resolve) => {
    chrome.storage.session.get([TASK_STORE_KEY], (items: Record<string, Record<string, unknown>>) => {
      const dump = items && items[TASK_STORE_KEY];
      if (dump) {
        for (const uid of Object.keys(dump)) {
          if (!TASKS.has(uid)) {
            const t: Task = Object.assign(
              { cards: [], timer: null },
              dump[uid],
            ) as unknown as Task;
            t.timer = null;
            TASKS.set(uid, t);
          }
        }
      }
      resolve();
    });
  });
}

// --- Helpers ---
function pad(num: number, n?: number): string {
  let s = String(num);
  while (s.length < (n || 2)) s = '0' + s;
  return s;
}

function pushProgress(payload: WeiProcessData) {
  LAST_PROGRESS = payload;
  try {
    chrome.runtime.sendMessage(
      { type: 'wei_process', data: payload },
      () => void chrome.runtime.lastError,
    );
  } catch {
    // ignore
  }
}

function pushFail(text: string) {
  try {
    chrome.runtime.sendMessage(
      { type: 'wei_fail', data: text },
      () => void chrome.runtime.lastError,
    );
  } catch {
    // ignore
  }
}

function escapeHtml(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fixMediaUrl(text: string): string {
  return String(text || '')
    .replace(/="\/\//g, '="https://')
    .replace(/='\/\//g, "='https://")
    .replace(/href="\/status/g, 'href="https://m.weibo.cn/status')
    .replace(/href="\/n/g, 'href="https://m.weibo.cn/n')
    .replace(/<a data-url=/g, '<a target="_blank" data-url=');
}

// --- API calls ---
async function fetchJSON(url: string, params?: Record<string, string>): Promise<unknown> {
  const usp = new URLSearchParams(params || {});
  const full = usp.toString() ? url + '?' + usp.toString() : url;
  const res = await fetch(full, {
    credentials: 'include',
    referrer: 'https://m.weibo.cn/',
    referrerPolicy: 'strict-origin-when-cross-origin',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'X-Requested-With': 'XMLHttpRequest',
      'MWeibo-Pwa': '1',
    },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function fetchProfile(uid: string): Promise<WBProfileData> {
  const data = (await fetchJSON('https://m.weibo.cn/profile/info', {
    uid: uid,
    page: '1',
    featurecode: '20000200',
  })) as {
    data?: {
      user?: { id: number; screen_name: string; profile_image_url: string };
      containerid?: string;
      total?: number;
    };
  };
  const user = data.data?.user;
  if (!user) throw new Error('获取用户信息失败');
  return {
    uid: String(user.id),
    username: user.screen_name,
    avatar: user.profile_image_url?.replace(/\/orj360\//, '/crop/') || '',
    total: data.data?.total || 0,
    containerid: data.data?.containerid || '',
  };
}

async function fetchPage(
  containerid: string,
  page: number,
  uid: string,
): Promise<WBPageData> {
  return (await fetchJSON('https://m.weibo.cn/api/container/getIndex', {
    containerid: containerid,
    page: String(page),
    uid: uid,
    featurecode: '20000200',
    type: 'uid',
    value: uid,
  })) as WBPageData;
}

async function fetchLongText(idstr: string): Promise<string | null> {
  try {
    const data = (await fetchJSON('https://m.weibo.cn/statuses/extend', {
      id: idstr,
    })) as { data?: { longTextContent?: string } };
    if (data.data?.longTextContent) return data.data.longTextContent;
    return null;
  } catch {
    return null;
  }
}

// --- HTML generation ---
function htmlHead(title: string): string {
  return (
    '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0">\n' +
    '<title>' +
    escapeHtml(title || 'Document') +
    '</title>\n' +
    '<link rel="stylesheet" href="https://h5.sinaimg.cn/marvel/v1.4.5/css/card/cards.css">\n' +
    '<link rel="stylesheet" href="https://h5.sinaimg.cn/marvel/v1.4.5/css/lib/base.css">\n' +
    '<style>[class*=m-imghold]>a>img{z-index:0;height:100%;position:absolute;}</style>\n' +
    '</head>\n<body>\n<div id="app" class="m-container-max"><div style="height:100%;">'
  );
}

function htmlFoot(): string {
  return '</div></div></body></html>';
}

function htmlPics(pics: WBPic[], picture: string): string {
  if (!pics || !pics.length) return '';
  let s = '<div class="weibo-media-wraps weibo-media media-b"><ul class="m-auto-list">';
  for (const p of pics) {
    const large = (p.large && p.large.url) || p.url;
    const thumb = p.url;
    const src = picture === '1' ? thumb : large;
    s += '<li class="m-auto-box"><div class="m-img-box m-imghold-square">';
    s +=
      '<a target="_blank" href="' +
      (large || '') +
      '"><img src="' +
      (src || '') +
      '"></a>';
    s += '</div></li>';
  }
  s += '</ul></div>';
  return s;
}

function htmlCard(mblog: WBStatus, opts: Record<string, string>): string {
  if (!mblog) return '';
  const text = fixMediaUrl(mblog.text || '');
  const picsHtml =
    mblog.pic_num > 0 ? htmlPics(mblog.pics, opts.PIC_SHOW || '1') : '';

  let retweet = '';
  if (mblog.retweeted_status) {
    const rtw = mblog.retweeted_status;
    const rtxt = fixMediaUrl(rtw.text || '');
    const rname = (rtw.user && rtw.user.screen_name) || '';
    const rprofile = (rtw.user && rtw.user.profile_url) || '';
    const rpics =
      rtw.pic_num > 0 ? htmlPics(rtw.pics, opts.PIC_SHOW || '1') : '';
    retweet =
      '<div class="weibo-rp"><div class="weibo-text"><span><a href="' +
      rprofile +
      '">@' +
      escapeHtml(rname) +
      '</a>:</span><span>' +
      rtxt +
      '</span></div>' +
      (rpics ? '<div>' + rpics + '</div>' : '') +
      '</div>';
  }

  let footer = '';
  if (opts.COMMENT_ROW !== '2') {
    footer =
      '<footer class="m-ctrl-box m-box-center-a">' +
      '<div class="m-diy-btn m-box-col m-box-center m-box-center-a"><i class="m-font m-font-forward"></i>' +
      '<span>' +
      (mblog as unknown as Record<string, unknown>).reposts_count || 0 +
      '</span></div>' +
      '<div class="m-diy-btn m-box-col m-box-center m-box-center-a"><i class="m-font m-font-comment"></i>' +
      '<span>' +
      (mblog as unknown as Record<string, unknown>).comments_count || 0 +
      '</span></div>' +
      '<div class="m-diy-btn m-box-col m-box-center m-box-center-a"><i class="m-font m-font-like"></i>' +
      '<span>' +
      (mblog as unknown as Record<string, unknown>).attitudes_count || 0 +
      '</span></div>' +
      '</footer>';
  }

  return (
    '<div class="card m-panel card9">' +
    '<div class="card-wrap">' +
    '<div class="weibo-text">' +
    text +
    '</div>' +
    picsHtml +
    retweet +
    footer +
    '</div></div>'
  );
}

async function flushTask(task: Task, suffix: string) {
  if (!task.cards.length) return;
  const opts = await configGetAll() as Record<string, string>;
  const chunks = task.cards.splice(0);
  const html =
    htmlHead(task.username) +
    chunks.map((m) => htmlCard(m, opts)).join('') +
    htmlFoot();
  const blob = new Blob([html], { type: 'text/html;charset=UTF-8' });
  const url = URL.createObjectURL(blob);
  const filename =
    task.username +
    '_' +
    pad(task.num - chunks.length + 1) +
    '-' +
    pad(task.num) +
    suffix +
    '.html';
  try {
    await chrome.downloads.download({
      url,
      filename,
      saveAs: false,
    });
  } catch {
    // ignore
  }
  URL.revokeObjectURL(url);
  task.htmlIndex += 1;
}

async function maybeExpandLong(mblog: WBStatus) {
  if (mblog.isLongText && mblog.idstr) {
    const long = await fetchLongText(mblog.idstr);
    if (long) mblog.text = long;
  }
  if (
    mblog.retweeted_status &&
    mblog.retweeted_status.isLongText &&
    mblog.retweeted_status.idstr
  ) {
    const long = await fetchLongText(mblog.retweeted_status.idstr);
    if (long) mblog.retweeted_status.text = long;
  }
}

// --- Main loop ---
async function runLoop(uid: string) {
  const task = TASKS.get(uid);
  if (!task || task.stopped) return;

  let data: WBPageData;
  try {
    data = await fetchPage(task.containerid, task.page, task.uid);
  } catch {
    pushProgress({
      uid,
      name: task.username,
      avatar: task.avatar,
      num: task.num,
      total: task.total,
      tip: '5分钟后自动重试',
    });
    scheduleRetry(uid, 5);
    return;
  }

  if (task.stopped) return;

  const cards = (data.cards || []).filter(
    (c) => c && c.card_type === 9 && c.mblog,
  );
  if (data.cardlistInfo && data.cardlistInfo.total) {
    task.total = data.cardlistInfo.total;
  }

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
      pushProgress({
        uid,
        name: task.username,
        avatar: task.avatar,
        num: task.num,
        total: task.total,
        tip: '完成',
      });
      task.stopped = true;
      TASKS.delete(uid);
    } else {
      pushProgress({
        uid,
        name: task.username,
        avatar: task.avatar,
        num: task.num,
        total: task.total,
        tip: '5分钟后重试第' + task.retry + '次',
      });
      scheduleRetry(uid, 5);
    }
    return;
  }

  task.retry = 0;
  task.num += cards.length;

  const mblogs = cards.map((c) => c.mblog);
  for (const m of mblogs) {
    try {
      await maybeExpandLong(m);
    } catch {
      // ignore
    }
  }

  task.cards.push(...mblogs);
  task.page += 1;

  const opts = await configGetAll() as Record<string, string>;
  const perPage = parseInt(opts.PER_PAGE, 10) || 500;
  if (task.cards.length >= perPage) {
    await flushTask(task, '');
  }

  pushProgress({
    uid,
    name: task.username,
    avatar: task.avatar,
    num: task.num,
    total: task.total,
    tip: '下载中',
  });

  const delay = parseFloat(opts.DELAY_PAGE) || 3;
  persistTasks();
  task.timer = setTimeout(
    () => runLoop(uid),
    (delay + Math.random() * 4) * 1000,
  );
}

// --- Task management ---
async function startTask(uid: string) {
  const existing = TASKS.get(uid);
  if (existing) {
    if (existing.timer) clearTimeout(existing.timer);
    existing.stopped = true;
  }
  let profile: WBProfileData;
  try {
    profile = await fetchProfile(uid);
  } catch (err: unknown) {
    pushFail((err as Error)?.message || '获取用户失败');
    return;
  }
  const task: Task = {
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
    stopped: false,
  };
  TASKS.set(profile.uid, task);
  persistTasks();
  pushProgress({
    uid: profile.uid,
    name: profile.username,
    avatar: profile.avatar,
    num: 0,
    total: profile.total,
    tip: '开始',
  });
  runLoop(profile.uid);
}

async function stopAll() {
  for (const [uid, task] of TASKS.entries()) {
    task.stopped = true;
    if (task.timer) clearTimeout(task.timer);
    try {
      await flushTask(task, '_finish');
    } catch {
      // ignore
    }
    pushProgress({
      uid,
      name: task.username,
      avatar: task.avatar,
      num: task.num,
      total: task.total,
      tip: '完成',
    });
  }
  TASKS.clear();
  persistTasks();
}

function scheduleRetry(uid: string, minutes: number) {
  try {
    chrome.alarms.create(ALARM_PREFIX + uid, { delayInMinutes: minutes });
  } catch {
    setTimeout(() => runLoop(uid), minutes * 60 * 1000);
  }
}

// --- Message handler ---
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (!request) return false;
  switch (request.type) {
    case 'wei_save': {
      const uid = request.data && request.data.uid;
      if (!uid) {
        pushFail('请提供 UID');
      } else {
        startTask(String(uid).trim());
      }
      sendResponse('ok');
      return false;
    }
    case 'stop_all':
      stopAll();
      sendResponse('ok');
      return false;
    case 'last_process':
      if (LAST_PROGRESS) {
        try {
          chrome.runtime.sendMessage(
            { type: 'wei_process', data: LAST_PROGRESS },
            () => void chrome.runtime.lastError,
          );
        } catch {
          // ignore
        }
      }
      sendResponse('ok');
      return false;
    case 'option':
      chrome.runtime.openOptionsPage();
      sendResponse('ok');
      return false;
    default:
      return false;
  }
});

// --- Init ---
chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

ensureDefaults();

// --- Alarms ---
if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm || !alarm.name) return;
    if (alarm.name.indexOf(ALARM_PREFIX) === 0) {
      const uid = alarm.name.slice(ALARM_PREFIX.length);
      restoreTasks().then(() => {
        if (TASKS.has(uid)) runLoop(uid);
      });
    }
  });
}
