<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NSelect, useMessage } from 'naive-ui'
import { uid } from '../db'
import { useWardrobeStore } from '../stores/useWardrobeStore'
import { compressImage } from '../services/image/compress'
import { deriveGarmentRules } from '../services/rules/derive'
import { canToggleInnerOuter, layerLabel } from '../services/rules/layerLabels'
import { washThreshold } from '../services/rules/washRules'
import TempStepper from '../components/common/TempStepper.vue'
import type { Category, Garment, Season, SleeveLength, Thickness } from '../types'

const wardrobe = useWardrobeStore()
const router = useRouter()
const message = useMessage()
const fileInput = ref<HTMLInputElement | null>(null)
const albumInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const blobs = ref<{ main: Blob; thumb: Blob } | null>(null)
const saving = ref(false)

const form = reactive({
  subCategory: '',
  colorName: '',
  category: 'top' as Category,
  thickness: 2 as Thickness,
  sleeveLength: 'long' as SleeveLength,
  materialLook: '',
  styleTags: '',
  sceneBlacklist: '',
  tempMin: 12,
  tempMax: 26,
  seasons: ['春', '秋'] as Season[],
  layerRoles: ['inner'] as Array<'inner' | 'outer'>,
})

const categoryOptions = [
  { label: '上装', value: 'top' }, { label: '下装', value: 'bottom' },
  { label: '外套', value: 'outerwear' }, { label: '连体', value: 'onePiece' },
  { label: '鞋履', value: 'shoes' }, { label: '配饰', value: 'accessory' },
]
const thicknessOptions = [1, 2, 3, 4, 5].map((v) => ({ label: `${v} 级 · ${['非常薄','薄','适中','厚','非常厚'][v-1]}`, value: v }))
const sleeveOptions = [
  { label: '无袖', value: 'none' }, { label: '短袖', value: 'short' }, { label: '长袖', value: 'long' },
]

const derived = computed(() => deriveGarmentRules({
  category: form.category,
  subCategory: form.subCategory,
  thickness: form.thickness,
  sleeveLength: form.sleeveLength,
  materialLook: form.materialLook,
}))

// 记录适温/季节是否被手动改过：改过后推导行改为"手动值"提示，避免误解为写死
const manualOverride = ref(false)

// 推导值随条件变化时，只要用户没手动改过，就自动同步到表单
watch(derived, (d) => {
  if (manualOverride.value) return
  form.seasons = [...d.seasons]
  form.tempMin = d.tempMin
  form.tempMax = d.tempMax
}, { immediate: true })

function markManual() { manualOverride.value = true }

// 品类变化时，穿着层级默认跟随规则推导的主角色
watch(() => form.category, () => {
  const primary = derived.value.layerRole
  // 上装/外套默认落在其主层级；若主层级是 inner/outer 则直接用，否则归为 inner
  form.layerRoles = [primary === 'outer' ? 'outer' : 'inner']
})

const showLayerToggle = computed(() => canToggleInnerOuter(form.category))

function toggleLayer(role: 'inner' | 'outer') {
  const i = form.layerRoles.indexOf(role)
  if (i >= 0) {
    if (form.layerRoles.length === 1) {
      message.warning('至少保留一个穿着层级')
      return
    }
    form.layerRoles.splice(i, 1)
  } else {
    form.layerRoles.push(role)
  }
}

function recompute() {
  const d = derived.value
  form.seasons = [...d.seasons]
  form.tempMin = d.tempMin
  form.tempMax = d.tempMax
  manualOverride.value = false
  message.success('已按规则更新季节与适温')
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const result = await compressImage(file)
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(result.main)
    blobs.value = { main: result.main, thumb: result.thumb }
    if (!form.colorName) {
      const r = parseInt(result.dominantColor.slice(1, 3), 16)
      const g = parseInt(result.dominantColor.slice(3, 5), 16)
      const b = parseInt(result.dominantColor.slice(5, 7), 16)
      form.colorName = r > g && r > b ? '暖色调' : b > r ? '冷色调' : '中性色'
    }
    message.success('照片已处理，EXIF 信息已剥离')
  } catch {
    message.error('图片处理失败，请换一张试试')
  }
}

