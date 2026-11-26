<script setup lang="ts">
import type { Garment } from '../../types'
defineProps<{ items: Garment[] }>()
const emit = defineEmits<{ washed: [ids: string[]]; open: [] }>()
</script>

<template>
  <div v-if="items.length" class="bar">
    <div class="icon">!</div>
    <div class="body">
      <div class="title">{{ items.length }} 件该洗了</div>
      <div class="sub">{{ items.slice(0, 3).map(g => g.subCategory).join('、') }}{{ items.length > 3 ? ' 等' : '' }}</div>
    </div>
    <button class="mini" @click="emit('open')">查看</button>
    <button class="mini solid" @click="emit('washed', items.map(g => g.id))">已清洗</button>
  </div>
</template>

<style scoped>
.bar {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  background: var(--warning-wash); border: 1px solid #EFDCC0;
  border-radius: var(--r-md);
}
.icon {
  width: 24px; height: 24px; border-radius: 50%; background: var(--warning);
  color: #fff; display: grid; place-items: center; font-weight: 600; flex: none;
}
.body { flex: 1; min-width: 0; }
.title { font-size: 13px; font-weight: 600; }
.sub { font-size: 11px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini {
  border: 1px solid var(--border-strong); background: var(--surface); color: var(--primary-ink);
  border-radius: var(--r-pill); padding: 5px 10px; font-size: 12px; cursor: pointer; white-space: nowrap;
}
.mini.solid { background: var(--primary); color: var(--text-on-primary); border-color: var(--primary); }
</style>
