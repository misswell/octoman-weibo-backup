import React, { useEffect, useState, useCallback } from 'react';
import { configGetAll, configSet } from '../utils/config';

interface RowProps {
  label: string;
  field: string;
  type: 'text' | 'select';
  options?: { value: string; label: string }[];
  validate?: (v: string) => string | null;
}

const ConfigRow: React.FC<RowProps> = ({ label, field, type, options, validate }) => {
  const [value, setValue] = useState('');
  const [key, setKey] = useState(0);

  useEffect(() => {
    configGetAll().then((cfg) => {
      setValue(String(cfg[field] || ""));
    });
  }, [key, field]);

  const handleSave = useCallback(async () => {
    const v = value.trim();
    if (v === '') {
      await configSet({ [field]: '' });
    }
    if (validate) {
      const err = validate(v);
      if (err) {
        showToast(err);
        return;
      }
    }
    await configSet({ [field]: v });
    showToast(`${label}保存成功！`);
  }, [value, field, label, validate]);

  const handleReset = useCallback(async () => {
    await configSet({ [field]: '' });
    setKey((k) => k + 1);
    showToast('已恢复默认');
  }, [field]);

  return (
    <tr>
      <td>{label}</td>
      <td>
        {type === 'text' ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        ) : (
          <select value={value} onChange={(e) => setValue(e.target.value)}>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </td>
      <td>
        <button className="btn" onClick={handleSave}>
          保存
        </button>{' '}
        <button className="btn" onClick={handleReset}>
          默认
        </button>
      </td>
    </tr>
  );
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = 'toast';
  }, 1500);
}

const App: React.FC = () => {
  return (
    <div className="all">
      <table>
        <tbody>
          <ConfigRow
            label="存档间隔（每多少条合并一个 html）"
            field="PER_PAGE"
            type="text"
            validate={(v) => (!/^\d+$/.test(v) || +v <= 0 ? '请输入正整数' : null)}
          />
          <ConfigRow
            label="转评赞栏"
            field="COMMENT_ROW"
            type="select"
            options={[
              { value: '1', label: '保留' },
              { value: '2', label: '去除' },
            ]}
          />
          <ConfigRow
            label="预览图片"
            field="PIC_SHOW"
            type="select"
            options={[
              { value: '1', label: '缩略图' },
              { value: '2', label: '大图' },
            ]}
          />
          <ConfigRow
            label="翻页基础间隔（秒）"
            field="DELAY_PAGE"
            type="text"
            validate={(v) =>
              !/^\d+(\.\d+)?$/.test(v) || +v < 0 ? '请输入非负数字' : null
            }
          />
        </tbody>
      </table>
      <div id="toast" className="toast" />
    </div>
  );
};

export default App;
