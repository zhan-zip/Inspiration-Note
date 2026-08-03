<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/task.js'
import { useProjectStore } from '../stores/project.js'
import { useScheduleStore } from '../stores/schedule.js'
import { useCompletionStore } from '../stores/completion.js'
import SwipeItem from '../components/SwipeItem.vue'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const scheduleStore = useScheduleStore()
const completionStore = useCompletionStore()

onMounted(async () => {
  await Promise.all([
    taskStore.load(),
    projectStore.load(),
    scheduleStore.load(),
    completionStore.load(),
  ])
})

/* 项目条目 */
const projectEntries = computed(() => projectStore.activeProjects)

/* 无项目且未完成的任务（今日打过勾的已完成 → 不再显示） */
const noProjectTasks = computed(() =>
  taskStore.activeTasks
    .filter((t) => !t.project_id)
    .filter((t) => completionStore.byTaskId(t.id).length === 0)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
)

/* 任务是否已安排日程 */
const hasSchedule = (taskId) => scheduleStore.byTaskId(taskId).length > 0

/* 点击项目条目 → 进入该项目任务列表页 */
function goProject(id) {
  router.push(`/project/${id}`)
}

/* 加入日程 → 跳日历页并自动选中该任务 */
function addToSchedule(task) {
  router.push({ path: '/calendar', query: { task: task.id } })
}

/* ---------- 新建任务 ---------- */
const showAdd = ref(false)
const addName = ref('')
const addProjectId = ref('')
function openAdd() {
  addName.value = ''
  addProjectId.value = ''
  showAdd.value = true
}
async function confirmAdd() {
  if (!addName.value.trim()) return
  await taskStore.create({ name: addName.value, project_id: addProjectId.value || null })
  showAdd.value = false
}

/* ---------- 新建项目 ---------- */
const showNewProject = ref(false)
const newProjectName = ref('')
function openNewProject() {
  newProjectName.value = ''
  showNewProject.value = true
}
async function confirmNewProject() {
  if (!newProjectName.value.trim()) return
  await projectStore.create(newProjectName.value)
  showNewProject.value = false
}

/* ---------- 重命名项目 ---------- */
const renameProject = ref(null)
const renameName = ref('')
function openRenameProject(p) {
  renameProject.value = p
  renameName.value = p.name
}
async function confirmRenameProject() {
  if (renameProject.value && renameName.value.trim()) {
    await projectStore.rename(renameProject.value.id, renameName.value)
  }
  renameProject.value = null
}

/* ---------- 编辑无项目任务（改名 + 移动项目） ---------- */
const editTask = ref(null)
const editName = ref('')
const editProjectId = ref('')
function openEditTask(task) {
  editTask.value = task
  editName.value = task.name
  editProjectId.value = task.project_id ?? ''
}
async function confirmEdit() {
  if (!editTask.value || !editName.value.trim()) return
  await taskStore.update(editTask.value.id, {
    name: editName.value,
    project_id: editProjectId.value || null,
  })
  editTask.value = null
}

