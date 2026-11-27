<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import type { Garment } from '../../types'
import { garmentThumbUrl } from '../../services/image/compress'

const props = defineProps<{ garment: Garment }>()
const emit = defineEmits<{ open: [id: string] }>()

const url = computed(() => garmentThumbUrl(props.garment))
// data URL 无需释放；仅旧 Blob 数据生成的临时 URL 需要在卸载时回收
onUnmounted(() => {
  if (props.garment.thumbBlob && url.value.startsWith('blob:')) URL.revokeObjectURL(url.value)
})

const statusText: Record<string, string> = {
  available: '', needsWash: '待清洗', washing: '洗中', archived: '已归档',
}
</script>

<template>
  <button class="card" @click="emit('open', garment.id)">
    <div class="photo" :style="{ background: garment.dominantColor }">
      <img v-if="url" :src="url" :alt="garment.subCategory" />
      <span v-if="statusText[garment.status]" class="badge" :class="garment.status">{{ statusText[garment.status] }}</span>
    </div>
    <div class="info">
      <div class="name">{{ garment.subCategory || garment.colorName }}</div>
      <div class="meta">{{ garment.seasons.join('/') }} · 穿过 {{ garment.wearCount }} 次</div>
    </div>
  </button>
</template>

<style scoped>
.card {
  display: block; width: 100%; padding: 0; text-align: left; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-md); box-shadow: var(--shadow-sm); overflow: hidden;
  transition: transform var(--t-micro) var(--ease), box-shadow var(--t-micro) var(--ease);
}
.card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.photo { position: relative; aspect-ratio: 3 / 4; overflow: hidden; }
.photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.badge {
  position: absolute; top: 8px; right: 8px; padding: 2px 8px; border-radius: var(--r-pill);
  font-size: 10px; background: rgba(255,252,247,.9); backdrop-filter: blur(6px); color: var(--primary-ink);
}
.badge.needsWash { color: var(--warning); }
.badge.washing { color: var(--danger); }
.info { padding: 10px 12px 12px; }
.name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { font-size: 12px; color: var(--text-3); }
</style>
