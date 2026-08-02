<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIdeaStore } from '../stores/idea.js'
import { useTaskStore } from '../stores/task.js'
import { useProjectStore } from '../stores/project.js'
import SwipeItem from '../components/SwipeItem.vue'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const ideaStore = useIdeaStore()
const taskStore = useTaskStore()
const projectStore = useProjectStore()

onMounted(async () => {
  await Promise.all([ideaStore.load(), taskStore.load(), projectStore.load()])
})

/* ---------- 记录灵感 ---------- */
const draft = ref('')
async function addIdea() {
  const text = draft.value.trim()
  if (!text) return
  await ideaStore.create(text)
  draft.value = ''
}

/* ---------- 下拉展开 / 上拉收起（全屏覆盖层跟随手指） ---------- */
const expanded = ref(false)
const dragging = ref(false)
const dragY = ref(0)
const listEl = ref(null)
let startX = 0
let startY = 0
let tracking = false

/* 列表可视高度（用于限制拖动范围，防止拖出屏幕外卡住） */
function listMax() {
  return listEl.value ? listEl.value.clientHeight : 400
}
function clampY(v) {
  const m = listMax()
  return Math.max(-m, Math.min(m, v))
}

const listStyle = computed(() => {
  if (dragging.value) {
    // 下拉（从顶部盖下来）：dragY>0 → -100% 开始跟随；上拉收回：dragY<0 → 从 0 跟随
    if (dragY.value >= 0) return { transform: `translateY(calc(-100% + ${dragY.value}px))` }
    return { transform: `translateY(${dragY.value}px)` }
  }
  return { transform: expanded.value ? 'translateY(0)' : 'translateY(-100%)' }
})

/* 根区域手势：只负责"下拉展开"（收起态时触摸在可见区；横向拖动交给抽屉） */
function onPointerStart(e) {
  startX = e.clientX
  startY = e.clientY
  tracking = true
  dragging.value = false
}

function onPointerMove(e) {
  if (!tracking) return
  if (e.buttons === 0) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.abs(dx) > Math.abs(dy)) return // 横向拖动交给抽屉
  if (!expanded.value && dy > 0) {
    dragging.value = true
    dragY.value = clampY(dy)
    e.preventDefault()
  }
}

function onPointerEnd() {
  if (tracking) {
    dragging.value = false
    // 拉一点点（30px）松手即自动滑满
    if (!expanded.value && dragY.value > 30) expanded.value = true
    dragY.value = 0
  }
  tracking = false
}

/* 覆盖层手势：负责"上拉收回"；横向拖动交给抽屉；仅在空白区拦截灵感项之外 */
function onListPointerStart(e) {
  startX = e.clientX
  startY = e.clientY
  tracking = true
  dragging.value = false
}

function onListPointerMove(e) {
  if (!tracking) return
  if (e.buttons === 0) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.abs(dx) > Math.abs(dy)) return // 横向拖动交给抽屉
  const atTop = !listEl.value || listEl.value.scrollTop <= 1
  if (expanded.value && dy < 0 && atTop) {
    dragging.value = true
    dragY.value = clampY(dy)
    e.preventDefault()
  }
}

function onListPointerEnd() {
  if (tracking) {
    dragging.value = false
    // 拉一点点（20px）松手即自动收回
    if (expanded.value && dragY.value < -20) expanded.value = false
    dragY.value = 0
  }
  tracking = false
}

/* ---------- 灵感项目标注 ---------- */
function projectLabel(idea) {
  if (idea.status === 'pending') return '待转'
  if (!idea.project_id) return '无项目'
  return projectStore.activeProjects.find((p) => p.id === idea.project_id)?.name ?? '无项目'
}

/* ---------- 转为任务 ---------- */
const convertId = ref(null)
const convertMode = ref('existing') // existing / new / none
const convertProjectId = ref('')
const newProjectName = ref('')

function openConvert(idea) {
  convertId.value = idea.id
  convertMode.value = 'existing'
  convertProjectId.value = projectStore.activeProjects[0]?.id ?? ''
  newProjectName.value = ''
}

function closeConvert() {
  convertId.value = null
}

async function confirmConvert() {
  const idea = ideaStore.activeIdeas.find((i) => i.id === convertId.value)
  if (!idea) return
  let projectId = null
  if (convertMode.value === 'existing') {
    projectId = convertProjectId.value || null
  } else if (convertMode.value === 'new') {
    if (!newProjectName.value.trim()) return
    const p = await projectStore.create(newProjectName.value)
    projectId = p.id
  }
  await taskStore.create({ name: idea.content, project_id: projectId })
  // 转任务成功后：回填项目归属到该灵感
  await ideaStore.markConverted(convertId.value, projectId)
  closeConvert()
}

/* ---------- 删除（自绘确认浮窗 + 软删除） ---------- */
const removeId = ref(null)
async function confirmRemove() {
  if (removeId.value) await ideaStore.softDelete(removeId.value)
  removeId.value = null
}
</script>

