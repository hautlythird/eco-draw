vue
<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useHistory } from '@/composables/useHistory'
import { useZoom } from '@/composables/useZoom'
import { useLayers } from '@/composables/useLayers'
import { useBotanicalData } from '@/composables/useBotanicalData'
import { useCanvasElements } from '@/composables/useCanvasElements'
import { useCanvasInteraction } from '@/composables/useCanvasInteraction'
import { CANVAS_CONFIG, GRID_SCALES } from '@/constants/tools'
import { logger } from '@/utils/logger'
import StaticGridLayer from './StaticGridLayer.vue'
import LayerTransformer from './LayerTransformer.vue'
import CanvasBackground from './Canvas/CanvasBackground.vue'
import CanvasGridOverlay from './Canvas/CanvasGridOverlay.vue'
import CompanionOverlay from './Canvas/CompanionOverlay.vue'
import ShapeElement from './Canvas/ShapeElement.vue'
import ImageElement from './Canvas/ImageElement.vue'
import PlantElement from './Canvas/PlantElement.vue'
import CanvasUI from './Canvas/CanvasUI.vue'


// Throttle function for performance
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

// Use canvas elements composable
const {
  lines,
  shapes,
  images,
  texts,
  konvaNodesMap,
  createLine,
  createShape,
  createText,
  createPlant,
  updateLinePoints,
  updateShapeSize,
  clearAll: clearAllElements,
  loadData: loadElementsData,
  getData: getElementsData
} = useCanvasElements()

// Use canvas interaction composable
const {
  touchStartDistance,
  touchStartPositions,
  isPanning,
  lastPanPosition,
  isTwoFingerGesture,
  initialStagePosition,
  panVelocity,
  lastPanTime,
  isMiddleMousePanning,
  middleMouseStartPos,
  isMovingElement,
  movingElement,
  moveStartPos,
  elementStartPos,
  isRotatingDuringCreation,
  creationStartPos,
  currentRotationAngle,
  getTransformedPointerPosition,
  snapToGridPoint: snapToGridHelper
} = useCanvasInteraction()

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
// Ensure minimum dimensions to prevent canvas errors
const exportAreaWidthPx = computed(() => {
  const width = props.canvasSize.width * METER_TO_PIXELS
  return Math.max(100, Math.floor(width)) // Minimum 100px, no fractional pixels
})

const exportAreaHeightPx = computed(() => {
  const height = props.canvasSize.height * METER_TO_PIXELS
  return Math.max(100, Math.floor(height)) // Minimum 100px, no fractional pixels
})

// Center the export area in the stage (this is the neon border area)
const exportAreaOffsetX = computed(() => (stageConfig.value.width - exportAreaWidthPx.value) / 2)
const exportAreaOffsetY = computed(() => (stageConfig.value.height - exportAreaHeightPx.value) / 2)

// Grid is now in StaticGridLayer.vue component to prevent re-renders during zoom

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
  syncLayersFromElements,
  getLayerByElementId
} = useLayers()

// Helper functions for layer visibility and lock
const isElementVisible = (elementId) => {
  const layer = getLayerByElementId(elementId)
  return layer ? layer.visible : true
}

const isElementLocked = (elementId) => {
  const layer = getLayerByElementId(elementId)
  return layer ? layer.locked : false
}

// Botanical Data
const { getCompanions, getAntagonists } = useBotanicalData()

// Compatibility Feedback
const compatibilityLines = ref([])

// Transformer ref
const transformerRef = ref(null)

// 🌱 Agroecological overlay features
const showCompanionCircles = ref(true)
const showSunZones = ref(false)
const showWaterZones = ref(false)
const showSpacingGuides = ref(true)

// Labels feature - can be enabled when needed
const showLabels = ref(false)

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

