<template>
  <v-layer ref="drawingLayer" name="advancedDrawingLayer">
    <!-- Main drawing lines with advanced physics -->
    <v-line
      v-for="line in advancedLines"
      :key="line.id"
      :config="line.config"
      @pointerdown="handleLinePointerDown($event, line)"
      @pointermove="handleLinePointerMove($event, line)"
      @pointerup="handleLinePointerUp($event, line)"
    />

    <!-- Texture overlay for paper grain interaction -->
    <v-layer ref="textureOverlay" name="textureOverlay" opacity="0.3">
      <v-rect
        v-for="texture in paperTextures"
        :key="texture.id"
        :config="texture.config"
      />
    </v-layer>

    <!-- Smudge and blend effects layer -->
    <v-layer ref="blendLayer" name="blendLayer" opacity="0.6">
      <v-ellipse
        v-for="smudge in smudgeEffects"
        :key="smudge.id"
        :config="smudge.config"
      />
    </v-layer>

    <!-- Highlight layer for pencil sheen -->
    <v-layer ref="highlightLayer" name="highlightLayer" opacity="0.2">
      <v-line
        v-for="highlight in highlights"
        :key="highlight.id"
        :config="highlight.config"
      />
    </v-layer>
  </v-layer>
</template>

<script>
import { ref, watch, onMounted, nextTick } from 'vue'
import { useAdvancedBrush } from '@/composables/useAdvancedBrush'
import { generateElementId } from '@/utils/idGenerator'
import { logger } from '@/utils/logger'

