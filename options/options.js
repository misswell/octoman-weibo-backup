function $(sel) { return document.querySelector(sel); }

let toastTimer = null;
function toast(msg) {
  const el = $('#alert');
  if (!el) return;
  el.classList.remove('show');
  if (toastTimer) clearTimeout(toastTimer);
  el.querySelector('strong').textContent = msg || '保存成功！';
  el.hidden = false;
  el.classList.add('show');
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    el.hidden = true;
  }, 1200);
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
    toast('存档间隔保存成功！');
  });

  $('#comment_row_btn').addEventListener('click', async () => {
    await configSet({ COMMENT_ROW: $('#comment_row').value });
    toast('转评赞栏保存成功！');
  });

  $('#pic_show_btn').addEventListener('click', async () => {
    await configSet({ PIC_SHOW: $('#pic_show').value });
    toast('预览图片保存成功！');
  });

  $('#delay_page_btn').addEventListener('click', async () => {
    const v = String($('#delay_page').value || '').trim();
    if (!/^\d+(\.\d+)?$/.test(v) || +v < 0) {
      toast('请输入非负数字');
      return;
    }
    await configSet({ DELAY_PAGE: v });
    toast('翻页间隔保存成功！');
  });
});
