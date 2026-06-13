function $(sel) { return document.querySelector(sel); }

function send(type, data) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: type, data: data }, res => {
      void chrome.runtime.lastError;
      resolve(res);
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

async function prefillUid() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs && tabs[0];
      const uid = detectUidFromUrl(tab && tab.url);
      if (uid) $('#uid').value = uid;
      resolve();
    });
  });
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

document.addEventListener('DOMContentLoaded', async function () {
  await prefillUid();
  send('last_process');

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