export default {
  name: 'AdvancedDrawingLayer',
  props: {
    lines: {
      type: Array,
      default: () => []
    },
    brushSettings: {
      type: Object,
      required: true
    },
    canvasScale: {
      type: Number,
      default: 1
    }
  },
  emits: ['line-start', 'line-draw', 'line-end'],
  setup(props, { emit }) {
    const drawingLayer = ref(null)
    const textureOverlay = ref(null)
    const blendLayer = ref(null)
    const highlightLayer = ref(null)

    // Advanced brush system
    const advancedBrush = useAdvancedBrush()

    // Enhanced line storage with physics data
    const advancedLines = ref([])
    const paperTextures = ref([])
    const smudgeEffects = ref([])
    const highlights = ref([])

    // Drawing state
    const isDrawing = ref(false)
    const currentStroke = ref(null)
    const lastPoint = ref(null)
    const strokeStartTime = ref(0)
    const totalStrokeDistance = ref(0)
    const strokePoints = ref([])

    // Initialize brush settings
    const initializeBrushSettings = () => {
      if (props.brushSettings) {
        advancedBrush.color.value = props.brushSettings.color || '#2c2c2c'
        advancedBrush.thickness.value = props.brushSettings.thickness || 50
        advancedBrush.selectedPencil.value = props.brushSettings.pencilType || 'HB'
        advancedBrush.selectedPaper.value = props.brushSettings.paperTexture || 'MEDIUM'
      }
    }

    // Calculate drawing velocity and angle
    const calculateDrawingPhysics = (currentPoint) => {
      if (!lastPoint.value || !strokeStartTime.value) {
        return { velocity: 0, angle: 0, pressure: 1.0 }
      }

      const currentTime = Date.now()
      const timeDelta = currentTime - strokeStartTime.value
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - lastPoint.value.x, 2) +
        Math.pow(currentPoint.y - lastPoint.value.y, 2)
      )

      // Calculate velocity (pixels per second)
      const velocity = timeDelta > 0 ? (distance / timeDelta) * 1000 : 0

      // Calculate angle
      const angle = Math.atan2(
        currentPoint.y - lastPoint.value.y,
        currentPoint.x - lastPoint.value.x
      ) * (180 / Math.PI)

      // Simulate pressure based on velocity and direction changes
      let pressure = 1.0
      if (velocity > 100) {
        // Fast movements = lighter pressure
        pressure = Math.max(0.3, 1.0 - (velocity - 100) / 500)
      } else if (velocity < 20 && totalStrokeDistance.value > 50) {
        // Slow, deliberate movements = heavier pressure
        pressure = Math.min(1.5, 1.0 + (50 - velocity) / 100)
      }

      // Add slight pressure variation for realism
      pressure += (Math.random() - 0.5) * 0.1
      pressure = Math.max(0.2, Math.min(2.0, pressure))

      return { velocity, angle, pressure }
    }

    // Create advanced line with physics
    const createAdvancedLine = (startPoint) => {
      const lineId = generateElementId()
      const physics = calculateDrawingPhysics(startPoint)

      // Update brush physics
      advancedBrush.updatePhysics(physics.velocity, physics.angle, physics.pressure)

      // Generate initial brush configuration
      const brushConfig = advancedBrush.generateBrushConfig(startPoint.x, startPoint.y)

      const advancedLine = {
        id: lineId,
        tag: `Advanced ${advancedBrush.currentPencil.value.name} ${advancedLines.value.length + 1}`,
        points: [startPoint.x, startPoint.y],
        config: {
          ...brushConfig,
          draggable: false,
          name: lineId
        },
        physicsData: {
          ...brushConfig.physicsData,
          strokeStartTime: Date.now(),
          layerCount: 0
        }
      }

      advancedLines.value.push(advancedLine)
      currentStroke.value = advancedLine
      strokePoints.value = [{ x: startPoint.x, y: startPoint.y, ...physics }]

      // Generate paper texture for stroke start
      generatePaperTexture(startPoint, physics)

      return advancedLine
    }

    // Generate paper grain texture
    const generatePaperTexture = (point, physics) => {
      const textureId = generateElementId()
      const textureSize = advancedBrush.currentPencil.value.texture * 20

      const texture = {
        id: textureId,
        config: {
          x: point.x - textureSize / 2,
          y: point.y - textureSize / 2,
          width: textureSize,
          height: textureSize,
          fill: `rgba(255, 255, 255, ${advancedBrush.currentPaper.value.grain * 0.1})`,
          noise: Math.random() * 0.5,
          rotation: physics.angle + Math.random() * 45
        }
      }

      paperTextures.value.push(texture)
    }

    // Add smudge effect for soft pencils
    const addSmudgeEffect = (point, pressure) => {
      const pencil = advancedBrush.currentPencil.value

      if (pencil.texture < 0.5) return // Only for soft pencils

      const smudgeId = generateElementId()
      const smudgeSize = advancedBrush.thickness.value * (pencil.texture * 0.8)

      const smudge = {
        id: smudgeId,
        config: {
          x: point.x,
          y: point.y,
          radiusX: smudgeSize,
          radiusY: smudgeSize * 0.6,
          fill: advancedBrush.color.value,
          opacity: pressure * pencil.texture * 0.3,
          rotation: Math.random() * 360
        }
      }

      smudgeEffects.value.push(smudge)

      // Limit smudge effects for performance
      if (smudgeEffects.value.length > 50) {
        smudgeEffects.value.shift()
      }
    }

    // Add highlight for graphite sheen
    const addHighlight = (points, pressure) => {
      const pencil = advancedBrush.currentPencil.value

      if (pencil.hardness < 0.3) return // Only for harder pencils

      const highlightId = generateElementId()

      // Create highlight along the stroke path
      const highlightPoints = points.slice(-20) // Last 20 points

      const highlight = {
        id: highlightId,
        config: {
          points: highlightPoints.flatMap(p => [p.x, p.y]),
          stroke: `rgba(255, 255, 255, ${pressure * 0.2})`,
          strokeWidth: advancedBrush.thickness.value * 0.1,
          opacity: pressure * pencil.hardness * 0.3,
          tension: 0.8,
          lineCap: 'round',
          lineJoin: 'round'
        }
      }

      highlights.value.push(highlight)

      // Limit highlights for performance
      if (highlights.value.length > 30) {
        highlights.value.shift()
      }
    }

    // Update stroke with new point
    const updateStroke = (newPoint) => {
      if (!currentStroke.value) return

      const physics = calculateDrawingPhysics(newPoint)

      // Update brush physics
      advancedBrush.updatePhysics(physics.velocity, physics.angle, physics.pressure)

      // Add new point to stroke
      currentStroke.value.points.push(newPoint.x, newPoint.y)
      strokePoints.value.push({ x: newPoint.x, y: newPoint.y, ...physics })

      // Update total distance
      if (lastPoint.value) {
        const distance = Math.sqrt(
          Math.pow(newPoint.x - lastPoint.value.x, 2) +
          Math.pow(newPoint.y - lastPoint.value.y, 2)
        )
        totalStrokeDistance.value += distance
      }

      // Regenerate brush configuration with current physics
      const brushConfig = advancedBrush.generateBrushConfig(newPoint.x, newPoint.y, strokePoints.value.length)
      currentStroke.value.config = {
        ...currentStroke.value.config,
        ...brushConfig,
        points: [...currentStroke.value.points] // Trigger re-render
      }

      // Add effects based on pencil type
      if (advancedBrush.currentPencil.value.texture > 0.5) {
        addSmudgeEffect(newPoint, physics.pressure)
      }

      if (advancedBrush.currentPencil.value.hardness > 0.3 && strokePoints.value.length % 10 === 0) {
        addHighlight(currentStroke.value.points, physics.pressure)
      }

      // Generate paper texture at intervals
      if (strokePoints.value.length % 5 === 0) {
        generatePaperTexture(newPoint, physics)
      }

      lastPoint.value = newPoint
      strokeStartTime.value = Date.now()

      emit('line-draw', currentStroke.value)
    }

    // Finalize stroke
    const finalizeStroke = () => {
      if (!currentStroke.value) return

      // Update stroke with final configuration
      const finalPhysics = calculateDrawingPhysics(lastPoint.value || { x: 0, y: 0 })
      advancedBrush.updatePhysics(finalPhysics.velocity, finalPhysics.angle, finalPhysics.pressure)

      const finalConfig = advancedBrush.generateBrushConfig(
        lastPoint.value?.x || 0,
        lastPoint.value?.y || 0,
        strokePoints.value.length
      )

      currentStroke.value.config = {
        ...currentStroke.value.config,
        ...finalConfig,
        points: [...currentStroke.value.points]
      }

      // Apply final blending effects
      if (advancedBrush.smudgeFactor.value > 0.3) {
        applyBlendingEffects(currentStroke.value)
      }

      emit('line-end', currentStroke.value)

      // Reset drawing state
      currentStroke.value = null
      lastPoint.value = null
      strokeStartTime.value = 0
      totalStrokeDistance.value = 0
      strokePoints.value = []
      isDrawing.value = false
    }

    // Apply blending effects to completed stroke
    const applyBlendingEffects = (line) {
      // This would implement advanced blending algorithms
      // For now, we'll just update the blend mode
      const pencil = advancedBrush.currentPencil.value

      if (pencil.hardness < 0.3) {
        line.config.globalCompositeOperation = 'multiply'
      } else if (pencil.texture > 0.7) {
        line.config.globalCompositeOperation = 'screen'
      }
    }

    // Event handlers
    const handleLinePointerDown = (event, line) => {
      emit('line-start', line)
    }

    const handleLinePointerMove = (event, line) => {
      // Handle line interactions if needed
    }

    const handleLinePointerUp = (event, line) => {
      emit('line-end', line)
    }

    // Public methods
    const startStroke = (point) => {
      if (isDrawing.value) return

      isDrawing.value = true
      strokeStartTime.value = Date.now()
      lastPoint.value = point
      return createAdvancedLine(point)
    }

    const continueStroke = (point) => {
      if (!isDrawing.value || !currentStroke.value) return
      updateStroke(point)
    }

    const endStroke = () => {
      if (!isDrawing.value) return
      finalizeStroke()
    }

    // Clean up old effects for performance
    const cleanupEffects = () => {
      // Keep only recent effects (last 100 of each type)
      if (paperTextures.value.length > 100) {
        paperTextures.value = paperTextures.value.slice(-100)
      }
      if (smudgeEffects.value.length > 50) {
        smudgeEffects.value = smudgeEffects.value.slice(-50)
      }
      if (highlights.value.length > 30) {
        highlights.value = highlights.value.slice(-30)
      }
    }

    // Watch for brush setting changes
    watch(() => props.brushSettings, initializeBrushSettings, { immediate: true, deep: true })

    // Watch for external line changes
    watch(() => props.lines, (newLines) => {
      advancedLines.value = newLines.map(line => ({
        ...line,
        physicsData: line.physicsData || { layerCount: 0, pressure: 1.0 }
      }))
    }, { deep: true })

    // Periodic cleanup
    onMounted(() => {
      setInterval(cleanupEffects, 30000) // Clean up every 30 seconds
      initializeBrushSettings()
    })

    return {
      // Refs
      drawingLayer,
      textureOverlay,
      blendLayer,
      highlightLayer,

      // State
      advancedLines,
      paperTextures,
      smudgeEffects,
      highlights,
      isDrawing,
      advancedBrush,

      // Methods
      startStroke,
      continueStroke,
      endStroke,
      handleLinePointerDown,
      handleLinePointerMove,
      handleLinePointerUp,
      cleanupEffects
    }
  }
}
</script>

<style scoped>
/* Advanced drawing layer styles */
</style>