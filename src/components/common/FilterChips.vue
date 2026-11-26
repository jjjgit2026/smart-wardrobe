<script setup lang="ts">
import { computed } from 'vue'

export type ChipOption = string | { label: string; value: string }

const props = defineProps<{ options: ChipOption[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function valueOf(opt: ChipOption): string {
  return typeof opt === 'string' ? opt : opt.value
}
function labelOf(opt: ChipOption): string {
  return typeof opt === 'string' ? opt : opt.label
}
const normalized = computed(() => props.options.map((o) => ({ value: valueOf(o), label: labelOf(o) })))
</script>

<template>
  <div class="chips no-scrollbar">
    <button
      v-for="opt in normalized"
      :key="opt.value"
      class="chip"
      :class="{ active: modelValue === opt.value }"
      @click="emit('update:modelValue', opt.value)"
    >{{ opt.label }}</button>
  </div>
</template>

<style scoped>
.chips { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0; }
.chip {
  flex: none; height: 32px; padding: 0 14px; border-radius: var(--r-pill);
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text-2); font-size: 12px; cursor: pointer;
}
.chip.active { background: var(--primary); border-color: var(--primary); color: var(--text-on-primary); }
</style>
