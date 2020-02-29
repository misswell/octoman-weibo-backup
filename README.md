<img src="https://blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200214_155227.png" width="300">

[![](https://img.shields.io/chrome-web-store/v/pojodomdlpobompicdllljgiomnfpmho.svg?logo=Google%20Chrome&logoColor=white&color=blue&style=flat-square)](https://chrome.google.com/webstore/detail/pojodomdlpobompicdllljgiomnfpmho)
[![](https://img.shields.io/chrome-web-store/stars/pojodomdlpobompicdllljgiomnfpmho.svg?logo=Google%20Chrome&logoColor=white&color=blue&style=flat-square)](https://chrome.google.com/webstore/detail/pojodomdlpobompicdllljgiomnfpmho)
[![](https://img.shields.io/chrome-web-store/users/pojodomdlpobompicdllljgiomnfpmho.svg?logo=Google%20Chrome&logoColor=white&color=blue&style=flat-square)](https://chrome.google.com/webstore/detail/pojodomdlpobompicdllljgiomnfpmho)

[![](https://img.shields.io/github/followers/misswell.svg?label=Follow&style=social)](https://github.com/misswell)
[![](https://img.shields.io/badge/Follow%20@刘国峰--brightgreen.svg?logo=Sina%20Weibo&style=social)](https://weibo.com/imfon)

新浪微博的备份 Chrome 浏览器扩展 （ 插件 ）

## 使用方法
- 在 PC 版新浪微博页面 https://weibo.com/ 点击扩展图标，出现的下拉列表中选择需要保存的用户，然后点击保存按钮
- 扩展使用示图

<img src="http://blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200215_115052.png" width="700">

- 保存后生成的文件示图

<img src="https://blog.liuguofeng.com/wp-content/uploads/2020/02/snipaste_20200219_173457.png" width="700">

- 生成的HTML文件的CSS样式与图片是在线的，如想完全离线使用，可将HTML文件Chrome打开后右键另存为（全部或单个文件）
- 完全离线保存的操作方法示图

<img src="https://blog.liuguofeng.com/wp-content/uploads/2020/02/Snipaste_2020-02-24_12-55-50.png" width="700">


## 其他说明
- 需要登录微博
- 请勿同时保存多个用户，会限制访问
- 保存过程中不建议频繁操作微博
- 每500条微博存为一个HTML文件，可用Chrome打开
- 如想存图到本地，可打开HTML文件后右键另存为，建议及时另存
- 微博太多会保存不全，因为新浪接口返回暂无微博
- 显示的总数会和实际数量不一致，微博接口的问题
- 保存的文件如果出现finish代表已经全部完成
- 经用户反馈炸号微博也可备份，前提是能登陆看到自己的微博
- 如出现验证失败的提示，请点击验证失败这段文字，然后重试
- 开发版使用方法见文章中的方法二 https://www.jianshu.com/p/0ce6ab938fcf

## 更新说明
v0.1.5
- 修复了部分用户最后一个html无法存档且无限增量的BUG、增加立即停止功能。