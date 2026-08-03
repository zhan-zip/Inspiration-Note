<script setup>
import { ref } from 'vue'

/**
 * 左滑露出操作按钮的列表项（支持多个按钮，宽度自适应）
 * 用法：
 *   <SwipeItem>
 *     内容
 *     <template #actions="{ close }">
 *       <button @click="close()">编辑</button>
 *       <button @click="close()">删除</button>
 *     </template>
 *   </SwipeItem>
 */
const actionsRef = ref(null)
const offset = ref(0)
let startX = 0
let tracking = false
let wasDragging = false

function onPointerStart(e) {
  startX = e.clientX
  tracking = true
  wasDragging = false
}

function onPointerMove(e) {
  if (!tracking) return
  if (e.buttons === 0) return
  const dx = e.clientX - startX
  if (Math.abs(dx) < 8) return
  wasDragging = true
  e.preventDefault()
  if (offset.value < 0) {
    // 已展开：向右拖关闭
    if (dx > 8) close()
  } else {
    // 收起态：向左拖（dx<0）露出右侧操作
    if (dx < -40) open()
  }
}

function onPointerEnd() {
  tracking = false
}

function open() {
  // 按操作区实际宽度左移（支持多个按钮）
  offset.value = -(actionsRef.value?.offsetWidth || 72)
}
function close() {
  offset.value = 0
}

/* capture 阶段拦截：拖动后的 click 在到达内层（如条目 @click）之前就阻止，
   避免右滑收回时误触发父级跳转 */
function onContentClickCapture(e) {
  if (wasDragging) {
    wasDragging = false
    e.stopPropagation()
    e.preventDefault()
  }
}

/* 内容点击（bubble 阶段）：非拖动点击且已展开则关闭收起态正常冒泡 */
function onContentClick(e) {
  if (offset.value < 0) {
    close()
    e.stopPropagation()
  }
}
</script>

<template>
  <!-- 根元素阻止 pointer 冒泡：左滑/右滑操作选项时，不带动外层（抽屉/列表层） -->
  <div class="swipe" @pointerdown.stop @pointermove.stop @pointerup.stop @pointercancel.stop>
    <!-- 右侧操作区（位于内容下层，内容左移后露出；收起时对读屏隐藏） -->
    <div ref="actionsRef" class="swipe-actions" :aria-hidden="offset < 0 ? 'false' : 'true'">
      <slot name="actions" :close="close" />
    </div>
    <!-- 内容区：左滑时左移露出操作；capture 拦截拖动后的 click，避免误触发父级跳转 -->
    <div
      class="swipe-content"
      :style="{ transform: `translateX(${offset}px)` }"
      @click.capture="onContentClickCapture"
      @click="onContentClick"
      @pointerdown="onPointerStart"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
    >
      <slot :is-open="offset < 0" :close="close" />
    </div>
  </div>
</template>

<style scoped>
.swipe {
  position: relative;
  overflow: hidden;
}
.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  z-index: 0;
}
.swipe-content {
  position: relative;
  z-index: 1;
  background: var(--bg);
  transition: transform 0.2s ease;
}
</style>
