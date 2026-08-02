<script setup>
defineProps({
  show: Boolean,
  message: String,
  confirmText: { type: String, default: '删除' },
})
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <teleport to="body">
    <div v-if="show" class="confirm-mask" @click.self="emit('cancel')">
      <div class="confirm-box">
        <p class="confirm-msg">{{ message }}</p>
        <div class="confirm-actions">
          <button class="btn" @click="emit('cancel')">取消</button>
          <button class="btn btn-dark" @click="emit('confirm')">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.confirm-box {
  background: var(--bg);
  width: 78%;
  max-width: 320px;
  padding: 22px;
  border: 1px solid var(--fg);
}
.confirm-msg {
  font-size: 15px;
  line-height: 1.6;
  margin: 0 0 18px;
  word-break: break-word;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
