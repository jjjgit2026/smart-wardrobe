<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NInput, NSelect, useMessage } from 'naive-ui'
import TempStepper from '../components/common/TempStepper.vue'
import { useWardrobeStore } from '../stores/useWardrobeStore'
import { useWeatherStore } from '../stores/useWeatherStore'
import { useSettingsStore, SCENES } from '../stores/useSettingsStore'
import { downloadBackup, importBackup, storageEstimate } from '../services/backup/exportImport'
import { WASH_TABLE_TEXT } from '../services/rules/washRules'
import { checkStorageAvailable } from '../services/storage/diagnose'

const wardrobe = useWardrobeStore()
const weather = useWeatherStore()
const settings = useSettingsStore()
const message = useMessage()
const cityInput = ref(settings.city)
const manualTemp = ref(Math.round(weather.effectiveTemp))
const usage = ref({ usageMB: 0, quotaMB: 0 })
const importInput = ref<HTMLInputElement | null>(null)
const storageCheck = ref('')

onMounted(async () => {
  usage.value = await storageEstimate()
  const r = await checkStorageAvailable()
  storageCheck.value = r.message
})

async function runStorageCheck() {
  const r = await checkStorageAvailable()
  storageCheck.value = r.message
  if (r.ok) message.success(r.message)
  else message.error(r.message, { duration: 10000 })
}

async function saveCity() {
  try {
    await weather.setCity(cityInput.value.trim())
    message.success('城市已保存，天气已更新')
  } catch {
    message.error('找不到这个城市，请检查名称')
  }
}

function applyManual() {
  weather.setManual(manualTemp.value)
  void weather.persistManual()
  message.success('已使用手动温度，搭配会按此温度计算')
}

async function exportData() {
  await downloadBackup()
  message.success('备份文件已下载')
}

async function importData(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const r = await importBackup(file)
    await wardrobe.refresh()
    message.success(`导入完成，新增 ${r.added} 件`)
  } catch {
    message.error('导入失败：备份文件格式不正确')
  }
  input.value = ''
}

async function loadDemo() {
  await wardrobe.loadDemo()
  message.success('已加入 8 件示例衣物')
}

async function clearAll() {
  if (!window.confirm('将清空全部衣物、搭配和记录，且不可恢复。确定继续吗？')) return
  await wardrobe.clearAll()
  message.success('已清空')
}

async function persist() {
  if (!navigator.storage?.persist) return
  const ok = await navigator.storage.persist()
  message.info(ok ? '已申请持久化存储' : '浏览器未批准持久化申请')
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">设置</h1>
    <div class="page-sub">所有数据只存在本机浏览器，不会上传到任何服务器。</div>

    <div class="section-title"><h3>AI 识别</h3></div>
    <div class="card block">
      <div class="spread"><span>当前模式</span><span class="tag">手动录入 + 本地规则</span></div>
      <p class="muted">本阶段不接入任何外部模型，照片只在你的设备上处理。后续可在设置里自行开启免费模型密钥。</p>
    </div>

    <div class="section-title"><h3>城市与天气</h3></div>
    <div class="card block form">
      <label>城市名称（定位失败时使用）</label>
      <div class="row">
        <n-input v-model:value="cityInput" placeholder="如：杭州" />
        <button class="warm-btn" @click="saveCity">保存</button>
      </div>
      <label>手动温度（无网络或不想定位时）</label>
      <div class="row">
        <temp-stepper :model-value="manualTemp" :min="-30" :max="50" @update:model-value="(v: number) => manualTemp = v" />
        <button class="warm-btn" @click="applyManual">使用</button>
      </div>
      <div class="muted">天气数据来自 Open-Meteo，遵循 CC BY 4.0，必须署名。</div>
      <a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather data by Open-Meteo.com</a>
    </div>

    <div class="section-title"><h3>清洗阈值</h3></div>
    <div class="card block">
      <div v-for="line in WASH_TABLE_TEXT" :key="line" class="wash-line">{{ line }}</div>
    </div>

    <div class="section-title"><h3>推荐偏好</h3></div>
    <div class="card block form">
      <label>默认场景</label>
      <n-select v-model:value="settings.defaultScene" :options="SCENES.map(s => ({ label: s, value: s }))" @update:value="(v: string) => settings.setScene(v)" />
      <label>默认推荐套数：{{ settings.topN }}</label>
      <input type="range" min="1" max="5" :value="settings.topN" @input="(e: Event) => settings.setTopN(Number((e.target as HTMLInputElement).value))" />
    </div>

    <div class="section-title"><h3>数据与备份</h3></div>
    <div class="card block form">
      <div class="muted">已用 {{ usage.usageMB }} MB / 配额 {{ usage.quotaMB }} MB</div>
      <div class="muted">本地存储自检：{{ storageCheck || '检查中…' }}</div>
      <button class="warm-btn" @click="runStorageCheck">重新检测存储</button>
      <div class="row">
        <button class="warm-btn" @click="exportData">导出备份</button>
        <button class="warm-btn" @click="importInput?.click()">导入备份</button>
        <button class="warm-btn" @click="persist">申请持久化</button>
      </div>
      <input ref="importInput" type="file" accept="application/json" class="hidden-file" @change="importData" />
      <div class="danger-box">
        清除浏览器数据会永久删除全部衣物照片与记录。请定期导出备份；本应用没有云端同步。
      </div>
      <div class="row">
        <button class="warm-btn" @click="loadDemo">加载示例衣物</button>
        <button class="warm-btn danger" @click="clearAll">清空全部数据</button>
      </div>
    </div>

    <div class="section-title"><h3>关于</h3></div>
    <div class="card block muted">
      智能衣橱 · 本地优先版本 {{ '0.1.0' }}<br />
      GitHub Pages 会记录站点访问 IP，但应用本身不收集、不上传任何用户数据。
    </div>
  </div>
</template>

<style scoped>
.block { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.form label { font-size: 12px; color: var(--text-3); }
.tag { font-size: 12px; background: var(--primary-wash); color: var(--primary-ink); padding: 2px 10px; border-radius: var(--r-pill); }
.wash-line { font-size: 13px; padding: 4px 0; border-bottom: 1px solid var(--border); }
.wash-line:last-child { border-bottom: 0; }
.danger-box { background: var(--danger-wash); color: var(--danger); border-radius: var(--r-sm); padding: 10px 12px; font-size: 12px; }
.warm-btn { flex: 1; padding: 8px 6px; font-size: 12px; }
.warm-btn.danger { color: var(--danger); border-color: var(--danger); }
.hidden-file { display: none; }
</style>
