import { createRouter, createWebHashHistory } from 'vue-router'
import TodayView from '../views/TodayView.vue'
import WardrobeView from '../views/WardrobeView.vue'
import CaptureView from '../views/CaptureView.vue'
import LabView from '../views/LabView.vue'
import CalendarView from '../views/CalendarView.vue'
import SettingsView from '../views/SettingsView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'today', component: TodayView },
    { path: '/wardrobe', name: 'wardrobe', component: WardrobeView },
    { path: '/capture', name: 'capture', component: CaptureView },
    { path: '/lab', name: 'lab', component: LabView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
