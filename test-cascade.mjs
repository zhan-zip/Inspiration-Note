// 数据层级联测试：项目删除/恢复连带任务、purge 级联清理
import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectStore } from './src/stores/project.js'
import { useTaskStore } from './src/stores/task.js'
import { useScheduleStore } from './src/stores/schedule.js'
import { useCompletionStore } from './src/stores/completion.js'
import assert from 'node:assert'

setActivePinia(createPinia())
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const scheduleStore = useScheduleStore()
const completionStore = useCompletionStore()

// 准备
const p = await projectStore.create('项目A')
const t1 = await taskStore.create({ name: '任务1', project_id: p.id })
const t2 = await taskStore.create({ name: '任务2', project_id: null })
const s = await scheduleStore.create(t1.id, '2026-08-03', 'once')
const c = await completionStore.complete(t1.id, '2026-08-03')

// 1. 项目软删 → 连带软删其下任务，无项目任务不动
await projectStore.softDelete(p.id)
assert.strictEqual(projectStore.trashedProjects.length, 1, '项目应进回收站')
assert.ok(taskStore.tasks.find((x) => x.id === t1.id).deleted_at, '项目下任务1应被连带软删')
assert.ok(!taskStore.tasks.find((x) => x.id === t2.id).deleted_at, '无项目任务2不应被删')
console.log('1. 项目软删连带任务 ✅')

// 2. 项目恢复 → 连带恢复其下任务
await projectStore.restore(p.id)
assert.strictEqual(projectStore.activeProjects.length, 1, '项目应恢复')
assert.ok(!taskStore.tasks.find((x) => x.id === t1.id).deleted_at, '任务1应随项目恢复')
console.log('2. 项目恢复连带任务 ✅')

// 3. 任务彻底删除 → 清理其 schedule/completion
await taskStore.purge(t1.id)
assert.ok(!taskStore.tasks.find((x) => x.id === t1.id), '任务1应物理删除')
assert.ok(!scheduleStore.schedules.find((x) => x.task_id === t1.id), 'schedule 应被清理')
assert.ok(!completionStore.completions.find((x) => x.task_id === t1.id), 'completion 应被清理')
console.log('3. 任务 purge 级联清理 ✅')

// 4. 项目彻底删除 → 连带物理删除其下所有任务
const p2 = await projectStore.create('项目B')
const t3 = await taskStore.create({ name: '任务3', project_id: p2.id })
await projectStore.purge(p2.id)
assert.ok(!projectStore.projects.find((x) => x.id === p2.id), '项目B应物理删除')
assert.ok(!taskStore.tasks.find((x) => x.id === t3.id), '任务3应随项目B物理删除')
console.log('4. 项目 purge 连带删除 ✅')

console.log('🎉 级联测试全部通过')
process.exit(0)
