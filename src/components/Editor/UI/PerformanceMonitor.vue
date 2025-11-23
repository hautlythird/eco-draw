<template>
  <div class="performance-monitor">
    <!-- Compact Mode -->
    <div v-if="compact" class="compact-display">
      <div class="performance-indicator" :class="performanceClass">
        <v-icon class="indicator-icon">{{ performanceIcon }}</v-icon>
        <span class="fps-text">{{ Math.round(fps) }} FPS</span>
      </div>
    </div>

    <!-- Full Mode -->
    <div v-else class="full-display">
      <!-- Header -->
      <div class="monitor-header">
        <div class="header-title">
          <v-icon class="mr-2">mdi-speedometer</v-icon>
          Performance Monitor
        </div>
        <div class="header-actions">
          <v-btn
            variant="text"
            size="small"
            @click="toggleMode"
            class="mode-toggle"
          >
            <v-icon>{{ showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            @click="resetMetrics"
            class="reset-btn"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat-item">
          <div class="stat-value" :class="performanceClass">{{ Math.round(fps) }}</div>
          <div class="stat-label">FPS</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatMemory(memoryUsage) }}</div>
          <div class="stat-label">Memory</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ visibleCount }}/{{ totalCount }}</div>
          <div class="stat-label">Visible</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ renderTime.toFixed(1) }}ms</div>
          <div class="stat-label">Render</div>
        </div>
      </div>

      <!-- Detailed Metrics -->
      <v-expand-transition>
        <div v-show="showDetails" class="detailed-metrics">
          <!-- Performance Graph -->
          <div class="metric-section">
            <div class="section-title">Performance History</div>
            <canvas
              ref="performanceCanvas"
              class="performance-graph"
              width="300"
              height="100"
            ></canvas>
          </div>

          <!-- Optimization Stats -->
          <div class="metric-section">
            <div class="section-title">Optimization Statistics</div>
            <div class="optimization-stats">
              <div class="opt-stat">
                <span class="opt-label">Culled Objects:</span>
                <span class="opt-value">{{ culledObjects }}</span>
              </div>
              <div class="opt-stat">
                <span class="opt-label">LOD Simplifications:</span>
                <span class="opt-value">{{ lodSimplifications }}</span>
              </div>
              <div class="opt-stat">
                <span class="opt-label">Dropped Frames:</span>
                <span class="opt-value">{{ droppedFrames }}</span>
              </div>
              <div class="opt-stat">
                <span class="opt-label">Average Frame Time:</span>
                <span class="opt-value">{{ averageFrameTime.toFixed(2) }}ms</span>
              </div>
            </div>
          </div>

          <!-- LOD Levels -->
          <div class="metric-section" v-if="lodLevels.length > 0">
            <div class="section-title">LOD Distribution</div>
            <div class="lod-distribution">
              <div
                v-for="level in lodLevels"
                :key="level"
                class="lod-level"
                :class="`lod-${level}`"
              >
                <div class="lod-indicator"></div>
                <span class="lod-label">{{ level.toUpperCase() }}</span>
              </div>
            </div>
          </div>

          <!-- Performance Mode Selection -->
          <div class="metric-section">
            <div class="section-title">Performance Mode</div>
            <v-chip-group v-model="selectedMode" mandatory>
              <v-chip
                v-for="mode in performanceModes"
                :key="mode.value"
                :value="mode.value"
                :color="mode.value === selectedMode ? 'primary' : 'default'"
                size="small"
                @click="setPerformanceMode(mode.value)"
              >
                <v-icon class="mr-1">{{ mode.icon }}</v-icon>
                {{ mode.label }}
              </v-chip>
            </v-chip-group>
          </div>

          <!-- Configuration -->
          <div class="metric-section">
            <div class="section-title">Advanced Configuration</div>
            <div class="config-options">
              <v-switch
                v-model="configOptions.enableLOD"
                label="Level of Detail"
                hide-details
                density="compact"
                @change="updateConfig"
              />
              <v-switch
                v-model="configOptions.enableCulling"
                label="Frustum Culling"
                hide-details
                density="compact"
                @change="updateConfig"
              />
              <v-switch
                v-model="configOptions.enableBatching"
                label="Batch Rendering"
                hide-details
                density="compact"
                @change="updateConfig"
              />
              <v-switch
                v-model="configOptions.adaptiveQuality"
                label="Adaptive Quality"
                hide-details
                density="compact"
                @change="updateConfig"
              />
            </div>
          </div>
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export default {
  name: 'PerformanceMonitor',
  props: {
    fps: {
      type: Number,
      default: 60
    },
    memoryUsage: {
      type: Number,
      default: 0
    },
    elementCount: {
      type: Number,
      default: 0
    },
    visibleElementCount: {
      type: Number,
      default: 0
    },
    renderTime: {
      type: Number,
      default: 0
    },
    culledObjects: {
      type: Number,
      default: 0
    },
    lodSimplifications: {
      type: Number,
      default: 0
    },
    droppedFrames: {
      type: Number,
      default: 0
    },
    averageFrameTime: {
      type: Number,
      default: 0
    },
    lodLevels: {
      type: Array,
      default: () => []
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  emits: ['performance-mode-changed', 'config-updated', 'metrics-reset'],
  setup(props, { emit }) {
    const showDetails = ref(false)
    const selectedMode = ref('balanced')
    const performanceCanvas = ref(null)
    const performanceHistory = ref([])
    const animationFrame = ref(null)

    const configOptions = ref({
      enableLOD: true,
      enableCulling: true,
      enableBatching: true,
      adaptiveQuality: true
    })

    const performanceModes = [
      { value: 'quality', label: 'Quality', icon: 'mdi-high-quality' },
      { value: 'balanced', label: 'Balanced', icon: 'mdi-balance' },
      { value: 'performance', label: 'Performance', icon: 'mdi-rocket' }
    ]

    // Computed properties
    const totalCount = computed(() => props.elementCount)
    const visibleCount = computed(() => props.visibleElementCount)

    const performanceClass = computed(() => {
      if (props.fps >= 55) return 'excellent'
      if (props.fps >= 30) return 'good'
      if (props.fps >= 15) return 'poor'
      return 'critical'
    })

    const performanceIcon = computed(() => {
      switch (performanceClass.value) {
        case 'excellent': return 'mdi-check-circle'
        case 'good': return 'mdi-alert-circle'
        case 'poor': return 'mdi-alert'
        case 'critical': return 'mdi-alert-octagon'
        default: return 'mdi-help-circle'
      }
    })

    // Methods
    const formatMemory = (bytes) => {
      if (bytes < 1024) return `${bytes}B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }

    const toggleMode = () => {
      showDetails.value = !showDetails.value
    }

    const resetMetrics = () => {
      emit('metrics-reset')
      performanceHistory.value = []
      updatePerformanceGraph()
    }

    const setPerformanceMode = (mode) => {
      selectedMode.value = mode
      emit('performance-mode-changed', mode)
    }

    const updateConfig = () => {
      emit('config-updated', configOptions.value)
    }

    // Performance graph
    const updatePerformanceGraph = () => {
      if (!performanceCanvas.value) return

      const canvas = performanceCanvas.value
      const ctx = canvas.getContext('2d')
      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1

      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw FPS line
      if (performanceHistory.value.length > 1) {
        ctx.strokeStyle = getPerformanceColor()
        ctx.lineWidth = 2
        ctx.beginPath()

        const step = width / Math.max(performanceHistory.value.length - 1, 1)

        performanceHistory.value.forEach((fps, index) => {
          const x = index * step
          const y = height - (fps / 60) * height

          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.stroke()
      }

      // Draw threshold lines
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])

      // 30 FPS threshold
      const thresholdY = height - (30 / 60) * height
      ctx.beginPath()
      ctx.moveTo(0, thresholdY)
      ctx.lineTo(width, thresholdY)
      ctx.stroke()

      ctx.setLineDash([])
    }

    const getPerformanceColor = () => {
      switch (performanceClass.value) {
        case 'excellent': return '#4CAF50'
        case 'good': return '#FF9800'
        case 'poor': return '#F44336'
        case 'critical': return '#D32F2F'
        default: return '#9E9E9E'
      }
    }

    // Animation loop for graph
    const animate = () => {
      // Add current FPS to history
      performanceHistory.value.push(props.fps)

      // Keep only last 100 samples
      if (performanceHistory.value.length > 100) {
        performanceHistory.value.shift()
      }

      // Update graph
      updatePerformanceGraph()

      animationFrame.value = requestAnimationFrame(animate)
    }

    // Watch for FPS changes
    watch(() => props.fps, (newFps) => {
      performanceHistory.value.push(newFps)
      if (performanceHistory.value.length > 100) {
        performanceHistory.value.shift()
      }
    })

    // Lifecycle
    onMounted(() => {
      if (!props.compact) {
        nextTick(() => {
          animate()
        })
      }
    })

    onUnmounted(() => {
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value)
      }
    })

    return {
      // State
      showDetails,
      selectedMode,
      performanceCanvas,
      performanceHistory,
      configOptions,
      performanceModes,

      // Computed
      totalCount,
      visibleCount,
      performanceClass,
      performanceIcon,

      // Methods
      formatMemory,
      toggleMode,
      resetMetrics,
      setPerformanceMode,
      updateConfig,
      updatePerformanceGraph,
      getPerformanceColor
    }
  }
}
</script>

<style scoped>
.performance-monitor {
  font-family: 'Inter', sans-serif;
}

.compact-display {
  display: flex;
  align-items: center;
}

.performance-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.performance-indicator.excellent {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.performance-indicator.good {
  background: rgba(255, 152, 0, 0.2);
  color: #FF9800;
}

.performance-indicator.poor {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
}

.performance-indicator.critical {
  background: rgba(211, 47, 47, 0.2);
  color: #D32F2F;
}

.indicator-icon {
  font-size: 14px;
}

.fps-text {
  font-variant-numeric: tabular-nums;
}

.full-display {
  background: var(--v-theme-surface);
  border-radius: 8px;
  border: 1px solid var(--v-theme-outline);
  overflow: hidden;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--v-theme-surface-variant);
  border-bottom: 1px solid var(--v-theme-outline);
}

.header-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.mode-toggle,
.reset-btn {
  min-width: 32px;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
  background: var(--v-theme-surface);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--v-theme-on-surface);
}

.stat-value.excellent {
  color: #4CAF50;
}

.stat-value.good {
  color: #FF9800;
}

.stat-value.poor {
  color: #F44336;
}

.stat-value.critical {
  color: #D32F2F;
}

.stat-label {
  font-size: 11px;
  color: var(--v-theme-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.detailed-metrics {
  padding: 16px;
  border-top: 1px solid var(--v-theme-outline);
}

.metric-section {
  margin-bottom: 20px;
}

.metric-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--v-theme-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.performance-graph {
  width: 100%;
  height: 100px;
  border: 1px solid var(--v-theme-outline);
  border-radius: 4px;
  background: var(--v-theme-surface);
}

.optimization-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.opt-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: var(--v-theme-surface-variant);
  border-radius: 4px;
}

.opt-label {
  font-size: 12px;
  color: var(--v-theme-on-surface-variant);
}

.opt-value {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--v-theme-on-surface);
}

.lod-distribution {
  display: flex;
  gap: 8px;
}

.lod-level {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.lod-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.lod-high {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.lod-high .lod-indicator {
  background: #4CAF50;
}

.lod-medium {
  background: rgba(255, 152, 0, 0.2);
  color: #FF9800;
}

.lod-medium .lod-indicator {
  background: #FF9800;
}

.lod-low {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
}

.lod-low .lod-indicator {
  background: #F44336;
}

.lod-minimal {
  background: rgba(211, 47, 47, 0.2);
  color: #D32F2F;
}

.lod-minimal .lod-indicator {
  background: #D32F2F;
}

.config-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .optimization-stats {
    grid-template-columns: 1fr;
  }

  .config-options {
    grid-template-columns: 1fr;
  }
}
</style>