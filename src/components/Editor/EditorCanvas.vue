vue
<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useHistory } from '@/composables/useHistory'
import { useZoom } from '@/composables/useZoom'
import { useLayers } from '@/composables/useLayers'
import { CANVAS_CONFIG, GRID_SCALES, PLANT_SPACING } from '@/constants/tools'
import { generateElementId } from '@/utils/idGenerator'
import { logger } from '@/utils/logger'
import StaticGridLayer from './StaticGridLayer.vue'
import LayerTransformer from './LayerTransformer.vue'


const throttle = (func, delay) => {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return func.apply(this, args)
    }
  }
}

const props = defineProps({
  tool: {
    type: String,
    required: true,
    validator: (value) => ['brush', 'eraser', 'square', 'circle', 'triangle', 'text', 'image', 'move'].includes(value)
  },
  toolOption: {
    type: String,
    default: ''
  },
  brushColor: {
    type: String,
    default: '#FF4015',
    validator: (value) => /^#[0-9A-F]{6}$/i.test(value)
  },
  brushThickness: {
    type: Number,
    default: 50,
    validator: (value) => value >= 1 && value <= 100
  },
  brushHardness: {
    type: Number,
    default: 50,
    validator: (value) => value >= 0 && value <= 100
  },
  brushOpacity: {
    type: Number,
    default: 100,
    validator: (value) => value >= 0 && value <= 100
  },
  showGrid: {
    type: Boolean,
    default: true
  },
  canvasSize: {
    type: Object,
    default: () => ({ width: 20, height: 15 }),
    validator: (value) => {
      return value && 
             typeof value.width === 'number' && 
             typeof value.height === 'number' &&
             value.width > 0 && 
             value.height > 0
    }
  },
  snapToGrid: {
    type: Boolean,
    default: false
  }
})

// Use centralized zoom management
const {
  stageScale,
  stagePosition,
  stageConfig,
  zoomIn: centralizedZoomIn,
  zoomOut: centralizedZoomOut,
  zoomToPoint,
  resetZoom: centralizedResetZoom,
  updateStageConfig,
  getSafeStageCenter,
  zoomPercentage
} = useZoom()

const stageRef = ref(null)

// 🌱 AGROECOLOGICAL GRID CONFIGURATION
const METER_TO_PIXELS = CANVAS_CONFIG.METER_TO_PIXELS
const GRID_SIZE_METERS = CANVAS_CONFIG.GRID_SIZE_METERS
const gridSize = METER_TO_PIXELS * GRID_SIZE_METERS

// Multi-scale grid system for different planning needs
const gridScales = {
  micro: METER_TO_PIXELS * GRID_SCALES.MICRO,
  small: METER_TO_PIXELS * GRID_SCALES.SMALL,
  standard: METER_TO_PIXELS * GRID_SCALES.STANDARD,
  medium: METER_TO_PIXELS * GRID_SCALES.MEDIUM,
  large: METER_TO_PIXELS * GRID_SCALES.LARGE,
  macro: METER_TO_PIXELS * GRID_SCALES.MACRO
}

// Calculate actual export area dimensions in pixels (neon border area)
const exportAreaWidthPx = computed(() => props.canvasSize.width * METER_TO_PIXELS)
const exportAreaHeightPx = computed(() => props.canvasSize.height * METER_TO_PIXELS)

// Center the export area in the stage (this is the neon border area)
const exportAreaOffsetX = computed(() => (stageConfig.value.width - exportAreaWidthPx.value) / 2)
const exportAreaOffsetY = computed(() => (stageConfig.value.height - exportAreaHeightPx.value) / 2)

// Grid is now in StaticGridLayer.vue component to prevent re-renders during zoom

const lines = ref([])
const shapes = ref([])
const images = ref([])
const texts = ref([])
const isDrawing = ref(false)
const selectedElement = ref(null)
const showTagDialog = ref(false)
const tagDialogPosition = ref({ x: 0, y: 0 })
const currentTag = ref('')
const editingElement = ref(null)
const isEditingLabel = ref(false)
const { saveHistory, undo, redo } = useHistory()

// Layer system integration
const {
  layers,
  selectedLayerIds,
  selectedElements,
  createLayer,
  selectLayer,
  clearSelection,
  isLayerSelected,
  deleteLayer,
  syncLayersFromElements
} = useLayers()

// Transformer ref
const transformerRef = ref(null)
const konvaNodesMap = ref(new Map()) // Map element IDs to Konva nodes

// 🌱 Agroecological overlay features
const showCompanionCircles = ref(true)
const showSunZones = ref(false)
const showWaterZones = ref(false)
const showSpacingGuides = ref(true)

// Labels feature - can be enabled when needed
const showLabels = ref(false)

// Touch gesture tracking for two-finger pan
const touchStartDistance = ref(0)
const touchStartPositions = ref([])
const isPanning = ref(false)
const lastPanPosition = ref({ x: 0, y: 0 })
const isTwoFingerGesture = ref(false)
const initialStagePosition = ref({ x: 0, y: 0 })
const panVelocity = ref({ x: 0, y: 0 })
const lastPanTime = ref(0)

// Middle mouse button panning
const isMiddleMousePanning = ref(false)
const middleMouseStartPos = ref({ x: 0, y: 0 })

// Move tool state
const isMovingElement = ref(false)
const movingElement = ref(null)
const moveStartPos = ref({ x: 0, y: 0 })
const elementStartPos = ref({ x: 0, y: 0 })

// Rotation state for geometric shapes during creation
const isRotatingDuringCreation = ref(false)
const creationStartPos = ref({ x: 0, y: 0 })
const currentRotationAngle = ref(0)

// Event listener cleanup reference
let contextMenuHandler = null

// Delete selected elements
const deleteSelectedElements = () => {
  if (selectedElements.value.length === 0) return
  
  // Create a Set of IDs to delete for faster lookup
  const idsToDelete = new Set(selectedElements.value.map(e => e.id))
  
  // Filter out the elements to delete
  lines.value = lines.value.filter(l => !idsToDelete.has(l.id))
  shapes.value = shapes.value.filter(s => !idsToDelete.has(s.id))
  images.value = images.value.filter(i => !idsToDelete.has(i.id))
  texts.value = texts.value.filter(t => !idsToDelete.has(t.id))
  
  // Delete layers
  selectedLayerIds.value.forEach(layerId => {
    deleteLayer(layerId)
  })
  
  // Clear selection
  clearSelection()
  
  // Force reactivity update
  nextTick(() => {
    saveHistory({ lines: lines.value, shapes: shapes.value, images: images.value, texts: texts.value })
    syncLayersFromElements(lines.value, shapes.value, images.value, texts.value)
  })
}

// Handle keyboard shortcuts
const handleKeyDown = (e) => {
  // Delete or Backspace to delete selected elements
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElements.value.length > 0) {
    e.preventDefault()
    deleteSelectedElements()
  }
  
  // Escape to deselect
  if (e.key === 'Escape') {
    clearSelection()
  }
}