function reset() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  blobs.value = null
  form.subCategory = ''
  form.colorName = ''
  form.materialLook = ''
  form.styleTags = ''
  form.sceneBlacklist = ''
  manualOverride.value = false
  const d = derived.value
  form.seasons = [...d.seasons]
  form.tempMin = d.tempMin
  form.tempMax = d.tempMax
  form.category = 'top'
  form.thickness = 2
  form.sleeveLength = 'long'
  form.layerRoles = ['inner']
  if (fileInput.value) fileInput.value.value = ''
  if (albumInput.value) albumInput.value.value = ''
}

async function save(again = false) {
  if (!form.subCategory.trim()) {
    message.warning('请填写品名')
    return
  }
  saving.value = true
  try {
    const d = derived.value
    const now = Date.now()
    const garment: Garment = {
      id: uid(),
      photoBlob: blobs.value?.main,
      thumbBlob: blobs.value?.thumb,
      dominantColor: '#C9A989',
      category: form.category,
      subCategory: form.subCategory.trim(),
      colorName: form.colorName.trim() || '未标注',
      thickness: form.thickness,
      sleeveLength: form.sleeveLength,
      materialLook: form.materialLook.trim() || '未标注',
      seasons: form.seasons.length ? [...form.seasons] : d.seasons,
      tempMin: form.tempMin,
      tempMax: form.tempMax,
      layerRole: d.layerRole,
      layerRoles: [...form.layerRoles],
      styleTags: form.styleTags.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      sceneBlacklist: form.sceneBlacklist.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      status: 'available',
      wearCount: 0,
      wearsSinceWash: 0,
      washThreshold: washThreshold(form.category, form.subCategory, form.materialLook),
      isHumanCorrected: true,
      createdAt: now,
      updatedAt: now,
    }
    await wardrobe.addGarment(garment)
    message.success('已加入衣橱')
    if (again) reset()
    else router.push('/wardrobe')
  } finally {
    saving.value = false
  }
}

onUnmounted(() => { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value) })
</script>

<template>
  <div class="page">
    <h1 class="page-title">拍照录入</h1>
    <div class="page-sub">本版为手动打标：拍照后填写关键信息，季节与适温由本地规则生成，不上传照片。</div>

    <div class="steps"><span class="on">1 拍照</span><span class="on">2 填写信息</span><span class="on">3 确认归档</span></div>

    <div class="capture card" :style="previewUrl ? {} : { background: 'var(--surface-2)' }">
      <img v-if="previewUrl" :src="previewUrl" alt="衣物预览" />
      <div v-else class="capture-empty">
        <div class="camera-mark">＋</div>
        <div class="muted">手机可调相机拍照，也可从相册选图</div>
      </div>
    </div>
    <input ref="fileInput" type="file" accept="image/*" capture="environment" class="file" @change="onFile" />
    <input ref="albumInput" type="file" accept="image/*" class="file" @change="onFile" />
    <div class="row actions">
      <button class="warm-btn primary" @click="fileInput?.click()">拍照</button>
      <button class="warm-btn" @click="albumInput?.click()">从相册选择</button>
    </div>

    <div class="section-title"><h3>衣物信息</h3></div>
    <div class="form card">
      <label>品名</label><n-input v-model:value="form.subCategory" placeholder="如：燕麦色针织开衫" />
      <label>颜色</label><n-input v-model:value="form.colorName" placeholder="如：燕麦色" />
      <label>品类</label><n-select v-model:value="form.category" :options="categoryOptions" />
      <label>穿着层级</label>
      <div v-if="showLayerToggle" class="row layer-toggles">
        <button
          v-for="r in (['inner', 'outer'] as const)" :key="r"
          type="button" class="layer-chip" :class="{ active: form.layerRoles.includes(r) }"
          @click="toggleLayer(r)"
        >{{ r === 'inner' ? '可内穿' : '可外穿' }}</button>
        <span class="muted">可多选，如开衫既能内搭也能外穿</span>
      </div>
      <div v-else class="muted layer-fixed">层级固定：{{ layerLabel(derived.layerRole) }}</div>
      <label>厚度（1 薄 – 5 厚）</label><n-select v-model:value="form.thickness" :options="thicknessOptions" />
      <label>袖长</label><n-select v-model:value="form.sleeveLength" :options="sleeveOptions" />
      <label>材质观感</label><n-input v-model:value="form.materialLook" placeholder="如：针织、羽绒、牛仔" />
      <label>风格标签（逗号分隔）</label><n-input v-model:value="form.styleTags" placeholder="通勤, 休闲" />
      <label>不适合场景（逗号分隔）</label><n-input v-model:value="form.sceneBlacklist" placeholder="正式" />
      <label class="label-with-action">适温区间（可手改）<button class="link inline" @click="recompute">按规则重算</button></label>
      <div class="row">
        <temp-stepper :model-value="form.tempMin" :min="-30" :max="50" @update:model-value="(v: number) => { form.tempMin = v; markManual() }" />
        <span class="muted">至</span>
        <temp-stepper :model-value="form.tempMax" :min="-30" :max="50" @update:model-value="(v: number) => { form.tempMax = v; markManual() }" />
      </div>
      <div class="derived" :class="{ manual: manualOverride }">
        <template v-if="manualOverride">
          当前为手动适温 · 规则建议：{{ derived.seasons.join(' / ') }} · {{ derived.tempMin }}–{{ derived.tempMax }}°C
          <button class="link inline" @click="recompute">采用建议</button>
        </template>
        <template v-else>
          <span class="derived-tag">自动跟随</span>
          {{ layerLabel(derived.layerRole) }} · {{ derived.seasons.join(' / ') }} · {{ derived.tempMin }}–{{ derived.tempMax }}°C
        </template>
      </div>
    </div>

    <div class="row actions">
      <button class="warm-btn" :disabled="saving" @click="save(false)">保存并去衣橱</button>
      <button class="warm-btn primary" :disabled="saving" @click="save(true)">保存并继续录入</button>
    </div>
  </div>
