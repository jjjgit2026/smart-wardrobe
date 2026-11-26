<script setup lang="ts">
const links = [
  { to: '/', label: '今日', icon: 'M4 11l8-7 8 7v9H4z', spacer: false },
  { to: '/wardrobe', label: '衣橱', icon: 'M4 7h16v13H4zM9 7V4h6v3', spacer: false },
  { to: '', label: '', icon: '', spacer: true },
  { to: '/lab', label: '搭配', icon: 'M5 5h6v6H5zM13 13h6v6h-6zM13 5h6v6h-6z', spacer: false },
  { to: '/calendar', label: '记录', icon: 'M4 6h16v14H4zM8 3v4M16 3v4M4 10h16', spacer: false },
]
</script>

<template>
  <nav class="tabbar">
    <template v-for="(l, i) in links" :key="i">
      <div v-if="l.spacer" class="tab spacer" aria-hidden="true"></div>
      <router-link v-else :to="l.to" class="tab">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
          <path :d="l.icon" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ l.label }}</span>
      </router-link>
    </template>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  height: calc(64px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: grid; grid-template-columns: repeat(5, 1fr);
  background: rgba(255,252,247,.94); backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
}
.tab {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; color: var(--text-3); text-decoration: none; font-size: 10px;
}
.tab.router-link-active { color: var(--primary); }
.tab.router-link-active::before {
  content: ''; position: absolute; top: 6px; width: 16px; height: 3px;
  border-radius: 3px; background: var(--accent);
}
.tab { position: relative; }
</style>