// Simple helper to calculate default label position for an element
const getDefaultLabelPos = (element, elementType) => {
  const labelWidth = (element.tag?.length || 0) * 8 + 16
  const labelHeight = 24
  const padding = 8
  
  if (elementType === 'rect') {
    return {
      x: element.x + element.width / 2 - labelWidth / 2,
      y: element.y - labelHeight - padding
    }
  } else if (elementType === 'circle') {
    return {
      x: element.x - labelWidth / 2,
      y: element.y - element.radius - labelHeight - padding
    }
  } else if (elementType === 'ellipse') {
    return {
      x: element.x - labelWidth / 2,
      y: element.y - element.radiusY - labelHeight - padding
    }
  } else if (elementType === 'triangle' || elementType === 'right-triangle') {
    return {
      x: element.x - labelWidth / 2,
      y: element.y - element.radius - labelHeight - padding
    }
  } else if (elementType === 'image') {
    return {
      x: element.x + (element.width || 100) / 2 - labelWidth / 2,
      y: element.y - labelHeight - padding
    }
  } else if (elementType === 'text') {
    return {
      x: element.x,
      y: element.y - labelHeight - padding
    }
  }
  
  return { x: element.x, y: element.y - labelHeight - padding }
}

// 🌿 Companion planting circles - static, no zoom dependency
const companionCircles = computed(() => {
  if (!showCompanionCircles.value) return []
  
  const circles = []
  
  // Only show for images (plants) - show both circles always
  images.value.forEach(img => {
    const centerX = img.x + (img.width || 100) / 2
    const centerY = img.y + (img.height || 100) / 2
    
    // Optimal spacing circle (60cm) - primary guide
    circles.push({
      x: centerX,
      y: centerY,
      radius: METER_TO_PIXELS * 0.6,
      stroke: 'rgba(255, 215, 0, 0.2)',
      strokeWidth: 1.5,
      dash: [6, 6],
      listening: false
    })
    
    // Companion zone (1.2m) - always show
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

// 🌞 Sun zone overlays (full sun, partial shade, full shade)
const sunZones = computed(() => {
  if (!showSunZones.value) return []
  
  const zones = []
  const zoneWidth = exportAreaWidthPx.value / 3
  
  // Full sun zone (left third)
  zones.push({
    x: exportAreaOffsetX.value,
    y: exportAreaOffsetY.value,
    width: zoneWidth,
    height: exportAreaHeightPx.value,
    fill: 'rgba(255, 215, 0, 0.08)',
    listening: false
  })
  
  // Partial shade (middle third)
  zones.push({
    x: exportAreaOffsetX.value + zoneWidth,
    y: exportAreaOffsetY.value,
    width: zoneWidth,
    height: exportAreaHeightPx.value,
    fill: 'rgba(255, 165, 0, 0.06)',
    listening: false
  })
  
  // Full shade (right third)
  zones.push({
    x: exportAreaOffsetX.value + zoneWidth * 2,
    y: exportAreaOffsetY.value,
    width: zoneWidth,
    height: exportAreaHeightPx.value,
    fill: 'rgba(138, 43, 226, 0.05)',
    listening: false
  })
  
  return zones
})

// 💧 Water zones (high, medium, low water needs)
const waterZones = computed(() => {
  if (!showWaterZones.value) return []
  
  const zones = []
  const zoneHeight = exportAreaHeightPx.value / 3
  
  // High water zone (top third)
  zones.push({
    x: exportAreaOffsetX.value,
    y: exportAreaOffsetY.value,
    width: exportAreaWidthPx.value,
    height: zoneHeight,
    fill: 'rgba(0, 191, 255, 0.08)',
    listening: false
  })
  
  // Medium water zone (middle third)
  zones.push({
    x: exportAreaOffsetX.value,
    y: exportAreaOffsetY.value + zoneHeight,
    width: exportAreaWidthPx.value,
    height: zoneHeight,
    fill: 'rgba(0, 191, 255, 0.05)',
    listening: false
  })
  
  // Low water zone (bottom third)
  zones.push({
    x: exportAreaOffsetX.value,
    y: exportAreaOffsetY.value + zoneHeight * 2,
    width: exportAreaWidthPx.value,
    height: zoneHeight,
    fill: 'rgba(0, 191, 255, 0.03)',
    listening: false
  })
  
  return zones
})

// Check if element is selected
const isElementSelected = (elementId) => {
  return selectedElements.value.some(e => e.id === elementId)
}

// Watch for undo/redo changes
const applyHistoryState = (state) => {
  if (state) {
    lines.value = [...state.lines]
    shapes.value = [...state.shapes]
    images.value = state.images ? [...state.images] : []
    texts.value = state.texts ? [...state.texts] : []
  }
}

// getSafeStageCenter is now provided by useZoom composable

defineExpose({
  undo: () => {
    const state = undo()
    applyHistoryState(state)
  },
  redo: () => {
    const state = redo()
    applyHistoryState(state)
  },
  clear: () => {
    lines.value = []
    shapes.value = []
    images.value = []
    texts.value = []
    saveHistory({ lines: [], shapes: [], images: [], texts: [] })
  },
  getStage: () => {
    return stageRef.value ? stageRef.value.getStage() : null
  },
  exportCanvas: () => {
    // Export only the area within the neon border (export area)
    if (!stageRef.value) return null
    
    try {
      const stage = stageRef.value.getStage()
      
      // Create a temporary canvas for export
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = exportAreaWidthPx.value
      exportCanvas.height = exportAreaHeightPx.value
      const ctx = exportCanvas.getContext('2d')
      
      // Fill with background color
      ctx.fillStyle = '#0f0f0f'
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      
      // Get the main canvas and draw only the export area
      const mainCanvas = stage.toCanvas({
        x: exportAreaOffsetX.value,
        y: exportAreaOffsetY.value,
        width: exportAreaWidthPx.value,
        height: exportAreaHeightPx.value,
        pixelRatio: 1
      })
      
      ctx.drawImage(mainCanvas, 0, 0)
      
      return exportCanvas
    } catch (error) {
      logger.error('Error exporting canvas:', error)
      return null
    }
  },
  getCanvasDataURL: (format = 'png', quality = 1) => {
    if (!stageRef.value) return null
    
    try {
      const stage = stageRef.value.getStage()
      
      // Create a temporary canvas for export
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = exportAreaWidthPx.value
      exportCanvas.height = exportAreaHeightPx.value
      const ctx = exportCanvas.getContext('2d')
      
      // Fill with background color
      ctx.fillStyle = '#0f0f0f'
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      
      // Get the main canvas and draw only the export area
      const mainCanvas = stage.toCanvas({
        x: exportAreaOffsetX.value,
        y: exportAreaOffsetY.value,
        width: exportAreaWidthPx.value,
        height: exportAreaHeightPx.value,
        pixelRatio: 1
      })
      
      ctx.drawImage(mainCanvas, 0, 0)
      
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
      return exportCanvas.toDataURL(mimeType, quality)
    } catch (error) {
      logger.error('Error getting canvas data URL:', error)
      return null
    }
  },
  getCanvasData: () => {
    // Get canvas data without cloning for performance
    return { lines: lines.value, shapes: shapes.value, images: images.value, texts: texts.value }
  },
  loadCanvas: (data) => {
    // Load canvas data from saved state
    if (data) {
      lines.value = data.lines || []
      shapes.value = data.shapes || []
      images.value = data.images || []
      texts.value = data.texts || []
      saveHistory({ lines: lines.value, shapes: shapes.value, images: images.value, texts: texts.value })
    }
  },
  zoomIn: centralizedZoomIn,
  zoomOut: centralizedZoomOut,
  resetZoom: centralizedResetZoom,
  addImage: (imageData) => {
    const imageElement = {
      ...imageData,
      id: imageData.id || generateElementId(),
      tag: imageData.tag || `Image ${images.value.length + 1}`,
      draggable: true
    }
    images.value.push(imageElement)
    saveHistory({ lines: lines.value, shapes: shapes.value, images: images.value, texts: texts.value })
  },
  addText: (textData) => {
    texts.value.push(textData)
    saveHistory({ lines: lines.value, shapes: shapes.value, images: images.value, texts: texts.value })
  },
  // 🌿 Agroecological overlay controls
  toggleCompanionCircles: () => {
    showCompanionCircles.value = !showCompanionCircles.value
  },
  toggleSunZones: () => {
    showSunZones.value = !showSunZones.value
  },
  toggleWaterZones: () => {
    showWaterZones.value = !showWaterZones.value
  },
  toggleSpacingGuides: () => {
    showSpacingGuides.value = !showSpacingGuides.value
  },
  getOverlayStates: () => ({
    companionCircles: showCompanionCircles.value,
    sunZones: showSunZones.value,
    waterZones: showWaterZones.value,
    spacingGuides: showSpacingGuides.value
  })
})

// Transform screen coordinates to canvas coordinates (accounting for zoom/pan)
const getTransformedPointerPosition = (stage) => {
  const pos = stage.getPointerPosition()
  if (!pos) return { x: 0, y: 0 }
  
  const transform = stage.getAbsoluteTransform().copy()
  transform.invert()
  return transform.point(pos)
}

// Snap point to grid (for infinite canvas)
const snapToGridPoint = (x, y) => {
  if (!props.snapToGrid) return { x, y }
  
  const snappedX = Math.round(x / gridSize) * gridSize
  const snappedY = Math.round(y / gridSize) * gridSize
  
  return { x: snappedX, y: snappedY }
}

// Improved drawing handler with better performance
const handleMouseDown = (e) => {
  const stage = e.target.getStage()
  const pos = getTransformedPointerPosition(stage)
  
  // Handle middle mouse button for panning
  if (e.evt.button === 1) {
    e.evt.preventDefault()
    isMiddleMousePanning.value = true
    const pointer = stage.getPointerPosition()
    middleMouseStartPos.value = { x: pointer.x, y: pointer.y }
    initialStagePosition.value = { ...stagePosition.value }
    return
  }
  
  // Handle right click (context menu is already prevented)
  if (e.evt.button === 2) {
    return
  }
  
  logger.log('Mouse down - Tool:', props.tool, 'Option:', props.toolOption, 'Position:', pos)
  
  // Handle move tool
  if (props.tool === 'move') {
    const clickedElement = e.target
    
    // Check if we clicked on an element (not the stage)
    if (clickedElement !== stage && clickedElement.getClassName() !== 'Stage') {
      // Find the element in our arrays
      const elementId = clickedElement.id()
      let foundElement = null
      
      // Search in all element arrays
      foundElement = shapes.value.find(s => s.id === elementId) ||
                     images.value.find(i => i.id === elementId) ||
                     texts.value.find(t => t.id === elementId)
      
      if (foundElement) {
        isMovingElement.value = true
        movingElement.value = foundElement
        moveStartPos.value = { x: pos.x, y: pos.y }
        elementStartPos.value = { x: foundElement.x, y: foundElement.y }
        return
      }
    }
    
    // If we didn't click on an element, pan the canvas
    isMiddleMousePanning.value = true
    const pointer = stage.getPointerPosition()
    middleMouseStartPos.value = { x: pointer.x, y: pointer.y }
    initialStagePosition.value = { ...stagePosition.value }
    return
  }
  
  // Handle text tool separately
  if (props.tool === 'text') {
    const text = prompt('Enter text:')
    if (text) {
      let fontSize = 24
      let fontWeight = 'normal'
      
      if (props.toolOption === 'heading') {
        fontSize = 48
        fontWeight = 'bold'
      } else if (props.toolOption === 'label') {
        fontSize = 16
      }
      
      const textElement = {
        id: generateElementId(),
        tag: `Text ${texts.value.length + 1}`,
        text: text,
        x: pos.x,
        y: pos.y,
        fontSize: fontSize,
        fontFamily: 'Inter, sans-serif',
        fontStyle: fontWeight,
        fill: props.brushColor,
        draggable: true
      }
      texts.value.push(textElement)
      saveHistory({ 
        lines: [...lines.value], 
        shapes: [...shapes.value],
        images: [...images.value],
        texts: [...texts.value]
      })
    }
    return
  }
  
  isDrawing.value = true
  
  if (props.tool === 'brush' || props.tool === 'eraser') {
    // Apply brush variant styles
    let strokeWidth = props.brushThickness / 10
    let tension = 0.5
    let lineCap = 'round'
    
    if (props.toolOption === 'marker') {
      strokeWidth = props.brushThickness / 8
      tension = 0.3
    } else if (props.toolOption === 'spray') {
      strokeWidth = props.brushThickness / 12
      tension = 0.8
    } else if (props.toolOption === 'calligraphy') {
      strokeWidth = props.brushThickness / 6
      lineCap = 'square'
    }
    
    const lineElement = {
      id: generateElementId(),
      tag: `${props.tool === 'eraser' ? 'Eraser' : 'Brush'} ${lines.value.length + 1}`,
      tool: props.tool,
      toolOption: props.toolOption,
      points: [pos.x, pos.y, pos.x, pos.y],
      stroke: props.brushColor,
      strokeWidth: strokeWidth,
      opacity: props.brushOpacity / 100,
      tension: tension,
      lineCap: lineCap,
      lineJoin: 'round',
      globalCompositeOperation: props.tool === 'eraser' ? 'destination-out' : 'source-over',
      perfectDrawEnabled: false
    }
    lines.value.push(lineElement)
  } else if (props.tool === 'square') {
    const isFilled = props.toolOption === 'filled'
    const isRounded = props.toolOption === 'rounded'
    
    creationStartPos.value = { x: pos.x, y: pos.y }
    currentRotationAngle.value = 0
    
    const shapeElement = {
      id: generateElementId(),
      tag: `Rectangle ${shapes.value.length + 1}`,
      type: 'rect',
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      stroke: props.brushColor,
      strokeWidth: 3,
      fill: isFilled ? props.brushColor : 'transparent',
      cornerRadius: isRounded ? 12 : 0,
      opacity: isFilled ? props.brushOpacity / 100 : 1,
      draggable: true,
      shadowColor: props.brushColor,
      shadowBlur: isFilled ? 0 : 8,
      shadowOpacity: 0.3
    }
    shapes.value.push(shapeElement)
  } else if (props.tool === 'circle') {
    const isFilled = props.toolOption === 'filled'
    const isEllipse = props.toolOption === 'ellipse'
    
    creationStartPos.value = { x: pos.x, y: pos.y }
    currentRotationAngle.value = 0
    
    const shapeElement = {
      id: generateElementId(),
      tag: `${isEllipse ? 'Ellipse' : 'Circle'} ${shapes.value.length + 1}`,
      type: isEllipse ? 'ellipse' : 'circle',
      x: pos.x,
      y: pos.y,
      radius: 0,
      radiusX: 0,
      radiusY: 0,
      rotation: 0,
      stroke: props.brushColor,
      strokeWidth: 3,
      fill: isFilled ? props.brushColor : 'transparent',
      opacity: isFilled ? props.brushOpacity / 100 : 1,
      draggable: true,
      shadowColor: props.brushColor,
      shadowBlur: isFilled ? 0 : 8,
      shadowOpacity: 0.3
    }
    shapes.value.push(shapeElement)
  } else if (props.tool === 'triangle') {
    const isFilled = props.toolOption === 'filled'
    const isRight = props.toolOption === 'right'
    
    creationStartPos.value = { x: pos.x, y: pos.y }
    currentRotationAngle.value = isRight ? 0 : 180
    
    const shapeElement = {
      id: generateElementId(),
      tag: `Triangle ${shapes.value.length + 1}`,
      type: isRight ? 'right-triangle' : 'triangle',
      x: pos.x,
      y: pos.y,
      sides: 3,
      radius: 0,
      stroke: props.brushColor,
      strokeWidth: 3,
      fill: isFilled ? props.brushColor : 'transparent',
      rotation: isRight ? 0 : 180,
      opacity: isFilled ? props.brushOpacity / 100 : 1,
      draggable: true,
      shadowColor: props.brushColor,
      shadowBlur: isFilled ? 0 : 8,
      shadowOpacity: 0.3
    }
    shapes.value.push(shapeElement)
  }
}

// Handle element click for tagging and selection
const handleElementClick = (element, event, konvaNode) => {
  try {
    // Store Konva node reference
    if (konvaNode) {
      konvaNodesMap.value.set(element.id, konvaNode)
    }
    
    if (event.evt.button === 2) { // Right click
      event.evt.preventDefault()
      selectedElement.value = element
      currentTag.value = element.tag || ''
      const stage = event.target.getStage()
      const pos = stage.getPointerPosition()
      tagDialogPosition.value = { x: pos.x, y: pos.y }
      showTagDialog.value = true
    } else if (event.evt.button === 0) { // Left click
      // Handle selection with layer system
      const multiSelect = event.evt.ctrlKey || event.evt.metaKey
      selectLayer(element.id, multiSelect)
    }
  } catch (error) {
    logger.error('Error in handleElementClick:', error)
  }
}

// Handle double-click for inline editing
const handleElementDoubleClick = (element, event) => {
  try {
    event.evt.preventDefault()
    editingElement.value = element
    currentTag.value = element.tag || ''
    const stage = event.target.getStage()
    const pos = stage.getPointerPosition()
    tagDialogPosition.value = { x: pos.x, y: pos.y }
    isEditingLabel.value = true
    showTagDialog.value = true
    
    // Focus input after dialog appears
    nextTick(() => {
      const input = document.querySelector('.tag-input')
      if (input) {
        input.focus()
        input.select()
      }
    })
  } catch (error) {
    logger.error('Error in handleElementDoubleClick:', error)
  }
}

// Update element tag
const updateTag = () => {
  const targetElement = editingElement.value || selectedElement.value
  if (targetElement && currentTag.value.trim()) {
    targetElement.tag = currentTag.value.trim()
    saveHistory({ 
      lines: [...lines.value], 
      shapes: [...shapes.value],
      images: [...images.value],
      texts: [...texts.value]
    })
  }
  showTagDialog.value = false
  selectedElement.value = null
  editingElement.value = null
  isEditingLabel.value = false
  currentTag.value = ''
}

// Close tag dialog
const closeTagDialog = () => {
  showTagDialog.value = false
  selectedElement.value = null
  editingElement.value = null
  isEditingLabel.value = false
  currentTag.value = ''
}

const handleMouseMove = (e) => {
  const stage = e.target.getStage()
  
  // Handle element moving with move tool
  if (isMovingElement.value && movingElement.value) {
    e.evt.preventDefault()
    const pos = getTransformedPointerPosition(stage)
    const deltaX = pos.x - moveStartPos.value.x
    const deltaY = pos.y - moveStartPos.value.y
    
    movingElement.value.x = elementStartPos.value.x + deltaX
    movingElement.value.y = elementStartPos.value.y + deltaY
    return
  }
  
  // Handle middle mouse panning
  if (isMiddleMousePanning.value) {
    e.evt.preventDefault()
    const pointer = stage.getPointerPosition()
    if (pointer) {
      const deltaX = pointer.x - middleMouseStartPos.value.x
      const deltaY = pointer.y - middleMouseStartPos.value.y
      
      stagePosition.value = {
        x: initialStagePosition.value.x + deltaX,
        y: initialStagePosition.value.y + deltaY
      }
    }
    return
  }
  
  if (!isDrawing.value) return
  
  // Prevent scrolling on touch devices
  if (e.evt) e.evt.preventDefault()
  
  const point = getTransformedPointerPosition(stage)
  
  if (props.tool === 'brush' || props.tool === 'eraser') {
    const lastLine = lines.value[lines.value.length - 1]
    if (lastLine) {
      // Performance optimization: limit points for smoother rendering
      const lastPoints = lastLine.points
      const lastX = lastPoints[lastPoints.length - 2]
      const lastY = lastPoints[lastPoints.length - 1]
      
      // Only add point if it's far enough from the last point (reduces redundant points)
      const distance = Math.sqrt(Math.pow(point.x - lastX, 2) + Math.pow(point.y - lastY, 2))
      if (distance > 2) {
        lastLine.points = lastLine.points.concat([point.x, point.y])
      }
    }
  } else if (shapes.value.length > 0) {
    const lastShape = shapes.value[shapes.value.length - 1]
    const startX = creationStartPos.value.x
    const startY = creationStartPos.value.y
    
    // Calculate distance from start point for size
    const dx = point.x - startX
    const dy = point.y - startY
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Calculate angle from start point for rotation (in degrees)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    
    if (lastShape.type === 'rect') {
      // For rectangles, use distance for both width and height (square-like growth)
      const size = distance
      lastShape.width = size
      lastShape.height = size
      // Set offset to center the rotation
      lastShape.offsetX = size / 2
      lastShape.offsetY = size / 2
      // Update position to keep center at start point
      lastShape.x = startX
      lastShape.y = startY
      // Apply rotation
      lastShape.rotation = angle
    } else if (lastShape.type === 'circle') {
      lastShape.radius = distance
      // Apply rotation (visual feedback even though circles are symmetric)
      lastShape.rotation = angle
    } else if (lastShape.type === 'ellipse') {
      // For ellipse, use distance as radius and angle for rotation
      lastShape.radiusX = distance
      lastShape.radiusY = distance * 0.6 // Make it elliptical
      lastShape.rotation = angle
    } else if (lastShape.type === 'triangle' || lastShape.type === 'right-triangle') {
      lastShape.radius = distance
      // For triangles, add the angle to the initial rotation
      const baseRotation = lastShape.type === 'right-triangle' ? 0 : 180
      lastShape.rotation = baseRotation + angle
    }
    
    // Store current rotation angle for visual feedback
    currentRotationAngle.value = angle
  }
}

const handleMouseUp = (e) => {
  // Stop element moving
  if (isMovingElement.value) {
    isMovingElement.value = false
    movingElement.value = null
    saveHistory({ 
      lines: [...lines.value], 
      shapes: [...shapes.value],
      images: [...images.value],
      texts: [...texts.value]
    })
    return
  }
  
  // Stop middle mouse panning
  if (e && e.evt && e.evt.button === 1) {
    isMiddleMousePanning.value = false
    return
  }
  
  // Stop middle mouse panning on any mouse up if it was active
  if (isMiddleMousePanning.value) {
    isMiddleMousePanning.value = false
  }
  
  if (isDrawing.value) {
    isDrawing.value = false
    saveHistory({ 
      lines: [...lines.value], 
      shapes: [...shapes.value],
      images: [...images.value],
      texts: [...texts.value]
    })
  }
}

// Touch event support with two-finger gesture detection - improved
const handleTouchStart = (e) => {
  const touches = e.evt.touches
  
  if (touches.length === 2) {
    // Two-finger gesture detected - enable panning
    e.evt.preventDefault()
    isTwoFingerGesture.value = true
    isPanning.value = true
    
    // Stop any ongoing drawing
    if (isDrawing.value) {
      handleMouseUp()
    }
    
    touchStartPositions.value = [
      { x: touches[0].clientX, y: touches[0].clientY },
      { x: touches[1].clientX, y: touches[1].clientY }
    ]
    
    // Calculate initial center point
    const centerX = (touches[0].clientX + touches[1].clientX) / 2
    const centerY = (touches[0].clientY + touches[1].clientY) / 2
    lastPanPosition.value = { x: centerX, y: centerY }
    initialStagePosition.value = { ...stagePosition.value }
    lastPanTime.value = Date.now()
    panVelocity.value = { x: 0, y: 0 }
    
    // Calculate initial distance for pinch zoom
    const dx = touches[1].clientX - touches[0].clientX
    const dy = touches[1].clientY - touches[0].clientY
    touchStartDistance.value = Math.sqrt(dx * dx + dy * dy)
  } else if (touches.length === 1) {
    // Single touch - normal drawing
    isTwoFingerGesture.value = false
    isPanning.value = false
    handleMouseDown(e)
  }
}

const handleTouchMove = (e) => {
  const touches = e.evt.touches
  
  if (touches.length === 2 && isTwoFingerGesture.value) {
    // Two-finger pan and zoom gesture
    e.evt.preventDefault()
    
    const now = Date.now()
    const timeDelta = now - lastPanTime.value
    
    const centerX = (touches[0].clientX + touches[1].clientX) / 2
    const centerY = (touches[0].clientY + touches[1].clientY) / 2
    
    const deltaX = centerX - lastPanPosition.value.x
    const deltaY = centerY - lastPanPosition.value.y
    
    // Calculate velocity for smoother panning
    if (timeDelta > 0) {
      panVelocity.value = {
        x: deltaX / timeDelta,
        y: deltaY / timeDelta
      }
    }
    
    // Calculate current distance for pinch zoom
    const dx = touches[1].clientX - touches[0].clientX
    const dy = touches[1].clientY - touches[0].clientY
    const currentDistance = Math.sqrt(dx * dx + dy * dy)
    
    // Detect if this is primarily a zoom or pan gesture
    const distanceChange = Math.abs(currentDistance - touchStartDistance.value)
    const panDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const isZoomGesture = distanceChange > panDistance * 0.5
    
    // Apply pinch zoom if significant distance change
    if (isZoomGesture && touchStartDistance.value > 0 && currentDistance > 0) {
      const scaleDelta = currentDistance / touchStartDistance.value
      const oldScale = stageScale.value
      
      // Smooth zoom with damping
      const smoothScaleDelta = 1 + (scaleDelta - 1) * 0.5
      const newScale = Math.max(0.1, Math.min(10, oldScale * smoothScaleDelta))
      
      // Zoom towards the center point of the two fingers
      const mousePointTo = {
        x: (centerX - stagePosition.value.x) / oldScale,
        y: (centerY - stagePosition.value.y) / oldScale
      }
      
      stageScale.value = newScale
      
      // Adjust position to zoom towards touch center
      stagePosition.value = {
        x: centerX - mousePointTo.x * newScale,
        y: centerY - mousePointTo.y * newScale
      }
      
      touchStartDistance.value = currentDistance
    } else {
      // Apply smooth panning with acceleration
      const acceleration = 1.2 // Slightly faster panning
      stagePosition.value = {
        x: stagePosition.value.x + deltaX * acceleration,
        y: stagePosition.value.y + deltaY * acceleration
      }
    }
    
    lastPanPosition.value = { x: centerX, y: centerY }
    lastPanTime.value = now
  } else if (touches.length === 1 && !isTwoFingerGesture.value) {
    // Single touch - normal drawing
    handleMouseMove(e)
  }
}

const handleTouchEnd = (e) => {
  const touches = e.evt.touches
  
  if (touches.length < 2) {
    isTwoFingerGesture.value = false
    isPanning.value = false
    touchStartDistance.value = 0
  }
  
  if (touches.length === 0) {
    handleMouseUp()
  }
}

// Zoom with mouse wheel - using centralized zoom management
const handleWheel = (e) => {
  try {
    e.evt.preventDefault()
    e.evt.stopPropagation()
    
    const stage = e.target.getStage()
    if (!stage) {
      logger.warn('Stage not available for wheel event')
      return
    }
    
    const pointer = stage.getPointerPosition()
    if (!pointer) {
      logger.warn('Pointer position not available for wheel event')
      return
    }
    
    // Detect trackpad vs mouse wheel
    const isTrackpad = Math.abs(e.evt.deltaY) < 50
    
    // Check if this is a pinch-to-zoom gesture (Ctrl/Cmd + wheel)
    if (e.evt.ctrlKey || e.evt.metaKey) {
      // Pinch-to-zoom on trackpad
      const direction = e.evt.deltaY > 0 ? -1 : 1
      zoomToPoint(pointer, direction)
    } else if (isTrackpad && !e.evt.shiftKey) {
      // Two-finger pan on trackpad (natural scrolling)
      const deltaX = e.evt.deltaX
      const deltaY = e.evt.deltaY
      
      // Apply smooth panning with natural scrolling direction
      stagePosition.value = {
        x: stagePosition.value.x - deltaX * 1.2,
        y: stagePosition.value.y - deltaY * 1.2
      }
    } else {
      // Regular mouse wheel zoom
      const direction = e.evt.deltaY > 0 ? -1 : 1
      zoomToPoint(pointer, direction)
    }
  } catch (error) {
    logger.error('Error in handleWheel:', error)
  }
}

const throttledHandleWheel = throttle(handleWheel, 16) // Smoother at ~60fps


// Watch for canvas size changes and update grid
watch(() => props.canvasSize, (newSize) => {
  logger.log('Export area size updated:', newSize)
  // Grid will auto-update via computed properties
}, { deep: true })

// Sync layers whenever elements change
watch([lines, shapes, images, texts], () => {
  syncLayersFromElements(lines.value, shapes.value, images.value, texts.value)
}, { deep: true })

// Get selected Konva nodes for transformer
const selectedKonvaNodes = computed(() => {
  const nodes = []
  selectedElements.value.forEach(element => {
    const node = konvaNodesMap.value.get(element.id)
    if (node) {
      nodes.push(node)
    }
  })
  return nodes
})

// Grid auto-updates via computed properties - no watch needed

// Initialize and handle window resize
let resizeHandler = null

onMounted(() => {
  resizeHandler = () => {
    updateStageConfig(
      window.innerWidth - 280,
      window.innerHeight - 80
    )
  }
  
  window.addEventListener('resize', resizeHandler)
  window.addEventListener('keydown', handleKeyDown)
  
  // Prevent context menu on canvas
  const canvas = document.querySelector('.canvas-container')
  if (canvas) {
    contextMenuHandler = (e) => e.preventDefault()
    canvas.addEventListener('contextmenu', contextMenuHandler)
  }
  
  // Initial setup
  nextTick(() => {
    logger.log('Infinite Canvas initialized:', {
      stage: stageConfig.value,
      exportArea: { width: exportAreaWidthPx.value, height: exportAreaHeightPx.value },
      grid: { 
        size: gridSize, 
        type: 'infinite',
        cells: { 
          horizontal: Math.ceil(exportAreaWidthPx.value / gridSize),
          vertical: Math.ceil(exportAreaHeightPx.value / gridSize)
        }
      }
    })
  })
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  window.removeEventListener('keydown', handleKeyDown)
  
  // Clean up context menu handler
  const canvas = document.querySelector('.canvas-container')
  if (canvas && contextMenuHandler) {
    canvas.removeEventListener('contextmenu', contextMenuHandler)
  }
})
</script>

<template>
  <div class="canvas-container" :class="{ 
    panning: isMiddleMousePanning || isTwoFingerGesture || isMovingElement,
    'move-tool': tool === 'move'
  }">
    <v-stage
    ref="stageRef"
    :config="{
      width: stageConfig.width,
      height: stageConfig.height,
      scaleX: stageScale,
      scaleY: stageScale,
      x: stagePosition.x,
      y: stagePosition.y,
      draggable: false
    }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @wheel="throttledHandleWheel"
    >
      <!-- Background & Overlays Layer (Combined) -->
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
        
        <!-- Export area background (slightly lighter) -->
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
        
        <!-- 🌞 Sun Zones (optional overlay) -->
        <template v-if="showSunZones && showGrid">
          <v-rect
            v-for="(zone, i) in sunZones"
            :key="`sun-zone-${i}`"
            :config="zone"
          />
          <!-- Sun zone labels -->
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
        
        <!-- 💧 Water Zones (optional overlay) -->
        <template v-if="showWaterZones && showGrid">
          <v-rect
            v-for="(zone, i) in waterZones"
            :key="`water-zone-${i}`"
            :config="zone"
          />
          <!-- Water zone labels -->
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
      
      <!-- Static Grid Layer - Never re-renders during zoom -->
      <StaticGridLayer :show-grid="showGrid" />
      
      <!-- Grid Overlays & UI Layer (Combined) -->
      <v-layer v-if="showGrid" :config="{ listening: false }">
        <!-- 🌿 Companion planting circles -->
        <v-circle
          v-for="(circle, i) in companionCircles"
          :key="`companion-circle-${i}`"
          :config="circle"
        />
                
        <!-- 🌱 Compact info panel (only shows when zoomed out) -->
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
        
        <!-- 📏 Simplified Rulers (only at zoom > 0.8) -->
        <template v-if="stageScale > 0.8">
          <!-- Top ruler markings (every 5 meters only) -->
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
        
        <!-- Left ruler markings (every 5 meters only) -->
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
        
        <!-- Export Area Border (clean neon effect) -->
        <v-rect
          :config="{
            x: exportAreaOffsetX,
            y: exportAreaOffsetY,
            width: exportAreaWidthPx,
            height: exportAreaHeightPx,
            stroke: props.brushColor,
            strokeWidth: 3,
            dash: [20, 10],
            shadowColor: props.brushColor,
            shadowBlur: 25,
            shadowOpacity: 0.8,
            shadowForStrokeEnabled: true,
            listening: false
          }"
        />
      </v-layer>
      
      <!-- Drawing Layer -->
      <v-layer>
        <!-- Draw all lines -->
        <v-line
          v-for="(line, i) in lines"
          :key="`line-${line.id || i}`"
          :config="line"
        />
        
        <!-- Draw all rectangles with labels grouped together -->
        <template v-for="shape in shapes.filter(s => s.type === 'rect')" :key="`rect-group-${shape.id}`">
          <!-- Layer border for selected elements -->
          <v-rect
            v-if="isLayerSelected(shape.id)"
            :key="`rect-border-${shape.id}`"
            :config="{
              x: shape.x - 5,
              y: shape.y - 5,
              width: shape.width + 10,
              height: shape.height + 10,
              stroke: props.brushColor,
              strokeWidth: 2,
              dash: [8, 4],
              listening: false,
              opacity: 0.6
            }"
          />
          <v-rect
            :ref="(el) => { if (el) konvaNodesMap.set(shape.id, el.getNode()) }"
            :config="{
              ...shape,
              id: shape.id,
              shadowForStrokeEnabled: true,
              shadowColor: shape.shadowColor || shape.stroke,
              shadowBlur: shape.shadowBlur || 0,
              shadowOpacity: shape.shadowOpacity || 0
            }"
            @click="(e) => handleElementClick(shape, e, e.target)"
            @tap="(e) => handleElementClick(shape, e, e.target)"
            @dblclick="handleElementDoubleClick(shape, $event)"
            @dbltap="handleElementDoubleClick(shape, $event)"
          />
          <!-- Label components for rectangles -->
          <template v-if="showLabels && shape.tag">
            <v-rect
              :key="`rect-label-bg-${shape.id}`"
              :config="{
                x: shape.x + shape.width / 2 - (shape.tag.length * 4 + 8),
                y: shape.y - 32,
                width: shape.tag.length * 8 + 16,
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
              :key="`rect-label-text-${shape.id}`"
              :config="{
                x: shape.x + shape.width / 2 - (shape.tag.length * 4) + 8,
                y: shape.y - 27,
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
              :key="`rect-label-line-${shape.id}`"
              :config="{
                points: [
                  shape.x + shape.width / 2,
                  shape.y - 20,
                  shape.x + shape.width / 2,
                  shape.y
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
        
        <!-- Draw all circles with labels grouped together -->
        <template v-for="shape in shapes.filter(s => s.type === 'circle')" :key="`circle-group-${shape.id}`">
          <!-- Layer border for selected elements -->
          <v-circle
            v-if="isLayerSelected(shape.id)"
            :key="`circle-border-${shape.id}`"
            :config="{
              x: shape.x,
              y: shape.y,
              radius: shape.radius + 5,
              stroke: props.brushColor,
              strokeWidth: 2,
              dash: [8, 4],
              listening: false,
              opacity: 0.6
            }"
          />
          <v-circle
            :ref="(el) => { if (el) konvaNodesMap.set(shape.id, el.getNode()) }"
            :config="{
              ...shape,
              id: shape.id,
              shadowForStrokeEnabled: true,
              shadowColor: shape.shadowColor || shape.stroke,
              shadowBlur: shape.shadowBlur || 0,
              shadowOpacity: shape.shadowOpacity || 0
            }"
            @click="(e) => handleElementClick(shape, e, e.target)"
            @tap="(e) => handleElementClick(shape, e, e.target)"
            @dblclick="handleElementDoubleClick(shape, $event)"
            @dbltap="handleElementDoubleClick(shape, $event)"
          />
          <!-- Label components for circles -->
          <template v-if="showLabels && shape.tag">
            <v-rect
              :key="`circle-label-bg-${shape.id}`"
              :config="{
                x: shape.x - (shape.tag.length * 4 + 8),
                y: shape.y - shape.radius - 32,
                width: shape.tag.length * 8 + 16,
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
              :key="`circle-label-text-${shape.id}`"
              :config="{
                x: (shape.x - (shape.tag.length * 4 + 8)) + 8,
                y: (shape.y - shape.radius - 32) + 5,
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
              :key="`circle-label-line-${shape.id}`"
              :config="{
                points: [
                  shape.x,
                  (shape.y - shape.radius - 32) + 12,
                  shape.x,
                  shape.y
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
        
        <!-- Draw all ellipses with labels grouped together -->
        <template v-for="shape in shapes.filter(s => s.type === 'ellipse')" :key="`ellipse-group-${shape.id}`">
          <!-- Layer border for selected elements -->
          <v-ellipse
            v-if="isLayerSelected(shape.id)"
            :key="`ellipse-border-${shape.id}`"
            :config="{
              x: shape.x,
              y: shape.y,
              radiusX: shape.radiusX + 5,
              radiusY: shape.radiusY + 5,
              stroke: props.brushColor,
              strokeWidth: 2,
              dash: [8, 4],
              listening: false,
              opacity: 0.6
            }"
          />
          <v-ellipse
            :ref="(el) => { if (el) konvaNodesMap.set(shape.id, el.getNode()) }"
            :config="{
              ...shape,
              id: shape.id,
              shadowForStrokeEnabled: true,
              shadowColor: shape.shadowColor || shape.stroke,
              shadowBlur: shape.shadowBlur || 0,
              shadowOpacity: shape.shadowOpacity || 0
            }"
            @click="(e) => handleElementClick(shape, e, e.target)"
            @tap="(e) => handleElementClick(shape, e, e.target)"
            @dblclick="handleElementDoubleClick(shape, $event)"
            @dbltap="handleElementDoubleClick(shape, $event)"
          />
          <!-- Label components for ellipses -->
          <template v-if="showLabels && shape.tag">
            <v-rect
              :key="`ellipse-label-bg-${shape.id}`"
              :config="{
                x: shape.x - (shape.tag.length * 4 + 8),
                y: shape.y - shape.radiusY - 28,
                width: shape.tag.length * 8 + 16,
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
              :key="`ellipse-label-text-${shape.id}`"
              :config="{
                x: (shape.x - (shape.tag.length * 4 + 8)) + 8,
                y: (shape.y - shape.radiusY - 28) + 5,
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
              :key="`ellipse-label-line-${shape.id}`"
              :config="{
                points: [
                  shape.x,
                  (shape.y - shape.radiusY - 28) + 12,
                  shape.x,
                  shape.y
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
        
        <!-- Draw all triangles with labels grouped together -->
        <template v-for="shape in shapes.filter(s => s.type === 'triangle' || s.type === 'right-triangle')" :key="`triangle-group-${shape.id}`">
          <!-- Layer border for selected elements -->
          <v-circle
            v-if="isLayerSelected(shape.id)"
            :key="`triangle-border-${shape.id}`"
            :config="{
              x: shape.x,
              y: shape.y,
              radius: shape.radius + 5,
              stroke: props.brushColor,
              strokeWidth: 2,
              dash: [8, 4],
              listening: false,
              opacity: 0.6
            }"
          />
          <v-regular-polygon
            :ref="(el) => { if (el) konvaNodesMap.set(shape.id, el.getNode()) }"
            :config="{
              ...shape,
              id: shape.id,
              shadowForStrokeEnabled: true,
              shadowColor: shape.shadowColor || shape.stroke,
              shadowBlur: shape.shadowBlur || 0,
              shadowOpacity: shape.shadowOpacity || 0
            }"
            @click="(e) => handleElementClick(shape, e, e.target)"
            @tap="(e) => handleElementClick(shape, e, e.target)"
            @dblclick="handleElementDoubleClick(shape, $event)"
            @dbltap="handleElementDoubleClick(shape, $event)"
          />
          <!-- Label components for triangles -->
          <template v-if="showLabels && shape.tag">
            <v-rect
              :key="`triangle-label-bg-${shape.id}`"
              :config="{
                x: shape.x - (shape.tag.length * 4 + 8),
                y: shape.y - shape.radius - 32,
                width: shape.tag.length * 8 + 16,
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
              :key="`triangle-label-text-${shape.id}`"
              :config="{
                x: (shape.x - (shape.tag.length * 4 + 8)) + 8,
                y: (shape.y - shape.radius - 32) + 5,
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
              :key="`triangle-label-line-${shape.id}`"
              :config="{
                points: [
                  shape.x,
                  (shape.y - shape.radius - 32) + 12,
                  shape.x,
                  shape.y
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
        
        <!-- Draw all images -->
        <template v-for="(img, i) in images" :key="`image-group-${img.id || i}`">
          <!-- Layer border for selected elements -->
          <v-rect
            v-if="isLayerSelected(img.id)"
            :key="`image-border-${img.id || i}`"
            :config="{
              x: img.x - 5,
              y: img.y - 5,
              width: (img.width || 100) + 10,
              height: (img.height || 100) + 10,
              stroke: props.brushColor,
              strokeWidth: 2,
              dash: [8, 4],
              listening: false,
              opacity: 0.6
            }"
          />
          <v-image
            :ref="(el) => { if (el) konvaNodesMap.set(img.id, el.getNode()) }"
            :config="{
              ...img,
              id: img.id
            }"
            @click="(e) => handleElementClick(img, e, e.target)"
            @tap="(e) => handleElementClick(img, e, e.target)"
            @dblclick="handleElementDoubleClick(img, $event)"
            @dbltap="handleElementDoubleClick(img, $event)"
          />
          <!-- Label components for images -->
          <template v-if="showLabels && img.tag">
            <v-rect
              :key="`image-label-bg-${img.id || i}`"
              :config="{
                x: img.x - 4,
                y: img.y - 32,
                width: img.tag.length * 8 + 16,
                height: 24,
                fill: 'rgba(0, 0, 0, 0.9)',
                cornerRadius: 6,
                shadowColor: props.brushColor,
                shadowBlur: 15,
                shadowOpacity: 0.9,
                listening: false,
                stroke: props.brushColor,
                strokeWidth: 1,
                opacity: 0.95
              }"
            />
            <v-text
              :key="`image-label-text-${img.id || i}`"
              :config="{
                x: img.x + 4,
                y: img.y - 27,
                text: img.tag,
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                fill: props.brushColor,
                fontStyle: 'bold',
                listening: false,
                shadowColor: props.brushColor,
                shadowBlur: 10,
                shadowOpacity: 1
              }"
            />
            <v-line
              :key="`image-label-line-${img.id || i}`"
              :config="{
                points: [
                  img.x + (img.tag.length * 4 + 4),
                  img.y - 20,
                  img.x + (img.width || 50) / 2,
                  img.y + (img.height || 50) / 2
                ],
                stroke: props.brushColor,
                strokeWidth: 1.5,
                dash: [4, 4],
                opacity: 0.4,
                listening: false
              }"
            />
          </template>
        </template>
        
        <!-- Draw all texts -->
        <template v-for="(text, i) in texts" :key="`text-group-${text.id || i}`">
          <!-- Layer border for selected elements -->
          <v-rect
            v-if="isLayerSelected(text.id)"
            :key="`text-border-${text.id || i}`"
            :config="{
              x: text.x - 5,
              y: text.y - 5,
              width: (text.text?.length || 5) * (text.fontSize || 24) * 0.6 + 10,
              height: (text.fontSize || 24) + 10,
              stroke: props.brushColor,
              strokeWidth: 2,
              dash: [8, 4],
              listening: false,
              opacity: 0.6
            }"
          />
          <v-text
            :ref="(el) => { if (el) konvaNodesMap.set(text.id, el.getNode()) }"
            :config="{
              ...text,
              id: text.id
            }"
            @click="(e) => handleElementClick(text, e, e.target)"
            @tap="(e) => handleElementClick(text, e, e.target)"
            @dblclick="handleElementDoubleClick(text, $event)"
            @dbltap="handleElementDoubleClick(text, $event)"
          />
          <!-- Label components for texts -->
          <template v-if="showLabels && text.tag">
            <v-rect
              :key="`text-label-bg-${text.id || i}`"
              :config="{
                x: text.x - 4,
                y: text.y - 32,
                width: text.tag.length * 8 + 16,
                height: 24,
                fill: 'rgba(0, 0, 0, 0.9)',
                cornerRadius: 6,
                shadowColor: text.fill,
                shadowBlur: 15,
                shadowOpacity: 0.9,
                listening: false,
                stroke: text.fill,
                strokeWidth: 1,
                opacity: 0.95
              }"
            />
            <v-text
              :key="`text-label-text-${text.id || i}`"
              :config="{
                x: text.x + 4,
                y: text.y - 27,
                text: text.tag,
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                fill: text.fill,
                fontStyle: 'bold',
                listening: false,
                shadowColor: text.fill,
                shadowBlur: 10,
                shadowOpacity: 1
              }"
            />
            <v-line
              :key="`text-label-line-${text.id || i}`"
              :config="{
                points: [
                  text.x + (text.tag.length * 4 + 4),
                  text.y - 20,
                  text.x,
                  text.y
                ],
                stroke: text.fill,
                strokeWidth: 1.5,
                dash: [4, 4],
                opacity: 0.4,
                listening: false
              }"
            />
          </template>
        </template>
        
        <!-- Layer Transformer for selected elements -->
        <LayerTransformer
          ref="transformerRef"
          :selected-nodes="selectedKonvaNodes"
          :stage-ref="stageRef"
        />
      </v-layer>
    </v-stage>
    
    <!-- Zoom indicator -->
    <div v-if="stageScale !== 1" class="zoom-indicator">
      {{ Math.round(stageScale * 100) }}%
    </div>
    

    <!-- Two-finger gesture indicator -->
    <div v-if="isTwoFingerGesture || isMiddleMousePanning" class="gesture-indicator">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"/>
      </svg>
      <span>{{ isMiddleMousePanning ? 'Pan Mode (Middle Mouse)' : 'Pan Mode (Trackpad)' }}</span>
    </div>
    
    <!-- Rotation indicator during shape creation -->
    <div v-if="isDrawing && (tool === 'square' || tool === 'circle' || tool === 'triangle')" class="rotation-indicator">
      <svg viewBox="0 0 24 24" fill="currentColor" class="rotate-icon">
        <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
      </svg>
      <div class="rotation-info">
        <span class="rotation-label">Rotation</span>
        <span class="rotation-value">{{ Math.round(currentRotationAngle) }}°</span>
      </div>
    </div>
    
    <!-- Tag Dialog -->
    <div v-if="showTagDialog" class="tag-dialog" :style="{ left: `${tagDialogPosition.x}px`, top: `${tagDialogPosition.y}px` }">
      <div class="tag-dialog-header">
        <h3>Rename Element</h3>
        <button @click="closeTagDialog" class="close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <input 
        v-model="currentTag" 
        type="text" 
        class="tag-input"
        placeholder="Enter element name..."
        @keyup.enter="updateTag"
        @keyup.esc="closeTagDialog"
        autofocus
      />
      <div class="tag-dialog-actions">
        <button @click="closeTagDialog" class="cancel-btn">Cancel</button>
        <button @click="updateTag" class="save-btn">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  flex: 1;
  background: #0a0a0a;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.canvas-container.panning {
  cursor: grabbing !important;
}

