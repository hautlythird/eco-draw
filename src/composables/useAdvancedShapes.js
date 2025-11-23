import { ref, computed } from 'vue'
import { generateElementId } from '@/utils/idGenerator'

export function useAdvancedShapes() {
  const shapes = ref([])
  const selectedShape = ref(null)
  const transformStart = ref(null)
  const clipboard = ref([])

  // Shape types
  const SHAPE_TYPES = {
    BASIC: {
      RECTANGLE: 'rectangle',
      CIRCLE: 'circle',
      ELLIPSE: 'ellipse',
      TRIANGLE: 'triangle',
      POLYGON: 'polygon',
      STAR: 'star'
    },
    ARCHITECTURAL: {
      ARCH: 'arch',
      COLUMN: 'column',
      BEAM: 'beam',
      FOUNDATION: 'foundation',
      WINDOW: 'window',
      DOOR: 'door'
    },
    GARDEN: {
      GARDEN_BED: 'garden-bed',
      PATH: 'path',
      POND: 'pond',
      FOUNTAIN: 'fountain',
      TERRACE: 'terrace',
      GREENHOUSE: 'greenhouse'
    },
    PROFESSIONAL: {
      DIMENSION_LINE: 'dimension-line',
      ANGLE_INDICATOR: 'angle-indicator',
      AREA_CALCULATOR: 'area-calculator',
      GOLDEN_RATIO: 'golden-ratio'
    }
  }

  // Boolean operations
  const BOOLEAN_OPERATIONS = {
    UNION: 'union',
    SUBTRACT: 'subtract',
    INTERSECT: 'intersect',
    EXCLUDE: 'exclude'
  }

  // Create basic shape with enhanced properties
  const createBasicShape = (type, x, y, options = {}) => {
    const shape = {
      id: generateElementId(),
      type,
      x,
      y,
      rotation: 0,
      scale: { x: 1, y: 1 },
      fill: options.fill || 'transparent',
      stroke: options.stroke || '#2c2c2c',
      strokeWidth: options.strokeWidth || 2,
      opacity: options.opacity || 1,
      draggable: true,
      visible: true,
      locked: false,
      tag: `${type.charAt(0).toUpperCase() + type.slice(1)} ${shapes.value.length + 1}`,
      createdAt: Date.now(),
      metadata: {
        professional: {
          cornerRadius: options.cornerRadius || 0,
          lineDash: options.lineDash || [],
          lineCap: options.lineCap || 'round',
          lineJoin: options.lineJoin || 'round',
          shadowBlur: options.shadowBlur || 0,
          shadowColor: options.shadowColor || 'transparent',
          shadowOpacity: options.shadowOpacity || 0,
          fillPattern: options.fillPattern || 'solid',
          fillGradient: options.fillGradient || null
        },
        architectural: {
          measurements: {
            width: 0,
            height: 0,
            area: 0,
            perimeter: 0
          },
          constraints: {
            maintainAspectRatio: options.maintainAspectRatio || false,
            snapToAngle: options.snapToAngle || 15,
            minSize: options.minSize || { width: 10, height: 10 },
            maxSize: options.maxSize || { width: 2000, height: 2000 }
          }
        }
      }
    }

    // Add type-specific properties
    switch (type) {
      case SHAPE_TYPES.BASIC.RECTANGLE:
        shape.width = options.width || 100
        shape.height = options.height || 100
        shape.cornerRadii = options.cornerRadii || [0, 0, 0, 0]
        break
      case SHAPE_TYPES.BASIC.CIRCLE:
        shape.radius = options.radius || 50
        break
      case SHAPE_TYPES.BASIC.ELLIPSE:
        shape.radiusX = options.radiusX || 60
        shape.radiusY = options.radiusY || 40
        break
      case SHAPE_TYPES.BASIC.TRIANGLE:
        shape.sides = 3
        shape.radius = options.radius || 50
        break
      case SHAPE_TYPES.BASIC.POLYGON:
        shape.sides = options.sides || 6
        shape.radius = options.radius || 50
        break
      case SHAPE_TYPES.BASIC.STAR:
        shape.points = options.points || 5
        shape.innerRadius = options.innerRadius || 20
        shape.outerRadius = options.outerRadius || 50
        break
    }

    shapes.value.push(shape)
    return shape
  }

  // Create architectural shape
  const createArchitecturalShape = (type, x, y, width, height, options = {}) => {
    const architecturalTemplates = {
      [SHAPE_TYPES.ARCHITECTURAL.ARCH]: () => createArchShape(x, y, width, height),
      [SHAPE_TYPES.ARCHITECTURAL.COLUMN]: () => createColumnShape(x, y, width, height),
      [SHAPE_TYPES.ARCHITECTURAL.BEAM]: () => createBeamShape(x, y, width, height),
      [SHAPE_TYPES.ARCHITECTURAL.FOUNDATION]: () => createFoundationShape(x, y, width, height),
      [SHAPE_TYPES.ARCHITECTURAL.WINDOW]: () => createWindowShape(x, y, width, height),
      [SHAPE_TYPES.ARCHITECTURAL.DOOR]: () => createDoorShape(x, y, width, height)
    }

    const templateFunc = architecturalTemplates[type]
    if (!templateFunc) return null

    const shape = templateFunc()
    Object.assign(shape, options)
    shape.type = type
    shape.x = x
    shape.y = y

    shapes.value.push(shape)
    return shape
  }

  // Create garden layout shape
  const createGardenShape = (type, params, options = {}) => {
    const gardenTemplates = {
      [SHAPE_TYPES.GARDEN.GARDEN_BED]: () => createGardenBedShape(params),
      [SHAPE_TYPES.GARDEN.PATH]: () => createPathShape(params),
      [SHAPE_TYPES.GARDEN.POND]: () => createPondShape(params),
      [SHAPE_TYPES.GARDEN.FOUNTAIN]: () => createFountainShape(params),
      [SHAPE_TYPES.GARDEN.TERRACE]: () => createTerraceShape(params),
      [SHAPE_TYPES.GARDEN.GREENHOUSE]: () => createGreenhouseShape(params)
    }

    const templateFunc = gardenTemplates[type]
    if (!templateFunc) return null

    const shape = templateFunc()
    Object.assign(shape, options)
    shape.type = type

    shapes.value.push(shape)
    return shape
  }

  // Arch shape creation
  const createArchShape = (x, y, width, height) => {
    const archPath = generateArchPath(x, y, width, height)
    return {
      id: generateElementId(),
      type: 'path',
      data: archPath,
      fill: 'transparent',
      stroke: '#2c2c2c',
      strokeWidth: 2,
      x: 0,
      y: 0
    }
  }

  // Column shape creation
  const createColumnShape = (x, y, width, height) => {
    const columnPath = generateColumnPath(x, y, width, height)
    return {
      id: generateElementId(),
      type: 'path',
      data: columnPath,
      fill: 'rgba(44, 44, 44, 0.1)',
      stroke: '#2c2c2c',
      strokeWidth: 2,
      x: 0,
      y: 0
    }
  }

  // Beam shape creation
  const createBeamShape = (x, y, width, height) => {
    return {
      id: generateElementId(),
      type: 'rect',
      x,
      y: y + (height - 20) / 2,
      width,
      height: 20,
      fill: 'rgba(44, 44, 44, 0.15)',
      stroke: '#2c2c2c',
      strokeWidth: 2,
      cornerRadius: 2
    }
  }

  // Foundation shape creation
  const createFoundationShape = (x, y, width, height) => {
    return {
      id: generateElementId(),
      type: 'rect',
      x,
      y: y + height - 15,
      width,
      height: 15,
      fill: 'rgba(100, 100, 100, 0.2)',
      stroke: '#666666',
      strokeWidth: 2,
      strokeDasharray: [5, 5]
    }
  }

  // Window shape creation
  const createWindowShape = (x, y, width, height) => {
    return {
      id: generateElementId(),
      type: 'group',
      x,
      y,
      children: [
        {
          type: 'rect',
          width,
          height,
          fill: 'transparent',
          stroke: '#2c2c2c',
          strokeWidth: 6
        },
        {
          type: 'rect',
          x: width / 2 - 3,
          y: 6,
          width: 6,
          height: height - 12,
          fill: '#2c2c2c'
        },
        {
          type: 'rect',
          x: 6,
          y: height / 2 - 3,
          width: width - 12,
          height: 6,
          fill: '#2c2c2c'
        }
      ]
    }
  }

  // Door shape creation
  const createDoorShape = (x, y, width, height) => {
    return {
      id: generateElementId(),
      type: 'group',
      x,
      y,
      children: [
        {
          type: 'rect',
          width,
          height,
          fill: 'transparent',
          stroke: '#2c2c2c',
          strokeWidth: 4
        },
        {
          type: 'rect',
          x: (width - width * 0.8) / 2,
          y: 4,
          width: width * 0.8,
          height: height - 4,
          fill: 'rgba(139, 69, 19, 0.3)',
          stroke: '#2c2c2c',
          strokeWidth: 2
        }
      ]
    }
  }

  // Garden bed shape creation
  const createGardenBedShape = ({ x, y, width, height, levels = 1, raised = true }) => {
    return {
      id: generateElementId(),
      type: 'group',
      x,
      y,
      children: [
        {
          type: 'rect',
          width,
          height,
          fill: 'transparent',
          stroke: '#8B4513',
          strokeWidth: 4,
          cornerRadius: 8
        },
        ...(raised ? [{
          type: 'rect',
          x: 2,
          y: 20,
          width: width - 4,
          height: height - 22,
          fill: '#654321',
          opacity: 0.7
        }] : [])
      ],
      metadata: {
        garden: {
          levels,
          raised,
          soilType: 'loam',
          irrigation: false
        }
      }
    }
  }

  // Path shape creation
  const createPathShape = ({ points, width = 40, material = 'gravel' }) => {
    const pathData = points.reduce((path, point, index) => {
      return index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`
    }, '')

    return {
      id: generateElementId(),
      type: 'path',
      data: pathData,
      fill: getPathMaterialColor(material),
      stroke: getPathMaterialStroke(material),
      strokeWidth: 3,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.8,
      metadata: {
        garden: {
          material,
          width,
          points
        }
      }
    }
  }

  // Pond shape creation
  const createPondShape = ({ x, y, width, height, depth = 'shallow' }) => {
    return {
      id: generateElementId(),
      type: 'ellipse',
      x,
      y,
      radiusX: width / 2,
      radiusY: height / 2,
      fill: 'rgba(64, 164, 223, 0.4)',
      stroke: '#4094DF',
      strokeWidth: 2,
      metadata: {
        garden: {
          type: 'water-feature',
          waterType: 'pond',
          depth
        }
      }
    }
  }

  // Fountain shape creation
  const createFountainShape = ({ x, y, radius, tiers = 2 }) => {
    return {
      id: generateElementId(),
      type: 'group',
      x,
      y,
      children: [
        {
          type: 'circle',
          radius,
          fill: 'rgba(64, 164, 223, 0.3)',
          stroke: '#4094DF',
          strokeWidth: 2
        },
        ...Array.from({ length: tiers }, (_, i) => ({
          type: 'circle',
          radius: radius * (1 - (i + 1) * 0.3),
          fill: 'transparent',
          stroke: '#4094DF',
          strokeWidth: 1,
          opacity: 0.7 - i * 0.2
        }))
      ],
      metadata: {
        garden: {
          type: 'water-feature',
          waterType: 'fountain',
          tiers,
          active: true
        }
      }
    }
  }

  // Terrace shape creation
  const createTerraceShape = ({ x, y, width, height, levels = 3 }) => {
    const levelHeight = height / levels

    return {
      id: generateElementId(),
      type: 'group',
      x,
      y,
      children: [
        {
          type: 'rect',
          width,
          height,
          fill: 'transparent',
          stroke: '#8B4513',
          strokeWidth: 3,
          cornerRadius: 4
        },
        ...Array.from({ length: levels }, (_, i) => ({
          type: 'rect',
          x: 3,
          y: i * levelHeight + 3,
          width: width - 6,
          height: levelHeight - 3,
          fill: `rgba(101, 67, 33, ${0.3 + i * 0.1})`,
          stroke: 'none'
        }))
      ],
      metadata: {
        garden: {
          type: 'garden-bed',
          levels,
          raised: true,
          tiered: true
        }
      }
    }
  }

  // Greenhouse shape creation
  const createGreenhouseShape = ({ x, y, width, height }) => {
    const roofPath = `
      M ${x} ${y + height * 0.3}
      L ${x + width/2} ${y}
      L ${x + width} ${y + height * 0.3}
    `

    return {
      id: generateElementId(),
      type: 'group',
      children: [
        {
          type: 'rect',
          x,
          y: y + height * 0.3,
          width,
          height: height * 0.7,
          fill: 'rgba(200, 200, 255, 0.2)',
          stroke: '#4169E1',
          strokeWidth: 2
        },
        {
          type: 'path',
          data: roofPath,
          fill: 'rgba(135, 206, 250, 0.3)',
          stroke: '#4169E1',
          strokeWidth: 2
        },
        {
          type: 'rect',
          x: x + width * 0.2,
          y: y + height * 0.5,
          width: width * 0.2,
          height: height * 0.4,
          fill: 'rgba(255, 255, 255, 0.5)',
          stroke: '#4169E1',
          strokeWidth: 1
        },
        {
          type: 'rect',
          x: x + width * 0.6,
          y: y + height * 0.5,
          width: width * 0.2,
          height: height * 0.4,
          fill: 'rgba(255, 255, 255, 0.5)',
          stroke: '#4169E1',
          strokeWidth: 1
        }
      ],
      metadata: {
        garden: {
          type: 'structure',
          structureType: 'greenhouse',
          climateControlled: true
        }
      }
    }
  }

  // Helper functions
  const generateArchPath = (x, y, width, height) => {
    const archHeight = height * 0.6
    const archWidth = width * 0.8
    return `
      M ${x} ${y + height}
      L ${x} ${y + height - archHeight}
      Q ${x + archWidth/2} ${y} ${x + archWidth} ${y + height - archHeight}
      L ${x + width} ${y + height}
      Z
    `
  }

  const generateColumnPath = (x, y, width, height) => {
    const columnWidth = width * 0.3
    const capitalHeight = height * 0.15
    const baseHeight = height * 0.1
    return `
      M ${x + columnWidth/2} ${y}
      L ${x + columnWidth/2} ${y + capitalHeight}
      L ${x} ${y + capitalHeight}
      L ${x} ${y + height - baseHeight}
      L ${x + columnWidth/2} ${y + height - baseHeight}
      L ${x + columnWidth/2} ${y + height}
      L ${x + width - columnWidth/2} ${y + height}
      L ${x + width - columnWidth/2} ${y + height - baseHeight}
      L ${x + width} ${y + height - baseHeight}
      L ${x + width} ${y + capitalHeight}
      L ${x + width - columnWidth/2} ${y + capitalHeight}
      L ${x + width - columnWidth/2} ${y}
      Z
    `
  }

  const getPathMaterialColor = (material) => {
    const colors = {
      gravel: 'rgba(200, 200, 200, 0.6)',
      stone: 'rgba(150, 150, 150, 0.7)',
      wood: 'rgba(139, 69, 19, 0.4)',
      mulch: 'rgba(101, 67, 33, 0.5)',
      grass: 'rgba(34, 139, 34, 0.4)'
    }
    return colors[material] || 'rgba(150, 150, 150, 0.5)'
  }

  const getPathMaterialStroke = (material) => {
    const strokes = {
      gravel: '#CCCCCC',
      stone: '#969696',
      wood: '#8B4513',
      mulch: '#654321',
      grass: '#228B22'
    }
    return strokes[material] || '#999999'
  }

  // Boolean operations
  const performBooleanOperation = (shapeA, shapeB, operation) => {
    // This would integrate with a library like JSTS or implement custom algorithms
    // For now, return a placeholder
    return {
      id: generateElementId(),
      type: 'complex',
      operation,
      operands: [shapeA.id, shapeB.id],
      result: null // Would contain the computed path
    }
  }

  // Shape transformation utilities
  const transformShape = (shape, transform) => {
    const { x, y, rotation, scale } = transform

    if (x !== undefined) shape.x = x
    if (y !== undefined) shape.y = y
    if (rotation !== undefined) shape.rotation = rotation
    if (scale) {
      shape.scale = { ...shape.scale, ...scale }
    }

    // Update measurements for architectural shapes
    if (shape.metadata?.architectural) {
      updateShapeMeasurements(shape)
    }

    return shape
  }

  const updateShapeMeasurements = (shape) => {
    if (!shape.metadata?.architectural) return

    let width = 0
    let height = 0

    switch (shape.type) {
      case 'rect':
        width = shape.width * shape.scale.x
        height = shape.height * shape.scale.y
        break
      case 'circle':
        width = height = shape.radius * 2 * Math.max(shape.scale.x, shape.scale.y)
        break
      case 'ellipse':
        width = shape.radiusX * 2 * shape.scale.x
        height = shape.radiusY * 2 * shape.scale.y
        break
      // Add more shape types as needed
    }

    shape.metadata.architectural.measurements = {
      width,
      height,
      area: calculateArea(shape),
      perimeter: calculatePerimeter(shape)
    }
  }

  const calculateArea = (shape) => {
    switch (shape.type) {
      case 'rect':
        return shape.width * shape.height * shape.scale.x * shape.scale.y
      case 'circle':
        return Math.PI * Math.pow(shape.radius * Math.max(shape.scale.x, shape.scale.y), 2)
      case 'ellipse':
        return Math.PI * shape.radiusX * shape.radiusY * shape.scale.x * shape.scale.y
      default:
        return 0
    }
  }

  const calculatePerimeter = (shape) => {
    switch (shape.type) {
      case 'rect':
        return 2 * (shape.width * shape.scale.x + shape.height * shape.scale.y)
      case 'circle':
        return 2 * Math.PI * shape.radius * Math.max(shape.scale.x, shape.scale.y)
      case 'ellipse':
        // Approximation using Ramanujan's formula
        const a = shape.radiusX * shape.scale.x
        const b = shape.radiusY * shape.scale.y
        const h = Math.pow((a - b) / (a + b), 2)
        return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
      default:
        return 0
    }
  }

  // Clipboard operations
  const copyShape = (shape) => {
    clipboard.value = [JSON.parse(JSON.stringify(shape))]
  }

  const copyShapes = (shapeList) => {
    clipboard.value = shapeList.map(shape => JSON.parse(JSON.stringify(shape)))
  }

  const pasteShape = (x, y) => {
    if (clipboard.value.length === 0) return null

    const pastedShape = clipboard.value[0]
    const newShape = {
      ...pastedShape,
      id: generateElementId(),
      x: x || pastedShape.x + 20,
      y: y || pastedShape.y + 20,
      tag: `${pastedShape.tag} (Copy)`
    }

    shapes.value.push(newShape)
    return newShape
  }

  const duplicateShape = (shape) => {
    const duplicate = {
      ...shape,
      id: generateElementId(),
      x: shape.x + 20,
      y: shape.y + 20,
      tag: `${shape.tag} (Copy)`
    }

    shapes.value.push(duplicate)
    return duplicate
  }

  // Shape deletion
  const deleteShape = (shapeId) => {
    const index = shapes.value.findIndex(shape => shape.id === shapeId)
    if (index > -1) {
      shapes.value.splice(index, 1)
      return true
    }
    return false
  }

  const deleteSelectedShapes = () => {
    if (selectedShape.value) {
      return deleteShape(selectedShape.value.id)
    }
    return false
  }

  // Shape selection
  const selectShape = (shapeId) => {
    selectedShape.value = shapes.value.find(shape => shape.id === shapeId) || null
  }

  const selectShapes = (shapeIds) => {
    return shapeIds.map(id => shapes.value.find(shape => shape.id === id)).filter(Boolean)
  }

  // Shape utilities
  const getShapesByType = (type) => {
    return shapes.value.filter(shape => shape.type === type)
  }

  const getShapesInArea = (x, y, width, height) => {
    return shapes.value.filter(shape => {
      const shapeRight = shape.x + (shape.width || shape.radius || shape.radiusX || 0)
      const shapeBottom = shape.y + (shape.height || shape.radius || shape.radiusY || 0)

      return shape.x < x + width && shapeRight > x &&
             shape.y < y + height && shapeBottom > y
    })
  }

  const getShapeAtPoint = (x, y) => {
    // Check shapes in reverse order (top to bottom)
    for (let i = shapes.value.length - 1; i >= 0; i--) {
      const shape = shapes.value[i]
      if (isPointInShape(x, y, shape)) {
        return shape
      }
    }
    return null
  }

  const isPointInShape = (x, y, shape) => {
    // Simplified point-in-shape test
    if (shape.type === 'rect') {
      return x >= shape.x && x <= shape.x + shape.width * shape.scale.x &&
             y >= shape.y && y <= shape.y + shape.height * shape.scale.y
    } else if (shape.type === 'circle') {
      const dx = x - shape.x
      const dy = y - shape.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= shape.radius * Math.max(shape.scale.x, shape.scale.y)
    }
    // Add more shape types as needed
    return false
  }

  return {
    // State
    shapes,
    selectedShape,
    clipboard,
    transformStart,

    // Constants
    SHAPE_TYPES,
    BOOLEAN_OPERATIONS,

    // Creation methods
    createBasicShape,
    createArchitecturalShape,
    createGardenShape,
    performBooleanOperation,

    // Transformation methods
    transformShape,
    updateShapeMeasurements,
    calculateArea,
    calculatePerimeter,

    // Clipboard methods
    copyShape,
    copyShapes,
    pasteShape,
    duplicateShape,

    // Deletion methods
    deleteShape,
    deleteSelectedShapes,

    // Selection methods
    selectShape,
    selectShapes,

    // Utility methods
    getShapesByType,
    getShapesInArea,
    getShapeAtPoint,
    isPointInShape
  }
}