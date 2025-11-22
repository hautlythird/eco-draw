<script setup>
import { computed } from 'vue'
import { CANVAS_CONFIG } from '@/constants/tools'

const METER_TO_PIXELS = CANVAS_CONFIG.METER_TO_PIXELS

const props = defineProps({
  showCompanionCircles: { type: Boolean, default: true },
  images: { type: Array, default: () => [] },
  compatibilityLines: { type: Array, default: () => [] }
})

// Companion planting circles
const companionCircles = computed(() => {
  if (!props.showCompanionCircles) return []
  
  const circles = []
  
  props.images.forEach(img => {
    const centerX = img.x + (img.width || 100) / 2
    const centerY = img.y + (img.height || 100) / 2
    
    // Optimal spacing circle (60cm)
    circles.push({
      x: centerX,
      y: centerY,
      radius: METER_TO_PIXELS * 0.6,
      stroke: 'rgba(255, 215, 0, 0.2)',
      strokeWidth: 1.5,
      dash: [6, 6],
      listening: false
    })
    
    // Companion zone (1.2m)
    circles.push({
      x: centerX,
      y: centerY,
      radius: METER_TO_PIXELS * 1.2,
      stroke: 'rgba(101, 255, 134, 0.15)',
      strokeWidth: 2,
      dash: [8, 8],
      listening: false
    })
  })
  
  return circles
})
</script>

<template>
  <v-layer :config="{ listening: false }">
    <!-- Companion circles -->
    <v-circle
      v-for="(circle, i) in companionCircles"
      :key="`companion-circle-${i}`"
      :config="circle"
    />

    <!-- Compatibility Lines -->
    <v-line
      v-for="(line, i) in compatibilityLines"
      :key="`compat-line-${i}`"
      :config="line"
    />
  </v-layer>
</template>
