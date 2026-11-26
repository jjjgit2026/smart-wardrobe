<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { liveQuery } from 'dexie'
import { NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { creamTheme } from './theme/naiveTheme'
import AppShell from './components/layout/AppShell.vue'
import { db } from './db'
import { useWardrobeStore } from './stores/useWardrobeStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useWeatherStore } from './stores/useWeatherStore'

const wardrobe = useWardrobeStore()
const settings = useSettingsStore()
const weather = useWeatherStore()
const subscriptions: Array<{ unsubscribe: () => void }> = []

onMounted(async () => {
  try { await settings.init() } catch { /* 设置读取失败用默认值 */ }
  try { await wardrobe.refresh() } catch { /* liveQuery 会兜底推送数据 */ }
  weather.init().catch(() => undefined)
  subscriptions.push(
    liveQuery(() => db.garments.toArray()).subscribe({ next: (v) => { wardrobe.garments = v } }),
    liveQuery(() => db.outfits.toArray()).subscribe({ next: (v) => { wardrobe.outfits = v } }),
    liveQuery(() => db.wearLogs.toArray()).subscribe({ next: (v) => { wardrobe.wearLogs = v } }),
    liveQuery(() => db.feedback.toArray()).subscribe({ next: (v) => { wardrobe.feedback = v } })
  )
})

onUnmounted(() => subscriptions.forEach((s) => s.unsubscribe()))
</script>

<template>
  <n-config-provider :theme-overrides="creamTheme">
    <n-message-provider>
      <n-dialog-provider>
        <app-shell />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
