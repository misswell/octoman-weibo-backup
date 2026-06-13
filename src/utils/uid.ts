// UID 提取工具函数

export function detectUidFromUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const hostname = u.hostname.replace(/^.*\./, '');
    if (!/weibo\.(com|cn)$/.test(hostname) && !/weibo\.(com|cn)/.test(u.hostname)) {
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
  } catch {
    return '';
  }
}
