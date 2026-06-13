import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { cpSync, existsSync, mkdirSync, renameSync } from 'fs';

function copyAssets() {
  return {
    name: 'copy-assets',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');

      // Move popup HTML from dist/src to dist/popup
      const popupSrcDir = resolve(dist, 'src/popup');
      const popupDestDir = resolve(dist, 'popup');
      if (existsSync(popupSrcDir)) {
        if (!existsSync(popupDestDir)) mkdirSync(popupDestDir, { recursive: true });
        renameSync(resolve(popupSrcDir, 'index.html'), resolve(popupDestDir, 'index.html'));
      }

      // Move options HTML from dist/src to dist/options
      const optionsSrcDir = resolve(dist, 'src/options');
      const optionsDestDir = resolve(dist, 'options');
      if (existsSync(optionsSrcDir)) {
        if (!existsSync(optionsDestDir)) mkdirSync(optionsDestDir, { recursive: true });
        renameSync(resolve(optionsSrcDir, 'index.html'), resolve(optionsDestDir, 'index.html'));
      }

      // Cleanup empty src dir
      try {
        // @ts-ignore - rmdirSync is available in Node
        const { rmSync } = require('fs');
        rmSync(resolve(dist, 'src'), { recursive: true, force: true });
      } catch {
        // ignore
      }

      // Copy static assets
      cpSync(resolve(__dirname, 'img'), resolve(dist, 'img'), { recursive: true });

      // Copy rules.json
      cpSync(resolve(__dirname, 'rules.json'), resolve(dist, 'rules.json'));

      // Copy manifest
      cpSync(resolve(__dirname, 'src/manifest.json'), resolve(dist, 'manifest.json'));

      console.log('[copy-assets] Static assets copied to dist/');
    },
  };
}

export default defineConfig({
  plugins: [react(), copyAssets()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        'content-listener': resolve(__dirname, 'src/content/listener.ts'),
        'content-weibo-api': resolve(__dirname, 'src/content/weibo-api.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
