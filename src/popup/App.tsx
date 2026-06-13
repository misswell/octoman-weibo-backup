import React, { useEffect, useState, useCallback } from 'react';
import { detectUidFromUrl } from '../utils/uid';
import { sendMessage } from '../utils/message';
import type { WeiProcessData } from '../utils/message';

const TIPS = [
  '1.需要登录微博 (m.weibo.cn 或 weibo.com)',
  '2.保存过程中不建议操作微博',
  '3.每 N 条微博存为一个 html 文件',
  '4.如想存图到本地，可打开 html 文件后右键另存为',
  '5.接口限制，太多可能下不全',
  '6.时间估算 1 条 1 秒',
];

const App: React.FC = () => {
  const [uid, setUid] = useState('');
  const [hint, setHint] = useState('提示：先在 weibo.com 登录后再点开始');
  const [hintError, setHintError] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [progress, setProgress] = useState<WeiProcessData | null>(null);

  useEffect(() => {
    // Prefill UID from current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      const detected = detectUidFromUrl(tab?.url || '');
      if (detected) setUid(detected);
    });

    // Request last progress
    sendMessage('last_process');

    const listener = (res: { type: string; data?: WeiProcessData | string }) => {
      if (!res) return;
      if (res.type === 'wei_process') {
        setProgress(res.data as WeiProcessData);
      } else if (res.type === 'wei_fail') {
        setHint(String(res.data || '失败'));
        setHintError(true);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const handleStart = useCallback(() => {
    const trimmed = uid.trim();
    if (!/^\d{5,}$/.test(trimmed)) {
      setHint('请输入正确的纯数字 UID');
      setHintError(true);
      return;
    }
    setHintError(false);
    setHint('已开始抓取，可以关闭此弹窗，进度会继续');
    setStopped(false);
    sendMessage('wei_save', { uid: trimmed });
  }, [uid]);

  const handleStop = useCallback(() => {
    setStopped(true);
    sendMessage('stop_all');
  }, []);

  const handleOptions = useCallback(() => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('src/options/index.html'));
    }
  }, []);

  const toggleTips = useCallback(() => {
    setShowTips((prev) => !prev);
  }, []);

  return (
    <div>
      {/* Tips section */}
      <ul className="process">
        <div style={{ position: 'relative', width: '100%' }}>
          <span>提示：请勿同时保存多个用户，会限制访问</span>
          <img
            src="/img/warning.png"
            className="warning-icon"
            onClick={toggleTips}
            alt="提示"
          />
        </div>
        <span className={`warning-more${showTips ? ' show' : ''}`}>
          {TIPS.map((tip, i) => (
            <div key={i}>{tip}</div>
          ))}
        </span>
        {progress && (
          <li className="process-li">
            <div className="album-info">
              {progress.avatar && (
                <img className="process-pic" src={progress.avatar} alt="" />
              )}
              <span>{progress.name || ''}</span>
            </div>
            <span className="pr">
              （{progress.tip || ''}）{progress.num ?? 0} / {progress.total ?? '-'}
            </span>
          </li>
        )}
      </ul>

      {/* UID input */}
      <ul className="uid-input">
        <label htmlFor="uid">微博 UID：</label>
        <input
          type="text"
          id="uid"
          placeholder="纯数字 UID，如 1669879400"
          autoComplete="off"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
        />
        <input
          type="button"
          className="btn"
          id="start"
          value="开始备份"
          onClick={handleStart}
        />
        <div
          className="uid-hint"
          id="uid-hint"
          style={hintError ? { color: '#d9534f' } : undefined}
        >
          {hint}
        </div>
      </ul>

      {/* Action line */}
      <ul className="option-line">
        <a
          href="https://blog.liuguofeng.com/p/5670"
          target="_blank"
          rel="noopener noreferrer"
          id="author"
        >
          问题反馈
        </a>
        <a href="#" id="option" onClick={handleOptions}>
          选项
        </a>
        <input
          type="button"
          className={`btn${stopped ? ' disable' : ''}`}
          id="stop-all"
          value="立即停止"
          onClick={handleStop}
        />
      </ul>
    </div>
  );
};

export default App;
