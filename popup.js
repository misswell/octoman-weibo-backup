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
     option.textContent = user.name + '(' + user.uid + ')';
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
 
 function renderProgress(data) {
   if (!data) return;
   refreshQueue();
 }
 
 function renderFail(text) {
   const hint = $('#uid-hint');
   if (hint) {
     hint.style.color = '#e74c3c';
     hint.textContent = text || '失败';
   }
 }
 
 // ========== Queue Management ==========
 
 let queueData = [];
 
 function renderQueueItem(item) {
   const uid = item.uid;
   const state = item.state;
   const pct = item.total > 0 ? Math.min(100, Math.round((item.num / item.total) * 100)) : 0;
 
   const statusLabel = { active: '下载中', waiting: '等待中', paused: '已暂停' }[state] || state;
 
   const statusClass = 'queue-status ' + state;
 
   let actions = '';
   if (state === 'active' || state === 'waiting') {
     actions += '<button class="btn-queue btn-pause" data-uid="' + uid + '" title="暂停">&#9208;</button>';
   }
   if (state === 'paused') {
     actions += '<button class="btn-queue btn-resume" data-uid="' + uid + '" title="继续">&#9654;</button>';
   }
   if (state !== 'completed') {
     actions += '<button class="btn-queue btn-remove" data-uid="' + uid + '" title="移除">&times;</button>';
   }
 
   let cls = 'queue-item';
   if (state === 'active') cls += ' queue-item--active';
   if (state === 'paused') cls += ' queue-item--paused';
   return '<div class="' + cls + '" data-uid="' + uid + '">' +
     (item.avatar ? '<img class="queue-avatar" src="' + item.avatar + '" alt=""/>' : '') +
     '<div class="queue-info">' +
       '<div class="queue-name">' + (item.username || uid) + ' <span class="' + statusClass + '">' + statusLabel + '</span></div>' +
       '<div class="queue-bar-wrap"><div class="queue-bar" style="width:' + pct + '%"></div></div>' +
     '</div>' +
     '<span class="queue-count">' + item.num + ' / ' + (item.total || '-') + '</span>' +
     '<div class="queue-actions">' + actions + '</div>' +
   '</div>';
 }
 
 function renderQueueList(items) {
   const list = $('#queue-list');
   if (!list) return;
   if (!items || !items.length) {
     list.innerHTML = '<div class="queue-empty">暂无任务</div>';
     return;
   }
   list.innerHTML = items.map(renderQueueItem).join('');
   bindQueueActions();
 }
 
 function bindQueueActions() {
   document.querySelectorAll('.btn-pause').forEach(btn => {
     btn.addEventListener('click', function() {
       send('queue_pause', { uid: this.dataset.uid });
      setTimeout(refreshQueue, 300);
     });
   });
   document.querySelectorAll('.btn-resume').forEach(btn => {
     btn.addEventListener('click', function() {
       send('queue_resume', { uid: this.dataset.uid });
      setTimeout(refreshQueue, 300);
     });
   });
   document.querySelectorAll('.btn-remove').forEach(btn => {
     btn.addEventListener('click', function() {
       send('queue_remove', { uid: this.dataset.uid });
      setTimeout(refreshQueue, 300);
     });
   });
 }
 
 function renderActiveStep(items) {
  var el = document.getElementById('active-step');
  if (!el) return;
  var active = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].state === 'active') { active = items[i]; break; }
  }
  if (!active) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }
  var text = (active.username || active.uid);
  if (active.step) text += '  ' + active.step;
  if (active.tip) text += '  ' + active.tip;
  el.textContent = text;
  el.style.display = '';
}

function refreshQueue() {
   send('get_queue').then(data => {
     queueData = data && data.items || [];
     renderQueueList(queueData);
     renderActiveStep(queueData);
   });
 }
 
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
       hint.textContent = '已有未完成任务，进度 ' + state.num + ' / ' + (state.total || '?') + ' 条';
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
  await refreshQueue();
  // Restore task states for existing queue items
  for (const item of queueData) {
    if (item.uid) checkExistingTask(item.uid);
  }
  // Check for pending verification from background
  send('get_verify').then(v => { if (v && v.url) showVerifyBanner(v.url, v.text); });

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
       hint.textContent = '正在提交备份请求，请稍候...';
     }
     send('wei_save', { uid: uid });
     setTimeout(refreshQueue, 300);
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
       hint.textContent = '正在重新开始备份...';
     }
     send('wei_save', { uid: uid, forceRestart: true });
     setTimeout(refreshQueue, 300);
   });
 
   $('#stop-all').addEventListener('click', function () {
     this.classList.add('disable');
     send('stop_all');
     setTimeout(refreshQueue, 300);
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
     refreshQueue();
    } else if (res.type === 'wei_fail') {
      const data = res.data || '';
      // Try to get actual verify URL from background
      send('get_verify').then(v => {
        const verifyUrl = (v && v.url) || 'https://m.weibo.cn/';
        const hint = $('#uid-hint');
        if (hint) {
          hint.style.color = '#e8642d';
          hint.innerHTML = (data || '请求失败') + ' <a href="' + verifyUrl + '" target="_blank" style="color:#e8642d;text-decoration:underline;font-weight:600;">点击打开验证码</a>';
        }
      });
      refreshQueue();
    } else if (res.type === 'wei_verify') {
      var vdata = res.data || {};
      var verifyUrl = vdata.url || 'https://m.weibo.cn/';
      var verifyText = vdata.text || '微博接口需要验证';
      showVerifyBanner(verifyUrl, verifyText);

    } else if (res.type === 'wei_queue') {
      refreshQueue();
    }
  sendResponse && sendResponse('done');
  return false;
});

function showVerifyBanner(url, text) {
  var existing = document.getElementById('verify-banner');
  if (existing) existing.remove();
  var banner = document.createElement('div');
  banner.id = 'verify-banner';
  banner.className = 'verify-banner';
  banner.innerHTML = '<span>' + (text || '微博接口需要验证，请点击以下链接完成验证后重试') + '</span>' +
    '<a href="' + (url || 'https://m.weibo.cn/') + '" target="_blank" class="verify-link">点击验证/登录</a>' +
    '<button class="verify-close" id="verify-close" type="button">&times;</button>';
  var tipsBox = document.querySelector('.tips-box');
  if (tipsBox && tipsBox.nextSibling) {
    tipsBox.parentNode.insertBefore(banner, tipsBox.nextSibling);
  } else {
    document.body.insertBefore(banner, document.body.firstChild);
  }
  document.getElementById('verify-close').addEventListener('click', function() {
    banner.remove();
  });
}
