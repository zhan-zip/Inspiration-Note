<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useIdeaStore } from '../stores/idea'
import { useTaskStore } from '../stores/task'
import { useProjectStore } from '../stores/project'
import SwipeItem from '../components/SwipeItem.vue'
import Modal from '../components/Modal.vue'

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

/* ---------- 下拉展开记录 / 上拉收起 ---------- */
const expanded = ref(false)
const listEl = ref(null)
let startY = 0
let tracking = false

function onTouchStart(e) {
  startY = e.touches[0].clientY
  tracking = true
}

function onTouchMove(e) {
  if (!tracking) return
  const dy = e.touches[0].clientY - startY
  const atTop = !listEl.value || listEl.value.scrollTop <= 1
  // 收起态：下拉超过阈值 → 展开列表
  if (!expanded.value && dy > 50) {
    expanded.value = true
    tracking = false
    e.preventDefault()
  }
  // 展开态：列表在顶部且上拉超过阈值 → 收起回记录
  else if (expanded.value && dy < -50 && atTop) {
    expanded.value = false
    tracking = false
    e.preventDefault()
  }
}

function onTouchEnd() {
  tracking = false
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
  await ideaStore.markConverted(convertId.value)
  closeConvert()
}

/* ---------- 右滑删除（软删除） ---------- */
async function removeIdea(id) {
  if (confirm('确定删除这条灵感吗？（可在回收站恢复）')) {
    await ideaStore.softDelete(id)
  }
}
</script>

<template>
  <div class="page idea-page" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" @touchcancel="onTouchEnd">
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

    <!-- 灵感列表（下拉展开） -->
    <div v-show="expanded" ref="listEl" class="idea-list">
      <template v-if="ideaStore.activeIdeas.length">
        <SwipeItem v-for="idea in ideaStore.activeIdeas" :key="idea.id">
          <div class="idea-item">
            <p class="idea-content">{{ idea.content }}</p>
            <div class="idea-meta">
              <span v-if="idea.status === 'converted'" class="converted-tag">已转任务</span>
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
            <button class="swipe-action" @click="removeIdea(idea.id); close()">删除</button>
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
  </div>
</template>

<style scoped>
.idea-page {
  display: flex;
  flex-direction: column;
  padding: 24px 20px 0;
  overflow: hidden;
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

.idea-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-top: 4px;
}

.idea-item {
  position: relative;
  padding: 16px 4px;
  border-bottom: 1px solid var(--light);
}

.idea-content {
  margin: 0 0 6px;
  font-size: 16px;
  line-height: 1.5;
  word-break: break-word;
}

.idea-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.converted-tag {
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
