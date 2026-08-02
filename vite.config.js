import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages 子路径部署，防止静态资源 404（PWA 部署最常见的坑）
  base: '/Inspiration-Note/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '灵感笔记 Inspiration-Note',
        short_name: '灵感笔记',
        description: '简约黑白的个人灵感记录与任务管理工具',
        lang: 'zh-CN',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        // 图标阶段 9 补充真图标
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
