function $(sel) { return document.querySelector(sel); }

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  if (toastTimer) clearTimeout(toastTimer);
  el.textContent = msg || '保存成功！';
  el.hidden = false;
  el.classList.add('show');
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    el.hidden = true;
  }, 1500);
}

async function fillPage() {
  const cfg = await configGetAll();
  $('#per_page').value = cfg.PER_PAGE;
  $('#comment_row').value = cfg.COMMENT_ROW;
  $('#pic_show').value = cfg.PIC_SHOW;
  $('#delay_page').value = cfg.DELAY_PAGE;
}

document.addEventListener('DOMContentLoaded', async () => {
  await fillPage();

  $('#per_page_btn').addEventListener('click', async () => {
    const v = String($('#per_page').value || '').trim();
    if (!/^\d+$/.test(v) || +v <= 0) {
      toast('请输入正整数');
      return;
    }
    await configSet({ PER_PAGE: v });
    toast('存档间隔已保存');
  });

  $('#comment_row_btn').addEventListener('click', async () => {
    await configSet({ COMMENT_ROW: $('#comment_row').value });
    toast('转评赞栏已保存');
  });

  $('#pic_show_btn').addEventListener('click', async () => {
    await configSet({ PIC_SHOW: $('#pic_show').value });
    toast('预览图片已保存');
  });

  $('#delay_page_btn').addEventListener('click', async () => {
    const v = String($('#delay_page').value || '').trim();
    if (!/^\d+(\.\d+)?$/.test(v) || +v < 0) {
      toast('请输入非负数字');
      return;
    }
    await configSet({ DELAY_PAGE: v });
    toast('翻页间隔已保存');
  });
});