<template>
  <div
    class="page idea-page"
    @pointerdown="onPointerStart"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
  >
    <!-- 大字提问 -->
    <h1 class="idea-title">记录一个灵感吗？</h1>

    <!-- 输入框 -->
    <input
      v-model="draft"
      class="input idea-input"
      placeholder="输入灵感，回车保存"
      @keyup.enter="addIdea"
    />
    <p class="hint" @click="expanded = !expanded">
      {{ expanded ? '↑ 上拉收起 · 回到记录' : '↓ 下拉查看所有灵感' }}
    </p>

    <!-- 灵感列表：全屏覆盖层（.stop 阻止冒泡，拖灵感不会带动外层抽屉） -->
    <div
      ref="listEl"
      class="idea-list"
      :class="{ 'no-transition': dragging }"
      :style="listStyle"
      @pointerdown="onListPointerStart"
      @pointermove="onListPointerMove"
      @pointerup="onListPointerEnd"
      @pointercancel="onListPointerEnd"
    >
      <div class="list-handle" />
      <h2 class="list-title">所有灵感</h2>

      <template v-if="ideaStore.activeIdeas.length">
        <SwipeItem
          v-for="idea in ideaStore.activeIdeas"
          :key="idea.id"
          @pointerdown.stop
          @pointermove.stop
          @pointerup.stop
          @pointercancel.stop
        >
          <div class="idea-item">
            <p class="idea-content">{{ idea.content }}</p>
            <div class="idea-meta">
              <span class="idea-project">{{ projectLabel(idea) }}</span>
              <span class="idea-time">{{ idea.created_at.slice(0, 10) }}</span>
            </div>
            <button
              v-if="idea.status === 'pending'"
              class="btn btn-dark convert-btn"
              @click="openConvert(idea)"
            >
              转为任务
            </button>
          </div>
          <template #actions="{ close }">
            <button class="swipe-action" @click="removeId = idea.id; close()">删除</button>
          </template>
        </SwipeItem>
      </template>
      <p v-else class="empty">还没有灵感，先记一条吧</p>
    </div>

    <!-- 转为任务弹窗 -->
    <Modal :show="!!convertId" @close="closeConvert">
      <h2 class="modal-title">转为任务</h2>
      <p class="modal-sub">灵感：{{ ideaStore.activeIdeas.find((i) => i.id === convertId)?.content }}</p>

      <div class="mode-options">
        <label class="mode-option">
          <input v-model="convertMode" type="radio" value="existing" />
          归入已有项目
        </label>
        <label v-if="projectStore.activeProjects.length" class="mode-option sub">
          <select v-model="convertProjectId" class="input">
            <option v-for="p in projectStore.activeProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>

        <label class="mode-option">
          <input v-model="convertMode" type="radio" value="new" />
          新建项目
        </label>
        <input
          v-if="convertMode === 'new'"
          v-model="newProjectName"
          class="input sub-input"
          placeholder="项目名称"
        />

        <label class="mode-option">
          <input v-model="convertMode" type="radio" value="none" />
          无项目
        </label>
      </div>

      <div class="modal-actions">
        <button class="btn" @click="closeConvert">取消</button>
        <button class="btn btn-dark" @click="confirmConvert">确认</button>
      </div>
    </Modal>

    <!-- 删除确认浮窗 -->
    <ConfirmDialog
      :show="!!removeId"
      message="确定删除这条灵感吗？（可在回收站恢复）"
      @confirm="confirmRemove"
      @cancel="removeId = null"
    />
  </div>
</template>

<style scoped>
.idea-page {
  position: relative;
  padding: 24px 20px 0;
  height: 100dvh;
  overflow: hidden;
  user-select: none;
}

.idea-title {
  font-size: 30px;
  font-weight: 700;
  margin: 8px 0 20px;
  letter-spacing: 1px;
}

.idea-input {
  font-size: 18px;
  padding: 12px 2px;
}

.hint {
  color: var(--gray);
  font-size: 13px;
  text-align: center;
  padding: 14px 0 10px;
  margin: 0;
  border-bottom: 1px solid var(--light);
  cursor: pointer;
}

/* 全屏覆盖层：从顶部盖下来 */
.idea-list {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg);
  z-index: 5;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 20px 20px;
  transition: transform 0.25s ease;
}

.idea-list.no-transition {
  transition: none;
}

.list-handle {
  width: 36px;
  height: 4px;
  background: var(--mid);
  border-radius: 2px;
  margin: 6px auto 10px;
}

.list-title {
  font-size: 20px;
  margin: 0 0 4px;
}

.idea-item {
  position: relative;
  padding: 16px 4px;
  border-bottom: 1px solid var(--light);
}

.idea-content {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  word-break: break-word;
}

.idea-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.idea-project {
  font-size: 12px;
  color: var(--gray);
}

.idea-time {
  font-size: 12px;
  color: var(--gray);
}

.convert-btn {
  font-size: 13px;
  padding: 4px 12px;
}

.swipe-action {
  height: 100%;
  width: 72px;
  border: none;
  background: var(--fg);
  color: var(--bg);
  font-size: 14px;
  cursor: pointer;
}

.modal-title {
  font-size: 20px;
  margin: 0 0 6px;
}

.modal-sub {
  color: var(--gray);
  font-size: 14px;
  margin: 0 0 16px;
  word-break: break-word;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.mode-option.sub {
  padding-left: 22px;
}

.sub-input {
  margin-top: -4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
