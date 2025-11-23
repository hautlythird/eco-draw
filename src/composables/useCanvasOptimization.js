import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export function useCanvasOptimization() {
  // Performance state
  const fps = ref(60)
  const frameTime = ref(0)
  const renderTime = ref(0)
  const memoryUsage = ref(0)
  const elementCount = ref(0)
  const visibleElementCount = ref(0)

  // Viewport configuration
  const viewport = ref({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    scale: 1
  })

  // LOD (Level of Detail) configuration
  const lodConfig = ref({
    enabled: true,
    thresholds: {
      high: 1.0,      // Scale >= 1.0 = Full detail
      medium: 0.5,    // Scale >= 0.5 = Medium detail
      low: 0.25,      // Scale >= 0.25 = Low detail
      minimal: 0.1    // Scale < 0.25 = Minimal detail
    },
    simplificationFactors: {
      high: 1.0,      // No simplification
      medium: 0.7,    // 30% reduction
      low: 0.4,       // 60% reduction
      minimal: 0.2    // 80% reduction
    }
  })

  // Culling configuration
  const cullingConfig = ref({
    enabled: true,
    margin: 100,      // Extra margin around viewport for smooth transitions
    frustumPadding: 50,
    enableOcclusion: false,
    enableDistanceCulling: true,
    maxCullingDistance: 2000
  })

  // Rendering optimization
  const renderConfig = ref({
    enableDoubleBuffering: true,
    enableDirtyRegionOptimization: true,
    enableBatchRendering: true,
    maxBatchSize: 100,
    enableObjectPooling: true,
    enableVirtualization: true,
    throttleRedraws: true,
    targetFrameTime: 16.67, // 60 FPS
    adaptiveQuality: true
  })

  // Memory management
  const memoryConfig = value({
    enableGarbageCollection: true,
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    cleanupThreshold: 0.8,
    enableTextureCompression: true,
    enableMeshCompression: true,
    poolSize: 1000
  })

  // Performance monitoring
  const performanceMetrics = ref({
    frameCount: 0,
    totalFrameTime: 0,
    averageFrameTime: 0,
    worstFrameTime: 0,
    droppedFrames: 0,
    renderCalls: 0,
    culledObjects: 0,
    lodSimplifications: 0
  })

  // Object pools for memory efficiency
  const objectPools = ref({
    nodes: [],
    lines: [],
    shapes: [],
    images: [],
    texts: []
  })

  // Dirty regions for partial redraws
  const dirtyRegions = ref([])
  const lastRenderBounds = ref(null)

  // Performance timers
  let frameTimer = null
  let renderTimer = null
  let memoryTimer = null
  let lastFrameTime = performance.now()

  // Calculate LOD level for an element based on scale and distance
  const calculateLODLevel = (element, viewport) => {
    if (!lodConfig.value.enabled) return 'high'

    const scale = viewport.scale
    const distance = calculateDistance(element, viewport)

    // Combine scale and distance for LOD calculation
    const effectiveScale = scale * Math.max(0.1, 1 - distance / cullingConfig.value.maxCullingDistance)

    if (effectiveScale >= lodConfig.value.thresholds.high) return 'high'
    if (effectiveScale >= lodConfig.value.thresholds.medium) return 'medium'
    if (effectiveScale >= lodConfig.value.thresholds.low) return 'low'
    return 'minimal'
  }

  // Calculate distance from element to viewport center
  const calculateDistance = (element, viewport) => {
    const elementCenter = getElementCenter(element)
    const viewportCenter = {
      x: viewport.x + viewport.width / 2,
      y: viewport.y + viewport.height / 2
    }

    return Math.sqrt(
      Math.pow(elementCenter.x - viewportCenter.x, 2) +
      Math.pow(elementCenter.y - viewportCenter.y, 2)
    )
  }

  // Get element center point
  const getElementCenter = (element) => {
    if (element.x !== undefined && element.y !== undefined) {
      if (element.width !== undefined && element.height !== undefined) {
        return {
          x: element.x + element.width / 2,
          y: element.y + element.height / 2
        }
      }
      return { x: element.x, y: element.y }
    }

    // Handle other element types (lines, paths, etc.)
    if (element.points && element.points.length >= 2) {
      return {
        x: (element.points[0] + element.points[element.points.length - 2]) / 2,
        y: (element.points[1] + element.points[element.points.length - 1]) / 2
      }
    }

    return { x: 0, y: 0 }
  }

  // Check if element is in viewport
  const isInViewport = (element, viewport) => {
    if (!cullingConfig.value.enabled) return true

    const bounds = getElementBounds(element)
    const margin = cullingConfig.value.margin

    // Expand viewport bounds by margin
    const viewportBounds = {
      left: viewport.x - margin,
      top: viewport.y - margin,
      right: viewport.x + viewport.width + margin,
      bottom: viewport.y + viewport.height + margin
    }

    // Check if element bounds intersect with viewport
    return !(bounds.right < viewportBounds.left ||
             bounds.left > viewportBounds.right ||
             bounds.bottom < viewportBounds.top ||
             bounds.top > viewportBounds.bottom)
  }

  // Get element bounds
  const getElementBounds = (element) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    if (element.x !== undefined && element.y !== undefined) {
      minX = element.x
      minY = element.y

      if (element.width !== undefined && element.height !== undefined) {
        maxX = element.x + element.width
        maxY = element.y + element.height
      } else if (element.radius !== undefined) {
        maxX = element.x + element.radius
        maxY = element.y + element.radius
        minX = element.x - element.radius
        minY = element.y - element.radius
      } else if (element.radiusX !== undefined && element.radiusY !== undefined) {
        maxX = element.x + element.radiusX
        maxY = element.y + element.radiusY
        minX = element.x - element.radiusX
        minY = element.y - element.radiusY
      }
    }

    // Handle lines and paths
    if (element.points && element.points.length >= 2) {
      for (let i = 0; i < element.points.length; i += 2) {
        const x = element.points[i]
        const y = element.points[i + 1]
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }

    return {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  // Apply LOD simplification to element
  const applyLODSimplification = (element, lodLevel) => {
    if (!lodConfig.value.enabled || lodLevel === 'high') return element

    const simplificationFactor = lodConfig.value.simplificationFactors[lodLevel]
    const simplifiedElement = { ...element }

    switch (element.type) {
      case 'line':
        if (element.points && element.points.length > 4) {
          // Reduce number of points in lines
          simplifiedElement.points = simplifyPoints(element.points, simplificationFactor)
          performanceMetrics.value.lodSimplifications++
        }
        break

      case 'path':
        if (element.data) {
          // Simplify path data
          simplifiedElement.data = simplifyPath(element.data, simplificationFactor)
          performanceMetrics.value.lodSimplifications++
        }
        break

      case 'circle':
        // Reduce circle detail at low LOD
        if (lodLevel === 'minimal') {
          simplifiedElement.segments = 8 // Reduce from default 32
        } else if (lodLevel === 'low') {
          simplifiedElement.segments = 16
        }
        break

      case 'rect':
        // Simplify rectangles at very low LOD
        if (lodLevel === 'minimal' && element.cornerRadius > 0) {
          simplifiedElement.cornerRadius = Math.max(1, element.cornerRadius * simplificationFactor)
        }
        break
    }

    // Reduce shadow quality at low LOD
    if (element.shadowBlur) {
      simplifiedElement.shadowBlur = element.shadowBlur * simplificationFactor
    }

    return simplifiedElement
  }

  // Simplify array of points
  const simplifyPoints = (points, factor) => {
    if (factor >= 1.0) return points

    const step = Math.max(1, Math.floor(1 / factor))
    const simplified = []

    for (let i = 0; i < points.length; i += step * 2) {
      simplified.push(points[i], points[i + 1])
    }

    // Ensure we always include the last point
    if (simplified.length < points.length) {
      simplified.push(points[points.length - 2], points[points.length - 1])
    }

    return simplified
  }

  // Simplify SVG path data
  const simplifyPath = (pathData, factor) => {
    if (factor >= 1.0) return pathData

    // Basic path simplification - remove redundant commands
    // This is a simplified implementation
    const commands = pathData.match(/[MLCZ][^MLCZ]*/g) || []

    if (commands.length > 10) {
      const keepCount = Math.max(3, Math.floor(commands.length * factor))
      return commands.slice(0, keepCount).join('') + ' Z'
    }

    return pathData
  }

  // Optimize render list
  const optimizeRenderList = (elements, viewport) => {
    const optimized = []
    let culledCount = 0

    for (const element of elements) {
      // Frustum culling
      if (!isInViewport(element, viewport)) {
        culledCount++
        continue
      }

      // Distance culling
      if (cullingConfig.value.enableDistanceCulling) {
        const distance = calculateDistance(element, viewport)
        if (distance > cullingConfig.value.maxCullingDistance) {
          culledCount++
          continue
        }
      }

      // LOD optimization
      const lodLevel = calculateLODLevel(element, viewport)
      const optimizedElement = applyLODSimplification(element, lodLevel)

      optimized.push({
        ...optimizedElement,
        lodLevel,
        distance: calculateDistance(element, viewport)
      })
    }

    performanceMetrics.value.culledObjects = culledCount
    return optimized
  }

  // Batch similar elements for rendering
  const batchElements = (elements) => {
    if (!renderConfig.value.enableBatchRendering) return elements

    const batches = {
      lines: [],
      shapes: [],
      images: [],
      texts: []
    }

    for (const element of elements) {
      switch (element.type) {
        case 'line':
          batches.lines.push(element)
          break
        case 'rect':
        case 'circle':
        case 'ellipse':
          batches.shapes.push(element)
          break
        case 'image':
          batches.images.push(element)
          break
        case 'text':
          batches.texts.push(element)
          break
        default:
          // Add to main array for unbatched elements
          if (!batches.other) batches.other = []
          batches.other.push(element)
      }
    }

    // Combine batches with size limits
    const result = []
    for (const [type, batch] of Object.entries(batches)) {
      if (batch.length === 0) continue

      if (batch.length <= renderConfig.value.maxBatchSize) {
        result.push({ type: 'batch', batchType: type, elements: batch })
      } else {
        // Split large batches
        for (let i = 0; i < batch.length; i += renderConfig.value.maxBatchSize) {
          result.push({
            type: 'batch',
            batchType: type,
            elements: batch.slice(i, i + renderConfig.value.maxBatchSize)
          })
        }
      }
    }

    return result
  }

  // Calculate dirty regions
  const calculateDirtyRegions = (changedElements, previousBounds) => {
    if (!renderConfig.value.enableDirtyRegionOptimization) return null

    const regions = []

    for (const element of changedElements) {
      const bounds = getElementBounds(element)
      regions.push(bounds)
    }

    return regions
  }

  // Get pooled object
  const getPooledObject = (type) => {
    if (!renderConfig.value.enableObjectPooling) return null

    const pool = objectPools.value[type]
    if (pool && pool.length > 0) {
      return pool.pop()
    }

    return null
  }

  // Return object to pool
  const returnToPool = (type, object) => {
    if (!renderConfig.value.enableObjectPooling) return

    const pool = objectPools.value[type]
    if (pool && pool.length < memoryConfig.value.poolSize) {
      // Reset object state
      if (typeof object.reset === 'function') {
        object.reset()
      }
      pool.push(object)
    }
  }

  // Adaptive quality adjustment
  const adjustQuality = () => {
    if (!renderConfig.value.adaptiveQuality) return

    const targetFrameTime = renderConfig.value.targetFrameTime
    const currentFrameTime = frameTime.value

    if (currentFrameTime > targetFrameTime * 1.5) {
      // Performance is poor, reduce quality
      if (lodConfig.value.thresholds.medium > 0.3) {
        lodConfig.value.thresholds.medium *= 0.9
        lodConfig.value.thresholds.low *= 0.9
      }
    } else if (currentFrameTime < targetFrameTime * 0.7) {
      // Performance is good, increase quality
      if (lodConfig.value.thresholds.medium < 0.7) {
        lodConfig.value.thresholds.medium *= 1.1
        lodConfig.value.thresholds.low *= 1.1
      }
    }
  }

  // Memory cleanup
  const performMemoryCleanup = () => {
    if (!memoryConfig.value.enableGarbageCollection) return

    // Clear old dirty regions
    if (dirtyRegions.value.length > 50) {
      dirtyRegions.value = dirtyRegions.value.slice(-20)
    }

    // Trim object pools
    for (const [type, pool] of Object.entries(objectPools.value)) {
      if (pool.length > memoryConfig.value.poolSize / 2) {
        pool.splice(memoryConfig.value.poolSize / 4)
      }
    }

    // Force garbage collection if available
    if (window.gc && memoryUsage.value > memoryConfig.value.maxMemoryUsage * memoryConfig.value.cleanupThreshold) {
      window.gc()
    }
  }

  // Performance monitoring
  const updatePerformanceMetrics = () => {
    const now = performance.now()
    const deltaTime = now - lastFrameTime
    lastFrameTime = now

    frameTime.value = deltaTime
    fps.value = Math.round(1000 / deltaTime)

    performanceMetrics.value.frameCount++
    performanceMetrics.value.totalFrameTime += deltaTime
    performanceMetrics.value.averageFrameTime = performanceMetrics.value.totalFrameTime / performanceMetrics.value.frameCount

    if (deltaTime > performanceMetrics.value.worstFrameTime) {
      performanceMetrics.value.worstFrameTime = deltaTime
    }

    if (deltaTime > renderConfig.value.targetFrameTime * 2) {
      performanceMetrics.value.droppedFrames++
    }
  }

  // Main optimization function
  const optimizeCanvas = (elements, currentViewport) => {
    const startTime = performance.now()

    viewport.value = currentViewport
    elementCount.value = elements.length

    // Step 1: Frustum culling
    const culledElements = optimizeRenderList(elements, currentViewport)
    visibleElementCount.value = culledElements.length

    // Step 2: Batch elements
    const batchedElements = batchElements(culledElements)

    // Step 3: Calculate dirty regions
    const dirtyRegions = calculateDirtyRegions([], lastRenderBounds.value)

    renderTime.value = performance.now() - startTime
    performanceMetrics.value.renderCalls++

    return {
      elements: batchedElements,
      dirtyRegions,
      lodLevels: [...new Set(culledElements.map(el => el.lodLevel))],
      performance: {
        elementCount: elementCount.value,
        visibleCount: visibleElementCount.value,
        culledCount: performanceMetrics.value.culledObjects,
        renderTime: renderTime.value
      }
    }
  }

  // Update viewport
  const updateViewport = (newViewport) => {
    viewport.value = { ...viewport.value, ...newViewport }
  }

  // Get performance report
  const getPerformanceReport = () => {
    return {
      fps: fps.value,
      frameTime: frameTime.value,
      renderTime: renderTime.value,
      memoryUsage: memoryUsage.value,
      elementCount: elementCount.value,
      visibleElementCount: visibleElementCount.value,
      culledObjects: performanceMetrics.value.culledObjects,
      lodSimplifications: performanceMetrics.value.lodSimplifications,
      droppedFrames: performanceMetrics.value.droppedFrames,
      averageFrameTime: performanceMetrics.value.averageFrameTime,
      worstFrameTime: performanceMetrics.value.worstFrameTime
    }
  }

  // Set performance mode
  const setPerformanceMode = (mode) => {
    const modes = {
      'quality': {
        enableLOD: false,
        enableCulling: false,
        enableBatching: false,
        adaptiveQuality: false
      },
      'balanced': {
        enableLOD: true,
        enableCulling: true,
        enableBatching: true,
        adaptiveQuality: true
      },
      'performance': {
        enableLOD: true,
        enableCulling: true,
        enableBatching: true,
        adaptiveQuality: true,
        aggressiveLOD: true
      }
    }

    const settings = modes[mode] || modes.balanced

    lodConfig.value.enabled = settings.enableLOD
    cullingConfig.value.enabled = settings.enableCulling
    renderConfig.value.enableBatchRendering = settings.enableBatching
    renderConfig.value.adaptiveQuality = settings.adaptiveQuality

    if (settings.aggressiveLOD) {
      lodConfig.value.thresholds.medium = 0.7
      lodConfig.value.thresholds.low = 0.4
      lodConfig.value.simplificationFactors.low = 0.3
      lodConfig.value.simplificationFactors.minimal = 0.1
    }
  }

  // Initialize performance monitoring
  const startPerformanceMonitoring = () => {
    frameTimer = setInterval(updatePerformanceMetrics, 16) // ~60 FPS

    // Memory monitoring
    if (performance.memory) {
      memoryTimer = setInterval(() => {
        memoryUsage.value = performance.memory.usedJSHeapSize
      }, 1000)
    }

    // Adaptive quality adjustment
    if (renderConfig.value.adaptiveQuality) {
      setInterval(adjustQuality, 5000)
    }

    // Memory cleanup
    if (memoryConfig.value.enableGarbageCollection) {
      setInterval(performMemoryCleanup, 30000) // Every 30 seconds
    }
  }

  // Stop performance monitoring
  const stopPerformanceMonitoring = () => {
    if (frameTimer) {
      clearInterval(frameTimer)
      frameTimer = null
    }

    if (memoryTimer) {
      clearInterval(memoryTimer)
      memoryTimer = null
    }
  }

  onMounted(() => {
    startPerformanceMonitoring()
  })

  onUnmounted(() => {
    stopPerformanceMonitoring()
  })

  return {
    // State
    fps,
    frameTime,
    renderTime,
    memoryUsage,
    elementCount,
    visibleElementCount,
    viewport,
    performanceMetrics,

    // Configuration
    lodConfig,
    cullingConfig,
    renderConfig,
    memoryConfig,

    // Core optimization methods
    optimizeCanvas,
    updateViewport,
    calculateLODLevel,
    isInViewport,
    applyLODSimplification,

    // Performance utilities
    getPerformanceReport,
    setPerformanceMode,
    adjustQuality,
    performMemoryCleanup,

    // Object pooling
    getPooledObject,
    returnToPool,

    // Monitoring
    startPerformanceMonitoring,
    stopPerformanceMonitoring
  }
}