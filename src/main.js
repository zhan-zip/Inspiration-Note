import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

// 自动更新：新版本 Service Worker 激活后自动刷新，加载最新代码
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !navigator.serviceWorker.controller) return
    refreshing = true
    window.location.reload()
  })
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