</template>

<style scoped>
.steps { display: flex; gap: 8px; margin-bottom: 14px; font-size: 11px; color: var(--text-3); }
.steps span { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill); padding: 4px 10px; }
.steps .on { color: var(--primary); border-color: var(--primary-soft); background: var(--primary-wash); }
.capture { height: 260px; border-radius: var(--r-lg); overflow: hidden; display: grid; place-items: center; }
.capture img { width: 100%; height: 100%; object-fit: cover; }
.capture-empty { text-align: center; }
.camera-mark { width: 48px; height: 48px; margin: 0 auto 8px; border-radius: 50%; background: var(--primary-wash); color: var(--primary); display: grid; place-items: center; font-size: 28px; }
.file { display: none; }
.wide { width: 100%; margin-top: 10px; }
.form { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.form label { font-size: 12px; color: var(--text-3); margin-top: 6px; }
.derived { font-size: 12px; color: var(--primary-ink); background: var(--primary-wash); padding: 8px 10px; border-radius: var(--r-sm); margin-top: 8px; line-height: 1.8; }
.derived.manual { background: var(--warning-wash); color: #8a6428; }
.derived-tag { display: inline-block; font-size: 11px; color: var(--primary-ink); background: var(--surface); border: 1px solid var(--primary-soft); border-radius: var(--r-pill); padding: 0 8px; margin-right: 6px; }
.label-with-action { display: flex; align-items: center; justify-content: space-between; }
.layer-toggles { flex-wrap: wrap; }
.layer-chip { border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-2); border-radius: var(--r-pill); padding: 6px 16px; min-height: 40px; font-size: 14px; cursor: pointer; font-family: inherit; }
.layer-chip.active { background: var(--primary); color: var(--text-on-primary); border-color: var(--primary); }
.layer-fixed { padding: 6px 0; }
.actions { margin-top: 16px; }
.actions .warm-btn { flex: 1; }
.link { border: 0; background: transparent; color: var(--primary); font-size: 13px; cursor: pointer; }
.link.inline { padding: 0 0 0 6px; font-size: 12px; text-decoration: underline; }
</style>
