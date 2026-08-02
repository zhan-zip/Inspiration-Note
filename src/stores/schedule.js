import { defineStore } from 'pinia'
import * as db from '../db/db'

/**
 * 日程 store：记录任务的安排
 * date: 'YYYY-MM-DD'
 * type: once=单次 / weekly=每周 / monthly=每月 / yearly=每年
 */
export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [],
  }),
  getters: {
    byTaskId: (state) => (taskId) => state.schedules.filter((s) => s.task_id === taskId),
    byDate: (state) => (date) => state.schedules.filter((s) => s.date === date),
  },
  actions: {
    async load() {
      this.schedules = await db.getAll('schedules')
    },
    /** 新增日程安排 */
    async create(taskId, date, type = 'once') {
      const schedule = {
        id: db.newId(),
        task_id: taskId,
        date,
        type,
      }
      await db.addItem('schedules', schedule)
      await this.load()
      return schedule
    },
    /** 移除一条安排 */
    async remove(id) {
      await db.purgeItem('schedules', id)
      await this.load()
    },
    /** 删除任务时的级联清理 */
    async removeByTask(taskId) {
      for (const s of this.schedules) {
        if (s.task_id === taskId) {
          await db.purgeItem('schedules', s.id)
        }
      }
      await this.load()
    },
  },
})
