<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '../stores/task'
import { useScheduleStore } from '../stores/schedule'
import { useProjectStore } from '../stores/project'
import Modal from '../components/Modal.vue'
import { toDateStr, todayStr, scheduleActiveOn } from '../utils/date'

const taskStore = useTaskStore()
const scheduleStore = useScheduleStore()
const projectStore = useProjectStore()

onMounted(async () => {
  await Promise.all([taskStore.load(), scheduleStore.load(), projectStore.load()])
})

/* ---------- 月份状态 ---------- */
const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth())

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']
const today = todayStr()

/* 当月网格（周一起始），首尾补 null */
const cells = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const first = new Date(y, m, 1)
  const startDay = (first.getDay() + 6) % 7 // 周一为 0
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const list = []
  for (let i = 0; i < startDay; i++) list.push(null)
  for (let d = 1; d <= daysInMonth; d++) list.push(new Date(y, m, d))
  return list
})

const monthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`)

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}
function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}
function backToToday() {
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
}

/* ---------- 某天任务数（周期生效 + 去重任务 + 排除软删） ---------- */
function countForDate(dateStr) {
  const ids = new Set()
  for (const s of scheduleStore.schedules) {
    if (scheduleActiveOn(s, dateStr)) ids.add(s.task_id)
  }
  let count = 0
  for (const id of ids) {
    const t = taskStore.tasks.find((x) => x.id === id)
    if (t && !t.deleted_at) count++
  }
  return count
}

/* 任务量颜色：≤2 白、3~4 灰、≥5 黑（用户定 3 灰 / 5 黑） */
function levelClass(count) {
  if (count >= 5) return 'level-black'
  if (count >= 3) return 'level-gray'
  return 'level-white'
}

/* ---------- 某天安排弹窗 ---------- */
const selected = ref(null) // 选中的日期 Date

const dayStr = computed(() => (selected.value ? toDateStr(selected.value) : ''))

const daySchedules = computed(() => {
  if (!selected.value) return []
  const dateStr = toDateStr(selected.value)
  return scheduleStore.schedules
    .filter((s) => scheduleActiveOn(s, dateStr))
    .map((s) => ({ ...s, task: taskStore.tasks.find((t) => t.id === s.task_id) }))
    .filter((x) => x.task && !x.task.deleted_at)
})

const TYPE_LABEL = { once: '单次', weekly: '每周', monthly: '每月', yearly: '每年' }

/* 添加安排 */
const addTaskId = ref('')
const addType = ref('once')
function openDay(date) {
  selected.value = date
  addTaskId.value = ''
  addType.value = 'once'
}
async function confirmSchedule() {
  if (!addTaskId.value) return
  await scheduleStore.create(addTaskId.value, dayStr.value, addType.value)
  addTaskId.value = ''
}
async function removeSchedule(id) {
  await scheduleStore.remove(id)
}

/* 项目名 */
const projectNameOf = (id) => projectStore.activeProjects.find((p) => p.id === id)?.name ?? ''
</script>

<template>
  <div class="page">
    <div class="cal-head">
      <button class="btn" @click="prevMonth">‹</button>
      <div class="cal-title">
        <span class="month-label">{{ monthLabel }}</span>
        <button class="btn today-btn" @click="backToToday">今天</button>
      </div>
      <button class="btn" @click="nextMonth">›</button>
    </div>

    <div class="legend">
      <span class="legend-item"><i class="dot level-white" />≤2 白</span>
      <span class="legend-item"><i class="dot level-gray" />3~4 灰</span>
      <span class="legend-item"><i class="dot level-black" />≥5 黑</span>
    </div>

    <!-- 星期表头 -->
    <div class="week-row">
      <span v-for="w in WEEK_DAYS" :key="w" class="week-cell">{{ w }}</span>
    </div>

    <!-- 月历网格 -->
    <div class="grid">
      <div
        v-for="(cell, idx) in cells"
        :key="idx"
        class="day"
        :class="cell ? levelClass(countForDate(toDateStr(cell))) : 'blank'"
        @click="cell && openDay(cell)"
      >
        <template v-if="cell">
          <span class="day-num" :class="{ today: toDateStr(cell) === today }">{{ cell.getDate() }}</span>
          <span v-if="countForDate(toDateStr(cell))" class="day-count">{{ countForDate(toDateStr(cell)) }}</span>
        </template>
      </div>
    </div>

    <!-- 某天安排弹窗 -->
    <Modal :show="!!selected" @close="selected = null">
      <h2 class="modal-title">{{ dayStr }}</h2>

      <p class="section-label">当天任务（{{ daySchedules.length }}）</p>
      <div v-if="daySchedules.length" class="day-list">
        <div v-for="s in daySchedules" :key="s.id" class="day-task">
          <div class="day-task-info">
            <span class="day-task-name">{{ s.task.name }}</span>
            <span class="day-task-type">{{ TYPE_LABEL[s.type] }}</span>
            <span v-if="s.task.project_id" class="day-task-project">{{ projectNameOf(s.task.project_id) }}</span>
          </div>
          <button class="btn remove-btn" @click="removeSchedule(s.id)">取消</button>
        </div>
      </div>
      <p v-else class="empty small">今天没有安排</p>

      <p class="section-label">添加安排</p>
      <select v-model="addTaskId" class="input">
        <option value="" disabled>选择任务…</option>
        <option v-for="t in taskStore.activeTasks" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <div class="type-row">
        <label v-for="(label, val) in TYPE_LABEL" :key="val" class="type-option">
          <input v-model="addType" type="radio" :value="val" />
          {{ label }}
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn" @click="selected = null">关闭</button>
        <button class="btn btn-dark" @click="confirmSchedule">安排</button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.cal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.month-label {
  font-size: 20px;
  font-weight: 700;
}
.today-btn {
  font-size: 13px;
  padding: 4px 10px;
}
.legend {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--gray);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.dot {
  width: 10px;
  height: 10px;
  border: 1px solid var(--fg);
  display: inline-block;
}
.dot.level-gray {
  background: var(--mid);
  border-color: var(--mid);
}
.dot.level-black {
  background: var(--dark);
  border-color: var(--dark);
}
.week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.week-cell {
  text-align: center;
  font-size: 12px;
  color: var(--gray);
  padding: 4px 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--light);
  position: relative;
  cursor: pointer;
}
.day-num {
  font-size: 14px;
}
.day-num.today {
  font-weight: 700;
  border: 1px solid var(--fg);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  line-height: 20px;
  text-align: center;
}
.day-count {
  position: absolute;
  bottom: 3px;
  font-size: 10px;
}
.level-gray {
  background: var(--mid);
}
.level-black {
  background: var(--dark);
  color: var(--bg);
}
.day.blank {
  border: none;
}
.section-label {
  font-size: 13px;
  color: var(--gray);
  margin: 14px 0 6px;
}
.day-list {
  border-top: 1px solid var(--light);
}
.day-task {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 2px;
  border-bottom: 1px solid var(--light);
}
.day-task-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.day-task-name {
  font-size: 15px;
}
.day-task-type,
.day-task-project {
  font-size: 12px;
  color: var(--gray);
}
.remove-btn {
  font-size: 13px;
  padding: 3px 10px;
}
.empty.small {
  padding: 12px 0;
}
.type-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 10px 0;
}
.type-option {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
</style>
