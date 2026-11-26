<script setup lang="ts">
import { RouterLink } from 'vue-router'
const links = [
  { to: '/', label: '今日穿搭' },
  { to: '/wardrobe', label: '我的衣橱' },
  { to: '/capture', label: '拍照录入' },
  { to: '/lab', label: '搭配实验室' },
  { to: '/calendar', label: '穿搭日历' },
  { to: '/settings', label: '设置' },
]
</script>

<template>
  <aside class="side">
    <div class="brand">
      <div class="mark">衣</div>
      <div>
        <div class="name">智能衣橱</div>
        <div class="tagline">穿得其所 · 物尽其用</div>
      </div>
    </div>
    <nav>
      <router-link v-for="l in links" :key="l.to" :to="l.to" class="nav-item">{{ l.label }}</router-link>
    </nav>
    <div class="foot">数据仅存于本机浏览器</div>
  </aside>
</template>

<style scoped>
.side {
  position: fixed; inset: 0 auto 0 0; width: 240px;
  background: var(--surface); border-right: 1px solid var(--border);
  padding: 28px 20px; display: flex; flex-direction: column; gap: 24px;
}
.brand { display: flex; align-items: center; gap: 12px; }
.mark {
  width: 42px; height: 42px; border-radius: 14px; background: var(--primary);
  color: var(--text-on-primary); display: grid; place-items: center;
  font-family: var(--font-serif); font-size: 20px;
}
.name { font-family: var(--font-serif); font-size: 18px; font-weight: 600; }
.tagline { font-size: 11px; color: var(--text-3); }
nav { display: flex; flex-direction: column; gap: 4px; }
.nav-item {
  padding: 11px 14px; border-radius: var(--r-sm); color: var(--text-2);
  text-decoration: none; font-size: 14px; transition: all var(--t-micro) var(--ease);
}
.nav-item:hover { background: var(--primary-wash); color: var(--primary-ink); }
.nav-item.router-link-active { background: var(--primary-wash); color: var(--primary-ink); font-weight: 600; }
.foot { margin-top: auto; font-size: 11px; color: var(--text-3); }
</style>
