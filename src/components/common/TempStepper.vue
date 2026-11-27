<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
}>(), { min: -30, max: 50 })

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function clamp(v: number): number {
  if (Number.isNaN(v)) return props.min
  return Math.max(props.min, Math.min(props.max, Math.round(v)))
}

function stepBy(delta: number) {
  emit('update:modelValue', clamp((props.modelValue || 0) + delta))
}

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '' || raw === '-') return
  const v = Number(raw)
  if (Number.isFinite(v)) emit('update:modelValue', clamp(v))
}
</script>

<template>
  <div class="temp-stepper">
    <button type="button" class="ts-btn" aria-label="减少" @click="stepBy(-1)">−</button>
    <input
      class="ts-input"
      type="number"
      inputmode="numeric"
      :min="min"
      :max="max"
      :value="modelValue"
      @change="onInput"
    />
    <button type="button" class="ts-btn" aria-label="增加" @click="stepBy(1)">+</button>
  </div>
</template>

<style scoped>
.temp-stepper {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--surface);
}
.ts-btn {
  flex: 0 0 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: var(--surface-2);
  color: var(--primary-ink);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  font-family: inherit;
}
.ts-btn:active { background: var(--primary-wash); }
.ts-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 44px;
  border: 0;
  outline: 0;
  text-align: center;
  font-size: 16px;
  color: var(--text-1);
  background: transparent;
  appearance: textfield;
  -moz-appearance: textfield;
}
.ts-input::-webkit-outer-spin-button,
.ts-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ts-btn + .ts-input { border-left: 1px solid var(--border); }
.ts-input + .ts-btn { border-left: 1px solid var(--border); }
</style>
