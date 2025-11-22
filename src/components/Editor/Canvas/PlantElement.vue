<script setup>
import { computed } from 'vue'

const props = defineProps({
  plant: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  brushColor: { type: String, default: '#FF4015' },
  isDrawing: { type: Boolean, default: false },
  isMovingElement: { type: Boolean, default: false },
  snapToGrid: { type: Boolean, default: false }
})

const emit = defineEmits([
  'dragstart',
  'dragmove',
  'dragend',
  'click',
  'dblclick',
  'nodeRef',
  'checkCompatibility'
])

const handleMouseEnter = (e) => {
  if (!props.isDrawing && !props.isMovingElement) {
    e.target.getStage().container().style.cursor = 'grab'
  }
}

const handleMouseLeave = (e) => {
  if (!props.isDrawing && !props.isMovingElement) {
    e.target.getStage().container().style.cursor = 'default'
  }
}

const handleDragMove = (e) => {
  emit('dragmove', e, props.plant)
}
</script>

<template>
  <template>
    <!-- Plant spacing circle -->
    <v-circle
      v-if="plant.plantId && plant.spacingRadius"
      :key="`plant-spacing-${plant.id}`"
      :config="{
        x: plant.x + (plant.fontSize || 48) / 2,
        y: plant.y + (plant.fontSize || 48) / 2,
        radius: plant.spacingRadius,
        stroke: plant.fill || '#65FF86',
        strokeWidth: 2,
        dash: [8, 8],
        listening: false,
        opacity: 0.5,
        perfectDrawEnabled: false
      }"
    />
    
    <!-- Selection border -->
    <v-rect
      v-if="isSelected"
      :key="`text-border-${plant.id}`"
      :config="{
        x: plant.x - 5,
        y: plant.y - 5,
        width: (plant.text?.length || 5) * (plant.fontSize || 24) * 0.6 + 10,
        height: (plant.fontSize || 24) + 10,
        stroke: brushColor,
        strokeWidth: 2,
        dash: [8, 4],
        listening: false,
        opacity: 0.6,
        perfectDrawEnabled: false
      }"
    />
    
    <!-- Plant/Text Icon (draggable group) -->
    <v-group
      :config="{
        x: plant.x,
        y: plant.y,
        draggable: true,
        id: `text-group-${plant.id}`,
        name: 'draggable-element'
      }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @dragstart="(e) => emit('dragstart', e, plant)"
      @dragmove="handleDragMove"
      @dragend="(e) => emit('dragend', e, plant)"
      @click="(e) => emit('click', plant, e, e.target)"
      @tap="(e) => emit('click', plant, e, e.target)"
      @dblclick="(e) => emit('dblclick', plant, e)"
      @dbltap="(e) => emit('dblclick', plant, e)"
    >
      <!-- Larger invisible hit area -->
      <v-rect
        :config="{
          x: -15,
          y: -15,
          width: (plant.fontSize || 48) + 30,
          height: (plant.fontSize || 48) + 30,
          fill: 'transparent',
          listening: true
        }"
      />
      
      <!-- Actual text -->
      <v-text
        :ref="(el) => { if (el) emit('nodeRef', plant.id, el.getNode()) }"
        :config="{
          x: 0,
          y: 0,
          text: plant.text,
          fontSize: plant.fontSize,
          fontFamily: plant.fontFamily,
          fontStyle: plant.fontStyle,
          fill: plant.fill,
          id: plant.id,
          shadowColor: plant.plantId ? (plant.fill || '#65FF86') : 'transparent',
          shadowBlur: plant.plantId ? 15 : 0,
          shadowOpacity: plant.plantId ? 0.6 : 0,
          perfectDrawEnabled: false,
          listening: false
        }"
      />
    </v-group>
    
    <!-- Plant Nametag (always visible for plants) -->
    <template v-if="plant.plantId && plant.tag">
      <v-rect
        :config="{
          x: plant.x + (plant.fontSize || 48) / 2 - (plant.tag.length * 4.5 + 12),
          y: plant.y - 38,
          width: plant.tag.length * 9 + 24,
          height: 28,
          fill: 'rgba(0, 0, 0, 0.95)',
          cornerRadius: 8,
          shadowColor: plant.fill || '#65FF86',
          shadowBlur: 20,
          shadowOpacity: 0.7,
          shadowForStrokeEnabled: false,
          listening: false,
          stroke: plant.fill || '#65FF86',
          strokeWidth: 2,
          opacity: 1,
          perfectDrawEnabled: false
        }"
      />
      <v-text
        :config="{
          x: plant.x + (plant.fontSize || 48) / 2 - (plant.tag.length * 4.5),
          y: plant.y - 31,
          text: plant.tag,
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: plant.fill || '#65FF86',
          fontStyle: 'bold',
          listening: false,
          shadowColor: plant.fill || '#65FF86',
          shadowBlur: 12,
          shadowOpacity: 1,
          perfectDrawEnabled: false
        }"
      />
      <v-text
        v-if="plant.spacingMeters"
        :config="{
          x: plant.x + (plant.fontSize || 48) / 2 - 20,
          y: plant.y + (plant.fontSize || 48) + 8,
          text: `${plant.spacingMeters.toFixed(1)}m`,
          fontSize: 11,
          fontFamily: 'Inter, monospace',
          fill: 'rgba(255, 255, 255, 0.7)',
          listening: false,
          shadowColor: '#000',
          shadowBlur: 4,
          perfectDrawEnabled: false
        }"
      />
    </template>
  </template>
</template>