.canvas-container.move-tool {
  cursor: grab;
}

.canvas-container.move-tool.panning {
  cursor: grabbing !important;
}

.zoom-indicator {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag-dialog {
  position: fixed;
  background: linear-gradient(145deg, rgba(20, 20, 20, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 0 40px rgba(var(--primary-rgb), 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(var(--primary-rgb), 0.5);
  min-width: 360px;
  animation: dialogSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: translate(-50%, -100%);
  margin-top: -20px;
}

@keyframes dialogSlideIn {
  0% {
    opacity: 0;
    transform: translate(-50%, -100%) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -100%) scale(1);
  }
}

.tag-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tag-dialog-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
  text-shadow: 0 0 10px rgba(var(--primary-rgb), 0.6);
  letter-spacing: 0.5px;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.tag-input {
  width: 100%;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s ease;
  outline: none;
  margin-bottom: 16px;
}

.tag-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.tag-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color);
  box-shadow: 
    0 0 0 3px rgba(var(--primary-rgb), 0.2),
    0 0 20px rgba(var(--primary-rgb), 0.3),
    inset 0 0 10px rgba(var(--primary-rgb), 0.1);
}

.tag-dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: 'Inter', sans-serif;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.save-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  color: white;
  box-shadow: 
    0 4px 12px rgba(var(--primary-rgb), 0.4),
    0 0 20px rgba(var(--primary-rgb), 0.3);
  border: 1px solid rgba(var(--primary-rgb), 0.6);
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 20px rgba(var(--primary-rgb), 0.5),
    0 0 30px rgba(var(--primary-rgb), 0.4);
}

