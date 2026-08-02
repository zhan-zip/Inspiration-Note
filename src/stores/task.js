import { defineStore } from 'pinia'
import * as db from '../db/db'
import { useScheduleStore } from './schedule'
import { useCompletionStore } from './completion'

/** 任务 store */
export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [],
  }),
  getters: {
    /** 正常任务（未软删除） */
    activeTasks(state) {
      return state.tasks.filter((t) => !t.deleted_at)
    },
    /** 回收站里的任务 */
    trashedTasks(state) {
      return state.tasks
        .filter((t) => t.deleted_at)
        .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    },
  },
  actions: {
    async load() {
      this.tasks = await db.getAll('tasks')
    },
    /** 新增任务 */
    async create({ name, project_id = null }) {
      const task = {
        id: db.newId(),
        name: name.trim(),
        project_id,
        status: 'todo', // todo=待办 / done=已完成
        created_at: db.nowISO(),
        deleted_at: null,
      }
      await db.addItem('tasks', task)
      await this.load()
      return task
    },
    /** 编辑任务 */
    async update(id, patch) {
      const task = await db.getItem('tasks', id)
      if (task) {
        await db.putItem('tasks', { ...task, ...patch })
        await this.load()
      }
    },
    /** 移动任务到其他项目 / 无项目（project_id 传 null） */
    async moveToProject(id, project_id) {
      await this.update(id, { project_id })
    },
    /** 软删除单个任务（连带清理其日程与完成记录到回收站失效态：随任务恢复生效） */
    async softDelete(id) {
      await db.softDelete('tasks', id)
      await this.load()
    },
    /** 项目被软删除时：连带软删其下所有正常任务 */
    async softDeleteByProject(projectId) {
      for (const t of this.tasks) {
        if (t.project_id === projectId && !t.deleted_at) {
          await db.softDelete('tasks', t.id)
        }
      }
      await this.load()
    },
    /** 项目被恢复时：连带恢复其下所有软删任务 */
    async restoreByProject(projectId) {
      for (const t of this.tasks) {
        if (t.project_id === projectId && t.deleted_at) {
          await db.restore('tasks', t.id)
        }
      }
      await this.load()
    },
    /** 恢复单个任务 */
    async restore(id) {
      await db.restore('tasks', id)
      await this.load()
    },
    /** 彻底删除单个任务（连带物理删除其日程与完成记录） */
    async purge(id) {
      const scheduleStore = useScheduleStore()
      const completionStore = useCompletionStore()
      await scheduleStore.removeByTask(id)
      await completionStore.removeByTask(id)
      await db.purgeItem('tasks', id)
      await this.load()
    },
    /** 项目被彻底删除时：连带物理删除其下所有任务（含已软删） */
    async purgeByProject(projectId) {
      const scheduleStore = useScheduleStore()
      const completionStore = useCompletionStore()
      for (const t of this.tasks) {
        if (t.project_id === projectId) {
          await scheduleStore.removeByTask(t.id)
          await completionStore.removeByTask(t.id)
          await db.purgeItem('tasks', t.id)
        }
      }
      await this.load()
    },
  },
})
