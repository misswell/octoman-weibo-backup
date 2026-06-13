chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'api_get') {
        let url = request.url;
        let params = request.params || {};
        let qs = new URLSearchParams(params).toString();
        let fullUrl = qs ? `${url}?${qs}` : url;

        fetch(fullUrl, {credentials: 'include'})
            .then(resp => {
                let ct = resp.headers.get('content-type') || '';
                if (ct.includes('json')) return resp.json();
                return resp.text().then(text => {
                    try { return JSON.parse(text); }
                    catch(e) { return {ok: 0, raw: text.substring(0, 200)}; }
                });
            })
            .then(data => sendResponse({ok: true, data: data}))
            .catch(e => sendResponse({ok: false, error: e.message}));
        return true;
    } else if (request.type === 'api_post') {
        let url = request.url;
        let data = request.data || {};

        fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams(data).toString(),
            credentials: 'include'
        })
            .then(resp => resp.json())
            .then(data => sendResponse({ok: true, data: data}))
            .catch(e => sendResponse({ok: false, error: e.message}));
        return true;
    } else if (request.type === 'api_text') {
        let url = request.url;

        fetch(url, {credentials: 'include'})
            .then(resp => resp.text())
            .then(text => sendResponse({ok: true, data: text}))
            .catch(e => sendResponse({ok: false, error: e.message}));
        return true;
    }
});
