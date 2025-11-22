import { ref, computed } from 'vue'
import { generateElementId } from '@/utils/idGenerator'
import { logger } from '@/utils/logger'
import { CANVAS_CONFIG } from '@/constants/tools'

const METER_TO_PIXELS = CANVAS_CONFIG.METER_TO_PIXELS

export function useCanvasElements() {
  const lines = ref([])
  const shapes = ref([])
  const images = ref([])
  const texts = ref([])
  const konvaNodesMap = ref(new Map())

  // Helper to get plant icon
  const getItemIcon = (type) => {
    const iconMap = {
      'FRUITS': '🍎',
      'HERBS': '🌿',
      'VEGETABLES': '🥕',
      'ROOTS': '🥔',
      'TREES': '🌳',
      'FLOWERS': '🌸',
      'CROPS': '🌾',
      'INVASIVE_SPECIES': '⚠️'
    }
    return iconMap[type] || '🌱'
  }

  // Helper to get plant color accent
  const getPlantColor = (type) => {
    const colorMap = {
      'FRUITS': '#FF4081',
      'HERBS': '#4CAF50',
      'VEGETABLES': '#FF9800',
      'ROOTS': '#8D6E63',
      'TREES': '#2E7D32',
      'FLOWERS': '#E91E63',
      'CROPS': '#FFC107',
      'INVASIVE_SPECIES': '#F44336'
    }
    return colorMap[type] || '#65FF86'
  }

  // Parse spacing string (e.g., "8-15m" or "0.3-0.5m") to get average in meters
  const parseSpacing = (spacingStr) => {
    if (!spacingStr) return 1 // Default 1 meter
    
    const match = spacingStr.match(/([\d.]+)(?:-([\d.]+))?m?/)
    if (!match) return 1
    
    const min = parseFloat(match[1])
    const max = match[2] ? parseFloat(match[2]) : min
    return (min + max) / 2
  }

  const createLine = (pos, tool, toolOption, brushColor, brushThickness, brushOpacity) => {
    let strokeWidth = brushThickness / 10
    let tension = 0.5
    let lineCap = 'round'
    
    if (toolOption === 'marker') {
      strokeWidth = brushThickness / 8
      tension = 0.3
    } else if (toolOption === 'spray') {
      strokeWidth = brushThickness / 12
      tension = 0.8
    } else if (toolOption === 'calligraphy') {
      strokeWidth = brushThickness / 6
      lineCap = 'square'
    }
    
    const lineElement = {
      id: generateElementId(),
      tag: `${tool === 'eraser' ? 'Eraser' : 'Brush'} ${lines.value.length + 1}`,
      tool: tool,
      toolOption: toolOption,
      points: [pos.x, pos.y, pos.x, pos.y],
      stroke: brushColor,
      strokeWidth: strokeWidth,
      opacity: brushOpacity / 100,
      tension: tension,
      lineCap: lineCap,
      lineJoin: 'round',
      globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
      perfectDrawEnabled: false
    }
    
    lines.value.push(lineElement)
    return lineElement
  }

  const createShape = (pos, tool, toolOption, brushColor, brushOpacity) => {
    const isFilled = toolOption === 'filled'
    const isRounded = toolOption === 'rounded'
    const isEllipse = toolOption === 'ellipse'
    const isRight = toolOption === 'right'
    
    let shapeElement = {
      id: generateElementId(),
      x: pos.x,
      y: pos.y,
      rotation: 0,
      stroke: brushColor,
      strokeWidth: 3,
      fill: isFilled ? brushColor : 'transparent',
      opacity: isFilled ? brushOpacity / 100 : 1,
      draggable: true,
      shadowColor: brushColor,
      shadowBlur: isFilled ? 0 : 8,
      shadowOpacity: 0.3
    }
    
    if (tool === 'square') {
      shapeElement = {
        ...shapeElement,
        tag: `Rectangle ${shapes.value.length + 1}`,
        type: 'rect',
        width: 0,
        height: 0,
        offsetX: 0,
        offsetY: 0,
        cornerRadius: isRounded ? 12 : 0
      }
    } else if (tool === 'circle') {
      shapeElement = {
        ...shapeElement,
        tag: `${isEllipse ? 'Ellipse' : 'Circle'} ${shapes.value.length + 1}`,
        type: isEllipse ? 'ellipse' : 'circle',
        radius: 0,
        radiusX: 0,
        radiusY: 0
      }
    } else if (tool === 'triangle') {
      shapeElement = {
        ...shapeElement,
        tag: `Triangle ${shapes.value.length + 1}`,
        type: isRight ? 'right-triangle' : 'triangle',
        sides: 3,
        radius: 0,
        rotation: isRight ? 0 : 180
      }
    }
    
    shapes.value.push(shapeElement)
    return shapeElement
  }

  const createText = (pos, text, fontSize, fontWeight, brushColor) => {
    const textElement = {
      id: generateElementId(),
      tag: `Text ${texts.value.length + 1}`,
      text: text,
      x: pos.x,
      y: pos.y,
      fontSize: fontSize,
      fontFamily: 'Inter, sans-serif',
      fontStyle: fontWeight,
      fill: brushColor,
      draggable: true
    }
    
    texts.value.push(textElement)
    return textElement
  }

  const createPlant = (pos, plant) => {
    const spacingMeters = parseSpacing(plant.spacing)
    const spacingRadius = spacingMeters * METER_TO_PIXELS / 2
    const plantColor = getPlantColor(plant.type)
    
    const plantElement = {
      id: generateElementId(),
      tag: plant.name,
      text: getItemIcon(plant.type),
      x: pos.x,
      y: pos.y,
      fontSize: 48,
      fontFamily: 'Inter, sans-serif',
      fill: plantColor,
      draggable: false,
      plantId: plant.id,
      plantType: plant.type,
      scientificName: plant.scientificName,
      plantingDate: new Date().toISOString(),
      spacing: plant.spacing,
      spacingRadius: spacingRadius,
      spacingMeters: spacingMeters
    }
    
    texts.value.push(plantElement)
    return plantElement
  }

  const updateLinePoints = (line, point) => {
    const lastPoints = line.points
    const lastX = lastPoints[lastPoints.length - 2]
    const lastY = lastPoints[lastPoints.length - 1]
    
    // Only add point if it's far enough from the last point
    const dx = point.x - lastX
    const dy = point.y - lastY
    const distSq = dx * dx + dy * dy
    
    if (distSq > 4) {
      line.points = line.points.concat([point.x, point.y])
    }
  }

  const updateShapeSize = (shape, startPos, currentPos) => {
    const dx = currentPos.x - startPos.x
    const dy = currentPos.y - startPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    
    if (shape.type === 'rect') {
      shape.width = distance
      shape.height = distance
      shape.offsetX = distance / 2
      shape.offsetY = distance / 2
      shape.x = startPos.x
      shape.y = startPos.y
      shape.rotation = angle
    } else if (shape.type === 'circle') {
      shape.radius = distance
      shape.rotation = angle
    } else if (shape.type === 'ellipse') {
      shape.radiusX = distance
      shape.radiusY = distance * 0.6
      shape.rotation = angle
    } else if (shape.type === 'triangle' || shape.type === 'right-triangle') {
      shape.radius = distance
      const baseRotation = shape.type === 'right-triangle' ? 0 : 180
      shape.rotation = baseRotation + angle
    }
    
    return angle
  }

  const clearAll = () => {
    lines.value = []
    shapes.value = []
    images.value = []
    texts.value = []
  }

  const loadData = (data) => {
    if (data) {
      lines.value = data.lines || []
      shapes.value = data.shapes || []
      images.value = data.images || []
      texts.value = data.texts || []
    }
  }

  const getData = () => {
    return {
      lines: lines.value,
      shapes: shapes.value,
      images: images.value,
      texts: texts.value
    }
  }

  return {
    // State
    lines,
    shapes,
    images,
    texts,
    konvaNodesMap,
    
    // Methods
    createLine,
    createShape,
    createText,
    createPlant,
    updateLinePoints,
    updateShapeSize,
    clearAll,
    loadData,
    getData,
    getItemIcon,
    getPlantColor,
    parseSpacing
  }
}
