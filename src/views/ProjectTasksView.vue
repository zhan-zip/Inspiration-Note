<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project.js'
import { useTaskStore } from '../stores/task.js'
import SwipeItem from '../components/SwipeItem.vue'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const taskStore = useTaskStore()

onMounted(async () => {
  await Promise.all([projectStore.load(), taskStore.load()])
})

const project = computed(() => projectStore.activeProjects.find((p) => p.id === route.params.id))

/* 该项目下的任务 */
const tasks = computed(() =>
  taskStore.activeTasks.filter((t) => t.project_id === route.params.id),
)

/* ---------- 添加任务 ---------- */
const showAdd = ref(false)
const addName = ref('')
function openAdd() {
  addName.value = ''
  showAdd.value = true
}
async function confirmAdd() {
  if (!addName.value.trim()) return
  await taskStore.create({ name: addName.value, project_id: route.params.id })
  showAdd.value = false
}

/* ---------- 编辑任务 ---------- */
const editTask = ref(null)
const editName = ref('')
function openEditTask(task) {
  editTask.value = task
  editName.value = task.name
}
async function confirmEdit() {
  if (editTask.value && editName.value.trim()) {
    await taskStore.update(editTask.value.id, { name: editName.value })
  }
  editTask.value = null
}

/* ---------- 重命名项目 ---------- */
const showRename = ref(false)
const renameName = ref('')
function openRename() {
  renameName.value = project.value?.name ?? ''
  showRename.value = true
}
async function confirmRename() {
  if (project.value && renameName.value.trim()) {
    await projectStore.rename(project.value.id, renameName.value)
  }
  showRename.value = false
}

/* ---------- 删除项目（连带任务） ---------- */
const showDeleteProject = ref(false)
async function confirmDeleteProject() {
  if (project.value) await projectStore.softDelete(project.value.id)
  showDeleteProject.value = false
  router.push('/tasks')
}

/* ---------- 删除任务 ---------- */
const removeTaskId = ref(null)
async function confirmRemoveTask() {
  if (removeTaskId.value) await taskStore.softDelete(removeTaskId.value)
  removeTaskId.value = null
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <button class="btn back-btn" @click="router.push('/tasks')">← 返回</button>
      <h1 class="page-title">{{ project?.name ?? '项目' }}</h1>
    </div>

    <div class="project-tools">
      <button class="btn" @click="openRename">重命名</button>
      <button class="btn danger" @click="showDeleteProject = true">删除项目</button>
      <button class="btn btn-dark" @click="openAdd">+ 添加任务</button>
    </div>

    <p class="page-sub">共 {{ tasks.length }} 个任务</p>

    <template v-if="project">
      <div class="task-list">
        <template v-if="tasks.length">
          <SwipeItem v-for="task in tasks" :key="task.id">
            <div class="task-item">
              <span class="task-name">{{ task.name }}</span>
            </div>
            <template #actions="{ close }">
              <button class="swipe-action edit" @click="openEditTask(task); close()">编辑</button>
              <button class="swipe-action delete" @click="removeTaskId = task.id; close()">删除</button>
            </template>
          </SwipeItem>
        </template>
        <p v-else class="empty">该项目还没有任务</p>
      </div>
    </template>
    <p v-else class="empty">项目不存在或已被删除</p>

    <!-- 添加任务弹窗 -->
    <Modal :show="showAdd" @close="showAdd = false">
      <h2 class="modal-title">添加任务</h2>
      <input v-model="addName" class="input" placeholder="任务名称" @keyup.enter="confirmAdd" />
      <div class="modal-actions">
        <button class="btn" @click="showAdd = false">取消</button>
        <button class="btn btn-dark" @click="confirmAdd">保存</button>
      </div>
    </Modal>

    <!-- 编辑任务弹窗 -->
    <Modal :show="!!editTask" @close="editTask = null">
      <h2 class="modal-title">编辑任务</h2>
      <input v-model="editName" class="input" placeholder="任务名称" @keyup.enter="confirmEdit" />
      <div class="modal-actions">
        <button class="btn" @click="editTask = null">取消</button>
        <button class="btn btn-dark" @click="confirmEdit">保存</button>
      </div>
    </Modal>

    <!-- 重命名项目弹窗 -->
    <Modal :show="showRename" @close="showRename = false">
      <h2 class="modal-title">重命名项目</h2>
      <input v-model="renameName" class="input" placeholder="项目名称" @keyup.enter="confirmRename" />
      <div class="modal-actions">
        <button class="btn" @click="showRename = false">取消</button>
        <button class="btn btn-dark" @click="confirmRename">保存</button>
      </div>
    </Modal>

    <!-- 删除项目确认（连带任务） -->
    <ConfirmDialog
      :show="showDeleteProject"
      message="删除该项目将连带删除其下所有任务（可到回收站恢复），建议先把有用的任务移出去。确定删除吗？"
      confirm-text="删除项目"
      @confirm="confirmDeleteProject"
      @cancel="showDeleteProject = false"
    />
    <!-- 删除任务确认 -->
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
  gap: 12px;
}
.back-btn {
  font-size: 13px;
  padding: 4px 10px;
}
.page-title {
  font-size: 24px;
  margin: 4px 0;
}
.project-tools {
  display: flex;
  gap: 10px;
  margin: 10px 0 4px;
}
.danger {
  border-color: var(--dark);
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
}
.task-name {
  font-size: 16px;
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
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
