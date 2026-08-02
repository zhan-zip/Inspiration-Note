import { defineStore } from 'pinia'
import * as db from '../db/db'

/** 完成记录 store：task_id + date 记录某天完成任务（复盘页用） */
export const useCompletionStore = defineStore('completion', {
  state: () => ({
    completions: [],
  }),
  getters: {
    byDate: (state) => (date) => state.completions.filter((c) => c.date === date),
    isCompleted: (state) => (taskId, date) =>
      state.completions.some((c) => c.task_id === taskId && c.date === date),
  },
  actions: {
    async load() {
      this.completions = await db.getAll('completions')
    },
    /** 打钩完成 */
    async complete(taskId, date) {
      await db.addItem('completions', {
        id: db.newId(),
        task_id: taskId,
        date,
      })
      await this.load()
    },
    /** 取消完成 */
    async uncomplete(taskId, date) {
      const target = this.completions.find((c) => c.task_id === taskId && c.date === date)
      if (target) {
        await db.purgeItem('completions', target.id)
        await this.load()
      }
    },
    /** 删除任务时的级联清理 */
    async removeByTask(taskId) {
      for (const c of this.completions) {
        if (c.task_id === taskId) {
          await db.purgeItem('completions', c.id)
        }
      }
      await this.load()
    },
  },
})
