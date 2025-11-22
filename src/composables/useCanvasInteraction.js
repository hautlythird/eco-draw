import { ref } from 'vue'
import { logger } from '@/utils/logger'

export function useCanvasInteraction() {
  // Touch gesture tracking
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

  const getTransformedPointerPosition = (stage) => {
    const pos = stage.getPointerPosition()
    if (!pos) return { x: 0, y: 0 }
    
    const transform = stage.getAbsoluteTransform().copy()
    transform.invert()
    return transform.point(pos)
  }

  const snapToGridPoint = (x, y, gridSize, snapToGrid) => {
    if (!snapToGrid) return { x, y }
    
    const snappedX = Math.round(x / gridSize) * gridSize
    const snappedY = Math.round(y / gridSize) * gridSize
    
    return { x: snappedX, y: snappedY }
  }

  return {
    // State
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
    
    // Methods
    getTransformedPointerPosition,
    snapToGridPoint
  }
}
