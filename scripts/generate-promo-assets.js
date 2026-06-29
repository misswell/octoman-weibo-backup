const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'promo');
const logoPath = path.join(root, 'img', 'logo.png');
const logoData = fs.readFileSync(logoPath).toString('base64');
const logoSrc = `data:image/png;base64,${logoData}`;

fs.mkdirSync(outDir, { recursive: true });

function css(width, height) {
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      color: #27313d;
      background: #f6f7f9;
      letter-spacing: 0;
    }
    .canvas {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background:
        radial-gradient(circle at 16% 18%, rgba(245, 164, 102, .22), transparent 26%),
        linear-gradient(135deg, #f9fbfd 0%, #fff7f1 48%, #f3f7fb 100%);
    }
    .topline { position: absolute; left: 0; right: 0; top: 0; height: 8px; background: linear-gradient(90deg, #e8642d, #f2a65e, #5c7cfa); }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; color: #26323f; }
    .brand img { width: 42px; height: 42px; border-radius: 9px; box-shadow: 0 8px 20px rgba(232,100,45,.18); }
    .brand small { display: block; margin-top: 2px; color: #7b8794; font-size: 14px; font-weight: 600; }
    .headline { margin: 0; color: #202b38; font-weight: 900; line-height: 1.04; letter-spacing: 0; }
    .subhead { margin: 18px 0 0; color: #5b6876; line-height: 1.65; font-weight: 520; }
    .pillrow { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .pill { padding: 9px 13px; border-radius: 999px; background: #fff; border: 1px solid rgba(232,100,45,.16); box-shadow: 0 10px 28px rgba(38,50,63,.08); color: #516070; font-size: 15px; font-weight: 700; white-space: nowrap; }
    .stage { position: absolute; background: #fff; border: 1px solid rgba(39,49,61,.08); box-shadow: 0 28px 90px rgba(38,50,63,.16); overflow: hidden; }
    .browser { border-radius: 16px; }
    .browserbar { height: 42px; display: flex; align-items: center; gap: 8px; padding: 0 16px; background: #f0f3f6; border-bottom: 1px solid #e2e6ea; }
    .dot { width: 11px; height: 11px; border-radius: 50%; background: #d45d51; }
    .dot:nth-child(2) { background: #e7b549; }
    .dot:nth-child(3) { background: #55b56a; }
    .url { margin-left: 10px; height: 24px; flex: 1; border-radius: 999px; background: #fff; color: #8a96a3; display: flex; align-items: center; padding: 0 14px; font-size: 12px; }
    .page { padding: 28px; background: #fbfcfd; height: calc(100% - 42px); }
    .feed-card { background: #fff; border: 1px solid #edf0f2; border-radius: 12px; padding: 18px; margin-bottom: 14px; }
    .feed-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #e8642d, #5c7cfa); }
    .line { height: 10px; border-radius: 999px; background: #e7ebef; margin: 8px 0; }
    .line.orange { background: #f2b28e; }
    .popup { width: 360px; border-radius: 18px; background: #f8f9fa; overflow: hidden; box-shadow: 0 26px 80px rgba(38,50,63,.24); border: 1px solid rgba(39,49,61,.08); }
    .popup-head { height: 58px; padding: 0 18px; display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #e8642d, #f0855e); color: #fff; font-size: 16px; font-weight: 800; }
    .popup-head img { width: 26px; height: 26px; border-radius: 6px; }
    .tip { margin: 12px; padding: 10px 12px; border-radius: 8px; background: #fff8e1; border: 1px solid #ffe0b2; color: #e65100; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
    .tip button { border: 1px solid #f6b08f; color: #e8642d; background: #fff; border-radius: 6px; padding: 3px 8px; font-weight: 800; }
    .form { margin: 12px; }
    .label { font-size: 12px; font-weight: 800; color: #59636f; margin-bottom: 6px; display: block; }
    .select, .input { width: 100%; height: 34px; border-radius: 7px; border: 1.5px solid #ddd; background: #fff; color: #2f3a45; padding: 0 10px; font-size: 12px; margin-bottom: 8px; }
    .actions { display: flex; gap: 6px; }
    .primary { background: #e8642d; color: #fff; border: 0; border-radius: 7px; height: 34px; padding: 0 13px; font-weight: 800; }
    .secondary { background: #fff; color: #e8642d; border: 1px solid #e8642d; border-radius: 7px; height: 34px; padding: 0 11px; font-weight: 800; }
    .progress { margin: 12px; padding: 11px; display: flex; align-items: center; gap: 9px; border-radius: 9px; background: #fff; border: 1px solid #e8e8e8; }
    .progress .avatar { width: 32px; height: 32px; }
    .progress-mid { flex: 1; min-width: 0; }
    .progress-name { font-size: 12px; font-weight: 800; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar { height: 5px; margin-top: 5px; border-radius: 99px; background: #eee; overflow: hidden; }
    .bar span { display: block; height: 100%; width: 62%; border-radius: 99px; background: linear-gradient(90deg, #e8642d, #f0855e); }
    .count { font-size: 11px; color: #8d98a4; white-space: nowrap; }
    .footer { height: 42px; border-top: 1px solid #eee; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; color: #8b96a3; font-size: 12px; }
    .shot-title { position: absolute; font-size: 52px; line-height: 1.08; font-weight: 900; color: #202b38; letter-spacing: 0; }
    .shot-copy { position: absolute; font-size: 21px; line-height: 1.65; color: #5b6876; font-weight: 540; }
    .badge { display: inline-flex; align-items: center; height: 34px; padding: 0 12px; border-radius: 999px; background: #fff; color: #e8642d; font-size: 14px; font-weight: 900; border: 1px solid rgba(232,100,45,.16); box-shadow: 0 12px 30px rgba(38,50,63,.08); }
    .file-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .file { background: #fff; border: 1px solid #e6ebef; border-radius: 12px; padding: 16px; min-height: 82px; }
    .file b { color: #303b46; font-size: 14px; display: block; margin-bottom: 9px; }
    .file span { color: #7a8794; font-size: 12px; }
    .folder { font-size: 64px; font-weight: 900; color: #e8642d; }
    .option-card { background: #fff; border-radius: 16px; border: 1px solid #e8edf2; box-shadow: 0 24px 80px rgba(38,50,63,.14); padding: 22px; }
    .option-row { display: grid; grid-template-columns: 120px 1fr 72px; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid #edf1f4; font-size: 15px; }
    .option-row:last-child { border-bottom: 0; }
    .option-input { height: 36px; border-radius: 8px; border: 1.5px solid #dfe4e8; padding: 0 12px; background: #fbfcfd; color: #34404c; }
    .save { height: 34px; border-radius: 8px; background: #e8642d; color: #fff; border: 0; font-weight: 800; }
    .captcha { padding: 12px; border: 1px solid #ffd2c1; background: #fff3ec; color: #d94f1d; border-radius: 9px; margin: 12px; font-size: 12px; }
    .captcha a, .captcha button { display: inline-flex; align-items: center; margin-left: 5px; height: 24px; border-radius: 5px; padding: 0 8px; font-size: 11px; font-weight: 800; text-decoration: none; }
    .captcha a { background: #e8642d; color: #fff; }
    .captcha button { background: #fff; color: #e8642d; border: 1px solid #e8642d; }
  `;
}

function popupHtml(mode = 'normal') {
  const history = mode === 'history';
  const captcha = mode === 'captcha';
  return `
    <div class="popup">
      <div class="popup-head"><img src="${logoSrc}">Octoman 微博备份</div>
      <div class="tip"><span>请勿同时保存多个用户，会限制访问</span><button>展开</button></div>
      <div class="form">
        <label class="label">微博 UID</label>
        <select class="select"><option>森林暴熊（2719799501）</option><option>数码观察员（1987654321）</option><option>旅行记录者（1687654321）</option></select>
        <div class="actions"><input class="input" value="2719799501"><button class="primary">${history ? '继续备份' : '开始备份'}</button><button class="secondary">重新开始</button></div>
      </div>
      ${captcha ? '<div class="captcha">微博要求验证码，请先完成验证后继续备份 <a>去验证</a><button>继续备份</button></div>' : ''}
      <div class="progress"><div class="avatar"></div><div class="progress-mid"><div class="progress-name">${history ? '历史任务：森林暴熊' : '森林暴熊'}</div><div class="bar"><span style="width:${captcha ? '78%' : '42%'}"></span></div></div><span class="count">${captcha ? '1090 / 1500' : '420 / 1000'}</span></div>
      ${history ? '<div class="progress"><div class="avatar" style="background:linear-gradient(135deg,#5c7cfa,#22b8cf)"></div><div class="progress-mid"><div class="progress-name">数码观察员</div><div class="bar"><span style="width:31%"></span></div></div><span class="count">310 / 980</span></div>' : ''}
      <div class="footer"><span>问题反馈</span><span>选项</span><button class="secondary" style="height:28px">立即停止</button></div>
    </div>
  `;
}

function browserMock() {
  return `
    <div class="stage browser" style="left:660px;top:120px;width:520px;height:520px;">
      <div class="browserbar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="url">weibo.com / 当前列表页</div></div>
      <div class="page">
        ${[0,1,2,3].map((i) => `
          <div class="feed-card">
            <div class="feed-top"><div class="avatar" style="background:linear-gradient(135deg,${i % 2 ? '#5c7cfa,#22b8cf' : '#e8642d,#f2a65e'})"></div><div style="flex:1"><div class="line orange" style="width:${120 + i * 28}px"></div><div class="line" style="width:${210 - i * 18}px"></div></div></div>
            <div class="line" style="width:88%"></div><div class="line" style="width:72%"></div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

const pages = [
  {
    file: 'chrome-store-screenshot-01-overview-1280x800.png',
    width: 1280,
    height: 800,
    html: `
      <div class="canvas"><div class="topline"></div>
        <div style="position:absolute;left:86px;top:76px" class="brand"><img src="${logoSrc}"><div>Octoman 微博备份<small>微博公开内容一键本地备份</small></div></div>
        <h1 class="shot-title" style="left:86px;top:170px;width:520px">把微博内容<br>保存为本地 HTML</h1>
        <p class="shot-copy" style="left:88px;top:330px;width:470px">输入 UID 或从列表页选择用户，后台自动抓取、分段存档，离线也能查看。</p>
        <div style="position:absolute;left:88px;top:485px" class="pillrow"><span class="pill">Manifest V3</span><span class="pill">断点继续</span><span class="pill">WeiboBackup</span></div>
        ${browserMock()}
        <div style="position:absolute;left:580px;top:170px">${popupHtml('normal')}</div>
      </div>`
  },
  {
    file: 'chrome-store-screenshot-02-select-users-1280x800.png',
    width: 1280,
    height: 800,
    html: `
      <div class="canvas"><div class="topline"></div>
        <h1 class="shot-title" style="left:86px;top:92px;width:520px">列表页识别多个用户</h1>
        <p class="shot-copy" style="left:88px;top:220px;width:470px">在微博列表页打开扩展，自动读取候选账号，从「页面用户」下拉框选择备份对象。</p>
        <div style="position:absolute;left:88px;top:355px" class="pillrow"><span class="pill">页面用户下拉</span><span class="pill">自动填 UID</span></div>
        ${browserMock()}
        <div style="position:absolute;left:600px;top:190px">${popupHtml('normal')}</div>
      </div>`
  },
  {
    file: 'chrome-store-screenshot-03-resume-captcha-1280x800.png',
    width: 1280,
    height: 800,
    html: `
      <div class="canvas"><div class="topline"></div>
        <h1 class="shot-title" style="left:84px;top:86px;width:560px">遇到验证也能继续</h1>
        <p class="shot-copy" style="left:88px;top:214px;width:510px">任务进度持久保存。完成微博验证后，点击「继续备份」从中断处恢复。</p>
        <div style="position:absolute;left:88px;top:360px" class="pillrow"><span class="pill">历史任务</span><span class="pill">去验证</span><span class="pill">继续备份</span></div>
        <div style="position:absolute;left:710px;top:118px">${popupHtml('captcha')}</div>
        <div class="stage" style="left:110px;top:500px;width:530px;height:155px;border-radius:18px;padding:22px;">
          <div style="font-size:17px;font-weight:900;color:#303b46;margin-bottom:12px">历史任务自动显示</div>
          <div class="progress" style="margin:0"><div class="avatar"></div><div class="progress-mid"><div class="progress-name">森林暴熊</div><div class="bar"><span style="width:78%"></span></div></div><span class="count">1090 / 1500</span></div>
        </div>
      </div>`
  },
  {
    file: 'chrome-store-screenshot-04-output-folder-1280x800.png',
    width: 1280,
    height: 800,
    html: `
      <div class="canvas"><div class="topline"></div>
        <h1 class="shot-title" style="left:84px;top:92px;width:540px">文件按用户名保存</h1>
        <p class="shot-copy" style="left:88px;top:220px;width:520px">所有备份统一进入浏览器下载目录下的 WeiboBackup 文件夹，文件名使用目标用户昵称。</p>
        <div class="stage" style="right:82px;top:116px;width:530px;height:520px;border-radius:18px;padding:32px;">
          <div class="folder">WeiboBackup</div>
          <div style="height:18px"></div>
          <div class="file-grid">
            <div class="file"><b>森林暴熊_01.html</b><span>前 500 条微博</span></div>
            <div class="file"><b>森林暴熊_02.html</b><span>继续存档</span></div>
            <div class="file"><b>森林暴熊_03_finish.html</b><span>完成尾包</span></div>
            <div class="file"><b>数码观察员_01.html</b><span>另一个用户</span></div>
          </div>
        </div>
      </div>`
  },
  {
    file: 'chrome-store-screenshot-05-options-1280x800.png',
    width: 1280,
    height: 800,
    html: `
      <div class="canvas"><div class="topline"></div>
        <h1 class="shot-title" style="left:86px;top:88px;width:520px">节奏可控，降低风控</h1>
        <p class="shot-copy" style="left:88px;top:216px;width:500px">翻页间隔带随机抖动，默认最低按 4 秒保护；图片预览、转评赞栏、存档间隔都可配置。</p>
        <div class="option-card" style="position:absolute;right:90px;top:130px;width:540px;">
          <div class="option-row"><b>存档间隔</b><div class="option-input">500</div><button class="save">保存</button></div>
          <div class="option-row"><b>转评赞栏</b><div class="option-input">保留</div><button class="save">保存</button></div>
          <div class="option-row"><b>预览图片</b><div class="option-input">缩略图</div><button class="save">保存</button></div>
          <div class="option-row"><b>翻页间隔</b><div class="option-input">4 秒，随机抖动</div><button class="save">保存</button></div>
        </div>
      </div>`
  },
  {
    file: 'chrome-store-small-promo-440x280.png',
    width: 440,
    height: 280,
    html: `
      <div class="canvas"><div class="topline"></div>
        <div style="position:absolute;left:28px;top:28px" class="brand"><img src="${logoSrc}" style="width:34px;height:34px"><div style="font-size:17px">Octoman 微博备份</div></div>
        <h1 class="headline" style="position:absolute;left:30px;top:92px;font-size:35px;width:250px">微博内容<br>本地备份</h1>
        <div style="position:absolute;left:30px;bottom:30px" class="badge">HTML 存档</div>
        <div style="position:absolute;right:24px;top:62px;transform:scale(.54);transform-origin:top right">${popupHtml('normal')}</div>
      </div>`
  },
  {
    file: 'chrome-store-marquee-1400x560.png',
    width: 1400,
    height: 560,
    html: `
      <div class="canvas"><div class="topline"></div>
        <div style="position:absolute;left:90px;top:72px" class="brand"><img src="${logoSrc}"><div style="font-size:24px">Octoman 微博备份<small>Chrome 扩展</small></div></div>
        <h1 class="headline" style="position:absolute;left:92px;top:162px;font-size:62px;width:560px">一键备份微博<br>离线保存 HTML</h1>
        <p class="subhead" style="position:absolute;left:94px;top:318px;width:520px;font-size:21px">列表页选用户、断点继续、验证码后恢复、统一保存到 WeiboBackup。</p>
        <div style="position:absolute;right:92px;top:74px;transform:scale(.86);transform-origin:top right">${popupHtml('history')}</div>
      </div>`
  },
  {
    file: 'blog-hero-1600x900.png',
    width: 1600,
    height: 900,
    html: `
      <div class="canvas"><div class="topline"></div>
        <div style="position:absolute;left:112px;top:90px" class="brand"><img src="${logoSrc}" style="width:52px;height:52px"><div style="font-size:27px">Octoman 微博备份<small>Manifest V3 版本</small></div></div>
        <h1 class="headline" style="position:absolute;left:116px;top:210px;font-size:68px;width:760px">把公开微博<br>保存成自己的本地档案</h1>
        <p class="subhead" style="position:absolute;left:120px;top:390px;width:660px;font-size:24px">支持列表页选择用户、历史任务继续、验证码后恢复、文件夹归档和可调节抓取节奏。</p>
        <div style="position:absolute;left:120px;top:585px" class="pillrow"><span class="pill" style="font-size:18px">WeiboBackup</span><span class="pill" style="font-size:18px">用户名命名</span><span class="pill" style="font-size:18px">断点继续</span></div>
        <div style="position:absolute;right:150px;top:110px;transform:scale(1.12);transform-origin:top right">${popupHtml('history')}</div>
      </div>`
  }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const shot of pages) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css(shot.width, shot.height)}</style></head><body>${shot.html}</body></html>`, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(outDir, shot.file), type: 'png' });
    console.log(path.join('promo', shot.file));
  }

  await browser.close();
})();
