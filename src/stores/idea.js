import { defineStore } from 'pinia'
import * as db from '../db/db.js'

/** 灵感 store */
export const useIdeaStore = defineStore('idea', {
  state: () => ({
    ideas: [],
  }),
  getters: {
    /** 正常灵感：仅显示未转（转任务后从灵感列表消失），按创建时间倒序 */
    activeIdeas(state) {
      return state.ideas
        .filter((i) => !i.deleted_at && i.status === 'pending')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    },
    /** 回收站里的灵感（已软删除） */
    trashedIdeas(state) {
      return state.ideas
        .filter((i) => i.deleted_at)
        .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    },
  },
  actions: {
    async load() {
      this.ideas = await db.getAll('ideas')
    },
    /** 新增灵感 */
    async create(content) {
      const idea = {
        id: db.newId(),
        content: content.trim(),
        created_at: db.nowISO(),
        status: 'pending', // pending=未转 / converted=已转
        project_id: null, // 转任务时回填所选项目
        deleted_at: null,
      }
      await db.addItem('ideas', idea)
      await this.load()
      return idea
    },
    /** 灵感已转为任务（回填项目归属） */
    async markConverted(id, projectId = null) {
      const idea = await db.getItem('ideas', id)
      if (idea) {
        await db.putItem('ideas', { ...idea, status: 'converted', project_id: projectId })
        await this.load()
      }
    },
    /** 软删除（进回收站） */
    async softDelete(id) {
      await db.softDelete('ideas', id)
      await this.load()
    },
    /** 恢复 */
    async restore(id) {
      await db.restore('ideas', id)
      await this.load()
    },
    /** 彻底删除（不可恢复） */
    async purge(id) {
      await db.purgeItem('ideas', id)
      await this.load()
    },
  },
})
