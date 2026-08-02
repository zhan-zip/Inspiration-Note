import { defineStore } from 'pinia'
import * as db from '../db/db'
import { useTaskStore } from './task'

/** 项目 store */
export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [],
  }),
  getters: {
    /** 正常项目（未软删除），按创建时间正序 */
    activeProjects(state) {
      return state.projects
        .filter((p) => !p.deleted_at)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    },
    /** 回收站里的项目 */
    trashedProjects(state) {
      return state.projects
        .filter((p) => p.deleted_at)
        .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    },
  },
  actions: {
    async load() {
      this.projects = await db.getAll('projects')
    },
    /** 新建项目 */
    async create(name) {
      const project = {
        id: db.newId(),
        name: name.trim(),
        created_at: db.nowISO(),
        deleted_at: null,
      }
      await db.addItem('projects', project)
      await this.load()
      return project
    },
    /** 重命名 */
    async rename(id, name) {
      await db.putItem('projects', { ...(await db.getItem('projects', id)), name: name.trim() })
      await this.load()
    },
    /** 软删除项目：连带软删其下所有任务 */
    async softDelete(id) {
      const taskStore = useTaskStore()
      await taskStore.softDeleteByProject(id)
      await db.softDelete('projects', id)
      await this.load()
    },
    /** 恢复项目：连带恢复其下所有任务 */
    async restore(id) {
      const taskStore = useTaskStore()
      await taskStore.restoreByProject(id)
      await db.restore('projects', id)
      await this.load()
    },
    /** 彻底删除项目：连带物理删除其下所有任务（不可恢复） */
    async purge(id) {
      const taskStore = useTaskStore()
      await taskStore.purgeByProject(id)
      await db.purgeItem('projects', id)
      await this.load()
    },
  },
})
