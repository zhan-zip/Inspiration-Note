<script setup>
import { ref } from 'vue'

/**
 * 右滑露出操作按钮的列表项（iOS 风格）
 * 使用 Pointer 事件：鼠标按住拖动 + 手机触摸均可
 * 用法：
 *   <SwipeItem>
 *     内容
 *     <template #actions="{ close }">
 *       <button @click="close()">删除</button>
 *     </template>
 *   </SwipeItem>
 */
const ACTION_W = 72
const offset = ref(0)
let startX = 0
let tracking = false

function onPointerStart(e) {
  startX = e.clientX
  tracking = true
}

function onPointerMove(e) {
  if (!tracking) return
  if (e.buttons === 0) return
  const dx = e.clientX - startX
  if (Math.abs(dx) < 8) return
  e.preventDefault()
  if (offset.value < 0) {
    // 已展开：向右拖关闭
    if (dx > 8) close()
  } else {
    // 收起态：向左拖（dx<0）露出右侧删除
    if (dx < -40) open()
  }
}

function onPointerEnd() {
  tracking = false
}

function open() {
  offset.value = -ACTION_W
}
function close() {
  offset.value = 0
}
</script>

<template>
  <div class="swipe">
    <!-- 右侧操作区（位于内容下层，内容左移后露出） -->
    <div class="swipe-actions">
      <slot name="actions" :close="close" />
    </div>
    <!-- 内容区：右滑时左移露出操作 -->
    <div
      class="swipe-content"
      :style="{ transform: `translateX(${offset}px)` }"
      @pointerdown="onPointerStart"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
    >
      <slot />
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
