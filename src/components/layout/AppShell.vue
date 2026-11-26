<script setup lang="ts">
import { useBreakpoints } from '../../composables/useBreakpoints'
import SideNav from './SideNav.vue'
import TabBar from './TabBar.vue'
import FabCapture from './FabCapture.vue'

const { isDesktop } = useBreakpoints()
</script>

<template>
  <div class="shell" :class="{ desktop: isDesktop }">
    <side-nav v-if="isDesktop" />
    <main class="main">
      <router-view />
    </main>
    <template v-if="!isDesktop">
      <tab-bar />
      <fab-capture />
    </template>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; }
.main { min-height: 100vh; }
.desktop .main { margin-left: 240px; }
</style>
