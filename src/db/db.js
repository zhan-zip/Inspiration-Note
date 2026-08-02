import { openDB } from 'idb'

const DB_NAME = 'inspiration-note'
const DB_VERSION = 1

/**
 * 打开/初始化 IndexedDB。
 * 5 张表：ideas / projects / tasks / schedules / completions
 * tasks、schedules、completions 带索引（级联查询用）
 */
export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('ideas')) {
        db.createObjectStore('ideas', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' })
        store.createIndex('project_id', 'project_id')
      }
      if (!db.objectStoreNames.contains('schedules')) {
        const store = db.createObjectStore('schedules', { keyPath: 'id' })
        store.createIndex('task_id', 'task_id')
      }
      if (!db.objectStoreNames.contains('completions')) {
        const store = db.createObjectStore('completions', { keyPath: 'id' })
        store.createIndex('task_id', 'task_id')
      }
    },
  })
}

/** 生成新 id */
export function newId() {
  return crypto.randomUUID()
}

/** 当前 ISO 时间字符串（软删除时间、创建时间用） */
export function nowISO() {
  return new Date().toISOString()
}

/** 通用增删改查 */
export async function addItem(storeName, item) {
  const db = await getDB()
  await db.add(storeName, item)
  return item
}

export async function putItem(storeName, item) {
  const db = await getDB()
  await db.put(storeName, item)
  return item
}

export async function getItem(storeName, id) {
  const db = await getDB()
  return db.get(storeName, id)
}

export async function getAll(storeName) {
  const db = await getDB()
  return db.getAll(storeName)
}

/** 按索引取值 */
export async function getAllByIndex(storeName, indexName, value) {
  const db = await getDB()
  return db.getAllFromIndex(storeName, indexName, value)
}

/** 物理删除（不可恢复） */
export async function purgeItem(storeName, id) {
  const db = await getDB()
  await db.delete(storeName, id)
}

/** 软删除：deleted_at 置为当前时间（进回收站） */
export async function softDelete(storeName, id) {
  const item = await getItem(storeName, id)
  if (!item) return
  await putItem(storeName, { ...item, deleted_at: nowISO() })
}

/** 恢复：清空 deleted_at（回原位） */
export async function restore(storeName, id) {
  const item = await getItem(storeName, id)
  if (!item) return
  await putItem(storeName, { ...item, deleted_at: null })
}
