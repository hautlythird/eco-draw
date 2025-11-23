<template>
  <v-layer ref="precisionShapesLayer" name="precisionShapes">
    <!-- Architectural Shapes -->
    <v-path
      v-for="archShape in architecturalShapes"
      :key="archShape.id"
      :config="archShape.config"
      @pointerdown="handleShapePointerDown($event, archShape)"
      @pointermove="handleShapePointerMove($event, archShape)"
      @transformend="handleShapeTransformEnd($event, archShape)"
    />

    <!-- Garden Layout Shapes -->
    <v-group
      v-for="gardenShape in gardenShapes"
      :key="gardenShape.id"
      :config="gardenShape.groupConfig"
    >
      <v-rect
        v-if="gardenShape.type === 'garden-bed'"
        :config="gardenShape.config"
      />
      <v-path
        v-if="gardenShape.type === 'path'"
        :config="gardenShape.config"
      />
      <v-ellipse
        v-if="gardenShape.type === 'water-feature'"
        :config="gardenShape.config"
      />
      <!-- Decorative elements -->
      <v-circle
        v-for="decoration in gardenShape.decorations"
        :key="decoration.id"
        :config="decoration.config"
      />
    </v-group>

    <!-- Measurement Tools -->
    <v-group
      v-for="measurement in measurements"
      :key="measurement.id"
      :config="measurement.groupConfig"
    >
      <!-- Dimension line -->
      <v-line :config="measurement.lineConfig" />
      <!-- End arrows -->
      <v-path :config="measurement.startArrowConfig" />
      <v-path :config="measurement.endArrowConfig" />
      <!-- Dimension text -->
      <v-text :config="measurement.textConfig" />
    </v-group>

    <!-- Professional Geometry Guides -->
    <v-group
      v-for="guide in geometryGuides"
      :key="guide.id"
      :config="guide.groupConfig"
    >
      <!-- Golden ratio guides -->
      <v-rect
        v-for="rect in guide.goldenRects"
        :key="rect.id"
        :config="rect.config"
      />
      <!-- Perspective grid lines -->
      <v-line
        v-for="line in guide.perspectiveLines"
        :key="line.id"
        :config="line.config"
      />
      <!-- Construction guides -->
      <v-circle
        v-for="circle in guide.constructionCircles"
        :key="circle.id"
        :config="circle.config"
      />
    </v-group>

    <!-- Shape handles for editing -->
    <v-circle
      v-for="handle in shapeHandles"
      :key="handle.id"
      :config="handle.config"
      @pointerdown="startHandleDrag($event, handle)"
      @pointermove="updateHandleDrag($event, handle)"
      @pointerup="endHandleDrag($event, handle)"
    />

    <!-- Snapping guides -->
    <v-line
      v-for="guide in snappingGuides"
      :key="guide.id"
      :config="guide.config"
    />
  </v-layer>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { generateElementId } from '@/utils/idGenerator'
import { logger } from '@/utils/logger'

