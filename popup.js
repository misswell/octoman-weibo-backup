function $(sel) { return document.querySelector(sel); }

function send(type, data) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: type, data: data }, res => {
      void chrome.runtime.lastError;
      resolve(res);
    });
  });
}

function sendToTab(tabId, type, data) {
  return new Promise(resolve => {
    if (!tabId) {
      resolve(null);
      return;
    }
    chrome.tabs.sendMessage(tabId, { type: type, data: data }, res => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(res || null);
    });
  });
}

function detectUidFromUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (!/weibo\.(com|cn)$/.test(host.replace(/^.*\./, '')) && !/weibo\.(com|cn)/.test(host)) {
      return '';
    }
    let m = u.pathname.match(/\/u\/(\d{5,})/);
    if (m) return m[1];
    m = u.pathname.match(/^\/(\d{5,})(?:\/)?$/);
    if (m) return m[1];
    m = u.pathname.match(/\/profile\/(\d{5,})/);
    if (m) return m[1];
    m = u.pathname.match(/\/p\/(\d{5,})/);
    if (m) return m[1];
    const uid = u.searchParams.get('uid');
    if (uid && /^\d+$/.test(uid)) return uid;
    return '';
  } catch (_) {
    return '';
  }
}

function getActiveTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

function uniqueUsers(users) {
  const seen = {};
  const result = [];
  (users || []).forEach(user => {
    const uid = String(user && user.uid || '').trim();
    if (!/^\d{5,}$/.test(uid) || seen[uid]) return;
    seen[uid] = true;
    result.push({ uid: uid, name: String(user.name || uid).trim() || uid });
  });
  return result;
}

function renderUserChoices(users, selectedUid) {
  const row = $('#user-select-row');
  const select = $('#user-select');
  if (!row || !select) return;
  select.innerHTML = '';
  const list = uniqueUsers(users);
  if (list.length <= 1) {
    row.hidden = true;
    return;
  }
  list.forEach(user => {
    const option = document.createElement('option');
    option.value = user.uid;
    option.textContent = user.name + '（' + user.uid + '）';
    if (selectedUid && user.uid === selectedUid) option.selected = true;
    select.appendChild(option);
  });
  row.hidden = false;
}

async function prefillUid() {
  const tab = await getActiveTab();
  const uidFromUrl = detectUidFromUrl(tab && tab.url);
  if (uidFromUrl) $('#uid').value = uidFromUrl;

  const usersRes = await sendToTab(tab && tab.id, 'detect_users');
  let users = uniqueUsers(usersRes && usersRes.users);
  if (!users.length) {
    const uidRes = await sendToTab(tab && tab.id, 'detect_uid');
    users = uniqueUsers(uidRes && uidRes.uid ? [{ uid: uidRes.uid, name: uidRes.uid }] : []);
  }

  const currentUid = ($('#uid').value || '').trim();
  if (!currentUid && users.length) $('#uid').value = users[0].uid;
  renderUserChoices(users, ($('#uid').value || '').trim());
}

function ensureProgressItem(name) {
  const id = 'p_' + (name || 'task');
  let item = document.getElementById(id);
  if (!item) {
    item = document.createElement('div');
    item.id = id;
    item.className = 'progress-item';
    const list = $('#progress-list');
    if (list) list.appendChild(item);
  }
  return item;
}

function renderProgress(data) {
  if (!data) return;
  const item = ensureProgressItem(data.name);
  const total = data.total != null ? data.total : 0;
  const num = data.num != null ? data.num : 0;
  const tip = data.tip || '';
  const pct = total > 0 ? Math.min(100, Math.round((num / total) * 100)) : 0;

  item.innerHTML =
    (data.avatar ? '<img class="progress-avatar" src="' + data.avatar + '" alt=""/>' : '') +
    '<div class="progress-info">' +
      '<div class="progress-name">' + (data.name || '') + '</div>' +
      '<div class="progress-bar-wrap"><div class="progress-bar" style="width:' + pct + '%"></div></div>' +
    '</div>' +
    '<span class="progress-count">' + num + ' / ' + (total || '-') + '</span>' +
    (tip ? '<span class="progress-tip">' + tip + '</span>' : '');
}

function renderFail(text) {
  const hint = $('#uid-hint');
  if (hint) {
    hint.style.color = '#e74c3c';
    hint.textContent = text || '失败';
  }
}

// 检查该 uid 是否有正在进行中的备份任务，决定按钮显示
async function checkExistingTask(uid) {
  if (!uid) return;
  const state = await send('get_task_state', { uid: uid });
  const startBtn = $('#start');
  const restartBtn = $('#restart');
  const hint = $('#uid-hint');
  if (!startBtn || !restartBtn) return;

  if (state && state.hasTask) {
    startBtn.textContent = '继续备份';
    startBtn.style.display = '';
    restartBtn.style.display = '';
    if (hint) {
      hint.style.color = '#e8642d';
      hint.textContent = '检测到未完成的备份任务：已抓 ' + state.num + ' / ' + (state.total || '?') + ' 条';
    }
  } else {
    startBtn.textContent = '开始备份';
    startBtn.style.display = '';
    restartBtn.style.display = 'none';
    if (hint) {
      hint.style.color = '';
      hint.textContent = '提示：先在 weibo.com 登录后再点开始';
    }
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  await prefillUid();
  send('last_process');

  var tipsBox = document.querySelector('.tips-box');
  var tipsToggle = $('#tips-toggle');
  if (tipsBox && tipsToggle) {
    tipsToggle.addEventListener('click', function () {
      const expanded = tipsBox.classList.toggle('is-open');
      tipsToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      tipsToggle.textContent = expanded ? '收起' : '展开';
    });
  }

  var uidInput = $('#uid');
  if (uidInput) {
    checkExistingTask((uidInput.value || '').trim());
    uidInput.addEventListener('input', function () {
      checkExistingTask((uidInput.value || '').trim());
    });
  }

  var userSelect = $('#user-select');
  if (userSelect) {
    userSelect.addEventListener('change', function () {
      if (uidInput) uidInput.value = this.value;
      checkExistingTask(this.value);
    });
  }

  $('#start').addEventListener('click', () => {
    const uid = ($('#uid').value || '').trim();
    if (!/^\d{5,}$/.test(uid)) {
      renderFail('请输入正确的纯数字 UID');
      return;
    }
    const hint = $('#uid-hint');
    if (hint) {
      hint.style.color = '';
      hint.textContent = '已开始抓取，可以关闭此弹窗，进度会继续';
    }
    send('wei_save', { uid: uid });
  });

  $('#restart').addEventListener('click', () => {
    const uid = ($('#uid').value || '').trim();
    if (!/^\d{5,}$/.test(uid)) {
      renderFail('请输入正确的纯数字 UID');
      return;
    }
    const hint = $('#uid-hint');
    if (hint) {
      hint.style.color = '';
      hint.textContent = '重新开始备份，之前进度将被清除';
    }
    send('wei_save', { uid: uid, forceRestart: true });
  });

  $('#stop-all').addEventListener('click', function () {
    this.classList.add('disable');
    send('stop_all');
  });

  $('#option').addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });
});

chrome.runtime.onMessage.addListener((res, sender, sendResponse) => {
  if (!res) return false;
  if (res.type === 'wei_process') {
    renderProgress(res.data);
  } else if (res.type === 'wei_fail') {
    renderFail(res.data);
  }
  sendResponse && sendResponse('done');
  return false;
});
