<!-- wp:image {"align":"center","id":5692,"width":480,"sizeSlug":"large","className":"is-style-default"} -->
<div class="wp-block-image is-style-default"><figure class="aligncenter size-large is-resized"><img src="//blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200214_155227.png" alt="" class="wp-image-5692" width="480"/></figure></div>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>新浪微博的备份 Chrome 浏览器扩展（插件）</p>
<!-- /wp:paragraph -->

<!-- wp:more -->
<!--more-->
<!-- /wp:more -->

<!-- wp:heading -->
<h2>使用方法</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>在 Chrome 里打开 <code>chrome://extensions/</code>，开启右上角「开发者模式」，点「加载已解压的扩展程序」选中本仓库目录。然后登录任意一个微博站点（推荐 <code>https://m.weibo.cn</code>，登录态会被扩展直接复用）。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>点扩展图标，弹窗里输入要备份的微博 UID（纯数字）。如果你当前 tab 是 <code>weibo.com/u/xxx</code>、<code>weibo.cn/u/xxx</code>、<code>m.weibo.cn/profile/xxx</code> 之类的页面，UID 会自动预填；如果当前列表页识别到多个用户，可在「页面用户」下拉框中选择下载对象。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>点「开始备份」，进度会持续显示在弹窗中；可以关闭弹窗，后台会继续抓。每达到一次「存档间隔」会触发一次浏览器下载（默认 500 条一个 html）。文件会保存到浏览器下载目录下的 <code>WeiboBackup</code> 文件夹，整个任务结束时会再下载一个带 <code>_finish</code> 后缀的尾包。</p>
<!-- /wp:paragraph -->

<!-- wp:image {"align":"center","id":5719,"width":640,"sizeSlug":"large"} -->
<div class="wp-block-image"><figure class="aligncenter size-large is-resized"><img src="http://blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200215_115052.png" alt="" class="wp-image-5719" width="640"/><figcaption>扩展使用示图</figcaption></figure></div>
<!-- /wp:image -->

<!-- wp:image {"align":"center","id":5728,"width":640,"sizeSlug":"large"} -->
<div class="wp-block-image"><figure class="aligncenter size-large is-resized"><img src="https://blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200219_173457.png" alt="" class="wp-image-5728" width="640"/><figcaption>保存后生成的文件示图</figcaption></figure></div>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>生成的 HTML 文件的 CSS 样式与图片是在线的，如想完全离线使用，可将 HTML 文件 Chrome 打开后右键另存为（全部或单个文件）。</p>
<!-- /wp:paragraph -->

<!-- wp:image {"align":"center","id":5735,"width":640,"sizeSlug":"large"} -->
<div class="wp-block-image"><figure class="aligncenter size-large is-resized"><img src="https://blog.liuguofeng.com/wp-content/uploads/2020/02/Snipaste_2020-02-24_12-55-50.png" alt="" class="wp-image-5735" width="640"/><figcaption>完全离线保存的操作方法示图</figcaption></figure></div>
<!-- /wp:image -->

<!-- wp:heading {"level":3} -->
<h3>提示：</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul><li>必须先登录微博（<code>m.weibo.cn</code> 或 <code>weibo.com</code> 任一站点的登录态都会被自动携带）</li><li>请勿同时保存多个用户，会限制访问</li><li>保存过程中不建议频繁操作微博</li><li>每 N 条微博存为一个 HTML 文件（默认 500 条），可用 Chrome 打开</li><li>如想存图到本地，可打开 HTML 文件后右键另存为，建议及时另存</li><li>微博太多会保存不全，因为新浪接口返回暂无微博</li><li>显示的总数会和实际数量不一致，微博接口的问题</li><li>保存的文件如果出现 <code>_finish</code> 代表已经全部完成</li><li>经用户反馈炸号微博也可备份，前提是能登陆看到自己的微博</li><li>如出现验证失败的提示，请点击验证失败这段文字，然后重试</li></ul>
<!-- /wp:list -->

