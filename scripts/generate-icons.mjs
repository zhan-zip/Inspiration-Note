// 生成 PWA 黑白图标（192 / 512 / maskable / apple-touch-icon）
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

// 基础图标：白底 + 黑色圆角方块（便签），内含白色灵感线条
const base = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ffffff"/>
  <rect x="96" y="96" width="320" height="320" rx="56" fill="#111111"/>
  <rect x="176" y="176" width="160" height="26" rx="13" fill="#ffffff"/>
  <rect x="176" y="243" width="160" height="26" rx="13" fill="#ffffff"/>
  <rect x="176" y="310" width="100" height="26" rx="13" fill="#ffffff"/>
</svg>`

// maskable：内容居中且留安全边距（适配圆形遮罩）
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ffffff"/>
  <rect x="136" y="136" width="240" height="240" rx="44" fill="#111111"/>
  <rect x="196" y="196" width="120" height="22" rx="11" fill="#ffffff"/>
  <rect x="196" y="245" width="120" height="22" rx="11" fill="#ffffff"/>
  <rect x="196" y="294" width="76" height="22" rx="11" fill="#ffffff"/>
</svg>`

mkdirSync('public', { recursive: true })

await sharp(Buffer.from(base)).resize(192, 192).png().toFile('public/pwa-192.png')
await sharp(Buffer.from(base)).resize(512, 512).png().toFile('public/pwa-512.png')
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile('public/pwa-maskable-512.png')
await sharp(Buffer.from(base)).resize(180, 180).png().toFile('public/apple-touch-icon.png')

console.log('✅ PWA 图标已生成：pwa-192 / pwa-512 / pwa-maskable-512 / apple-touch-icon')
