<script setup>
const props = defineProps({
  image: { type: Object, required: true },
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
    <v-rect
      v-if="isSelected"
      :key="`image-border-${image.id}`"
      :config="{
        x: image.x - 5,
        y: image.y - 5,
        width: (image.width || 100) + 10,
        height: (image.height || 100) + 10,
        stroke: brushColor,
        strokeWidth: 2,
        dash: [8, 4],
        listening: false,
        opacity: 0.6
      }"
    />
    
    <!-- Image element -->
    <v-image
      :ref="(el) => { if (el) emit('nodeRef', image.id, el.getNode()) }"
      :config="{
        ...image,
        id: image.id
      }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @dragstart="(e) => emit('dragstart', e, image)"
      @dragmove="(e) => emit('dragmove', e, image)"
      @dragend="(e) => emit('dragend', e, image)"
      @click="(e) => emit('click', image, e, e.target)"
      @tap="(e) => emit('click', image, e, e.target)"
      @dblclick="(e) => emit('dblclick', image, e)"
      @dbltap="(e) => emit('dblclick', image, e)"
    />
    
    <!-- Label -->
    <template v-if="showLabels && image.tag">
      <v-rect
        :key="`image-label-bg-${image.id}`"
        :config="{
          x: image.x - 4,
          y: image.y - 32,
          width: image.tag.length * 8 + 16,
          height: 24,
          fill: 'rgba(0, 0, 0, 0.9)',
          cornerRadius: 6,
          shadowColor: brushColor,
          shadowBlur: 15,
          shadowOpacity: 0.9,
          listening: false,
          stroke: brushColor,
          strokeWidth: 1,
          opacity: 0.95
        }"
      />
      <v-text
        :key="`image-label-text-${image.id}`"
        :config="{
          x: image.x + 4,
          y: image.y - 27,
          text: image.tag,
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          fill: brushColor,
          fontStyle: 'bold',
          listening: false,
          shadowColor: brushColor,
          shadowBlur: 10,
          shadowOpacity: 1
        }"
      />
      <v-line
        :key="`image-label-line-${image.id}`"
        :config="{
          points: [
            image.x + (image.tag.length * 4 + 4),
            image.y - 20,
            image.x + (image.width || 50) / 2,
            image.y + (image.height || 50) / 2
          ],
          stroke: brushColor,
          strokeWidth: 1.5,
          dash: [4, 4],
          opacity: 0.4,
          listening: false
        }"
      />
    </template>
  </template>
</template>
