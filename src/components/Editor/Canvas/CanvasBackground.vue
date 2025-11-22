<script setup>
import { computed } from 'vue'
import { CANVAS_CONFIG } from '@/constants/tools'

const props = defineProps({
  stagePosition: { type: Object, required: true },
  stageScale: { type: Number, required: true },
  exportAreaOffsetX: { type: Number, required: true },
  exportAreaOffsetY: { type: Number, required: true },
  exportAreaWidthPx: { type: Number, required: true },
  exportAreaHeightPx: { type: Number, required: true },
  showSunZones: { type: Boolean, default: false },
  showWaterZones: { type: Boolean, default: false },
  showGrid: { type: Boolean, default: true },
  canvasSize: { type: Object, required: true },
  brushColor: { type: String, default: '#FF4015' }
})

// Sun zone overlays
const sunZones = computed(() => {
  if (!props.showSunZones || !props.showGrid) return []
  
  const zones = []
  const zoneWidth = props.exportAreaWidthPx / 3
  
  zones.push({
    x: props.exportAreaOffsetX,
    y: props.exportAreaOffsetY,
    width: zoneWidth,
    height: props.exportAreaHeightPx,
    fill: 'rgba(255, 215, 0, 0.08)',
    listening: false
  })
  
  zones.push({
    x: props.exportAreaOffsetX + zoneWidth,
    y: props.exportAreaOffsetY,
    width: zoneWidth,
    height: props.exportAreaHeightPx,
    fill: 'rgba(255, 165, 0, 0.06)',
    listening: false
  })
  
  zones.push({
    x: props.exportAreaOffsetX + zoneWidth * 2,
    y: props.exportAreaOffsetY,
    width: zoneWidth,
    height: props.exportAreaHeightPx,
    fill: 'rgba(138, 43, 226, 0.05)',
    listening: false
  })
  
  return zones
})

// Water zone overlays
const waterZones = computed(() => {
  if (!props.showWaterZones || !props.showGrid) return []
  
  const zones = []
  const zoneHeight = props.exportAreaHeightPx / 3
  
  zones.push({
    x: props.exportAreaOffsetX,
    y: props.exportAreaOffsetY,
    width: props.exportAreaWidthPx,
    height: zoneHeight,
    fill: 'rgba(0, 191, 255, 0.08)',
    listening: false
  })
  
  zones.push({
    x: props.exportAreaOffsetX,
    y: props.exportAreaOffsetY + zoneHeight,
    width: props.exportAreaWidthPx,
    height: zoneHeight,
    fill: 'rgba(0, 191, 255, 0.05)',
    listening: false
  })
  
  zones.push({
    x: props.exportAreaOffsetX,
    y: props.exportAreaOffsetY + zoneHeight * 2,
    width: props.exportAreaWidthPx,
    height: zoneHeight,
    fill: 'rgba(0, 191, 255, 0.03)',
    listening: false
  })
  
  return zones
})
</script>

<template>
  <v-layer :config="{ listening: false }">
    <!-- Infinite dark background -->
    <v-rect
      :config="{
        x: -stagePosition.x / stageScale - CANVAS_CONFIG.STAGE_PADDING,
        y: -stagePosition.y / stageScale - CANVAS_CONFIG.STAGE_PADDING,
        width: CANVAS_CONFIG.STAGE_PADDING * 2,
        height: CANVAS_CONFIG.STAGE_PADDING * 2,
        fill: '#0a0a0a',
        listening: false
      }"
    />
    
    <!-- Export area background -->
    <v-rect
      :config="{
        x: exportAreaOffsetX,
        y: exportAreaOffsetY,
        width: exportAreaWidthPx,
        height: exportAreaHeightPx,
        fill: '#0f0f0f',
        listening: false
      }"
    />
    
    <!-- Sun Zones -->
    <template v-if="showSunZones && showGrid">
      <v-rect
        v-for="(zone, i) in sunZones"
        :key="`sun-zone-${i}`"
        :config="zone"
      />
      <v-text
        :config="{
          x: exportAreaOffsetX + exportAreaWidthPx / 6 - 30,
          y: exportAreaOffsetY + 20,
          text: '☀️ Full Sun',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: 'rgba(255, 215, 0, 0.8)',
          fontStyle: 'bold',
          listening: false
        }"
      />
      <v-text
        :config="{
          x: exportAreaOffsetX + exportAreaWidthPx / 2 - 50,
          y: exportAreaOffsetY + 20,
          text: '⛅ Partial Shade',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: 'rgba(255, 165, 0, 0.8)',
          fontStyle: 'bold',
          listening: false
        }"
      />
      <v-text
        :config="{
          x: exportAreaOffsetX + exportAreaWidthPx * 5 / 6 - 45,
          y: exportAreaOffsetY + 20,
          text: '🌙 Full Shade',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: 'rgba(138, 43, 226, 0.8)',
          fontStyle: 'bold',
          listening: false
        }"
      />
    </template>
    
    <!-- Water Zones -->
    <template v-if="showWaterZones && showGrid">
      <v-rect
        v-for="(zone, i) in waterZones"
        :key="`water-zone-${i}`"
        :config="zone"
      />
      <v-text
        :config="{
          x: exportAreaOffsetX + 20,
          y: exportAreaOffsetY + exportAreaHeightPx / 6 - 10,
          text: '💧💧💧 High Water',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: 'rgba(0, 191, 255, 0.9)',
          fontStyle: 'bold',
          listening: false
        }"
      />
      <v-text
        :config="{
          x: exportAreaOffsetX + 20,
          y: exportAreaOffsetY + exportAreaHeightPx / 2 - 10,
          text: '💧💧 Medium Water',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: 'rgba(0, 191, 255, 0.7)',
          fontStyle: 'bold',
          listening: false
        }"
      />
      <v-text
        :config="{
          x: exportAreaOffsetX + 20,
          y: exportAreaOffsetY + exportAreaHeightPx * 5 / 6 - 10,
          text: '💧 Low Water',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: 'rgba(0, 191, 255, 0.5)',
          fontStyle: 'bold',
          listening: false
        }"
      />
    </template>
  </v-layer>
</template>
