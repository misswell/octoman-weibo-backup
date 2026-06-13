// Content script: 提供 weibo API 代理（fetch 走页面 cookie）

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'api_get') {
    const url = request.url as string;
    const params = (request.params as Record<string, string>) || {};
    const qs = new URLSearchParams(params).toString();
    const fullUrl = qs ? `${url}?${qs}` : url;

    fetch(fullUrl, { credentials: 'include' })
      .then((resp) => {
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('json')) return resp.json();
        return resp.text().then((text) => {
          try {
            return JSON.parse(text);
          } catch {
            return { ok: 0, raw: text.substring(0, 200) };
          }
        });
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
    return true;
  } else if (request.type === 'api_post') {
    const url = request.url as string;
    const data = (request.data as Record<string, string>) || {};

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString(),
      credentials: 'include',
    })
      .then((resp) => resp.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
    return true;
  } else if (request.type === 'api_text') {
    const url = request.url as string;

    fetch(url, { credentials: 'include' })
      .then((resp) => resp.text())
      .then((text) => sendResponse({ ok: true, data: text }))
      .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