/* ---------- 删除 ---------- */
const removeProjectId = ref(null)
const removeTaskId = ref(null)
async function confirmRemoveProject() {
  if (removeProjectId.value) await projectStore.softDelete(removeProjectId.value)
  removeProjectId.value = null
}
async function confirmRemoveTask() {
  if (removeTaskId.value) await taskStore.softDelete(removeTaskId.value)
  removeTaskId.value = null
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">任务列表</h1>

    <div class="quick-actions">
      <button class="btn btn-dark" @click="openAdd">+ 新建任务</button>
      <button class="btn" @click="openNewProject">+ 新建项目</button>
    </div>

    <p class="page-sub">{{ projectEntries.length }} 个项目 · {{ noProjectTasks.length }} 个待办</p>

    <div class="entry-list">
      <!-- 项目条目：单击跳转，左滑重命名/删除 -->
      <template v-if="projectEntries.length">
        <SwipeItem v-for="p in projectEntries" :key="p.id">
          <template #default="{ isOpen }">
            <div class="entry" @click="!isOpen && goProject(p.id)">
              <span class="tag project-tag">项目</span>
              <span class="entry-name">{{ p.name }}</span>
            </div>
          </template>
          <template #actions="{ close }">
            <button class="swipe-action edit" @click="openRenameProject(p); close()">重命名</button>
            <button class="swipe-action delete" @click="removeProjectId = p.id; close()">删除</button>
          </template>
        </SwipeItem>
      </template>

      <!-- 无项目未完成任务：标注归属/时间，可加入日程，已安排灰字 -->
      <template v-if="noProjectTasks.length">
        <SwipeItem v-for="t in noProjectTasks" :key="t.id">
          <div class="entry" :class="{ scheduled: hasSchedule(t.id) }">
            <span class="tag task-tag">任务</span>
            <span class="entry-name">{{ t.name }}</span>
            <div class="entry-meta">
              <span class="meta-item">无项目</span>
              <span class="meta-item">{{ t.created_at.slice(0, 10) }}</span>
              <button
                v-if="!hasSchedule(t.id)"
                class="btn schedule-btn"
                @click.stop="addToSchedule(t)"
              >
                + 加入日程
              </button>
              <span v-else class="meta-item scheduled-tag">已安排</span>
            </div>
          </div>
          <template #actions="{ close }">
            <button class="swipe-action edit" @click="openEditTask(t); close()">编辑</button>
            <button class="swipe-action delete" @click="removeTaskId = t.id; close()">删除</button>
          </template>
        </SwipeItem>
      </template>

      <p v-if="!projectEntries.length && !noProjectTasks.length" class="empty">
        还没有项目或任务，点上方新建
      </p>
    </div>

    <!-- 新建任务弹窗 -->
    <Modal :show="showAdd" @close="showAdd = false">
      <h2 class="modal-title">新建任务</h2>
      <input v-model="addName" class="input" placeholder="任务名称" @keyup.enter="confirmAdd" />
      <select v-model="addProjectId" class="input project-select">
        <option value="">无项目</option>
        <option v-for="p in projectStore.activeProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <div class="modal-actions">
        <button class="btn" @click="showAdd = false">取消</button>
        <button class="btn btn-dark" @click="confirmAdd">保存</button>
      </div>
    </Modal>

    <!-- 新建项目弹窗 -->
    <Modal :show="showNewProject" @close="showNewProject = false">
      <h2 class="modal-title">新建项目</h2>
      <input v-model="newProjectName" class="input" placeholder="项目名称" @keyup.enter="confirmNewProject" />
      <div class="modal-actions">
        <button class="btn" @click="showNewProject = false">取消</button>
        <button class="btn btn-dark" @click="confirmNewProject">创建</button>
      </div>
    </Modal>

    <!-- 重命名项目弹窗 -->
    <Modal :show="!!renameProject" @close="renameProject = null">
      <h2 class="modal-title">重命名项目</h2>
      <input v-model="renameName" class="input" placeholder="项目名称" @keyup.enter="confirmRenameProject" />
      <div class="modal-actions">
        <button class="btn" @click="renameProject = null">取消</button>
        <button class="btn btn-dark" @click="confirmRenameProject">保存</button>
      </div>
    </Modal>

    <!-- 编辑任务弹窗 -->
    <Modal :show="!!editTask" @close="editTask = null">
      <h2 class="modal-title">编辑任务</h2>
      <input v-model="editName" class="input" placeholder="任务名称" @keyup.enter="confirmEdit" />
      <select v-model="editProjectId" class="input project-select">
        <option value="">无项目</option>
        <option v-for="p in projectStore.activeProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <div class="modal-actions">
        <button class="btn" @click="editTask = null">取消</button>
        <button class="btn btn-dark" @click="confirmEdit">保存</button>
      </div>
    </Modal>

    <!-- 删除确认浮窗 -->
    <ConfirmDialog
      :show="!!removeProjectId"
      message="删除该项目将连带删除其下所有任务（可到回收站恢复），建议先把有用的任务移出去。确定删除吗？"
      confirm-text="删除项目"
      @confirm="confirmRemoveProject"
      @cancel="removeProjectId = null"
    />
    <ConfirmDialog
      :show="!!removeTaskId"
      message="确定删除这个任务吗？（可在回收站恢复）"
      confirm-text="删除"
      @confirm="confirmRemoveTask"
      @cancel="removeTaskId = null"
    />
  </div>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin: 4px 0;
}
.quick-actions {
  display: flex;
  gap: 10px;
  margin: 10px 0 4px;
}
.page-sub {
  color: var(--gray);
  font-size: 13px;
  margin: 4px 0 12px;
}
.entry-list {
  border-top: 1px solid var(--light);
}
.entry {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 13px 2px;
  border-bottom: 1px solid var(--light);
}
.entry-name {
  font-size: 16px;
  flex: 1;
  min-width: 80px;
}
.tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.project-tag {
  background: var(--fg);
  color: var(--bg);
}
.task-tag {
  border: 1px solid var(--mid);
  color: var(--gray);
}
/* 已安排日程的任务：整体灰字 */
.entry.scheduled .entry-name,
.entry.scheduled .meta-item {
  color: var(--mid);
}
.entry-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding-left: 2px;
}
.meta-item {
  font-size: 12px;
  color: var(--gray);
}
.schedule-btn {
  font-size: 12px;
  padding: 2px 10px;
  min-height: 32px;
  min-width: auto;
  margin-left: auto;
}
.scheduled-tag {
  margin-left: auto;
  font-size: 12px;
}
.swipe-action {
  height: 100%;
  border: none;
  font-size: 13px;
  padding: 0 18px;
  cursor: pointer;
}
.swipe-action.edit {
  background: var(--bg);
  color: var(--fg);
  border-left: 1px solid var(--fg);
}
.swipe-action.delete {
  background: var(--fg);
  color: var(--bg);
}
.modal-title {
  font-size: 20px;
  margin: 0 0 16px;
}
.project-select {
  margin-top: 12px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
