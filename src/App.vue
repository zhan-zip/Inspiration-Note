<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toastState } from './toast.js'

const route = useRoute()
const router = useRouter()

// 页面导航列表（主页=灵感，右拉呼出）
const navItems = [
  { path: '/', label: '灵感' },
  { path: '/tasks', label: '任务列表' },
  { path: '/calendar', label: '日历' },
  { path: '/today', label: '今日' },
  { path: '/review', label: '复盘' },
  { path: '/trash', label: '回收站' },
]

// 抽屉开关状态：0=关闭，1=打开
const open = ref(0)
const dragging = ref(false)

// 抽屉滑出 / 主视图右移 联动（右移 70%，抽屉基本全露）
const drawerX = computed(() => `${(open.value - 1) * 100}%`)
const mainX = computed(() => `${open.value * 70}%`)

// 手势状态（Pointer 事件：鼠标 + 触摸 + 触控笔统一支持）
// 右拉 = 返回/拉出：子页（项目任务页）先返回上一级，一级页拉出抽屉
const startX = ref(0)
const startY = ref(0)
const startOpen = ref(false)
const isChild = computed(() => route.path.startsWith('/project/'))
let totalDx = 0

function onPointerDown(e) {
  startX.value = e.clientX
  startY.value = e.clientY
  startOpen.value = open.value > 0.5
  dragging.value = false
  totalDx = 0
}

function onPointerMove(e) {
  // 鼠标未按住（hover 移动）不处理，只有按下拖动才触发手势
  if (e.buttons === 0) return
  const dx = e.clientX - startX.value
  const dy = e.clientY - startY.value
  // 横向位移主导才认作手势，避免与页面纵向滚动冲突
  if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) <= 8) return
  dragging.value = true
  totalDx = dx
  e.preventDefault()
  // 子页：横向手势完全用于"返回"，完全不碰抽屉状态
  if (isChild.value) return
  const max = window.innerWidth * 0.35
  let pct
  if (startOpen.value) {
    // 抽屉开着：向左推关闭，向右拉保持
    pct = 1 + dx / max
  } else {
    // 抽屉关着：只有右拉（自左向右）打开；左滑不动
    pct = dx / max
  }
  open.value = Math.max(0, Math.min(1, pct))
}

function onPointerEnd() {
  dragging.value = false
  open.value = open.value > 0.5 ? 1 : 0
  // 子页左滑超过阈值 → 返回上一级（任务列表）
  if (isChild.value && totalDx < -60 && open.value < 0.5) {
    router.back()
  }
}

// 点击页面名 → 关闭抽屉 + 切换页面
function go(item) {
  open.value = 0
  if (route.path !== item.path) router.push(item.path)
}
</script>

<template>
  <div class="app">
    <!-- 左侧页面导航列表（抽屉） -->
    <aside class="drawer" :class="{ dragging }" :style="{ transform: `translateX(${drawerX})` }">
      <div class="drawer-title">灵感笔记</div>
      <nav class="drawer-nav">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="drawer-item"
          :class="{ active: route.path === item.path }"
          @click="go(item)"
        >
          {{ item.label }}
        </button>
      </nav>
      <p class="drawer-foot">本地存储 · 离线可用</p>
    </aside>

    <!-- 遮罩：抽屉打开时盖住主视图，点击关闭 -->
    <div v-if="open > 0.5" class="drawer-mask" @click="open = 0"></div>

    <!-- 主视图 -->
    <main
      class="main"
      :class="{ dragging }"
      :style="{ transform: `translateX(${mainX})` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
    >
      <!-- 可见导航入口：点击呼出抽屉 -->
      <button v-if="open < 0.5" class="nav-toggle" @click="open = 1" aria-label="打开导航">≡</button>
      <RouterView />
    </main>

    <!-- 全局 toast -->
    <div class="toasts">
      <transition-group name="toast">
        <div v-for="t in toastState.items" :key="t.id" class="toast">{{ t.msg }}</div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
}

.drawer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 70%;
  background: var(--bg);
  border-right: 1px solid var(--fg);
  display: flex;
  flex-direction: column;
  z-index: 30;
}

/* 遮罩：盖住主视图，点击关闭抽屉 */
.drawer-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 25;
}

.main {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg);
  z-index: 20;
  /* 允许垂直滚动，水平手势交给 JS（抽屉） */
  touch-action: pan-y;
  user-select: none;
}

.drawer,
.main {
  transition: transform 0.25s ease;
}

.drawer.dragging,
.main.dragging {
  transition: none;
}

/* 可见导航入口按钮 */
.nav-toggle {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 40;
  width: 44px;
  height: 44px;
  border: 1px solid var(--fg);
  background: var(--bg);
  color: var(--fg);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0.92;
}

/* 全局 toast */
.toasts {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 50;
  pointer-events: none;
}
.toast {
  background: var(--fg);
  color: var(--bg);
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 4px;
  max-width: 80%;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.drawer-title {
  padding: 28px 20px 12px;
  font-size: 22px;
  font-weight: 700;
  border-bottom: 1px solid var(--mid);
}

.drawer-nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.drawer-item {
  display: block;
  width: 100%;
  padding: 15px 20px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--light);
  font-size: 16px;
  color: var(--fg);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.drawer-item.active {
  background: var(--fg);
  color: var(--bg);
  font-weight: 600;
}

.drawer-foot {
  padding: 14px 20px;
  font-size: 12px;
  color: var(--gray);
  margin: 0;
}
</style>
