<img src="https://blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200214_155227.png" width="300">

[![](https://img.shields.io/chrome-web-store/v/pojodomdlpobompicdllljgiomnfpmho.svg?logo=Google%20Chrome&logoColor=white&color=blue&style=flat-square)](https://chrome.google.com/webstore/detail/pojodomdlpobompicdllljgiomnfpmho)
[![](https://img.shields.io/chrome-web-store/stars/pojodomdlpobompicdllljgiomnfpmho.svg?logo=Google%20Chrome&logoColor=white&color=blue&style=flat-square)](https://chrome.google.com/webstore/detail/pojodomdlpobompicdllljgiomnfpmho)
[![](https://img.shields.io/chrome-web-store/users/pojodomdlpobompicdllljgiomnfpmho.svg?logo=Google%20Chrome&logoColor=white&color=blue&style=flat-square)](https://chrome.google.com/webstore/detail/pojodomdlpobompicdllljgiomnfpmho)

[![](https://img.shields.io/github/followers/misswell.svg?label=Follow&style=social)](https://github.com/misswell)
[![](https://img.shields.io/badge/Follow%20@刘国峰--brightgreen.svg?logo=Sina%20Weibo&style=social)](https://weibo.com/imfon)

一键备份任意微博用户的所有公开内容为本地 HTML 文件。在微博页面点击扩展图标，输入目标用户 UID，即可自动抓取并下载，离线可查看。

## 使用方法（v0.2.0 起）
- 老版本依赖的 `weibo.com` PC 模板已下线，原扩展无法继续工作；同时 Chrome 138+ 已经停止加载 manifest v2 扩展。本仓库已经升级为 manifest v3，并改用 `m.weibo.cn` 公开接口直接拉取数据。
- 使用步骤：
  1. 在 Chrome 里打开 `chrome://extensions/`，开启右上角「开发者模式」，点「加载已解压的扩展程序」选中本目录。
  2. 在浏览器里登录任意一个微博站点（推荐 `https://m.weibo.cn`，登录态会被扩展直接复用）。
  3. 点扩展图标，弹窗里输入要备份的微博 UID（纯数字）。如果你当前 tab 是 `weibo.com/u/xxx`、`weibo.cn/u/xxx`、`m.weibo.cn/profile/xxx` 之类的页面，UID 会自动预填。
  4. 点「开始备份」，进度会持续显示在弹窗中；可以关闭弹窗，后台会继续抓。
  5. 每达到一次「存档间隔」会触发一次浏览器下载（默认 500 条一个 html）。整个任务结束时会再下载一个带 `_finish` 后缀的尾包。

<img src="http://blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200215_115052.png" width="700">

- 保存后生成的文件示图

<img src="https://blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200219_173457.png" width="700">

- 生成的HTML文件的CSS样式与图片是在线的，如想完全离线使用，可将HTML文件Chrome打开后右键另存为（全部或单个文件）
- 完全离线保存的操作方法示图

<img src="https://blog.liuguofeng.com/wp-content/uploads/2020/02/Snipaste_2020-02-24_12-55-50.png" width="700">

## 权限说明

| 权限 | 用途 |
|---|---|
| `storage` | 保存用户配置项（存档间隔、图片大小、翻页间隔等）以及后台任务状态。 |
| `downloads` | 将抓取到的微博内容拼接为 HTML 文件并通过浏览器下载保存到本地。 |
| `tabs` | 读取当前标签页 URL，自动识别其中的微博用户 UID，省去手动输入。 |
| `alarms` | 在接口限流或网络波动导致抓取中断时，设置定时重试，确保备份不丢失。 |
| `declarativeNetRequest` | 对发往新浪图床的请求自动注入 `Referer` 头，避免备份后的 HTML 文件因防盗链显示空白图片。 |

| 主机权限 | 用途 |
|---|---|
| `*.weibo.com` / `*.weibo.cn` | 在微博页面注入内容脚本，并复用用户的微博登录态调用公开接口拉取微博数据。 |
| `*.sinaimg.cn` / `*.sinajs.cn` | 配合 `declarativeNetRequest` 规则，为图片请求补全 Referer，保障备份文件中图片正常显示。 |

## 其他说明
- 必须先登录微博（`m.weibo.cn` 或 `weibo.com` 任一站点的登录态都会被自动携带）
- 请勿同时保存多个用户，会限制访问
- 保存过程中不建议频繁操作微博
- 每 N 条微博存为一个 HTML 文件（默认 500 条），可用 Chrome 打开
- 如想存图到本地，可打开 HTML 文件后右键另存为，建议及时另存
- 微博太多会保存不全，因为新浪接口返回暂无微博
- 显示的总数会和实际数量不一致，微博接口的问题
- 保存的文件如果出现 `_finish` 代表已经全部完成
- 经用户反馈炸号微博也可备份，前提是能登陆看到自己的微博
- 如出现验证失败的提示，请点击验证失败这段文字，然后重试
- 开发版使用方法见文章中的方法二 https://www.jianshu.com/p/0ce6ab938fcf

## 更新说明
v0.2.0
- 升级到 manifest v3（service worker + chrome.storage + chrome.downloads + chrome.alarms）。
- 改为直接走 `m.weibo.cn` 的 `profile/info`、`api/container/getIndex`、`statuses/extend` 接口，不再依赖 `weibo.com` PC 页面 DOM。
- popup 改为输入 UID（支持自动从当前 tab URL 解析），不再扫描页面侧边栏。
- 移除已失效的第三方 `imgram.cn` 端点和未维护的「找回丢失的转发」功能。
- 选项页新增「翻页基础间隔」可调。
- 通过 `declarativeNetRequest` 对所有发往 `sinaimg.cn` / `sinajs.cn` 的请求自动注入 `Referer: https://m.weibo.cn/`，避免备份后的 html 因防盗链显示空图。注：查看备份 html 时扩展必须保持启用状态。

v0.1.8
- 找回丢失的转发（安装插件后浏览过的转发，试运行）。

v0.1.7
- 修复自定义合并条数大于500出现的BUG。

v0.1.6
- 添加用户自定义项，是否默认大图，是否显示转评赞栏，多少条合并一个HTML。

v0.1.5
- 修复了部分用户最后一个html无法存档且无限增量的BUG、增加立即停止功能。
