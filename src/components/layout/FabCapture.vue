<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <button class="fab" aria-label="拍照录入" @click="router.push('/capture')">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M4 8h4l2-2h4l2 2h4v11H4z" stroke-linejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  </button>
</template>

<style scoped>
.fab {
  position: fixed; z-index: 21; left: 50%; bottom: calc(40px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: 56px; height: 56px; border-radius: 50%; border: 4px solid var(--bg);
  background: var(--primary); color: var(--text-on-primary);
  display: grid; place-items: center; box-shadow: var(--shadow-fab); cursor: pointer;
  transition: transform var(--t-micro) var(--ease);
}
.fab:active { transform: translateX(-50%) scale(.94); }
</style>
