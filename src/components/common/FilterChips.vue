<script setup lang="ts">
defineProps<{ options: string[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="chips no-scrollbar">
    <button
      v-for="opt in options"
      :key="opt"
      class="chip"
      :class="{ active: modelValue === opt }"
      @click="emit('update:modelValue', opt)"
    >{{ opt }}</button>
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
