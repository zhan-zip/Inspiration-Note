<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 页面导航列表（主页=灵感，左滑呼出）
const navItems = [
  { path: '/', label: '灵感' },
  { path: '/tasks', label: '任务列表' },
  { path: '/calendar', label: '日历' },
  { path: '/today', label: '今日' },
  { path: '/review', label: '复盘' },
  { path: '/projects', label: '项目' },
  { path: '/trash', label: '回收站' },
]

// 抽屉开关状态：0=关闭，1=打开
const open = ref(0)
const dragging = ref(false)

// 抽屉滑出 / 主视图右移 联动
const drawerX = computed(() => `${(open.value - 1) * 100}%`)
const mainX = computed(() => `${open.value * 30}%`)

// 手势状态（Pointer 事件：鼠标 + 触摸 + 触控笔统一支持）
const startX = ref(0)
const startY = ref(0)
const startOpen = ref(false)

function onPointerDown(e) {
  startX.value = e.clientX
  startY.value = e.clientY
  startOpen.value = open.value > 0.5
  dragging.value = false
}

function onPointerMove(e) {
  // 鼠标未按住（hover 移动）不处理，只有按下拖动才触发手势
  if (e.buttons === 0) return
  const dx = e.clientX - startX.value
  const dy = e.clientY - startY.value
  // 横向位移主导才认作抽屉手势，避免与页面纵向滚动冲突
  if (!dragging.value) {
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      dragging.value = true
    } else {
      return
    }
  }
  const max = window.innerWidth * 0.35
  // 关闭时：向右拉（dx>0）→ 抽屉从左被拉出；打开时：向左推（dx<0）→ 抽屉收回
  let pct = startOpen.value ? 1 + dx / max : dx / max
  open.value = Math.max(0, Math.min(1, pct))
  e.preventDefault()
}

function onPointerEnd() {
  dragging.value = false
  open.value = open.value > 0.5 ? 1 : 0
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
      <RouterView />
    </main>
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
  z-index: 10;
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
