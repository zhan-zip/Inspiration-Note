<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast, toastState } from './toast.js'

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
// PWA 安装引导
const installEvt = ref(null)
const showInstallHelp = ref(false)
// 已安装（standalone 模式）则不再提示
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
const showInstall = ref(!isStandalone && !localStorage.getItem('install-dismissed'))

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
  if (e.pointerType === 'touch') return // 触摸由 touch 事件处理（pan-y 会拦截水平 pointermove）
  // 鼠标未按住（hover）不处理
  if (e.pointerType === 'mouse' && e.buttons === 0) return
  const dx = e.clientX - startX.value
  const dy = e.clientY - startY.value
  // 横向位移主导才认作手势，避免与页面纵向滚动冲突
  if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) <= 8) return
  // 子页：横向手势完全由子页自身处理（右拉衔接返回任务列表），本容器不接管、不捕获指针
  if (isChild.value) return
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
  // 子页：手势由子页自身处理，本容器不改变抽屉状态
  if (isChild.value) return
  // 用「本次累计拖拽位移」决定最终开关，避免松手时停在半开状态
  const threshold = window.innerWidth * 0.12
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

// 首次进入：一次性提示「左滑条目可编辑/删除」
onMounted(() => {
  if (!localStorage.getItem('inspiration-guide')) {
    toast('左滑条目可编辑/删除')
    localStorage.setItem('inspiration-guide', '1')
  }
  // PWA 安装引导
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvt.value = e
    showInstall.value = true
  })
  window.addEventListener('appinstalled', () => {
    showInstall.value = false
    localStorage.removeItem('install-dismissed')
  })
})

function installApp() {
  if (installEvt.value) {
    // 安卓 Chrome：触发系统安装弹窗
    installEvt.value.prompt()
    installEvt.value.userChoice.then((r) => {
      if (r.outcome === 'accepted') showInstall.value = false
    })
    return
  }
  // iOS / 无自动安装事件：弹出操作说明
  showInstallHelp.value = true
}

function dismissInstall() {
  showInstall.value = false
  localStorage.setItem('install-dismissed', '1')
}

/* 触摸手势（touch 事件不受 touch-action 拦截） */
function onTouchStart(e) {
  if (e.touches.length !== 1) return
  startX.value = e.touches[0].clientX
  startY.value = e.touches[0].clientY
  startOpen.value = open.value > 0.5
  totalDx = 0
}

function onTouchMove(e) {
  if (e.touches.length !== 1) return
  const dx = e.touches[0].clientX - startX.value
  const dy = e.touches[0].clientY - startY.value
  // 纵向拖动交给页面滚动
  if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) <= 8) return
  // 子页：右拉返回由子页自身处理
  if (isChild.value) return
  e.preventDefault()
  totalDx = dx
  const max = window.innerWidth * 0.28
  let pct
  if (startOpen.value) {
    pct = 1 + dx / max
  } else {
    pct = dx / max
  }
  open.value = Math.max(0, Math.min(1, pct))
}

function onTouchEnd() {
  const threshold = window.innerWidth * 0.12
  if (isChild.value) return
  if (startOpen.value) {
    open.value = totalDx < -threshold ? 0 : 1
  } else {
    open.value = totalDx > threshold ? 1 : 0
  }
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
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <!-- 左侧页面导航列表（抽屉） -->
    <aside
      class="drawer"
      :class="{ dragging }"
      :aria-hidden="open < 0.5 ? 'true' : 'false'"
      :style="{ transform: `translateX(${drawerX})` }"
    >
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

    <!-- PWA 安装引导按钮 -->
    <div v-if="showInstall" class="install-btn-wrap">
      <button class="install-btn" @click="installApp">安装应用</button>
      <button class="install-close" @click="dismissInstall" aria-label="关闭">×</button>
    </div>

    <!-- iOS 安装说明 -->
    <div v-if="showInstallHelp" class="install-help-mask" @click.self="showInstallHelp = false">
      <div class="install-help">
        <h3 class="help-title">安装到主屏幕</h3>
        <ol class="help-steps">
          <li>点浏览器底部 / 右上角「<b>分享</b>」按钮</li>
          <li>选择「<b>添加到主屏幕</b>」</li>
          <li>完成后从主屏幕打开，即可离线使用</li>
        </ol>
        <button class="btn btn-dark" @click="showInstallHelp = false">知道了</button>
      </div>
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

/* PWA 安装引导按钮 */
.install-btn-wrap {
  position: fixed;
  bottom: 28px;
  right: 24px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 6px;
}
.install-btn {
  background: var(--fg);
  color: var(--bg);
  border: none;
  padding: 12px 22px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 24px;
  cursor: pointer;
  min-height: 44px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
.install-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--fg);
  background: var(--bg);
  color: var(--fg);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

/* iOS 安装说明浮窗 */
.install-help-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70;
}
.install-help {
  background: var(--bg);
  width: 82%;
  max-width: 340px;
  padding: 24px;
  border: 1px solid var(--fg);
}
.help-title {
  font-size: 20px;
  margin: 0 0 14px;
}
.help-steps {
  margin: 0 0 18px;
  padding-left: 20px;
  font-size: 15px;
  line-height: 1.9;
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