.save-btn:active {
  transform: translateY(0);
}

.gesture-indicator {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-color);
  border: 2px solid rgba(var(--primary-rgb), 0.5);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 30px rgba(var(--primary-rgb), 0.4);
  pointer-events: none;
  animation: pulseGlow 2s ease-in-out infinite;
  display: flex;
  align-items: center;
  gap: 10px;
}

.gesture-indicator svg {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
  filter: drop-shadow(0 0 8px currentColor);
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 30px rgba(var(--primary-rgb), 0.4);
  }
  50% {
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 40px rgba(var(--primary-rgb), 0.6),
      0 0 60px rgba(var(--primary-rgb), 0.3);
  }
}

.rotation-indicator {
  position: absolute;
  bottom: 80px;
  right: 20px;
  background: linear-gradient(145deg, rgba(20, 20, 20, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%);
  backdrop-filter: blur(30px) saturate(180%);
  padding: 16px 20px;
  border-radius: 14px;
  border: 2px solid rgba(var(--primary-rgb), 0.5);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(var(--primary-rgb), 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  pointer-events: none;
  animation: rotationSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 180px;
}

@keyframes rotationSlideIn {
  0% {
    opacity: 0;
    transform: translateX(30px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.rotation-indicator .rotate-icon {
  width: 28px;
  height: 28px;
  color: var(--primary-color);
  filter: drop-shadow(0 0 10px rgba(var(--primary-rgb), 0.8));
  animation: continuousRotate 3s linear infinite;
}

@keyframes continuousRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.rotation-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.rotation-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.rotation-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--primary-color);
  text-shadow: 0 0 15px rgba(var(--primary-rgb), 0.8);
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
}

/* 🌿 Compact Grid Legend */
.grid-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 14px 16px;
  border: 1.5px solid rgba(101, 255, 134, 0.25);
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(101, 255, 134, 0.15);
  min-width: 180px;
  animation: legendSlideIn 0.3s ease-out;
  pointer-events: none;
}

@keyframes legendSlideIn {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.legend-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(101, 255, 134, 0.15);
}

.legend-icon {
  font-size: 16px;
}

.legend-title {
  font-size: 13px;
  font-weight: 700;
  color: #65FF86;
  letter-spacing: 0.3px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Inter', sans-serif;
}

.legend-line {
  width: 30px;
  height: 2px;
  border-radius: 2px;
}

.legend-line.standard {
  background: rgba(255, 255, 255, 0.4);
  height: 1.5px;
}

.legend-line.bed {
  background: rgba(101, 255, 134, 0.6);
  height: 2px;
  box-shadow: 0 0 6px rgba(101, 255, 134, 0.3);
}

.legend-line.zone {
  background: rgba(255, 215, 0, 0.7);
  height: 2.5px;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}
</style>
