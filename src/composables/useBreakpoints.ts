import { onMounted, onUnmounted, ref } from 'vue'

export function useBreakpoints() {
  const isDesktop = ref(false)
  const isTablet = ref(false)
  let mqDesktop: MediaQueryList | null = null
  let mqTablet: MediaQueryList | null = null

  const update = () => {
    isDesktop.value = !!mqDesktop?.matches
    isTablet.value = !!mqTablet?.matches && !isDesktop.value
  }

  onMounted(() => {
    mqDesktop = window.matchMedia('(min-width: 1024px)')
    mqTablet = window.matchMedia('(min-width: 768px)')
    update()
    mqDesktop.addEventListener('change', update)
    mqTablet.addEventListener('change', update)
  })

  onUnmounted(() => {
    mqDesktop?.removeEventListener('change', update)
    mqTablet?.removeEventListener('change', update)
  })

  return { isDesktop, isTablet }
}
