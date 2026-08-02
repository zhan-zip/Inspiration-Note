<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from '../stores/project.js'
import { useTaskStore } from '../stores/task.js'
import { useIdeaStore } from '../stores/idea.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import SwipeItem from '../components/SwipeItem.vue'

const projectStore = useProjectStore()
const taskStore = useTaskStore()
const ideaStore = useIdeaStore()

onMounted(async () => {
  await Promise.all([projectStore.load(), taskStore.load(), ideaStore.load()])
})

/* ---------- 展开状态 ---------- */
const expandedId = ref(null)
function toggleProject(id) {
  expandedId.value = expandedId.value === id ? null : id
}

const tasksOf = (projectId) =>
  taskStore.activeTasks.filter((t) => (t.project_id ?? null) === projectId)

const noProjectTasks = computed(() => taskStore.activeTasks.filter((t) => !t.project_id))

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
const editProject = ref(null) // 正在重命名的项目
const editProjectName = ref('')
function openRename(p) {
  editProject.value = p
  editProjectName.value = p.name
}
async function confirmRename() {
  if (editProject.value && editProjectName.value.trim()) {
    await projectStore.rename(editProject.value.id, editProjectName.value)
  }
  editProject.value = null
}

/* ---------- 添加任务（到指定项目或无项目） ---------- */
const addTask = ref(null) // 目标项目 id（null=无项目）
const addTaskName = ref('')
function openAddTask(projectId) {
  addTask.value = projectId
  addTaskName.value = ''
}
async function confirmAddTask() {
  if (!addTaskName.value.trim()) return
  await taskStore.create({ name: addTaskName.value, project_id: addTask.value })
  addTask.value = null
}

