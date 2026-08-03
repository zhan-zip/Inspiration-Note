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
let pointerCaptured = false

function onPointerMove(e) {
  // 鼠标未按住（hover 移动）不处理，只有按下拖动才触发手势
  if (e.buttons === 0) return
  const dx = e.clientX - startX.value
  const dy = e.clientY - startY.value
  // 横向位移主导才认作手势，避免与页面纵向滚动冲突
  if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) <= 8) return
  dragging.value = true
  totalDx = dx
  // 判定为拖拽后才捕获指针（避免普通点击的 click 被重定向）
  if (!pointerCaptured && typeof e.currentTarget?.setPointerCapture === 'function') {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
      pointerCaptured = true
    } catch (err) {
      /* 忽略捕获失败 */
    }
  }
  e.preventDefault()
  // 子页：横向手势完全用于"返回"，完全不碰抽屉状态
  if (isChild.value) return
  const max = window.innerWidth * 0.28
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

function onPointerDown(e) {
  startX.value = e.clientX
  startY.value = e.clientY
  startOpen.value = open.value > 0.5
  dragging.value = false
  totalDx = 0
  pointerCaptured = false
}

function onPointerEnd() {
  dragging.value = false
  // 用「本次累计拖拽位移」决定最终开关，避免松手时停在半开状态
  const threshold = window.innerWidth * 0.12
  if (isChild.value) {
    // 子页：左滑返回上一级
    if (totalDx < -60) {
      open.value = 0
      router.back()
    } else {
      open.value = open.value > 0.5 ? 1 : 0
    }
    return
  }
  if (startOpen.value) {
    // 抽屉开着：向左推超过阈值 → 关闭，否则保持打开
    open.value = totalDx < -threshold ? 0 : 1
  } else {
    // 抽屉关着：向右拉超过阈值 → 打开，否则保持关闭
    open.value = totalDx > threshold ? 1 : 0
  }
}

// 点击页面名 → 关闭抽屉 + 切换页面
function go(item) {
  open.value = 0
  if (route.path !== item.path) router.push(item.path)
}
</script>

<template>
  <!-- 拖拽监听放在最外层：无论鼠标在抽屉/遮罩/主视图哪个区域拖拽都能收到 -->
  <div
    class="app"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
  >
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

    <!-- 遮罩：抽屉打开时淡入盖住主视图，点击关闭（平滑过渡，不突然插入） -->
    <div class="drawer-mask" :class="{ show: open > 0.5 }" @click="open = 0"></div>

    <!-- 左缘引导：提示可向右拉展开抽屉（纯视觉，不拦截任何交互） -->
    <div v-if="open < 0.5" class="edge-hint" aria-hidden="true"></div>

    <!-- 主视图 -->
    <main class="main" :class="{ dragging }" :style="{ transform: `translateX(${mainX})` }">
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
  /* 允许垂直滚动，水平拖拽手势交给 JS；防拖拽选中文本 */
  touch-action: pan-y;
  user-select: none;
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
  z-index: 100; /* 抽屉绝对最上，防止被遮罩/主视图覆盖 */
}

/* 遮罩：盖住主视图，点击关闭抽屉；淡入淡出避免突然出现/消失的卡顿感 */
.drawer-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 50;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.drawer-mask.show {
  opacity: 1;
  pointer-events: auto;
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
  transition: transform 0.2s ease-out;
}

.drawer.dragging,
.main.dragging {
  transition: none;
}

/* 左缘引导：细条提示可右拉展开抽屉，脉冲动画吸引注意，不拦截事件 */
.edge-hint {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 52px;
  background: var(--fg);
  border-radius: 0 3px 3px 0;
  opacity: 0.35;
  z-index: 40;
  pointer-events: none;
  animation: edge-pulse 2.6s ease-in-out infinite;
}
@keyframes edge-pulse {
  0%,
  100% {
    opacity: 0.2;
    transform: translateY(-50%) translateX(0);
  }
  50% {
    opacity: 0.55;
    transform: translateY(-50%) translateX(2px);
  }
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