<!-- wp:heading -->
<h2>谷歌应用商店在线安装</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>如果可以访问谷歌，使用谷歌应用商店地址进行在线安装</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><a href="https://chrome.google.com/webstore/detail/pojodomdlpobompicdllljgiomnfpmho">https://chrome.google.com/webstore/detail/pojodomdlpobompicdllljgiomnfpmho</a></p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>微软 Edge 应用商店</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p><a href="https://microsoftedge.microsoft.com/addons/detail/aefblchdkofkcaaloldpmgcebablgapf">https://microsoftedge.microsoft.com/addons/detail/aefblchdkofkcaaloldpmgcebablgapf</a></p>
<!-- /wp:heading -->

<!-- wp:heading -->
<h2>开源地址</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>项目完全开源，源代码托管在 GitHub</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><a href="https://github.com/misswell/octoman-weibo-backup">https://github.com/misswell/octoman-weibo-backup</a></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>下载后通过 Chrome 开发者模式加载已解压的扩展程序即可使用，详见上面的使用方法。</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>更新说明</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p><strong>v0.2.2</strong></p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><li>支持在微博列表页识别多个用户，并在 popup 中选择某一用户进行备份。</li><li>下载文件统一保存到浏览器下载目录下的 <code>WeiboBackup</code> 文件夹。</li><li>下载文件名改为使用目标用户昵称，并在浏览器决定文件名时强制修正，避免退回默认「下载.html」。</li><li>提示说明改为手动展开 / 收起，不再鼠标悬停自动展开。</li><li>翻页请求节奏改为更快且随机抖动，长微博正文展开改为小批量并发处理。</li></ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p><strong>v0.2.1</strong></p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><li>任务持久化改用 <code>chrome.storage.local</code>，浏览器关闭后任务状态不丢失。</li><li>新增「继续备份」功能：输入已有任务的 UID 可从中断处继续，不必重新开始。</li><li>新增「重新开始」按钮：支持强制清空旧进度重新抓取。</li><li>网络异常 / 接口限流采用递增退避重试（1→2→4→8→15→30 分钟），避免频繁请求加重风控。</li><li><code>fetch</code> 增加底层网络错误捕获（DNS / 连接被拒 / 超时），与业务错误区分处理。</li></ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p><strong>v0.2.0</strong></p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><li><strong>重大更新：升级到 manifest v3</strong>（service worker + chrome.storage + chrome.downloads + chrome.alarms）。Chrome 138+ 已停止加载 manifest v2 扩展。</li><li>改为直接走 <code>m.weibo.cn</code> 的公开接口拉取数据，不再依赖 <code>weibo.com</code> PC 页面 DOM，老版本依赖的 PC 模板已下线。</li><li>popup 改为输入 UID（支持自动从当前 tab URL 解析），不再扫描页面侧边栏。</li><li>移除已失效的第三方端点和未维护的「找回丢失的转发」功能。</li><li>移除 jQuery 依赖，大幅减少扩展体积。</li><li>选项页新增「翻页基础间隔」可调。</li><li>通过 <code>declarativeNetRequest</code> 对所有发往 <code>sinaimg.cn</code> / <code>sinajs.cn</code> 的请求自动注入 <code>Referer: https://m.weibo.cn/</code>，避免备份后的 html 因防盗链显示空图。</li></ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p><strong>v0.1.9</strong> 适配新版微博</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>v0.1.8</strong> 找回丢失的转发（安装插件后浏览过的转发，试运行）。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>v0.1.7</strong> 修复自定义合并条数大于 500 出现的 BUG。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>v0.1.6</strong> 添加用户自定义项，是否默认大图，是否显示转评赞栏，多少条合并一个 HTML。</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>v0.1.5</strong> 修复了部分用户最后一个 html 无法存档且无限增量的 BUG、增加立即停止功能。</p>
<!-- /wp:paragraph -->