// Handle drop events for drag and drop
const handleDrop = (e) => {
  e.preventDefault()
  const stage = stageRef.value?.getStage()
  if (!stage) return
  
  // Get drop position relative to the stage
  const containerRect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - containerRect.left
  const y = e.clientY - containerRect.top
  
  // Transform to stage coordinates
  const transform = stage.getAbsoluteTransform().copy()
  transform.invert()
  const pos = transform.point({ x, y })
  
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'))
    if (data.type === 'plant') {
      const plant = data.data
      createPlant(pos, plant)
      saveHistory({ lines: lines.value, shapes: shapes.value, images: images.value, texts: texts.value })
      logger.log('Plant dropped:', plant.name, 'at', pos)
    }
  } catch (err) {
    logger.error('Error handling drop:', err)
  }
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
    clearAllElements()
    saveHistory({ lines: [], shapes: [], images: [], texts: [] })
  },
  getStage: () => {
    return stageRef.value ? stageRef.value.getStage() : null
  },
  exportCanvas: () => {
    // Export only the area within the neon border (export area)
    if (!stageRef.value) {
      logger.error('Export failed: Stage ref not available')
      return null
    }
    
    try {
      const stage = stageRef.value.getStage()
      if (!stage) {
        logger.error('Export failed: Stage not initialized')
        return null
      }
      
      // Validate export dimensions
      const width = exportAreaWidthPx.value
      const height = exportAreaHeightPx.value
      
      if (!width || !height || width <= 0 || height <= 0) {
        logger.error('Export failed: Invalid dimensions', { width, height, canvasSize: props.canvasSize })
        return null
      }
      
      // Create a temporary canvas for export with validated dimensions
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = Math.max(1, Math.floor(width))
      exportCanvas.height = Math.max(1, Math.floor(height))
      
      const ctx = exportCanvas.getContext('2d')
      if (!ctx) {
        logger.error('Export failed: Could not get 2D context')
        return null
      }
      
      // Fill with background color
      ctx.fillStyle = '#0f0f0f'
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      
      // Get the main canvas and draw only the export area
      const mainCanvas = stage.toCanvas({
        x: exportAreaOffsetX.value,
        y: exportAreaOffsetY.value,
        width: exportCanvas.width,
        height: exportCanvas.height,
        pixelRatio: 1
      })
      
      // Validate main canvas before drawing
      if (!mainCanvas || mainCanvas.width === 0 || mainCanvas.height === 0) {
        logger.error('Export failed: Invalid main canvas dimensions', {
          mainCanvas: mainCanvas ? { width: mainCanvas.width, height: mainCanvas.height } : null
        })
        return null
      }
      
      ctx.drawImage(mainCanvas, 0, 0)
      
      logger.log('Canvas exported successfully', { width: exportCanvas.width, height: exportCanvas.height })
      return exportCanvas
    } catch (error) {
      logger.error('Error exporting canvas:', error)
      return null
    }
  },
  getCanvasDataURL: (format = 'png', quality = 1) => {
    if (!stageRef.value) {
      logger.error('getCanvasDataURL failed: Stage ref not available')
      return null
    }
    
    try {
      const stage = stageRef.value.getStage()
      if (!stage) {
        logger.error('getCanvasDataURL failed: Stage not initialized')
        return null
      }
      
      // Validate export dimensions
      const width = exportAreaWidthPx.value
      const height = exportAreaHeightPx.value
      
      if (!width || !height || width <= 0 || height <= 0) {
        logger.error('getCanvasDataURL failed: Invalid dimensions', { width, height, canvasSize: props.canvasSize })
        return null
      }
      
      // Create a temporary canvas for export with validated dimensions
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = Math.max(1, Math.floor(width))
      exportCanvas.height = Math.max(1, Math.floor(height))
      
      const ctx = exportCanvas.getContext('2d')
      if (!ctx) {
        logger.error('getCanvasDataURL failed: Could not get 2D context')
        return null
      }
      
      // Fill with background color
      ctx.fillStyle = '#0f0f0f'
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      
      // Get the main canvas and draw only the export area
      const mainCanvas = stage.toCanvas({
        x: exportAreaOffsetX.value,
        y: exportAreaOffsetY.value,
        width: exportCanvas.width,
        height: exportCanvas.height,
        pixelRatio: 1
      })
      
      // Validate main canvas before drawing
      if (!mainCanvas || mainCanvas.width === 0 || mainCanvas.height === 0) {
        logger.error('getCanvasDataURL failed: Invalid main canvas dimensions', {
          mainCanvas: mainCanvas ? { width: mainCanvas.width, height: mainCanvas.height } : null
        })
        return null
      }
      
      ctx.drawImage(mainCanvas, 0, 0)
      
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
      const dataURL = exportCanvas.toDataURL(mimeType, quality)
      
      logger.log('Canvas data URL generated successfully', { format, quality, size: dataURL.length })
      return dataURL
    } catch (error) {
      logger.error('Error getting canvas data URL:', error)
      return null
    }
  },
  getCanvasData: () => {
    return getElementsData()
  },
  loadCanvas: (data) => {
    loadElementsData(data)
    saveHistory({ lines: lines.value, shapes: shapes.value, images: images.value, texts: texts.value })
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
  }
})

