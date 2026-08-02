<script setup>
import { ref, onMounted } from 'vue'
import { useIdeaStore } from '../stores/idea.js'
import { useProjectStore } from '../stores/project.js'
import { useTaskStore } from '../stores/task.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const ideaStore = useIdeaStore()
const projectStore = useProjectStore()
const taskStore = useTaskStore()

onMounted(async () => {
  await Promise.all([ideaStore.load(), projectStore.load(), taskStore.load()])
})

/* 恢复：项目恢复会连带恢复其下任务 */
async function restoreProject(id) {
  await projectStore.restore(id)
}
async function restoreTask(id) {
  await taskStore.restore(id)
}
async function restoreIdea(id) {
  await ideaStore.restore(id)
}

/* 彻底删除：需确认，不可恢复 */
const purgeTarget = ref(null) // { type: 'project'|'task'|'idea', id }
function askPurge(type, id) {
  purgeTarget.value = { type, id }
}
async function confirmPurge() {
  const { type, id } = purgeTarget.value
  if (type === 'project') await projectStore.purge(id)
  else if (type === 'task') await taskStore.purge(id)
  else if (type === 'idea') await ideaStore.purge(id)
  purgeTarget.value = null
}

const total = () =>
  projectStore.trashedProjects.length + taskStore.trashedTasks.length + ideaStore.trashedIdeas.length
</script>

<template>
  <div class="page">
    <h1 class="page-title">回收站</h1>
    <p class="page-sub">共 {{ total() }} 项 · 恢复后回到原位，彻底删除不可恢复</p>

    <!-- 项目 -->
    <template v-if="projectStore.trashedProjects.length">
      <h2 class="section-title">项目（{{ projectStore.trashedProjects.length }}）</h2>
      <div class="trash-item" v-for="p in projectStore.trashedProjects" :key="p.id">
        <div class="trash-info">
          <p class="trash-name">{{ p.name }}</p>
          <p class="trash-time">删除于 {{ (p.deleted_at || '').slice(0, 16).replace('T', ' ') }}</p>
        </div>
        <div class="trash-actions">
          <button class="btn btn-dark" @click="restoreProject(p.id)">恢复</button>
          <button class="btn" @click="askPurge('project', p.id)">彻底删除</button>
        </div>
      </div>
    </template>

    <!-- 任务 -->
    <template v-if="taskStore.trashedTasks.length">
      <h2 class="section-title">任务（{{ taskStore.trashedTasks.length }}）</h2>
      <div class="trash-item" v-for="t in taskStore.trashedTasks" :key="t.id">
        <div class="trash-info">
          <p class="trash-name">{{ t.name }}</p>
          <p class="trash-time">删除于 {{ (t.deleted_at || '').slice(0, 16).replace('T', ' ') }}</p>
        </div>
        <div class="trash-actions">
          <button class="btn btn-dark" @click="restoreTask(t.id)">恢复</button>
          <button class="btn" @click="askPurge('task', t.id)">彻底删除</button>
        </div>
      </div>
    </template>

    <!-- 灵感 -->
    <template v-if="ideaStore.trashedIdeas.length">
      <h2 class="section-title">灵感（{{ ideaStore.trashedIdeas.length }}）</h2>
      <div class="trash-item" v-for="i in ideaStore.trashedIdeas" :key="i.id">
        <div class="trash-info">
          <p class="trash-name">{{ i.content }}</p>
          <p class="trash-time">删除于 {{ (i.deleted_at || '').slice(0, 16).replace('T', ' ') }}</p>
        </div>
        <div class="trash-actions">
          <button class="btn btn-dark" @click="restoreIdea(i.id)">恢复</button>
          <button class="btn" @click="askPurge('idea', i.id)">彻底删除</button>
        </div>
      </div>
    </template>

    <p v-if="!total()" class="empty">回收站是空的</p>

    <!-- 彻底删除确认 -->
    <ConfirmDialog
      :show="!!purgeTarget"
      message="彻底删除后不可恢复，确定要彻底删除吗？"
      confirm-text="彻底删除"
      @confirm="confirmPurge"
      @cancel="purgeTarget = null"
    />
  </div>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin: 4px 0;
}
.page-sub {
  color: var(--gray);
  font-size: 13px;
  margin: 4px 0 14px;
}
.section-title {
  font-size: 15px;
  margin: 18px 0 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--mid);
}
.trash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 2px;
  border-bottom: 1px solid var(--light);
}
.trash-info {
  flex: 1;
  min-width: 0;
}
.trash-name {
  margin: 0 0 4px;
  font-size: 15px;
  word-break: break-word;
}
.trash-time {
  margin: 0;
  font-size: 12px;
  color: var(--gray);
}
.trash-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.trash-actions .btn {
  font-size: 13px;
  padding: 4px 10px;
}
</style>