/* ---------- 编辑任务（改名 + 移动项目） ---------- */
const editTask = ref(null)
const editTaskName = ref('')
const editTaskProject = ref('')
function openEditTask(task) {
  editTask.value = task
  editTaskName.value = task.name
  editTaskProject.value = task.project_id ?? ''
}
async function confirmEditTask() {
  if (!editTask.value || !editTaskName.value.trim()) return
  await taskStore.update(editTask.value.id, {
    name: editTaskName.value,
    project_id: editTaskProject.value || null,
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
    <div class="page-head">
      <h1 class="page-title">项目</h1>
      <button class="btn btn-dark" @click="openNewProject">+ 新建项目</button>
    </div>

    <p class="page-sub">共 {{ projectStore.activeProjects.length }} 个项目</p>

    <!-- 项目卡片 -->
    <div
      v-for="p in projectStore.activeProjects"
      :key="p.id"
      class="project-card"
      :class="{ open: expandedId === p.id }"
    >
      <div class="project-head" @click="toggleProject(p.id)">
        <span class="project-name">{{ p.name }}</span>
        <span class="project-count">{{ tasksOf(p.id).length }}</span>
        <span class="arrow">{{ expandedId === p.id ? '▾' : '▸' }}</span>
      </div>

      <div v-if="expandedId === p.id" class="project-body">
        <template v-if="tasksOf(p.id).length">
          <SwipeItem v-for="t in tasksOf(p.id)" :key="t.id">
            <div class="task-row" @click="openEditTask(t)">
              <span class="task-name">{{ t.name }}</span>
              <button class="mini-btn" @click.stop="openEditTask(t)">编辑</button>
            </div>
            <template #actions="{ close }">
              <button class="swipe-action" @click="removeTaskId = t.id; close()">删除</button>
            </template>
          </SwipeItem>
        </template>
        <p v-else class="empty small">该项目还没有任务</p>

        <button class="btn add-task" @click="openAddTask(p.id)">+ 添加任务</button>
        <div class="project-actions">
          <button class="btn mini-btn" @click="openRename(p)">重命名</button>
          <button class="btn mini-btn danger" @click="removeProjectId = p.id">删除项目</button>
        </div>
      </div>
    </div>

    <!-- 无项目任务 -->
    <div class="project-card no-project">
      <div class="project-head">
        <span class="project-name">无项目</span>
        <span class="project-count">{{ noProjectTasks.length }}</span>
      </div>
      <div class="project-body">
        <template v-if="noProjectTasks.length">
          <SwipeItem v-for="t in noProjectTasks" :key="t.id">
            <div class="task-row" @click="openEditTask(t)">
              <span class="task-name">{{ t.name }}</span>
              <button class="mini-btn" @click.stop="openEditTask(t)">编辑</button>
            </div>
            <template #actions="{ close }">
              <button class="swipe-action" @click="removeTaskId = t.id; close()">删除</button>
            </template>
          </SwipeItem>
        </template>
        <p v-else class="empty small">没有无项目任务</p>
        <button class="btn add-task" @click="openAddTask(null)">+ 添加任务</button>
      </div>
    </div>

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
    <Modal :show="!!editProject" @close="editProject = null">
      <h2 class="modal-title">重命名项目</h2>
      <input v-model="editProjectName" class="input" placeholder="项目名称" @keyup.enter="confirmRename" />
      <div class="modal-actions">
        <button class="btn" @click="editProject = null">取消</button>
        <button class="btn btn-dark" @click="confirmRename">保存</button>
      </div>
    </Modal>

    <!-- 添加任务弹窗 -->
    <Modal :show="addTask !== null" @close="addTask = null">
      <h2 class="modal-title">添加任务</h2>
      <p class="modal-sub">目标：{{ addTask !== null && (projectStore.activeProjects.find((p) => p.id === addTask)?.name ?? '无项目') }}</p>
      <input v-model="addTaskName" class="input" placeholder="任务名称" @keyup.enter="confirmAddTask" />
      <div class="modal-actions">
        <button class="btn" @click="addTask = null">取消</button>
        <button class="btn btn-dark" @click="confirmAddTask">保存</button>
      </div>
    </Modal>

    <!-- 编辑任务弹窗（改名 + 移动项目） -->
    <Modal :show="!!editTask" @close="editTask = null">
      <h2 class="modal-title">编辑任务</h2>
      <input v-model="editTaskName" class="input" placeholder="任务名称" @keyup.enter="confirmEditTask" />
      <select v-model="editTaskProject" class="input project-select">
        <option value="">无项目</option>
        <option v-for="p in projectStore.activeProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <div class="modal-actions">
        <button class="btn" @click="editTask = null">取消</button>
        <button class="btn btn-dark" @click="confirmEditTask">保存</button>
      </div>
    </Modal>

    <!-- 删除确认浮窗 -->
    <ConfirmDialog
      :show="!!removeProjectId"
      message="删除该项目将连带删除其下所有任务（可到回收站恢复），建议先把有用的任务移出去。确定删除吗？"
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
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-title {
  font-size: 26px;
  margin: 4px 0;
}
.page-sub {
  color: var(--gray);
  font-size: 13px;
  margin: 4px 0 12px;
}

.project-card {
  border: 1px solid var(--fg);
  margin-bottom: 14px;
}
.project-card.open {
  border-color: var(--dark);
}
.project-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
}
.project-name {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
}
.project-count {
  font-size: 13px;
  color: var(--gray);
}
.arrow {
  font-size: 12px;
}
.project-body {
  border-top: 1px solid var(--light);
  padding: 8px 16px 12px;
}
.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 2px;
  border-bottom: 1px solid var(--light);
  cursor: pointer;
}
.task-name {
  font-size: 15px;
}
.mini-btn {
  font-size: 12px;
  padding: 3px 10px;
}
.mini-btn.danger {
  border-color: var(--dark);
}
.add-task {
  width: 100%;
  margin-top: 10px;
  font-size: 13px;
  padding: 6px;
  border-style: dashed;
}
.project-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
.empty.small {
  padding: 14px 0;
  font-size: 13px;
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
  margin: 0 0 16px;
}
.modal-sub {
  color: var(--gray);
  font-size: 14px;
  margin: 0 0 12px;
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
