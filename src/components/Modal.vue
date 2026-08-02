<script setup>
defineProps({ show: Boolean })
const emit = defineEmits(['close'])
</script>

<template>
  <teleport to="body">
    <div v-if="show" class="modal-mask" @click.self="emit('close')">
      <div class="modal">
        <slot />
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--bg);
  width: 86%;
  max-width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 22px;
  border: 1px solid var(--fg);
}
</style>
