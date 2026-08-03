<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCompletionStore } from '../stores/completion.js'
import { useTaskStore } from '../stores/task.js'
import { useProjectStore } from '../stores/project.js'
import { toDateStr } from '../utils/date.js'

const completionStore = useCompletionStore()
const taskStore = useTaskStore()
const projectStore = useProjectStore()

onMounted(async () => {
  await Promise.all([completionStore.load(), taskStore.load(), projectStore.load()])
})

const viewMode = ref('week') // day / week / month
const dayOffset = ref(0)
const weekOffset = ref(0)
const monthOffset = ref(0)

/* 周范围（周一起始） */
function weekRangeByOffset(offset) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  monday.setDate(monday.getDate() + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: toDateStr(monday), end: toDateStr(sunday) }
}

/* 月范围 */
function monthRangeByOffset(offset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + offset
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 0)
  return { start: toDateStr(start), end: toDateStr(end) }
}

const range = computed(() => {
  if (viewMode.value === 'day') {
    const d = new Date()
    d.setDate(d.getDate() + dayOffset.value)
    const str = toDateStr(d)
    return { start: str, end: str, label: str }
  }
  if (viewMode.value === 'week') {
    const r = weekRangeByOffset(weekOffset.value)
    return { ...r, label: `${r.start} ~ ${r.end}` }
  }
  const r = monthRangeByOffset(monthOffset.value)
  return { ...r, label: `${r.start.slice(0, 7)}` }
})

function shift(delta) {
  if (viewMode.value === 'day') dayOffset.value += delta
  else if (viewMode.value === 'week') weekOffset.value += delta
  else monthOffset.value += delta
}
function backToday() {
  dayOffset.value = 0
  weekOffset.value = 0
  monthOffset.value = 0
}

/* 周期内完成记录 → 按项目分组 */
const groups = computed(() => {
  const { start, end } = range.value
  const completions = completionStore.completions
    .filter((c) => c.date >= start && c.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date))
  const map = new Map()
  for (const c of completions) {
    const task = taskStore.tasks.find((t) => t.id === c.task_id)
    if (!task || task.deleted_at) continue
    const key = task.project_id || 'none'
    if (!map.has(key)) {
      const proj = task.project_id
        ? projectStore.activeProjects.find((p) => p.id === task.project_id)
        : null
      map.set(key, { name: proj?.name ?? '无项目', items: [] })
    }
    map.get(key).items.push({ id: task.id, name: task.name, date: c.date })
  }
  return [...map.values()]
})

const totalCount = computed(() => groups.value.reduce((s, g) => s + g.items.length, 0))
</script>

<template>
  <div class="page">
    <h1 class="page-title">复盘</h1>

    <!-- 周/月切换 -->
    <div class="mode-tabs">
      <button class="tab" :class="{ active: viewMode === 'day' }" @click="viewMode = 'day'">天</button>
      <button class="tab" :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">周</button>
      <button class="tab" :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">月</button>
    </div>

    <!-- 周期导航 -->
    <div class="range-nav">
      <button class="btn" @click="shift(-1)">‹</button>
      <div class="range-label">
        <span>{{ range.label }}</span>
        <button class="btn today-link" @click="backToday">回今天</button>
      </div>
      <button class="btn" @click="shift(1)">›</button>
    </div>

    <p class="page-sub">共完成 {{ totalCount }} 个任务</p>

    <!-- 按项目分组 -->
    <template v-if="groups.length">
      <div v-for="(g, gi) in groups" :key="gi" class="group">
        <h2 class="group-title">{{ g.name }}</h2>
        <div class="group-list">
          <div v-for="item in g.items" :key="item.id + item.date" class="item">
            <p class="item-name">{{ item.name }}</p>
            <p class="item-sub">
              <span class="item-project">{{ g.name }}</span>
              <span class="item-date">{{ item.date }}</span>
            </p>
          </div>
        </div>
      </div>
    </template>
    <p v-else class="empty">这个周期还没有完成记录。<br />去「今日」打钩完成一些吧</p>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin: 4px 0 14px;
}

.mode-tabs {
  display: flex;
  border: 1px solid var(--fg);
  margin-bottom: 12px;
}
.tab {
  flex: 1;
  padding: 8px 0;
  background: var(--bg);
  border: none;
  font-size: 15px;
  cursor: pointer;
  color: var(--fg);
}
.tab.active {
  background: var(--fg);
  color: var(--bg);
}

.range-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.range-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--gray);
}
.today-link {
  font-size: 12px;
  padding: 2px 8px;
}

.page-sub {
  color: var(--gray);
  font-size: 13px;
  margin: 4px 0 12px;
}

.group {
  margin-bottom: 18px;
}
.group-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--mid);
}
.group-list {
  border-top: 1px solid var(--light);
}
.item {
  padding: 12px 2px;
  border-bottom: 1px solid var(--light);
}
.item-name {
  margin: 0 0 4px;
  font-size: 15px;
}
.item-sub {
  margin: 0;
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--gray);
}
.empty {
  line-height: 1.8;
}
</style>
