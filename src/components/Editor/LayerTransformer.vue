<template>
  <v-transformer
    ref="transformerRef"
    :config="transformerConfig"
  />
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  selectedNodes: {
    type: Array,
    default: () => []
  },
  stageRef: {
    type: Object,
    default: null
  }
})

const transformerRef = ref(null)

const transformerConfig = {
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  borderStroke: '#FF4015',
  borderStrokeWidth: 2,
  anchorFill: '#FF4015',
  anchorStroke: '#ffffff',
  anchorSize: 10,
  anchorCornerRadius: 5,
  borderDash: [4, 4],
  keepRatio: false,
  boundBoxFunc: (oldBox, newBox) => {
    // Prevent negative dimensions
    if (newBox.width < 5 || newBox.height < 5) {
      return oldBox
    }
    return newBox
  }
}

// Update transformer nodes when selection changes
watch(() => props.selectedNodes, (newNodes) => {
  nextTick(() => {
    if (!transformerRef.value) return
    
    const transformer = transformerRef.value.getNode()
    if (!transformer) return
    
    if (newNodes && newNodes.length > 0) {
      transformer.nodes(newNodes)
      transformer.getLayer().batchDraw()
    } else {
      transformer.nodes([])
      transformer.getLayer().batchDraw()
    }
  })
}, { immediate: true, deep: true })

defineExpose({
  getNode: () => transformerRef.value?.getNode()
})
</script>