// Helper functions are now in useCanvasElements composable

// Check compatibility between a plant and existing plants
const checkPlacementCompatibility = (newPlant) => {
  compatibilityLines.value = [] // Clear previous lines
  
  if (!newPlant.tag) return

  const companions = getCompanions(newPlant.tag)
  const antagonists = getAntagonists(newPlant.tag)
  
  images.value.forEach(existingPlant => {
    if (existingPlant.id === newPlant.id) return
    
    const isCompanion = companions.includes(existingPlant.tag)
    const isAntagonist = antagonists.includes(existingPlant.tag)
    
    if (isCompanion || isAntagonist) {
      // Draw connection line
      compatibilityLines.value.push({
        points: [newPlant.x + 50, newPlant.y + 50, existingPlant.x + 50, existingPlant.y + 50],
        stroke: isCompanion ? '#2ecc71' : '#e74c3c',
        strokeWidth: 2,
        dash: [5, 5],
        opacity: 0.8
      })
    }
  })
}

// Watch for element moves to update compatibility lines
watch([() => isMovingElement.value, () => movingElement.value], ([isMoving, element]) => {
  if (isMoving && element && element.plantId) {
    checkPlacementCompatibility(element)
  } else {
    compatibilityLines.value = [] // Clear lines when not moving
  }
})

// Helper functions for drag events - unified for all element types
const handleElementDragStart = (e, element) => {
  if (isDrawing.value) {
    e.evt.preventDefault()
    return false
  }
  
  // Prevent dragging locked elements
  if (isElementLocked(element.id)) {
    e.evt.preventDefault()
    return false
  }
  
  e.target.getStage().container().style.cursor = 'grabbing'
  isMovingElement.value = true
  movingElement.value = element
  
  // Check compatibility for plants
  if (element.plantId) {
    checkPlacementCompatibility(element)
  }
}

const handleElementDragMove = (e, element) => {
  if (isDrawing.value) {
    e.evt.preventDefault()
    return false
  }
  // Konva handles the position automatically, sync our reference
  const node = e.target
  element.x = node.x()
  element.y = node.y()
  
  // Apply snap to grid if enabled
  if (props.snapToGrid) {
    const snapped = snapToGridPoint(element.x, element.y)
    element.x = snapped.x
    element.y = snapped.y
    node.position({ x: snapped.x, y: snapped.y })
  }
  
  // Update compatibility lines for plants during drag
  if (element.plantId) {
    checkPlacementCompatibility(element)
  }
}

const handleElementDragEnd = (e, element) => {
  if (isDrawing.value) {
    e.evt.preventDefault()
    return false
  }
  e.target.getStage().container().style.cursor = 'grab'
  
  // Final position sync
  const node = e.target
  element.x = node.x()
  element.y = node.y()
  
  isMovingElement.value = false
  movingElement.value = null
  
  // Clear compatibility lines
  compatibilityLines.value = []
  
  saveHistory({ lines: lines.value, shapes: shapes.value, images: images.value, texts: texts.value })
}

// Element click and double-click handlers are defined below after drag handlers

