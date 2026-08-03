import { reactive } from 'vue'

/**
 * 全局轻量 toast：任何组件调用 toast('消息') 即可显示，约 1.8s 自动消失
 */
const state = reactive({ items: [] })
let seed = 0

export function toast(msg) {
  const t = { id: ++seed, msg }
  state.items.push(t)
  setTimeout(() => {
    const i = state.items.findIndex((x) => x.id === t.id)
    if (i >= 0) state.items.splice(i, 1)
  }, 1800)
}

export { state as toastState }
