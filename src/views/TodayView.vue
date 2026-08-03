<script setup>
import { computed, onMounted } from 'vue'
import { useTaskStore } from '../stores/task'
import { useScheduleStore } from '../stores/schedule'
import { useCompletionStore } from '../stores/completion'
import { useProjectStore } from '../stores/project'
import { todayStr, scheduleActiveOn } from '../utils/date'

const taskStore = useTaskStore()
const scheduleStore = useScheduleStore()
const completionStore = useCompletionStore()
const projectStore = useProjectStore()

onMounted(async () => {
  await Promise.all([
    taskStore.load(),
    scheduleStore.load(),
    completionStore.load(),
    projectStore.load(),
  ])
})

const date = todayStr()

/* 今天应安排的任务（单次=今天；每周=星期相同；每月=号相同；每年=月日相同） */
const todayTasks = computed(() => {
  const ids = new Set()
  for (const s of scheduleStore.schedules) {
    if (scheduleActiveOn(s, date)) ids.add(s.task_id)
  }
  return taskStore.activeTasks.filter((t) => ids.has(t.id))
})

const doneCount = computed(
  () => todayTasks.value.filter((t) => completionStore.isCompleted(t.id, date)).length,
)

async function toggle(task) {
  if (completionStore.isCompleted(task.id, date)) {
    await completionStore.uncomplete(task.id, date)
  } else {
    await completionStore.complete(task.id, date)
  }
}

const projectNameOf = (id) => projectStore.activeProjects.find((p) => p.id === id)?.name ?? ''
const weekDay = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]
</script>

<template>
  <div class="page">
    <h1 class="page-title">今日</h1>
    <p class="page-sub">{{ date }} · 周{{ weekDay }} · 已完成 {{ doneCount }}/{{ todayTasks.length }}</p>

    <div class="today-list">
      <template v-if="todayTasks.length">
        <div
          v-for="task in todayTasks"
          :key="task.id"
          class="today-item"
          :class="{ done: completionStore.isCompleted(task.id, date) }"
          @click="toggle(task)"
        >
          <span class="check">{{ completionStore.isCompleted(task.id, date) ? '✓' : '' }}</span>
          <span class="today-name">{{ task.name }}</span>
          <span v-if="task.project_id" class="today-project">{{ projectNameOf(task.project_id) }}</span>
        </div>
      </template>
      <p v-else class="empty">今天没有安排任务。<br />去「日历」安排一些吧</p>
    </div>
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
.today-list {
  border-top: 1px solid var(--light);
}
.today-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 4px;
  border-bottom: 1px solid var(--light);
  cursor: pointer;
}
.check {
  width: 24px;
  height: 24px;
  border: 2px solid var(--fg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.today-item.done .check {
  background: var(--fg);
  color: var(--bg);
}
.today-name {
  font-size: 16px;
  flex: 1;
}
.today-item.done .today-name {
  color: var(--gray);
  text-decoration: line-through;
}
.today-project {
  font-size: 12px;
  color: var(--gray);
}
.empty {
  line-height: 1.8;
}
</style>
