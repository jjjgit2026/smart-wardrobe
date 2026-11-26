<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NSelect, NInputNumber, useMessage } from 'naive-ui'
import { uid } from '../db'
import { useWardrobeStore } from '../stores/useWardrobeStore'
import { compressImage } from '../services/image/compress'
import { deriveGarmentRules } from '../services/rules/derive'
import { washThreshold } from '../services/rules/washRules'
import type { Category, Garment, Season, SleeveLength, Thickness } from '../types'

const wardrobe = useWardrobeStore()
const router = useRouter()
const message = useMessage()
const fileInput = ref<HTMLInputElement | null>(null)
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

function recompute() {
  const d = derived.value
  form.seasons = [...d.seasons]
  form.tempMin = d.tempMin
  form.tempMax = d.tempMax
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
  if (fileInput.value) fileInput.value.value = ''
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
    <button class="warm-btn wide" @click="fileInput?.click()">{{ previewUrl ? '重新拍照 / 换图' : '拍照或选择图片' }}</button>

    <div class="section-title"><h3>衣物信息</h3><button class="link" @click="recompute">按规则重算适温</button></div>
    <div class="form card">
      <label>品名</label><n-input v-model:value="form.subCategory" placeholder="如：燕麦色针织开衫" />
      <label>颜色</label><n-input v-model:value="form.colorName" placeholder="如：燕麦色" />
      <label>品类</label><n-select v-model:value="form.category" :options="categoryOptions" />
      <label>厚度（1 薄 – 5 厚）</label><n-select v-model:value="form.thickness" :options="thicknessOptions" />
      <label>袖长</label><n-select v-model:value="form.sleeveLength" :options="sleeveOptions" />
      <label>材质观感</label><n-input v-model:value="form.materialLook" placeholder="如：针织、羽绒、牛仔" />
      <label>风格标签（逗号分隔）</label><n-input v-model:value="form.styleTags" placeholder="通勤, 休闲" />
      <label>不适合场景（逗号分隔）</label><n-input v-model:value="form.sceneBlacklist" placeholder="正式" />
      <label>适温区间（可手改）</label>
      <div class="row">
        <n-input-number v-model:value="form.tempMin" :min="-30" :max="50" size="small" />
        <span class="muted">至</span>
        <n-input-number v-model:value="form.tempMax" :min="-30" :max="50" size="small" />
      </div>
      <div class="derived">
        推导结果：{{ derived.seasons.join(' / ') }} · {{ derived.tempMin }}–{{ derived.tempMax }}°C · {{ derived.layerRole }}
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
.derived { font-size: 12px; color: var(--primary-ink); background: var(--primary-wash); padding: 8px 10px; border-radius: var(--r-sm); margin-top: 8px; }
.actions { margin-top: 16px; }
.actions .warm-btn { flex: 1; }
.link { border: 0; background: transparent; color: var(--primary); font-size: 13px; cursor: pointer; }
</style>
