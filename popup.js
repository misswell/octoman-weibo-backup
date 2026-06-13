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
    if (!/weibo\.(com|cn)$/.test(u.hostname.replace(/^.*\./, '')) && !/weibo\.(com|cn)/.test(u.hostname)) {
      return '';
    }
    // weibo.com/u/123456 或 weibo.cn/u/123456
    let m = u.pathname.match(/\/u\/(\d{5,})/);
    if (m) return m[1];
    // m.weibo.cn/profile/123456
    m = u.pathname.match(/\/profile\/(\d{5,})/);
    if (m) return m[1];
    // m.weibo.cn/u/123456
    m = u.pathname.match(/\/p\/(\d{5,})/);
    if (m) return m[1];
    // ?uid=xxx
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

function ensureProcessRow(name) {
  const id = 'process_' + (name || 'task');
  let li = document.getElementById(id);
  if (!li) {
    li = document.createElement('li');
    li.id = id;
    li.className = 'process-li';
    document.querySelector('.process').appendChild(li);
  }
  return li;
}

function renderProgress(data) {
  if (!data) return;
  const li = ensureProcessRow(data.name);
  const total = data.total != null ? data.total : '-';
  const num = data.num != null ? data.num : 0;
  const tip = data.tip || '';
  li.innerHTML = ''
    + '<div class="album-info">'
    + (data.avatar ? '<img class="process-pic" src="' + data.avatar + '"/>' : '')
    + '<span>' + (data.name || '') + '</span>'
    + '</div>'
    + '<span class="pr">（' + tip + '）' + num + ' / ' + total + '</span>';
}

function renderFail(text) {
  const hint = $('#uid-hint');
  if (hint) {
    hint.style.color = '#d9534f';
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

  $('#option').addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });

  const warn = document.querySelector('.warning-icon');
  const more = document.querySelector('.warning-more');
  if (warn && more) {
    warn.addEventListener('mouseover', () => { more.style.display = 'block'; });
    warn.addEventListener('mouseleave', () => { more.style.display = 'none'; });
  }
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
