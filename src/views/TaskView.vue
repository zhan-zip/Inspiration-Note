<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '../stores/task'
import { useProjectStore } from '../stores/project'
import { useScheduleStore } from '../stores/schedule'
import SwipeItem from '../components/SwipeItem.vue'
import Modal from '../components/Modal.vue'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const scheduleStore = useScheduleStore()

onMounted(async () => {
  await Promise.all([taskStore.load(), projectStore.load(), scheduleStore.load()])
})

/* 待办池：未安排日程、未软删除的任务 */
const todoTasks = computed(() => {
  const scheduledIds = new Set(scheduleStore.schedules.map((s) => s.task_id))
  return taskStore.activeTasks.filter((t) => !scheduledIds.has(t.id))
})

/* 项目 id → 名称 */
const projectNameOf = (id) => projectStore.activeProjects.find((p) => p.id === id)?.name ?? ''

/* ---------- 新增任务 ---------- */
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

/* ---------- 编辑任务 ---------- */
const editTask = ref(null)
const editName = ref('')
const editProjectId = ref('')
function openEdit(task) {
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

/* ---------- 删除（软删除进回收站） ---------- */
async function removeTask(id) {
  if (confirm('确定删除这个任务吗？（可在回收站恢复）')) {
    await taskStore.softDelete(id)
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">任务列表</h1>
      <button class="btn btn-dark" @click="openAdd">+ 新增</button>
    </div>

    <p class="page-sub">待办池 · 共 {{ todoTasks.length }} 个未安排任务</p>

    <div class="task-list">
      <template v-if="todoTasks.length">
        <SwipeItem v-for="task in todoTasks" :key="task.id">
          <div class="task-item" @click="openEdit(task)">
            <p class="task-name">{{ task.name }}</p>
            <span v-if="task.project_id" class="task-project">{{ projectNameOf(task.project_id) }}</span>
          </div>
          <template #actions="{ close }">
            <button class="swipe-action" @click="removeTask(task.id); close()">删除</button>
          </template>
        </SwipeItem>
      </template>
      <p v-else class="empty">暂无待办任务，点右上角新增</p>
    </div>

    <!-- 新增任务弹窗 -->
    <Modal :show="showAdd" @close="showAdd = false">
      <h2 class="modal-title">新增任务</h2>
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
.task-list {
  border-top: 1px solid var(--light);
}
.task-item {
  padding: 15px 2px;
  border-bottom: 1px solid var(--light);
  cursor: pointer;
}
.task-name {
  margin: 0 0 4px;
  font-size: 16px;
}
.task-project {
  font-size: 12px;
  color: var(--gray);
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
