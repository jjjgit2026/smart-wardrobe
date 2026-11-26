import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getSetting, setSetting } from '../db/repositories'

export const SCENES = ['日常', '通勤', '正式', '运动', '约会', '旅行']

export const useSettingsStore = defineStore('settings', () => {
  const city = ref('')
  const topN = ref(3)
  const defaultScene = ref('日常')
  const notifyEnabled = ref(false)

  async function init() {
    city.value = await getSetting('location.city', '')
    topN.value = await getSetting('recommend.topN', 3)
    defaultScene.value = await getSetting('recommend.scene', '日常')
    notifyEnabled.value = await getSetting('notify.enabled', false)
  }

  async function setCity(value: string) {
    city.value = value
    await setSetting('location.city', value)
  }

  async function setTopN(value: number) {
    topN.value = value
    await setSetting('recommend.topN', value)
  }

  async function setScene(value: string) {
    defaultScene.value = value
    await setSetting('recommend.scene', value)
  }

  async function setNotify(value: boolean) {
    notifyEnabled.value = value
    await setSetting('notify.enabled', value)
  }

  return { city, topN, defaultScene, notifyEnabled, init, setCity, setTopN, setScene, setNotify }
})
