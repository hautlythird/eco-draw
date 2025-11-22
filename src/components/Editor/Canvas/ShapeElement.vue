<script setup>
import { computed } from 'vue'

const props = defineProps({
  shape: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  showLabels: { type: Boolean, default: false },
  brushColor: { type: String, default: '#FF4015' },
  isDrawing: { type: Boolean, default: false },
  isMovingElement: { type: Boolean, default: false }
})

const emit = defineEmits([
  'dragstart',
  'dragmove',
  'dragend',
  'click',
  'dblclick',
  'nodeRef'
])

const shapeComponent = computed(() => {
  switch (props.shape.type) {
    case 'rect': return 'v-rect'
    case 'circle': return 'v-circle'
    case 'ellipse': return 'v-ellipse'
    case 'triangle':
    case 'right-triangle': return 'v-regular-polygon'
    default: return 'v-rect'
  }
})

const borderConfig = computed(() => {
  const shape = props.shape
  const base = {
    stroke: props.brushColor,
    strokeWidth: 2,
    dash: [8, 4],
    listening: false,
    opacity: 0.6
  }
  
  if (shape.type === 'rect') {
    return {
      ...base,
      x: shape.x - 5,
      y: shape.y - 5,
      width: shape.width + 10,
      height: shape.height + 10
    }
  } else if (shape.type === 'circle' || shape.type === 'triangle' || shape.type === 'right-triangle') {
    return {
      ...base,
      x: shape.x,
      y: shape.y,
      radius: shape.radius + 5
    }
  } else if (shape.type === 'ellipse') {
    return {
      ...base,
      x: shape.x,
      y: shape.y,
      radiusX: shape.radiusX + 5,
      radiusY: shape.radiusY + 5
    }
  }
  return base
})

const labelConfig = computed(() => {
  const shape = props.shape
  if (!shape.tag) return null
  
  const labelWidth = shape.tag.length * 8 + 16
  let x, y
  
  if (shape.type === 'rect') {
    x = shape.x + shape.width / 2 - (shape.tag.length * 4 + 8)
    y = shape.y - 32
  } else if (shape.type === 'circle' || shape.type === 'triangle' || shape.type === 'right-triangle') {
    x = shape.x - (shape.tag.length * 4 + 8)
    y = shape.y - shape.radius - 32
  } else if (shape.type === 'ellipse') {
    x = shape.x - (shape.tag.length * 4 + 8)
    y = shape.y - shape.radiusY - 28
  }
  
  return { x, y, width: labelWidth }
})

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
</script>

<template>
  <template>
    <!-- Selection border -->
    <component
      v-if="isSelected"
      :is="shape.type === 'ellipse' ? 'v-ellipse' : (shape.type === 'rect' ? 'v-rect' : 'v-circle')"
      :key="`${shape.type}-border-${shape.id}`"
      :config="borderConfig"
    />
    
    <!-- Shape element -->
    <component
      :is="shapeComponent"
      :ref="(el) => { if (el) emit('nodeRef', shape.id, el.getNode()) }"
      :config="{
        ...shape,
        id: shape.id,
        shadowForStrokeEnabled: true,
        shadowColor: shape.shadowColor || shape.stroke,
        shadowBlur: shape.shadowBlur || 0,
        shadowOpacity: shape.shadowOpacity || 0
      }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @dragstart="(e) => emit('dragstart', e, shape)"
      @dragmove="(e) => emit('dragmove', e, shape)"
      @dragend="(e) => emit('dragend', e, shape)"
      @click="(e) => emit('click', shape, e, e.target)"
      @tap="(e) => emit('click', shape, e, e.target)"
      @dblclick="(e) => emit('dblclick', shape, e)"
      @dbltap="(e) => emit('dblclick', shape, e)"
    />
    
    <!-- Label -->
    <template v-if="showLabels && shape.tag && labelConfig">
      <v-rect
        :key="`${shape.type}-label-bg-${shape.id}`"
        :config="{
          x: labelConfig.x,
          y: labelConfig.y,
          width: labelConfig.width,
          height: 24,
          fill: 'rgba(0, 0, 0, 0.9)',
          cornerRadius: 6,
          shadowColor: shape.stroke,
          shadowBlur: 15,
          shadowOpacity: 0.9,
          listening: false,
          stroke: shape.stroke,
          strokeWidth: 1,
          opacity: 0.95
        }"
      />
      <v-text
        :key="`${shape.type}-label-text-${shape.id}`"
        :config="{
          x: labelConfig.x + 8,
          y: labelConfig.y + 5,
          text: shape.tag,
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          fill: shape.stroke,
          fontStyle: 'bold',
          listening: false,
          shadowColor: shape.stroke,
          shadowBlur: 10,
          shadowOpacity: 1
        }"
      />
      <v-line
        :key="`${shape.type}-label-line-${shape.id}`"
        :config="{
          points: [
            shape.x + (shape.type === 'rect' ? shape.width / 2 : 0),
            labelConfig.y + 12,
            shape.x + (shape.type === 'rect' ? shape.width / 2 : 0),
            shape.y + (shape.type === 'rect' ? 0 : (shape.type === 'ellipse' ? -shape.radiusY : -shape.radius))
          ],
          stroke: shape.stroke,
          strokeWidth: 1.5,
          dash: [4, 4],
          opacity: 0.4,
          listening: false
        }"
      />
    </template>
  </template>
</template>