export default {
  name: 'PrecisionShapes',
  props: {
    gridSize: {
      type: Number,
      default: 50
    },
    snapToGrid: {
      type: Boolean,
      default: true
    },
    showMeasurements: {
      type: Boolean,
      default: true
    },
    showGuides: {
      type: Boolean,
      default: false
    },
    shapes: {
      type: Array,
      default: () => []
    }
  },
  emits: ['shape-created', 'shape-modified', 'measurement-updated'],
  setup(props, { emit }) {
    const precisionShapesLayer = ref(null)

    // Shape storage
    const architecturalShapes = ref([])
    const gardenShapes = ref([])
    const measurements = ref([])
    const geometryGuides = ref([])
    const shapeHandles = ref([])
    const snappingGuides = ref([])

    // Editing state
    const isCreating = ref(false)
    const currentCreation = ref(null)
    const isDragging = ref(false)
    const draggedHandle = ref(null)
    const selectedShape = ref(null)

    // Golden ratio constant
    const GOLDEN_RATIO = 1.618033988749895

    // Architectural shape templates
    const ARCHITECTURAL_TEMPLATES = {
      ARCH: {
        type: 'arch',
        create: (x, y, width, height) => createArchPath(x, y, width, height)
      },
      COLUMN: {
        type: 'column',
        create: (x, y, width, height) => createColumnShape(x, y, width, height)
      },
      BEAM: {
        type: 'beam',
        create: (x, y, width, height) => createBeamShape(x, y, width, height)
      },
      FOUNDATION: {
        type: 'foundation',
        create: (x, y, width, height) => createFoundationShape(x, y, width, height)
      },
      WINDOW: {
        type: 'window',
        create: (x, y, width, height) => createWindowShape(x, y, width, height)
      },
      DOOR: {
        type: 'door',
        create: (x, y, width, height) => createDoorShape(x, y, width, height)
      }
    }

    // Garden layout templates
    const GARDEN_TEMPLATES = {
      RAISED_BED: {
        type: 'garden-bed',
        create: (x, y, width, height) => createRaisedBed(x, y, width, height)
      },
        PATH: {
        type: 'path',
        create: (points) => createPathShape(points)
      },
      POND: {
        type: 'water-feature',
        create: (x, y, width, height) => createPondShape(x, y, width, height)
      },
      FOUNTAIN: {
        type: 'water-feature',
        create: (x, y, radius) => createFountainShape(x, y, radius)
      },
      TERRACE: {
        type: 'garden-bed',
        create: (x, y, width, height, levels) => createTerraceBed(x, y, width, height, levels)
      }
    }

    // Create architectural arch shape
    const createArchPath = (x, y, width, height) => {
      const archHeight = height * 0.6
      const archWidth = width * 0.8

      const path = `
        M ${x} ${y + height}
        L ${x} ${y + height - archHeight}
        Q ${x + archWidth/2} ${y} ${x + archWidth} ${y + height - archHeight}
        L ${x + width} ${y + height}
        Z
      `

      return {
        id: generateElementId(),
        type: 'arch',
        config: {
          x: 0,
          y: 0,
          data: path,
          fill: 'transparent',
          stroke: '#2c2c2c',
          strokeWidth: 2,
          lineJoin: 'round',
          draggable: true,
          name: 'arch-shape'
        }
      }
    }

    // Create column shape
    const createColumnShape = (x, y, width, height) => {
      const columnWidth = width * 0.3
      const capitalHeight = height * 0.15
      const baseHeight = height * 0.1

      const path = `
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

      return {
        id: generateElementId(),
        type: 'column',
        config: {
          x: 0,
          y: 0,
          data: path,
          fill: 'rgba(44, 44, 44, 0.1)',
          stroke: '#2c2c2c',
          strokeWidth: 2,
          draggable: true,
          name: 'column-shape'
        }
      }
    }

    // Create beam shape
    const createBeamShape = (x, y, width, height) => {
      const beamHeight = height * 0.2

      return {
        id: generateElementId(),
        type: 'beam',
        config: {
          x: x,
          y: y + (height - beamHeight) / 2,
          width: width,
          height: beamHeight,
          fill: 'rgba(44, 44, 44, 0.15)',
          stroke: '#2c2c2c',
          strokeWidth: 2,
          cornerRadius: 2,
          draggable: true,
          name: 'beam-shape'
        }
      }
    }

    // Create foundation shape
    const createFoundationShape = (x, y, width, height) => {
      const thickness = 20

      return {
        id: generateElementId(),
        type: 'foundation',
        config: {
          x: x,
          y: y + height - thickness,
          width: width,
          height: thickness,
          fill: 'rgba(100, 100, 100, 0.2)',
          stroke: '#666666',
          strokeWidth: 2,
          strokeDasharray: [5, 5],
          draggable: true,
          name: 'foundation-shape'
        }
      }
    }

    // Create window shape
    const createWindowShape = (x, y, width, height) => {
      const frameThickness = 8
      const crossX = x + width / 2
      const crossY = y + height / 2

      return {
        id: generateElementId(),
        type: 'window-group',
        elements: [
          // Window frame
          {
            type: 'rect',
            config: {
              x: x,
              y: y,
              width: width,
              height: height,
              fill: 'transparent',
              stroke: '#2c2c2c',
              strokeWidth: frameThickness,
              draggable: true
            }
          },
          // Vertical cross
          {
            type: 'rect',
            config: {
              x: crossX - frameThickness/2,
              y: y + frameThickness,
              width: frameThickness,
              height: height - frameThickness * 2,
              fill: '#2c2c2c',
              stroke: 'none',
              draggable: false
            }
          },
          // Horizontal cross
          {
            type: 'rect',
            config: {
              x: x + frameThickness,
              y: crossY - frameThickness/2,
              width: width - frameThickness * 2,
              height: frameThickness,
              fill: '#2c2c2c',
              stroke: 'none',
              draggable: false
            }
          }
        ]
      }
    }

    // Create door shape
    const createDoorShape = (x, y, width, height) => {
      const doorWidth = width * 0.8
      const frameThickness = 6

      return {
        id: generateElementId(),
        type: 'door-group',
        elements: [
          // Door frame
          {
            type: 'rect',
            config: {
              x: x,
              y: y,
              width: width,
              height: height,
              fill: 'transparent',
              stroke: '#2c2c2c',
              strokeWidth: frameThickness,
              draggable: true
            }
          },
          // Door
          {
            type: 'rect',
            config: {
              x: x + (width - doorWidth) / 2,
              y: y + frameThickness,
              width: doorWidth,
              height: height - frameThickness,
              fill: 'rgba(139, 69, 19, 0.3)',
              stroke: '#2c2c2c',
              strokeWidth: 2,
              draggable: false
            }
          },
          // Door knob
          {
            type: 'circle',
            config: {
              x: x + width * 0.7,
              y: y + height / 2,
              radius: 4,
              fill: '#666666',
              stroke: 'none',
              draggable: false
            }
          }
        ]
      }
    }

    // Create raised garden bed
    const createRaisedBed = (x, y, width, height) => {
      const bedHeight = 60
      const soilHeight = height - bedHeight

      return {
        id: generateElementId(),
        type: 'garden-bed',
        groupConfig: {
          x: x,
          y: y,
          draggable: true
        },
        config: {
          width: width,
          height: height,
          fill: 'transparent',
          stroke: '#8B4513',
          strokeWidth: 4,
          cornerRadius: 8
        },
        decorations: [
          {
            id: generateElementId(),
            type: 'soil',
            config: {
              x: 2,
              y: bedHeight,
              width: width - 4,
              height: soilHeight - 2,
              fill: '#654321',
              stroke: 'none',
              opacity: 0.7
            }
          }
        ]
      }
    }

    // Create path shape
    const createPathShape = (points) => {
      if (!points || points.length < 2) return null

      const pathData = points.reduce((path, point, index) => {
        if (index === 0) {
          return `M ${point.x} ${point.y}`
        } else {
          return `${path} L ${point.x} ${point.y}`
        }
      }, '')

      return {
        id: generateElementId(),
        type: 'path',
        config: {
          data: pathData + ' Z',
          fill: 'rgba(200, 200, 200, 0.3)',
          stroke: '#999999',
          strokeWidth: 3,
          lineCap: 'round',
          lineJoin: 'round',
          tension: 0.2,
          draggable: true
        }
      }
    }

    // Create pond shape
    const createPondShape = (x, y, width, height) => {
      return {
        id: generateElementId(),
        type: 'water-feature',
        config: {
          x: x,
          y: y,
          width: width,
          height: height * 0.7, // Elliptical pond
          fill: 'rgba(64, 164, 223, 0.4)',
          stroke: '#4094DF',
          strokeWidth: 2,
          draggable: true
        }
      }
    }

    // Create fountain shape
    const createFountainShape = (x, y, radius) => {
      const levels = [
        { r: radius, opacity: 0.3 },
        { r: radius * 0.7, opacity: 0.5 },
        { r: radius * 0.4, opacity: 0.7 }
      ]

      return {
        id: generateElementId(),
        type: 'water-feature',
        config: {
          x: x,
          y: y,
          radius: radius,
          fill: 'rgba(64, 164, 223, 0.3)',
          stroke: '#4094DF',
          strokeWidth: 2,
          draggable: true
        },
        decorations: levels.map((level, index) => ({
          id: generateElementId(),
          type: 'fountain-level',
          config: {
            x: x,
            y: y,
            radius: level.r,
            fill: 'transparent',
            stroke: '#4094DF',
            strokeWidth: 1,
            opacity: level.opacity
          }
        }))
      }
    }

    // Create terrace garden bed
    const createTerraceBed = (x, y, width, height, levels = 3) => {
      const levelHeight = height / levels

      return {
        id: generateElementId(),
        type: 'garden-bed',
        groupConfig: {
          x: x,
          y: y,
          draggable: true
        },
        config: {
          width: width,
          height: height,
          fill: 'transparent',
          stroke: '#8B4513',
          strokeWidth: 3,
          cornerRadius: 4
        },
        decorations: Array.from({ length: levels }, (_, index) => ({
          id: generateElementId(),
          type: 'terrace-level',
          config: {
            x: 3,
            y: index * levelHeight + 3,
            width: width - 6,
            height: levelHeight - 3,
            fill: `rgba(101, 67, 33, ${0.3 + index * 0.1})`,
            stroke: 'none'
          }
        }))
      }
    }

    // Create measurement line
    const createMeasurement = (startPoint, endPoint, label) => {
      const midX = (startPoint.x + endPoint.x) / 2
      const midY = (startPoint.y + endPoint.y) / 2

      return {
        id: generateElementId(),
        groupConfig: {
          draggable: false
        },
        lineConfig: {
          points: [startPoint.x, startPoint.y, endPoint.x, endPoint.y],
          stroke: '#FF6B35',
          strokeWidth: 2,
          lineDasharray: [5, 5]
        },
        startArrowConfig: {
          data: 'M 0,-8 L 8,0 L 0,8',
          x: startPoint.x,
          y: startPoint.y,
          fill: '#FF6B35',
          rotation: Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) * 180 / Math.PI + 90
        },
        endArrowConfig: {
          data: 'M 0,-8 L 8,0 L 0,8',
          x: endPoint.x,
          y: endPoint.y,
          fill: '#FF6B35',
          rotation: Math.atan2(startPoint.y - endPoint.y, startPoint.x - endPoint.x) * 180 / Math.PI + 90
        },
        textConfig: {
          x: midX,
          y: midY - 15,
          text: label,
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: '#FF6B35',
          align: 'center'
        }
      }
    }

    // Create golden ratio guide
    const createGoldenRatioGuide = (x, y, width, height) => {
      const goldenWidth = width
      const goldenHeight = height / GOLDEN_RATIO
      const nextWidth = goldenWidth / GOLDEN_RATIO
      const nextHeight = goldenHeight / GOLDEN_RATIO

      return {
        id: generateElementId(),
        type: 'golden-ratio',
        groupConfig: {
          opacity: 0.3
        },
        goldenRects: [
          {
            id: generateElementId(),
            config: {
              x: x,
              y: y,
              width: goldenWidth,
              height: goldenHeight,
              fill: 'transparent',
              stroke: '#9C27B0',
              strokeWidth: 1,
              strokeDasharray: [3, 3]
            }
          },
          {
            id: generateElementId(),
            config: {
              x: x + goldenWidth - nextWidth,
              y: y,
              width: nextWidth,
              height: nextHeight,
              fill: 'transparent',
              stroke: '#9C27B0',
              strokeWidth: 1,
              strokeDasharray: [3, 3]
            }
          }
        ]
      }
    }

    // Create perspective grid
    const createPerspectiveGrid = (vanishingPoint, gridSize = 50, lines = 20) => {
      const perspectiveLines = []

      // Horizontal lines converging to vanishing point
      for (let i = -lines/2; i <= lines/2; i++) {
        const y = vanishingPoint.y + i * gridSize
        perspectiveLines.push({
          id: generateElementId(),
          config: {
            points: [
              vanishingPoint.x - 2000, y,
              vanishingPoint.x + 2000, y
            ],
            stroke: 'rgba(0, 0, 255, 0.2)',
            strokeWidth: 1,
            lineDasharray: [2, 4]
          }
        })
      }

      // Vertical lines converging to vanishing point
      for (let i = -lines/2; i <= lines/2; i++) {
        const x = vanishingPoint.x + i * gridSize
        perspectiveLines.push({
          id: generateElementId(),
          config: {
            points: [
              x, vanishingPoint.y - 2000,
              x, vanishingPoint.y + 2000
            ],
            stroke: 'rgba(0, 0, 255, 0.2)',
            strokeWidth: 1,
            lineDasharray: [2, 4]
          }
        })
      }

      return {
        id: generateElementId(),
        type: 'perspective-grid',
        groupConfig: {
          opacity: 0.5
        },
        perspectiveLines
      }
    }

    // Snap point to grid
    const snapToGridPoint = (point) => {
      if (!props.snapToGrid) return point

      return {
        x: Math.round(point.x / props.gridSize) * props.gridSize,
        y: Math.round(point.y / props.gridSize) * props.gridSize
      }
    }

    // Public methods
    const createArchitecturalShape = (type, x, y, width, height) => {
      const template = ARCHITECTURAL_TEMPLATES[type]
      if (!template) return null

      const shape = template.create(x, y, width, height)
      architecturalShapes.value.push(shape)
      emit('shape-created', shape)
      return shape
    }

    const createGardenShape = (type, ...params) => {
      const template = GARDEN_TEMPLATES[type]
      if (!template) return null

      const shape = template.create(...params)
      gardenShapes.value.push(shape)
      emit('shape-created', shape)
      return shape
    }

    const addMeasurement = (startPoint, endPoint, label) => {
      const measurement = createMeasurement(startPoint, endPoint, label)
      measurements.value.push(measurement)
      emit('measurement-updated', measurement)
      return measurement
    }

    const addGoldenRatioGuide = (x, y, width, height) => {
      const guide = createGoldenRatioGuide(x, y, width, height)
      geometryGuides.value.push(guide)
      return guide
    }

    const addPerspectiveGrid = (vanishingPoint) => {
      const grid = createPerspectiveGrid(vanishingPoint)
      geometryGuides.value.push(grid)
      return grid
    }

    // Event handlers
    const handleShapePointerDown = (event, shape) => {
      selectedShape.value = shape
      emit('shape-modified', { action: 'select', shape })
    }

    const handleShapePointerMove = (event, shape) => {
      if (selectedShape.value === shape) {
        emit('shape-modified', { action: 'move', shape, event })
      }
    }

    const handleShapeTransformEnd = (event, shape) => {
      emit('shape-modified', { action: 'transform', shape, event })
    }

    const startHandleDrag = (event, handle) => {
      isDragging.value = true
      draggedHandle.value = handle
    }

    const updateHandleDrag = (event, handle) => {
      if (isDragging.value && draggedHandle.value === handle) {
        // Update handle position and shape geometry
      }
    }

    const endHandleDrag = (event, handle) => {
      isDragging.value = false
      draggedHandle.value = null
    }

    // Watch for props changes
    watch(() => props.shapes, (newShapes) => {
      // Sync external shapes with internal state
      architecturalShapes.value = newShapes.filter(s => s.type.includes('arch') || s.type.includes('column') || s.type.includes('beam'))
      gardenShapes.value = newShapes.filter(s => s.type.includes('garden') || s.type.includes('path') || s.type.includes('water'))
    }, { deep: true })

    return {
      // Refs
      precisionShapesLayer,

      // State
      architecturalShapes,
      gardenShapes,
      measurements,
      geometryGuides,
      shapeHandles,
      snappingGuides,
      selectedShape,
      isCreating,
      currentCreation,

      // Methods
      createArchitecturalShape,
      createGardenShape,
      addMeasurement,
      addGoldenRatioGuide,
      addPerspectiveGrid,
      snapToGridPoint,

      // Event handlers
      handleShapePointerDown,
      handleShapePointerMove,
      handleShapeTransformEnd,
      startHandleDrag,
      updateHandleDrag,
      endHandleDrag,

      // Templates
      ARCHITECTURAL_TEMPLATES,
      GARDEN_TEMPLATES
    }
  }
}
</script>

<style scoped>
/* Precision shapes styles */
</style>