<script setup lang="ts">
import { computed, ref } from 'vue'
import { NInput, NModal, NSelect, NInputNumber } from 'naive-ui'
import { useMessage } from 'naive-ui'
import FilterChips from '../components/common/FilterChips.vue'
import GarmentCard from '../components/garment/GarmentCard.vue'
import { useWardrobeStore } from '../stores/useWardrobeStore'
import { deriveGarmentRules } from '../services/rules/derive'
import { markWashed } from '../services/wear/logWear'
import type { Garment, Season, Thickness } from '../types'

const wardrobe = useWardrobeStore()
const message = useMessage()
const search = ref('')
const season = ref('全部')
const category = ref('全部')
const status = ref('全部')
const showDetail = ref(false)
const detail = ref<Garment | null>(null)
const previewUrl = computed(() => detail.value?.thumbBlob ? URL.createObjectURL(detail.value.thumbBlob) : '')

function toggleSeason(s: Season) {
  if (!detail.value) return
  const i = detail.value.seasons.indexOf(s)
  if (i >= 0) detail.value.seasons.splice(i, 1)
  else detail.value.seasons.push(s)
  detail.value.seasons = [...detail.value.seasons]
}

const seasonOptions = ['全部', '春', '夏', '秋', '冬']
const categoryOptions = [
  { label: '全部', value: '全部' },
  { label: '上装', value: 'top' }, { label: '下装', value: 'bottom' },
  { label: '外套', value: 'outerwear' }, { label: '连体', value: 'onePiece' },
]
const statusOptions = ['全部', 'available', 'needsWash', 'washing', 'archived']
const statusLabel: Record<string, string> = { available: '可用', needsWash: '待清洗', washing: '洗中', archived: '已归档' }
const thicknessOptions = [1, 2, 3, 4, 5].map((v) => ({ label: `${v} 级`, value: v }))

const filtered = computed(() => wardrobe.garments.filter((g) => {
  const q = search.value.trim().toLowerCase()
  if (q && !`${g.subCategory}${g.colorName}${g.styleTags.join('')}`.toLowerCase().includes(q)) return false
  if (season.value !== '全部' && !g.seasons.includes(season.value as Season)) return false
  if (category.value !== '全部' && g.category !== category.value) return false
  if (status.value !== '全部' && g.status !== status.value) return false
  return true
}))

function open(id: string) {
  const g = wardrobe.garments.find((x) => x.id === id)
  if (!g) return
  detail.value = { ...g, seasons: [...g.seasons], styleTags: [...g.styleTags], sceneBlacklist: [...g.sceneBlacklist] }
  showDetail.value = true
}

function recompute() {
  if (!detail.value) return
  const r = deriveGarmentRules(detail.value)
  detail.value.seasons = r.seasons
  detail.value.tempMin = r.tempMin
  detail.value.tempMax = r.tempMax
  detail.value.layerRole = r.layerRole
  message.success('已按规则重算适温区间')
}

async function save() {
  if (!detail.value) return
  await wardrobe.updateGarment(detail.value)
  showDetail.value = false
  message.success('已保存')
}

async function wash(id: string) {
  await markWashed([id])
  await wardrobe.refresh()
  message.success('已标记清洗')
}

async function remove(id: string) {
  if (!window.confirm('确定删除这件衣服吗？此操作不可撤销。')) return
  await wardrobe.deleteGarment(id)
  message.success('已删除')
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">我的衣橱</h1>
    <div class="page-sub">{{ wardrobe.garments.length }} 件 · 可用 {{ wardrobe.available.length }} 件 · 待洗 {{ wardrobe.toWash.length }} 件</div>

    <n-input v-model:value="search" placeholder="搜索品名、颜色或风格" clearable />

    <div class="filters">
      <filter-chips v-model="season" :options="seasonOptions" />
      <n-select v-model:value="category" :options="categoryOptions" size="small" class="select" />
      <filter-chips v-model="status" :options="statusOptions" />
    </div>

    <div v-if="filtered.length" class="grid">
      <garment-card v-for="g in filtered" :key="g.id" :garment="g" @open="open" />
    </div>
    <div v-else class="empty card">
      <h3>没有找到衣服</h3>
      <p class="muted">换个筛选条件，或去拍照录入新单品。</p>
    </div>

    <n-modal v-model:show="showDetail" preset="card" title="衣物详情" class="detail">
      <div v-if="detail" class="form">
        <div class="preview" :style="{ background: detail.dominantColor }">
          <img v-if="previewUrl" :src="previewUrl" alt="预览" />
        </div>
        <label>品名</label>
        <n-input v-model:value="detail.subCategory" />
        <label>颜色</label>
        <n-input v-model:value="detail.colorName" />
        <label>品类</label>
        <n-select v-model:value="detail.category" :options="categoryOptions.filter(o => o.value !== '全部')" />
        <label>厚度（1 薄 – 5 厚）</label>
        <n-select v-model:value="detail.thickness" :options="thicknessOptions" />
        <label>袖长</label>
        <n-select v-model:value="detail.sleeveLength" :options="[
          { label: '无袖', value: 'none' }, { label: '短袖', value: 'short' }, { label: '长袖', value: 'long' },
        ]" />
        <label>材质观感</label>
        <n-input v-model:value="detail.materialLook" />
        <label>适温区间</label>
        <div class="row">
          <n-input-number v-model:value="detail.tempMin" :min="-30" :max="50" size="small" />
          <span class="muted">至</span>
          <n-input-number v-model:value="detail.tempMax" :min="-30" :max="50" size="small" />
        </div>
        <label>适用季节</label>
        <div class="row">
          <button
            v-for="s in ['春','夏','秋','冬']" :key="s" class="season-chip"
            :class="{ active: detail.seasons.includes(s as Season) }"
            @click="toggleSeason(s as Season)"
          >{{ s }}</button>
        </div>
        <div class="spread meta-row">
          <span class="muted">状态：{{ statusLabel[detail.status] }}</span>
          <span class="muted">穿过 {{ detail.wearCount }} 次 · 距上次清洗 {{ detail.wearsSinceWash }} 次</span>
        </div>
        <div class="row">
          <button class="warm-btn" @click="recompute">按规则重算适温</button>
          <button class="warm-btn" @click="wash(detail.id)">已清洗</button>
          <button class="warm-btn" @click="remove(detail.id)">删除</button>
        </div>
        <div class="row actions">
          <button class="warm-btn" @click="showDetail = false">取消</button>
          <button class="warm-btn primary" @click="save">保存修改</button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.filters { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
.select { max-width: 140px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.empty { text-align: center; padding: 40px 16px; }
.detail { width: min(460px, 92vw); }
.form { display: flex; flex-direction: column; gap: 8px; }
.form label { font-size: 12px; color: var(--text-3); margin-top: 4px; }
.preview { height: 120px; border-radius: var(--r-md); overflow: hidden; }
.preview img { width: 100%; height: 100%; object-fit: cover; }
.season-chip { border: 1px solid var(--border); background: var(--surface); border-radius: var(--r-pill); padding: 4px 12px; cursor: pointer; font-size: 12px; }
.season-chip.active { background: var(--primary); color: var(--text-on-primary); border-color: var(--primary); }
.meta-row { margin-top: 8px; }
.actions { margin-top: 12px; }
.actions .warm-btn { flex: 1; }
@media (min-width: 768px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(4, 1fr); } }
</style>
