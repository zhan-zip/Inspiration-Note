import { createRouter, createWebHashHistory } from 'vue-router'
import IdeaView from '../views/IdeaView.vue'
import TaskView from '../views/TaskView.vue'
import CalendarView from '../views/CalendarView.vue'
import TodayView from '../views/TodayView.vue'
import ReviewView from '../views/ReviewView.vue'
import ProjectTasksView from '../views/ProjectTasksView.vue'
import TrashView from '../views/TrashView.vue'

const routes = [
  { path: '/', name: 'idea', component: IdeaView },        // 灵感页（默认主页）
  { path: '/tasks', name: 'tasks', component: TaskView },  // 任务列表（所有任务 + 项目入口）
  { path: '/calendar', name: 'calendar', component: CalendarView }, // 日历 + 任务量可视化
  { path: '/today', name: 'today', component: TodayView }, // 今日（打钩完成）
  { path: '/review', name: 'review', component: ReviewView }, // 复盘
  { path: '/project/:id', name: 'project-tasks', component: ProjectTasksView }, // 项目任务列表
  { path: '/trash', name: 'trash', component: TrashView }, // 回收站
]

// 使用 hash 路由：PWA 部署在 GitHub Pages 子路径，hash 模式刷新不 404
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
