// 数据层单元测试：验证"转任务回填项目归属"的数据流
import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { useIdeaStore } from './src/stores/idea.js'
import { useProjectStore } from './src/stores/project.js'
import { useTaskStore } from './src/stores/task.js'
import assert from 'node:assert'

setActivePinia(createPinia())
const ideaStore = useIdeaStore()
const projectStore = useProjectStore()
const taskStore = useTaskStore()

function labelFor(idea) {
  if (idea.status === 'pending') return '待转'
  if (!idea.project_id) return '无项目'
  return projectStore.activeProjects.find((p) => p.id === idea.project_id)?.name ?? '无项目'
}

// 场景 1：选已有项目
const p1 = await projectStore.create('食光记')
const i1 = await ideaStore.create('已有项目灵感')
await taskStore.create({ name: i1.content, project_id: p1.id })
await ideaStore.markConverted(i1.id, p1.id)
const s1 = ideaStore.ideas.find((i) => i.id === i1.id)
console.log('场景1 已有项目 → 标签:', labelFor(s1), '(应=食光记)')

// 场景 2：新建项目
const i2 = await ideaStore.create('新建项目灵感')
const p2 = await projectStore.create('新项目A')
await taskStore.create({ name: i2.content, project_id: p2.id })
await ideaStore.markConverted(i2.id, p2.id)
const s2 = ideaStore.ideas.find((i) => i.id === i2.id)
console.log('场景2 新建项目 → 标签:', labelFor(s2), '(应=新项目A)')

// 场景 3：无项目
const i3 = await ideaStore.create('无项目灵感')
await taskStore.create({ name: i3.content, project_id: null })
await ideaStore.markConverted(i3.id, null)
const s3 = ideaStore.ideas.find((i) => i.id === i3.id)
console.log('场景3 无项目 → 标签:', labelFor(s3), '(应=无项目)')

// 场景 4：转任务后灵感从列表消失
const i4 = await ideaStore.create('转后应消失')
assert.ok(ideaStore.activeIdeas.some((i) => i.id === i4.id), '转前应在列表')
await ideaStore.markConverted(i4.id, null)
assert.ok(!ideaStore.activeIdeas.some((i) => i.id === i4.id), '转后应离开列表')
console.log('场景4 转任务后消失 ✅')

const ok =
  labelFor(s1) === '食光记' && labelFor(s2) === '新项目A' && labelFor(s3) === '无项目'
console.log(ok ? '✅ 数据层全部通过' : '❌ 数据层有问题')
process.exit(ok ? 0 : 1)
