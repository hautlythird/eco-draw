<script setup>
import { computed } from 'vue'
import { CANVAS_CONFIG, GRID_SCALES } from '@/constants/tools'

const METER_TO_PIXELS = CANVAS_CONFIG.METER_TO_PIXELS
const GRID_SIZE_METERS = CANVAS_CONFIG.GRID_SIZE_METERS

const props = defineProps({
  showGrid: { type: Boolean, default: true },
  stageScale: { type: Number, required: true },
  exportAreaOffsetX: { type: Number, required: true },
  exportAreaOffsetY: { type: Number, required: true },
  exportAreaWidthPx: { type: Number, required: true },
  exportAreaHeightPx: { type: Number, required: true },
  canvasSize: { type: Object, required: true },
  brushColor: { type: String, default: '#FF4015' }
})
</script>

<template>
  <v-layer v-if="showGrid" :config="{ listening: false }">
    <!-- Compact info panel (only shows when zoomed out) -->
    <v-group v-if="stageScale <= 1.2">
      <v-rect
        :config="{
          x: exportAreaOffsetX + 10,
          y: exportAreaOffsetY + 10,
          width: 200,
          height: 60,
          fill: 'rgba(0, 0, 0, 0.85)',
          cornerRadius: 10,
          listening: false,
          shadowColor: '#65FF86',
          shadowBlur: 15,
          shadowOpacity: 0.4,
          stroke: 'rgba(101, 255, 134, 0.2)',
          strokeWidth: 1
        }"
      />
      <v-text
        :config="{
          x: exportAreaOffsetX + 20,
          y: exportAreaOffsetY + 20,
          text: `🌿 ${canvasSize.width}m × ${canvasSize.height}m`,
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: '#65FF86',
          fontStyle: 'bold',
          listening: false
        }"
      />
      <v-text
        :config="{
          x: exportAreaOffsetX + 20,
          y: exportAreaOffsetY + 42,
          text: `${canvasSize.width * canvasSize.height}m² | ${GRID_SIZE_METERS}m grid`,
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          fill: 'rgba(255, 255, 255, 0.7)',
          listening: false
        }"
      />
    </v-group>
    
    <!-- Simplified Rulers (only at zoom > 0.8) -->
    <template v-if="stageScale > 0.8">
      <!-- Top ruler markings (every 5 meters) -->
      <template v-for="i in Math.ceil(canvasSize.width / 5)" :key="`ruler-top-${i}`">
        <v-line
          :config="{
            points: [
              exportAreaOffsetX + i * 5 * METER_TO_PIXELS,
              exportAreaOffsetY - 15,
              exportAreaOffsetX + i * 5 * METER_TO_PIXELS,
              exportAreaOffsetY
            ],
            stroke: 'rgba(101, 255, 134, 0.5)',
            strokeWidth: 2,
            listening: false
          }"
        />
        <v-text
          :config="{
            x: exportAreaOffsetX + i * 5 * METER_TO_PIXELS - 12,
            y: exportAreaOffsetY - 28,
            text: `${i * 5}m`,
            fontSize: 11,
            fontFamily: 'Inter, monospace',
            fill: '#65FF86',
            listening: false,
            shadowColor: '#000',
            shadowBlur: 4
          }"
        />
      </template>
      
      <!-- Left ruler markings (every 5 meters) -->
      <template v-for="i in Math.ceil(canvasSize.height / 5)" :key="`ruler-left-${i}`">
        <v-line
          :config="{
            points: [
              exportAreaOffsetX - 15,
              exportAreaOffsetY + i * 5 * METER_TO_PIXELS,
              exportAreaOffsetX,
              exportAreaOffsetY + i * 5 * METER_TO_PIXELS
            ],
            stroke: 'rgba(101, 255, 134, 0.5)',
            strokeWidth: 2,
            listening: false
          }"
        />
        <v-text
          :config="{
            x: exportAreaOffsetX - 35,
            y: exportAreaOffsetY + i * 5 * METER_TO_PIXELS - 6,
            text: `${i * 5}m`,
            fontSize: 11,
            fontFamily: 'Inter, monospace',
            fill: '#65FF86',
            listening: false,
            shadowColor: '#000',
            shadowBlur: 4
          }"
        />
      </template>
    </template>
    
    <!-- Export Area Border -->
    <v-rect
      :config="{
        x: exportAreaOffsetX,
        y: exportAreaOffsetY,
        width: exportAreaWidthPx,
        height: exportAreaHeightPx,
        stroke: brushColor,
        strokeWidth: 2,
        dash: [20, 10],
        listening: false,
        opacity: 0.6
      }"
    />
  </v-layer>
</template>
