<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/task.js'
import { useProjectStore } from '../stores/project.js'
import SwipeItem from '../components/SwipeItem.vue'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()
const taskStore = useTaskStore()
const projectStore = useProjectStore()

onMounted(async () => {
  await Promise.all([taskStore.load(), projectStore.load()])
})

/* 所有未删除任务（含已安排到日历的），按创建时间倒序 */
const tasks = computed(() =>
  [...taskStore.activeTasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
)

const projectNameOf = (id) => projectStore.activeProjects.find((p) => p.id === id)?.name ?? ''

/* 点击项目 → 进入该项目任务列表页 */
function goProject(id) {
  router.push(`/project/${id}`)
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

/* ---------- 编辑任务（改名 + 移动项目） ---------- */
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

/* ---------- 删除（自绘确认 + 软删除） ---------- */
const removeId = ref(null)
async function confirmRemove() {
  if (removeId.value) await taskStore.softDelete(removeId.value)
  removeId.value = null
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">任务列表</h1>
    </div>

    <div class="quick-actions">
      <button class="btn btn-dark" @click="openAdd">+ 新建任务</button>
      <button class="btn" @click="openNewProject">+ 新建项目</button>
    </div>

    <p class="page-sub">共 {{ tasks.length }} 个任务</p>

    <div class="task-list">
      <template v-if="tasks.length">
        <SwipeItem v-for="task in tasks" :key="task.id">
          <div class="task-item">
            <span class="task-name">{{ task.name }}</span>
            <button
              v-if="task.project_id"
              class="task-project"
              @click.stop="goProject(task.project_id)"
            >
              {{ projectNameOf(task.project_id) }}
            </button>
          </div>
          <template #actions="{ close }">
            <button class="swipe-action edit" @click="openEditTask(task); close()">编辑</button>
            <button class="swipe-action delete" @click="removeId = task.id; close()">删除</button>
          </template>
        </SwipeItem>
      </template>
      <p v-else class="empty">还没有任务，点上方新建</p>
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
      :show="!!removeId"
      message="确定删除这个任务吗？（可在回收站恢复）"
      confirm-text="删除"
      @confirm="confirmRemove"
      @cancel="removeId = null"
    />
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
}
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
.task-list {
  border-top: 1px solid var(--light);
}
.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 2px;
  border-bottom: 1px solid var(--light);
}
.task-name {
  flex: 1;
  font-size: 16px;
}
.task-project {
  border: none;
  background: var(--light);
  color: var(--gray);
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
  border-radius: 2px;
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
