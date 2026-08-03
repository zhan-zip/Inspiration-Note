import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { registerSW } from 'virtual:pwa-register'
import './styles/main.css'

// 注册 Service Worker：检测到新版本激活后自动刷新，实现"打开即新版"
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          window.location.reload()
        }
      })
    })
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
