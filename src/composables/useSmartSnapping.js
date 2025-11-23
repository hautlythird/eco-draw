import { ref, computed } from 'vue'

export function useSmartSnapping() {
  const snapEnabled = ref(true)
  const snapStrength = ref(15) // pixels
  const snapToGrid = ref(true)
  const snapToObjects = ref(true)
  const snapToAngles = ref(true)
  const snapToMeasurements = ref(false)
  const showSnapIndicators = ref(true)

  // Snap grid configuration
  const gridConfig = ref({
    size: 50, // pixels
    subdivisions: 4, // subdivisions per grid cell
    origin: { x: 0, y: 0 },
    angle: 0 // grid rotation in degrees
  })

  // Angular snap configuration
  const angleSnapConfig = ref({
    angles: [0, 15, 30, 45, 60, 75, 90, 120, 135, 150, 180],
    customAngles: [],
    strength: 3 // degrees
  })

  // Measurement snap configuration
  const measurementConfig = ref({
    distances: [0.5, 1, 2, 5, 10], // meters
    conversionFactor: 50 // pixels per meter
  })

  // Snap guides for visual feedback
  const snapGuides = ref([])
  const snapPoints = ref([])
  const alignmentGuides = ref([])

  // Object tracking for snapping
  const trackedObjects = ref([])
  const objectSnapPoints = ref(new Map())

  // Current snap state
  const currentSnap = ref({
    point: null,
    type: null,
    strength: 0,
    source: null
  })

  // Grid snapping
  const snapToGridPoint = (point) => {
    if (!snapToGrid.value || !snapEnabled.value) return point

    const { size, subdivisions, origin } = gridConfig.value
    const cellSize = size / subdivisions

    // Calculate grid-relative position
    const relativeX = point.x - origin.x
    const relativeY = point.y - origin.y

    // Apply grid rotation if needed
    const rotatedPoint = gridConfig.value.angle !== 0
      ? rotatePoint(relativeX, relativeY, -gridConfig.value.angle)
      : { x: relativeX, y: relativeY }

    // Find nearest grid intersection
    const gridX = Math.round(rotatedPoint.x / cellSize) * cellSize
    const gridY = Math.round(rotatedPoint.y / cellSize) * cellY

    // Check if within snap strength
    const distance = Math.sqrt(
      Math.pow(gridX - rotatedPoint.x, 2) +
      Math.pow(gridY - rotatedPoint.y, 2)
    )

    if (distance <= snapStrength.value) {
      // Rotate back and apply origin offset
      const snappedPoint = gridConfig.value.angle !== 0
        ? rotatePoint(gridX, gridY, gridConfig.value.angle)
        : { x: gridX, y: gridY }

      const finalPoint = {
        x: snappedPoint.x + origin.x,
        y: snappedPoint.y + origin.y
      }

      currentSnap.value = {
        point: finalPoint,
        type: 'grid',
        strength: distance,
        source: 'grid'
      }

      addSnapGuide(finalPoint, 'grid')
      return finalPoint
    }

    return point
  }

  // Object snapping
  const snapToObjectPoints = (point, excludeId = null) => {
    if (!snapToObjects.value || !snapEnabled.value) return point

    let closestPoint = null
    let minDistance = snapStrength.value
    let snapType = null
    let sourceObject = null

    // Check all tracked objects for snap points
    for (const obj of trackedObjects.value) {
      if (obj.id === excludeId) continue

      const objectPoints = getObjectSnapPoints(obj)

      for (const snapPoint of objectPoints) {
        const distance = Math.sqrt(
          Math.pow(snapPoint.x - point.x, 2) +
          Math.pow(snapPoint.y - point.y, 2)
        )

        if (distance < minDistance) {
          minDistance = distance
          closestPoint = snapPoint
          snapType = snapPoint.type
          sourceObject = obj
        }
      }
    }

    if (closestPoint) {
      currentSnap.value = {
        point: closestPoint,
        type: snapType,
        strength: minDistance,
        source: sourceObject
      }

      addSnapGuide(closestPoint, 'object')
      addAlignmentGuides(closestPoint, sourceObject)
      return closestPoint
    }

    return point
  }

  // Angular snapping
  const snapToAngle = (startPoint, endPoint) => {
    if (!snapToAngles.value || !snapEnabled.value) return endPoint

    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x)
    const distance = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) +
      Math.pow(endPoint.y - startPoint.y, 2)
    )

    // Check all snap angles
    const allAngles = [...angleSnapConfig.value.angles, ...angleSnapConfig.value.customAngles]

    for (const snapAngle of allAngles) {
      const snapAngleRad = (snapAngle * Math.PI) / 180
      const angleDiff = Math.abs(angle - snapAngleRad)

      if (angleDiff <= (angleSnapConfig.value.strength * Math.PI / 180)) {
        // Calculate snapped point
        const snappedPoint = {
          x: startPoint.x + Math.cos(snapAngleRad) * distance,
          y: startPoint.y + Math.sin(snapAngleRad) * distance
        }

        currentSnap.value = {
          point: snappedPoint,
          type: 'angle',
          strength: angleDiff,
          source: `angle-${snapAngle}°`
        }

        addAngularGuide(startPoint, snappedPoint, snapAngle)
        return snappedPoint
      }
    }

    return endPoint
  }

  // Measurement snapping
  const snapToMeasurements = (point, referencePoint = null) => {
    if (!snapToMeasurements.value || !snapEnabled.value || !referencePoint) return point

    const conversion = measurementConfig.value.conversionFactor

    for (const distance of measurementConfig.value.distances) {
      const pixelDistance = distance * conversion

      // Check horizontal snap
      const horizontalPoint = { x: referencePoint.x + pixelDistance, y: point.y }
      const hDistance = Math.abs(horizontalPoint.x - point.x)

      if (hDistance <= snapStrength.value) {
        currentSnap.value = {
          point: horizontalPoint,
          type: 'measurement',
          strength: hDistance,
          source: `${distance}m-horizontal`
        }

        addMeasurementGuide(referencePoint, horizontalPoint, `${distance}m`)
        return horizontalPoint
      }

      // Check vertical snap
      const verticalPoint = { x: point.x, y: referencePoint.y + pixelDistance }
      const vDistance = Math.abs(verticalPoint.y - point.y)

      if (vDistance <= snapStrength.value) {
        currentSnap.value = {
          point: verticalPoint,
          type: 'measurement',
          strength: vDistance,
          source: `${distance}m-vertical`
        }

        addMeasurementGuide(referencePoint, verticalPoint, `${distance}m`)
        return verticalPoint
      }
    }

    return point
  }

  // Get snap points for an object
  const getObjectSnapPoints = (obj) => {
    if (objectSnapPoints.value.has(obj.id)) {
      return objectSnapPoints.value.get(obj.id)
    }

    const points = []

    switch (obj.type) {
      case 'rect':
        points.push(
          { x: obj.x, y: obj.y, type: 'corner' }, // top-left
          { x: obj.x + obj.width, y: obj.y, type: 'corner' }, // top-right
          { x: obj.x, y: obj.y + obj.height, type: 'corner' }, // bottom-left
          { x: obj.x + obj.width, y: obj.y + obj.height, type: 'corner' }, // bottom-right
          { x: obj.x + obj.width/2, y: obj.y, type: 'edge-center' }, // top-center
          { x: obj.x + obj.width/2, y: obj.y + obj.height, type: 'edge-center' }, // bottom-center
          { x: obj.x, y: obj.y + obj.height/2, type: 'edge-center' }, // left-center
          { x: obj.x + obj.width, y: obj.y + obj.height/2, type: 'edge-center' }, // right-center
          { x: obj.x + obj.width/2, y: obj.y + obj.height/2, type: 'center' } // center
        )
        break

      case 'circle':
        points.push(
          { x: obj.x, y: obj.y, type: 'center' },
          { x: obj.x + obj.radius, y: obj.y, type: 'edge' },
          { x: obj.x - obj.radius, y: obj.y, type: 'edge' },
          { x: obj.x, y: obj.y + obj.radius, type: 'edge' },
          { x: obj.x, y: obj.y - obj.radius, type: 'edge' }
        )
        break

      case 'line':
        points.push(
          { x: obj.points[0], y: obj.points[1], type: 'endpoint' },
          { x: obj.points[obj.points.length - 2], y: obj.points[obj.points.length - 1], type: 'endpoint' }
        )

        // Add midpoint
        const midX = (obj.points[0] + obj.points[obj.points.length - 2]) / 2
        const midY = (obj.points[1] + obj.points[obj.points.length - 1]) / 2
        points.push({ x: midX, y: midY, type: 'midpoint' })
        break
    }

    objectSnapPoints.value.set(obj.id, points)
    return points
  }

  // Add object to tracking
  const trackObject = (obj) => {
    if (!trackedObjects.value.find(o => o.id === obj.id)) {
      trackedObjects.value.push(obj)
    }
  }

  // Remove object from tracking
  const untrackObject = (objId) => {
    trackedObjects.value = trackedObjects.value.filter(o => o.id !== objId)
    objectSnapPoints.value.delete(objId)
  }

  // Update tracked object
  const updateTrackedObject = (obj) => {
    const index = trackedObjects.value.findIndex(o => o.id === obj.id)
    if (index > -1) {
      trackedObjects.value[index] = obj
      objectSnapPoints.value.delete(obj.id) // Force recalculation
    }
  }

  // Visual guide management
  const addSnapGuide = (point, type) => {
    if (!showSnapIndicators.value) return

    snapGuides.value.push({
      id: `snap-${Date.now()}`,
      x: point.x,
      y: point.y,
      type,
      timestamp: Date.now()
    })

    // Limit guide lifetime
    setTimeout(() => {
      snapGuides.value = snapGuides.value.filter(g =>
        Date.now() - g.timestamp < 1000
      )
    }, 1000)
  }

  const addAlignmentGuides = (point, sourceObject) => {
    if (!showSnapIndicators.value) return

    // Add horizontal and vertical alignment guides
    alignmentGuides.value.push(
      {
        id: `align-h-${Date.now()}`,
        type: 'horizontal',
        y: point.y,
        startX: 0,
        endX: 9999,
        timestamp: Date.now()
      },
      {
        id: `align-v-${Date.now()}`,
        type: 'vertical',
        x: point.x,
        startY: 0,
        endY: 9999,
        timestamp: Date.now()
      }
    )
  }

  const addAngularGuide = (startPoint, endPoint, angle) => {
    if (!showSnapIndicators.value) return

    alignmentGuides.value.push({
      id: `angular-${Date.now()}`,
      type: 'angular',
      startPoint,
      endPoint,
      angle,
      timestamp: Date.now()
    })
  }

  const addMeasurementGuide = (startPoint, endPoint, label) => {
    if (!showSnapIndicators.value) return

    alignmentGuides.value.push({
      id: `measurement-${Date.now()}`,
      type: 'measurement',
      startPoint,
      endPoint,
      label,
      timestamp: Date.now()
    })
  }

  // Combined snapping function
  const snapPoint = (point, options = {}) => {
    if (!snapEnabled.value) return point

    const {
      excludeId = null,
      referencePoint = null,
      startPoint = null,
      preferGrid = true
    } = options

    let snappedPoint = { ...point }

    // Apply snapping in order of preference
    if (preferGrid) {
      snappedPoint = snapToGridPoint(snappedPoint)
    }

    if (snapToObjects.value) {
      snappedPoint = snapToObjectPoints(snappedPoint, excludeId)
    }

    if (snapToMeasurements.value && referencePoint) {
      snappedPoint = snapToMeasurements(snappedPoint, referencePoint)
    }

    if (snapToAngles.value && startPoint) {
      snappedPoint = snapToAngle(startPoint, snappedPoint)
    } else if (!preferGrid && snapToGrid.value) {
      // Try grid snapping last if not preferred
      snappedPoint = snapToGridPoint(snappedPoint)
    }

    return snappedPoint
  }

  // Rotate point around origin
  const rotatePoint = (x, y, angleDegrees) => {
    const angleRad = (angleDegrees * Math.PI) / 180
    const cosAngle = Math.cos(angleRad)
    const sinAngle = Math.sin(angleRad)

    return {
      x: x * cosAngle - y * sinAngle,
      x: x * sinAngle + y * cosAngle
    }
  }

  // Clear snap guides
  const clearSnapGuides = () => {
    snapGuides.value = []
    alignmentGuides.value = []
    currentSnap.value = { point: null, type: null, strength: 0, source: null }
  }

  // Cleanup old guides
  const cleanupGuides = () => {
    const now = Date.now()

    snapGuides.value = snapGuides.value.filter(guide =>
      now - guide.timestamp < 2000
    )

    alignmentGuides.value = alignmentGuides.value.filter(guide =>
      now - guide.timestamp < 3000
    )
  }

  // Auto-cleanup interval
  let cleanupInterval = null

  const startAutoCleanup = () => {
    if (cleanupInterval) clearInterval(cleanupInterval)
    cleanupInterval = setInterval(cleanupGuides, 1000)
  }

  const stopAutoCleanup = () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  }

  // Configuration utilities
  const addCustomAngle = (angle) => {
    if (!angleSnapConfig.value.customAngles.includes(angle)) {
      angleSnapConfig.value.customAngles.push(angle)
      angleSnapConfig.value.customAngles.sort((a, b) => a - b)
    }
  }

  const removeCustomAngle = (angle) => {
    const index = angleSnapConfig.value.customAngles.indexOf(angle)
    if (index > -1) {
      angleSnapConfig.value.customAngles.splice(index, 1)
    }
  }

  const addCustomMeasurement = (distance) => {
    if (!measurementConfig.value.distances.includes(distance)) {
      measurementConfig.value.distances.push(distance)
      measurementConfig.value.distances.sort((a, b) => a - b)
    }
  }

  const removeCustomMeasurement = (distance) => {
    const index = measurementConfig.value.distances.indexOf(distance)
    if (index > -1) {
      measurementConfig.value.distances.splice(index, 1)
    }
  }

  // Preset configurations
  const applyPreset = (presetName) => {
    const presets = {
      'architectural': {
        snapToGrid: true,
        snapToObjects: true,
        snapToAngles: true,
        snapToMeasurements: true,
        gridConfig: { size: 100, subdivisions: 2 },
        angleSnapConfig: { angles: [0, 30, 45, 60, 90] },
        measurementConfig: { distances: [1, 2, 5, 10] }
      },
      'garden-design': {
        snapToGrid: true,
        snapToObjects: true,
        snapToAngles: false,
        snapToMeasurements: false,
        gridConfig: { size: 50, subdivisions: 4 },
        angleSnapConfig: { angles: [0, 45, 90] },
        measurementConfig: { distances: [0.5, 1, 2] }
      },
      'technical-drawing': {
        snapToGrid: true,
        snapToObjects: true,
        snapToAngles: true,
        snapToMeasurements: true,
        gridConfig: { size: 20, subdivisions: 1 },
        angleSnapConfig: { angles: [0, 15, 30, 45, 60, 75, 90] },
        measurementConfig: { distances: [0.1, 0.5, 1, 2, 5] }
      }
    }

    const preset = presets[presetName]
    if (preset) {
      Object.assign(preset, preset)
    }
  }

  return {
    // State
    snapEnabled,
    snapStrength,
    snapToGrid,
    snapToObjects,
    snapToAngles,
    snapToMeasurements,
    showSnapIndicators,
    gridConfig,
    angleSnapConfig,
    measurementConfig,
    snapGuides,
    snapPoints,
    alignmentGuides,
    trackedObjects,
    currentSnap,

    // Core methods
    snapPoint,
    snapToGridPoint,
    snapToObjectPoints,
    snapToAngle,
    snapToMeasurements,

    // Object tracking
    trackObject,
    untrackObject,
    updateTrackedObject,
    getObjectSnapPoints,

    // Visual guides
    addSnapGuide,
    addAlignmentGuides,
    addAngularGuide,
    addMeasurementGuide,
    clearSnapGuides,

    // Configuration
    addCustomAngle,
    removeCustomAngle,
    addCustomMeasurement,
    removeCustomMeasurement,
    applyPreset,

    // Lifecycle
    startAutoCleanup,
    stopAutoCleanup,
    cleanupGuides
  }
}