// Snap point to grid wrapper
const snapToGridPoint = (x, y) => {
  return snapToGridHelper(x, y, gridSize, props.snapToGrid)
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
  
  // PREVENT drawing/creating shapes when dragging an element
  if (isMovingElement.value) {
    return
  }
  
  // PREVENT drawing/creating shapes when clicking on a draggable element
  const clickedElement = e.target
  if (clickedElement !== stage && clickedElement.getClassName() !== 'Stage') {
    const elementId = clickedElement.id()
    const elementClass = clickedElement.getClassName()
    
    // Check if we clicked on a draggable element or inside a draggable group
    const isDraggableElement = 
      shapes.value.some(s => s.id === elementId && s.draggable !== false) ||
      images.value.some(i => i.id === elementId && i.draggable !== false) ||
      texts.value.some(t => t.id === elementId && t.draggable !== false) ||
      (elementId && elementId.startsWith('drag-area-')) ||
      (elementId && elementId.startsWith('text-group-')) ||
      clickedElement.isDragging?.() ||
      clickedElement.draggable?.() ||
      (clickedElement.getParent && clickedElement.getParent()?.draggable?.())
    
    // If we clicked on a draggable element and we're not using the move tool, don't create new shapes
    if (isDraggableElement && props.tool !== 'move') {
      return
    }
  }
  
  logger.log('Mouse down - Tool:', props.tool, 'Option:', props.toolOption, 'Position:', pos)
  
  // Handle move tool
  if (props.tool === 'move') {
    const clickedElement = e.target
    
    // Check if we clicked on an element (not the stage)
    if (clickedElement !== stage && clickedElement.getClassName() !== 'Stage') {
      // Find the element in our arrays
      let elementId = clickedElement.id()
      let foundElement = null
      
      // Check if it's a drag area for text elements
      if (elementId && elementId.startsWith('drag-area-')) {
        const actualId = elementId.replace('drag-area-', '')
        foundElement = texts.value.find(t => t.id === actualId)
      } else {
        // Search in all element arrays
        foundElement = shapes.value.find(s => s.id === elementId) ||
                       images.value.find(i => i.id === elementId) ||
                       texts.value.find(t => t.id === elementId)
      }
      
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
      
      createText(pos, text, fontSize, fontWeight, props.brushColor)
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
    createLine(pos, props.tool, props.toolOption, props.brushColor, props.brushThickness, props.brushOpacity)
  } else if (props.tool === 'square' || props.tool === 'circle' || props.tool === 'triangle') {
    creationStartPos.value = { x: pos.x, y: pos.y }
    currentRotationAngle.value = (props.tool === 'triangle' && props.toolOption !== 'right') ? 180 : 0
    createShape(pos, props.tool, props.toolOption, props.brushColor, props.brushOpacity)
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
  
  // Handle element moving with move tool or direct drag
  if (isMovingElement.value && movingElement.value) {
    e.evt.preventDefault()
    const pos = getTransformedPointerPosition(stage)
    const deltaX = pos.x - moveStartPos.value.x
    const deltaY = pos.y - moveStartPos.value.y
    
    let newX = elementStartPos.value.x + deltaX
    let newY = elementStartPos.value.y + deltaY
    
    // Apply snap to grid if enabled
    if (props.snapToGrid) {
      const snapped = snapToGridPoint(newX, newY)
      newX = snapped.x
      newY = snapped.y
    }
    
    movingElement.value.x = newX
    movingElement.value.y = newY
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
  
  // PREVENT drawing when an element is being dragged
  if (isMovingElement.value || !isDrawing.value) return
  
  // Prevent scrolling on touch devices
  if (e.evt) e.evt.preventDefault()
  
  const point = getTransformedPointerPosition(stage)
  
  if (props.tool === 'brush' || props.tool === 'eraser') {
    const lastLine = lines.value[lines.value.length - 1]
    if (lastLine) {
      updateLinePoints(lastLine, point)
    }
  } else if (shapes.value.length > 0) {
    const lastShape = shapes.value[shapes.value.length - 1]
    const angle = updateShapeSize(lastShape, creationStartPos.value, point)
    currentRotationAngle.value = angle
  }
}

const handleMouseUp = (e) => {
  // Reset cursor to default
  if (e && e.target) {
    const stage = e.target.getStage()
    if (stage) {
      stage.container().style.cursor = 'default'
    }
  }
  
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
    e.evt.preventDefault()
    
    const now = Date.now()
    const timeDelta = now - lastPanTime.value
    
    const centerX = (touches[0].clientX + touches[1].clientX) * 0.5
    const centerY = (touches[0].clientY + touches[1].clientY) * 0.5
    
    const deltaX = centerX - lastPanPosition.value.x
    const deltaY = centerY - lastPanPosition.value.y
    
    if (timeDelta > 0) {
      panVelocity.value = {
        x: deltaX / timeDelta,
        y: deltaY / timeDelta
      }
    }
    
    const dx = touches[1].clientX - touches[0].clientX
    const dy = touches[1].clientY - touches[0].clientY
    const currentDistance = Math.sqrt(dx * dx + dy * dy)
    
    const distanceChange = Math.abs(currentDistance - touchStartDistance.value)
    const panDistSq = deltaX * deltaX + deltaY * deltaY
    const isZoomGesture = distanceChange * distanceChange > panDistSq * 0.25
    
    if (isZoomGesture && touchStartDistance.value > 0 && currentDistance > 0) {
      const scaleDelta = currentDistance / touchStartDistance.value
      const oldScale = stageScale.value
      
      const smoothScaleDelta = 1 + (scaleDelta - 1) * 0.5
      const newScale = Math.max(0.1, Math.min(10, oldScale * smoothScaleDelta))
      
      const mousePointTo = {
        x: (centerX - stagePosition.value.x) / oldScale,
        y: (centerY - stagePosition.value.y) / oldScale
      }
      
      stageScale.value = newScale
      
      stagePosition.value = {
        x: centerX - mousePointTo.x * newScale,
        y: centerY - mousePointTo.y * newScale
      }
      
      touchStartDistance.value = currentDistance
    } else {
      const acceleration = 1.2
      stagePosition.value = {
        x: stagePosition.value.x + deltaX * acceleration,
        y: stagePosition.value.y + deltaY * acceleration
      }
    }
    
    lastPanPosition.value = { x: centerX, y: centerY }
    lastPanTime.value = now
  } else if (touches.length === 1 && !isTwoFingerGesture.value) {
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
const canvasContainerRef = ref(null)

const updateStageDimensions = () => {
  // Get actual container dimensions instead of using hardcoded values
  const container = document.querySelector('.canvas-container')
  if (container) {
    const rect = container.getBoundingClientRect()
    updateStageConfig(rect.width, rect.height)
  } else {
    // Fallback to window dimensions minus estimated UI
    updateStageConfig(
      window.innerWidth - 280,
      window.innerHeight - 80
    )
  }
}

onMounted(() => {
  resizeHandler = () => {
    updateStageDimensions()
  }
  
  window.addEventListener('resize', resizeHandler)
  window.addEventListener('keydown', handleKeyDown)
  
  // Prevent context menu on canvas
  const canvas = document.querySelector('.canvas-container')
  if (canvas) {
    contextMenuHandler = (e) => e.preventDefault()
    canvas.addEventListener('contextmenu', contextMenuHandler)
  }
  
  // Initial setup with actual dimensions
  nextTick(() => {
    updateStageDimensions()
    
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
  <div 
    class="canvas-container" 
    :class="{ 
      panning: isMiddleMousePanning || isTwoFingerGesture || isMovingElement,
      'move-tool': tool === 'move'
    }"
    @drop="handleDrop"
    @dragover.prevent
  >
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
    class="konva-stage"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @wheel="throttledHandleWheel"
    >
      <!-- Background & Overlays Layer -->
      <CanvasBackground
        :stage-position="stagePosition"
        :stage-scale="stageScale"
        :export-area-offset-x="exportAreaOffsetX"
        :export-area-offset-y="exportAreaOffsetY"
        :export-area-width-px="exportAreaWidthPx"
        :export-area-height-px="exportAreaHeightPx"
        :show-sun-zones="showSunZones"
        :show-water-zones="showWaterZones"
        :show-grid="showGrid"
        :canvas-size="canvasSize"
        :brush-color="brushColor"
      />
      
      <!-- Static Grid Layer - Never re-renders during zoom -->
      <StaticGridLayer :show-grid="showGrid" />
      
      <!-- Companion Overlay Layer -->
      <CompanionOverlay
        :show-companion-circles="showCompanionCircles"
        :images="images"
        :compatibility-lines="compatibilityLines"
      />
      
      <!-- Grid Overlays & UI Layer -->
      <CanvasGridOverlay
        :show-grid="showGrid"
        :stage-scale="stageScale"
        :export-area-offset-x="exportAreaOffsetX"
        :export-area-offset-y="exportAreaOffsetY"
        :export-area-width-px="exportAreaWidthPx"
        :export-area-height-px="exportAreaHeightPx"
        :canvas-size="canvasSize"
        :brush-color="brushColor"
      />
      
      <!-- Drawing Layer -->
      <v-layer>
        <!-- Draw all lines -->
        <v-line
          v-for="line in lines"
          :key="`line-${line.id}`"
          :config="line"
        />
        
        <!-- Draw all shapes using ShapeElement component -->
        <ShapeElement
          v-for="shape in shapes"
          :key="`shape-${shape.id}`"
          :shape="shape"
          :is-selected="isLayerSelected(shape.id)"
          :show-labels="showLabels"
          :brush-color="brushColor"
          :is-drawing="isDrawing"
          :is-moving-element="isMovingElement"
          @dragstart="handleElementDragStart"
          @dragmove="handleElementDragMove"
          @dragend="handleElementDragEnd"
          @click="handleElementClick"
          @dblclick="handleElementDoubleClick"
          @node-ref="(id, node) => konvaNodesMap.set(id, node)"
        />
        
        <!-- Draw all images using ImageElement component -->
        <ImageElement
          v-for="img in images"
          :key="`image-${img.id}`"
          :image="img"
          :is-selected="isLayerSelected(img.id)"
          :show-labels="showLabels"
          :brush-color="brushColor"
          :is-drawing="isDrawing"
          :is-moving-element="isMovingElement"
          @dragstart="handleElementDragStart"
          @dragmove="handleElementDragMove"
          @dragend="handleElementDragEnd"
          @click="handleElementClick"
          @dblclick="handleElementDoubleClick"
          @node-ref="(id, node) => konvaNodesMap.set(id, node)"
        />
        
        <!-- Draw all plants/texts using PlantElement component -->
        <PlantElement
          v-for="text in texts"
          :key="`plant-${text.id}`"
          :plant="text"
          :is-selected="isLayerSelected(text.id)"
          :brush-color="brushColor"
          :is-drawing="isDrawing"
          :is-moving-element="isMovingElement"
          :snap-to-grid="snapToGrid"
          @dragstart="handleElementDragStart"
          @dragmove="(e, plant) => {
            if (isDrawing) {
              e.evt.preventDefault()
              return false
            }
            const node = e.target
            plant.x = node.x()
            plant.y = node.y()
            if (snapToGrid) {
              const snapped = snapToGridPoint(plant.x, plant.y)
              plant.x = snapped.x
              plant.y = snapped.y
              node.position({ x: snapped.x, y: snapped.y })
            }
            if (plant.plantId) {
              checkPlacementCompatibility(plant)
            }
          }"
          @dragend="handleElementDragEnd"
          @click="handleElementClick"
          @dblclick="handleElementDoubleClick"
          @node-ref="(id, node) => konvaNodesMap.set(id, node)"
        />
        
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
            @mouseenter="(e) => { if (!isDrawing.value && !isMovingElement.value) e.target.getStage().container().style.cursor = 'grab' }"
            @mouseleave="(e) => { if (!isDrawing.value && !isMovingElement.value) e.target.getStage().container().style.cursor = 'default' }"
            @dragstart="(e) => handleElementDragStart(e, shape)"
            @dragmove="(e) => handleElementDragMove(e, shape)"
            @dragend="(e) => handleElementDragEnd(e, shape)"
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
            @mouseenter="(e) => { if (!isDrawing.value && !isMovingElement.value) e.target.getStage().container().style.cursor = 'grab' }"
            @mouseleave="(e) => { if (!isDrawing.value && !isMovingElement.value) e.target.getStage().container().style.cursor = 'default' }"
            @dragstart="(e) => handleElementDragStart(e, shape)"
            @dragmove="(e) => handleElementDragMove(e, shape)"
            @dragend="(e) => handleElementDragEnd(e, shape)"
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
        <template v-for="img in images" :key="`image-group-${img.id}`">
          <!-- Layer border for selected elements -->
          <v-rect
            v-if="isLayerSelected(img.id)"
            :key="`image-border-${img.id}`"
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
            @mouseenter="(e) => { if (!isDrawing.value && !isMovingElement.value) e.target.getStage().container().style.cursor = 'grab' }"
            @mouseleave="(e) => { if (!isDrawing.value && !isMovingElement.value) e.target.getStage().container().style.cursor = 'default' }"
            @dragstart="(e) => handleElementDragStart(e, img)"
            @dragmove="(e) => handleElementDragMove(e, img)"
            @dragend="(e) => handleElementDragEnd(e, img)"
            @click="(e) => handleElementClick(img, e, e.target)"
            @tap="(e) => handleElementClick(img, e, e.target)"
            @dblclick="handleElementDoubleClick(img, $event)"
            @dbltap="handleElementDoubleClick(img, $event)"
          />
          <!-- Label components for images -->
          <template v-if="showLabels && img.tag">
            <v-rect
              :key="`image-label-bg-${img.id}`"
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
              :key="`image-label-text-${img.id}`"
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
              :key="`image-label-line-${img.id}`"
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
        
        <!-- Draw all texts/plants with enhanced visualization -->
        <template v-for="text in texts" :key="`text-group-${text.id}`" >
          <!-- 🌱 Plant spacing circle (dotted line showing required space) -->
          <v-circle
            v-if="text.plantId && text.spacingRadius"
            :key="`plant-spacing-${text.id}`"
            :config="{
              x: text.x + (text.fontSize || 48) / 2,
              y: text.y + (text.fontSize || 48) / 2,
              radius: text.spacingRadius,
              stroke: text.fill || '#65FF86',
              strokeWidth: 2,
              dash: [8, 8],
              listening: false,
              opacity: 0.5,
              perfectDrawEnabled: false
            }"
          />
          

          
          <!-- Layer border for selected elements -->
          <v-rect
            v-if="isLayerSelected(text.id)"
            :key="`text-border-${text.id}`"
            :config="{
              x: text.x - 5,
              y: text.y - 5,
              width: (text.text?.length || 5) * (text.fontSize || 24) * 0.6 + 10,
              height: (text.fontSize || 24) + 10,
              stroke: props.brushColor,
              strokeWidth: 2,
              dash: [8, 4],
              listening: false,
              opacity: 0.6,
              perfectDrawEnabled: false
            }"
          />
          
          <!-- Plant/Text Icon (draggable with larger hit area via group) -->
          <v-group
            :config="{
              x: text.x,
              y: text.y,
              draggable: true,
              id: `text-group-${text.id}`,
              name: 'draggable-element'
            }"
            @mouseenter="(e) => { if (!isDrawing.value && !isMovingElement.value) e.target.getStage().container().style.cursor = 'grab' }"
            @mouseleave="(e) => { if (!isDrawing.value && !isMovingElement.value) e.target.getStage().container().style.cursor = 'default' }"
            @dragstart="(e) => handleElementDragStart(e, text)"
            @dragmove="(e) => {
              if (isDrawing.value) {
                e.evt.preventDefault()
                return false
              }
              
              // Konva handles the position automatically, sync our reference
              const node = e.target
              text.x = node.x()
              text.y = node.y()
              
              // Apply snap to grid if enabled
              if (props.snapToGrid) {
                const snapped = snapToGridPoint(text.x, text.y)
                text.x = snapped.x
                text.y = snapped.y
                node.position({ x: snapped.x, y: snapped.y })
              }
              
              // Update compatibility lines for plants during drag
              if (text.plantId) {
                checkPlacementCompatibility(text)
              }
            }"
            @dragend="(e) => handleElementDragEnd(e, text)"
            @click="(e) => handleElementClick(text, e, e.target)"
            @tap="(e) => handleElementClick(text, e, e.target)"
            @dblclick="handleElementDoubleClick(text, $event)"
            @dbltap="handleElementDoubleClick(text, $event)"
          >
            <!-- Larger invisible hit area -->
            <v-rect
              :config="{
                x: -15,
                y: -15,
                width: (text.fontSize || 48) + 30,
                height: (text.fontSize || 48) + 30,
                fill: 'transparent',
                listening: true
              }"
            />
            
            <!-- Actual text -->
            <v-text
              :ref="(el) => { if (el) konvaNodesMap.set(text.id, el.getNode()) }"
              :config="{
                x: 0,
                y: 0,
                text: text.text,
                fontSize: text.fontSize,
                fontFamily: text.fontFamily,
                fontStyle: text.fontStyle,
                fill: text.fill,
                id: text.id,
                shadowColor: text.plantId ? (text.fill || '#65FF86') : 'transparent',
                shadowBlur: text.plantId ? 15 : 0,
                shadowOpacity: text.plantId ? 0.6 : 0,
                perfectDrawEnabled: false,
                listening: false
              }"
            />
          </v-group>
          
          <!-- 🏷️ Plant Nametag (always visible for plants) -->
          <template v-if="text.plantId && text.tag">
            <!-- Nametag background -->
            <v-rect
              :config="{
                x: text.x + (text.fontSize || 48) / 2 - (text.tag.length * 4.5 + 12),
                y: text.y - 38,
                width: text.tag.length * 9 + 24,
                height: 28,
                fill: 'rgba(0, 0, 0, 0.95)',
                cornerRadius: 8,
                shadowColor: text.fill || '#65FF86',
                shadowBlur: 20,
                shadowOpacity: 0.7,
                shadowForStrokeEnabled: false,
                listening: false,
                stroke: text.fill || '#65FF86',
                strokeWidth: 2,
                opacity: 1,
                perfectDrawEnabled: false
              }"
            />
            <!-- Nametag text -->
            <v-text
              :config="{
                x: text.x + (text.fontSize || 48) / 2 - (text.tag.length * 4.5),
                y: text.y - 31,
                text: text.tag,
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                fill: text.fill || '#65FF86',
                fontStyle: 'bold',
                listening: false,
                shadowColor: text.fill || '#65FF86',
                shadowBlur: 12,
                shadowOpacity: 1,
                perfectDrawEnabled: false
              }"
            />
            <!-- Spacing info label (below icon) -->
            <v-text
              v-if="text.spacingMeters"
              :config="{
                x: text.x + (text.fontSize || 48) / 2 - 20,
                y: text.y + (text.fontSize || 48) + 8,
                text: `${text.spacingMeters.toFixed(1)}m`,
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
          
          <!-- Label components for non-plant texts (original behavior) -->
          <template v-if="!text.plantId && showLabels && text.tag">
            <v-rect
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
                opacity: 0.95,
                perfectDrawEnabled: false
              }"
            />
            <v-text
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
                shadowOpacity: 1,
                perfectDrawEnabled: false
              }"
            />
            <v-line
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
                listening: false,
                perfectDrawEnabled: false
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
  min-width: 0;
  min-height: 0;
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





/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .zoom-indicator {
    bottom: 20px;
    right: 70px;
    font-size: 12px;
    padding: 8px 16px;
    z-index: 10;
  }
  
  .gesture-indicator {
    top: 60px;
    font-size: 12px;
    padding: 8px 16px;
    z-index: 10;
  }
  
  .gesture-indicator svg {
    width: 16px;
    height: 16px;
  }
  
  .tag-dialog {
    min-width: 280px;
    max-width: calc(100vw - 40px);
    padding: 20px;
    z-index: 1100;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
    margin-top: 0;
  }
  
  .rotation-indicator {
    bottom: 20px;
    left: 20px;
    z-index: 10;
    min-width: 140px;
    padding: 12px 16px;
  }
  
  .rotation-value {
    font-size: 18px;
  }
}
