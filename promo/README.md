# Promo Assets

宣传图由 `scripts/generate-promo-assets.js` 生成。

## Chrome Web Store

- `chrome-store-screenshot-01-overview-1280x800.png`：总览截图
- `chrome-store-screenshot-02-select-users-1280x800.png`：列表页选择用户
- `chrome-store-screenshot-03-resume-captcha-1280x800.png`：验证码后继续任务
- `chrome-store-screenshot-04-output-folder-1280x800.png`：WeiboBackup 文件夹归档
- `chrome-store-screenshot-05-options-1280x800.png`：选项页和拉取节奏
- `chrome-store-small-promo-440x280.png`：小宣传图
- `chrome-store-marquee-1400x560.png`：Marquee 宣传图

## Blog

- `blog-hero-1600x900.png`：博客头图 / 文章封面

## Regenerate

```bash
NODE_PATH=/Users/guofeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/guofeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
scripts/generate-promo-assets.js
```
