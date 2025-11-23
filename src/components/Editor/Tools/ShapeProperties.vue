<template>
  <div class="shape-properties">
    <div v-if="!selectedShape" class="no-selection">
      <v-icon class="mb-2">mdi-shape-outline</v-icon>
      <div class="text-h6">No Shape Selected</div>
      <div class="text-body-2 text-medium-emphasis">
        Select a shape to view and edit its properties
      </div>
    </div>

    <div v-else class="properties-content">
      <!-- Shape Header -->
      <div class="shape-header">
        <div class="shape-info">
          <v-icon class="shape-icon">{{ getShapeIcon(selectedShape.type) }}</v-icon>
          <div class="shape-details">
            <div class="shape-name">{{ selectedShape.tag }}</div>
            <div class="shape-type">{{ formatShapeType(selectedShape.type) }}</div>
          </div>
        </div>
        <div class="shape-actions">
          <v-btn
            variant="text"
            size="small"
            icon="mdi-content-copy"
            @click="duplicateShape"
            title="Duplicate"
          />
          <v-btn
            variant="text"
            size="small"
            icon="mdi-delete"
            @click="deleteShape"
            title="Delete"
            color="error"
          />
        </div>
      </div>

      <!-- Transform Properties -->
      <div class="property-section">
        <div class="section-title">
          <v-icon class="mr-2">mdi-transform</v-icon>
          Transform
        </div>

        <div class="property-grid">
          <!-- Position -->
          <div class="property-row">
            <label class="property-label">Position</label>
            <div class="property-inputs">
              <v-text-field
                v-model.number="localShape.x"
                label="X"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('x')"
              />
              <v-text-field
                v-model.number="localShape.y"
                label="Y"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('y')"
              />
            </div>
          </div>

          <!-- Size -->
          <div class="property-row" v-if="hasSizeProperty(selectedShape)">
            <label class="property-label">Size</label>
            <div class="property-inputs">
              <v-text-field
                v-model.number="localShape.width"
                label="Width"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('width')"
              />
              <v-text-field
                v-model.number="localShape.height"
                label="Height"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('height')"
              />
            </div>
          </div>

          <!-- Radius for circles/ellipses -->
          <div class="property-row" v-if="selectedShape.type === 'circle'">
            <label class="property-label">Radius</label>
            <v-text-field
              v-model.number="localShape.radius"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
              @change="updateProperty('radius')"
            />
          </div>

          <div class="property-row" v-if="selectedShape.type === 'ellipse'">
            <label class="property-label">Radius</label>
            <div class="property-inputs">
              <v-text-field
                v-model.number="localShape.radiusX"
                label="X"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('radiusX')"
              />
              <v-text-field
                v-model.number="localShape.radiusY"
                label="Y"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('radiusY')"
              />
            </div>
          </div>

          <!-- Rotation -->
          <div class="property-row">
            <label class="property-label">Rotation</label>
            <div class="property-inputs">
              <v-text-field
                v-model.number="localShape.rotation"
                label="Degrees"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('rotation')"
              />
              <v-btn
                variant="outlined"
                size="small"
                @click="resetRotation"
                class="reset-btn"
              >
                Reset
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Appearance Properties -->
      <div class="property-section">
        <div class="section-title">
          <v-icon class="mr-2">mdi-palette</v-icon>
          Appearance
        </div>

        <div class="property-grid">
          <!-- Fill -->
          <div class="property-row">
            <label class="property-label">Fill</label>
            <div class="property-inputs">
              <input
                type="color"
                v-model="localShape.fill"
                class="color-picker"
                @change="updateProperty('fill')"
              />
              <v-text-field
                v-model="localShape.fill"
                label="Color"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('fill')"
              />
            </div>
          </div>

          <!-- Opacity -->
          <div class="property-row">
            <label class="property-label">Opacity</label>
            <v-slider
              v-model="localShape.opacity"
              min="0"
              max="1"
              step="0.1"
              hide-details
              @change="updateProperty('opacity')"
            />
            <span class="opacity-value">{{ Math.round(localShape.opacity * 100) }}%</span>
          </div>

          <!-- Stroke -->
          <div class="property-row">
            <label class="property-label">Stroke</label>
            <div class="property-inputs">
              <input
                type="color"
                v-model="localShape.stroke"
                class="color-picker"
                @change="updateProperty('stroke')"
              />
              <v-text-field
                v-model.number="localShape.strokeWidth"
                label="Width"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                @change="updateProperty('strokeWidth')"
              />
            </div>
          </div>

          <!-- Corner Radius for rectangles -->
          <div class="property-row" v-if="selectedShape.type === 'rect'">
            <label class="property-label">Corner Radius</label>
            <v-slider
              v-model="localShape.cornerRadius"
              min="0"
              max="50"
              hide-details
              @change="updateProperty('cornerRadius')"
            />
            <span class="radius-value">{{ localShape.cornerRadius }}px</span>
          </div>
        </div>
      </div>

      <!-- Professional Properties -->
      <div class="property-section" v-if="hasProfessionalProperties">
        <div class="section-title">
          <v-icon class="mr-2">mdi-cog</v-icon>
          Professional
        </div>

        <div class="property-grid">
          <!-- Line Style -->
          <div class="property-row">
            <label class="property-label">Line Style</label>
            <v-select
              v-model="localShape.lineDash"
              :items="lineStyles"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              @change="updateProperty('lineDash')"
            />
          </div>

          <!-- Line Cap -->
          <div class="property-row">
            <label class="property-label">Line Cap</label>
            <v-select
              v-model="localShape.lineCap"
              :items="lineCapOptions"
              variant="outlined"
              density="compact"
              hide-details
              @change="updateProperty('lineCap')"
            />
          </div>

          <!-- Shadow Effects -->
          <div class="property-row">
            <label class="property-label">Shadow</label>
            <div class="property-inputs">
              <v-checkbox
                v-model="shadowEnabled"
                label="Enabled"
                hide-details
                density="compact"
                @change="updateShadow"
              />
              <v-text-field
                v-model.number="localShape.shadowBlur"
                label="Blur"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                :disabled="!shadowEnabled"
                @change="updateProperty('shadowBlur')"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Architectural Properties -->
      <div class="property-section" v-if="isArchitecturalShape">
        <div class="section-title">
          <v-icon class="mr-2">mdi-domain</v-icon>
          Architectural
        </div>

        <div class="property-grid">
          <!-- Measurements Display -->
          <div class="property-row">
            <label class="property-label">Measurements</label>
            <div class="measurements">
              <div class="measurement-item">
                <span class="measurement-label">Width:</span>
                <span class="measurement-value">{{ formatMeasurement(widthInMeters) }}m</span>
              </div>
              <div class="measurement-item">
                <span class="measurement-label">Height:</span>
                <span class="measurement-value">{{ formatMeasurement(heightInMeters) }}m</span>
              </div>
              <div class="measurement-item">
                <span class="measurement-label">Area:</span>
                <span class="measurement-value">{{ formatMeasurement(areaInMeters) }}m²</span>
              </div>
              <div class="measurement-item">
                <span class="measurement-label">Perimeter:</span>
                <span class="measurement-value">{{ formatMeasurement(perimeterInMeters) }}m</span>
              </div>
            </div>
          </div>

          <!-- Constraints -->
          <div class="property-row">
            <label class="property-label">Constraints</label>
            <div class="constraints">
              <v-checkbox
                v-model="maintainAspectRatio"
                label="Maintain Aspect Ratio"
                hide-details
                density="compact"
                @change="updateConstraints"
              />
              <v-checkbox
                v-model="snapToAngles"
                label="Snap to Angles"
                hide-details
                density="compact"
                @change="updateConstraints"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Garden Properties -->
      <div class="property-section" v-if="isGardenShape">
        <div class="section-title">
          <v-icon class="mr-2">mdi-leaf</v-icon>
          Garden
        </div>

        <div class="property-grid">
          <!-- Plant-specific properties -->
          <div class="property-row" v-if="selectedShape.metadata?.garden">
            <label class="property-label">Soil Type</label>
            <v-select
              v-model="soilType"
              :items="soilTypes"
              variant="outlined"
              density="compact"
              hide-details
              @change="updateGardenProperty('soilType')"
            />

            <label class="property-label">Irrigation</label>
            <v-checkbox
              v-model="irrigation"
              label="Enabled"
              hide-details
              density="compact"
              @change="updateGardenProperty('irrigation')"
            />

            <label class="property-label">Sun Exposure</label>
            <v-select
              v-model="sunExposure"
              :items="sunExposureOptions"
              variant="outlined"
              density="compact"
              hide-details
              @change="updateGardenProperty('sunExposure')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'ShapeProperties',
  props: {
    selectedShape: {
      type: Object,
      default: null
    },
    pixelsPerMeter: {
      type: Number,
      default: 50
    }
  },
  emits: ['shape-updated', 'shape-duplicated', 'shape-deleted'],
  setup(props, { emit }) {
    // Local shape state for reactive updates
    const localShape = ref({})
    const shadowEnabled = ref(false)
    const maintainAspectRatio = ref(false)
    const snapToAngles = ref(false)

    // Garden properties
    const soilType = ref('loam')
    const irrigation = ref(false)
    const sunExposure = ref('partial')

    // Line style options
    const lineStyles = [
      { label: 'Solid', value: [] },
      { label: 'Dashed', value: [5, 5] },
      { label: 'Dotted', value: [2, 2] },
      { label: 'Dash-Dot', value: [10, 5, 2, 5] },
      { label: 'Long Dash', value: [15, 5] }
    ]

    const lineCapOptions = ['butt', 'round', 'square']

    const soilTypes = [
      { title: 'Loam', value: 'loam' },
      { title: 'Clay', value: 'clay' },
      { title: 'Sand', value: 'sand' },
      { title: 'Silt', value: 'silt' },
      { title: 'Peat', value: 'peat' }
    ]

    const sunExposureOptions = [
      { title: 'Full Sun', value: 'full' },
      { title: 'Partial Sun', value: 'partial' },
      { title: 'Full Shade', value: 'shade' }
    ]

    // Computed properties
    const hasProfessionalProperties = computed(() => {
      return props.selectedShape && ['rect', 'circle', 'line', 'path'].includes(props.selectedShape.type)
    })

    const isArchitecturalShape = computed(() => {
      return props.selectedShape?.metadata?.architectural !== undefined
    })

    const isGardenShape = computed(() => {
      return props.selectedShape?.metadata?.garden !== undefined
    })

    const widthInMeters = computed(() => {
      if (!props.selectedShape?.width) return 0
      return props.selectedShape.width / props.pixelsPerMeter
    })

    const heightInMeters = computed(() => {
      if (!props.selectedShape?.height) return 0
      return props.selectedShape.height / props.pixelsPerMeter
    })

    const areaInMeters = computed(() => {
      if (!props.selectedShape) return 0

      const width = widthInMeters.value
      const height = heightInMeters.value

      switch (props.selectedShape.type) {
        case 'rect':
          return width * height
        case 'circle':
          const radius = props.selectedShape.radius / props.pixelsPerMeter
          return Math.PI * radius * radius
        case 'ellipse':
          const radiusX = props.selectedShape.radiusX / props.pixelsPerMeter
          const radiusY = props.selectedShape.radiusY / props.pixelsPerMeter
          return Math.PI * radiusX * radiusY
        default:
          return 0
      }
    })

    const perimeterInMeters = computed(() => {
      if (!props.selectedShape) return 0

      const width = widthInMeters.value
      const height = heightInMeters.value

      switch (props.selectedShape.type) {
        case 'rect':
          return 2 * (width + height)
        case 'circle':
          const radius = props.selectedShape.radius / props.pixelsPerMeter
          return 2 * Math.PI * radius
        case 'ellipse':
          const radiusX = props.selectedShape.radiusX / props.pixelsPerMeter
          const radiusY = props.selectedShape.radiusY / props.pixelsPerMeter
          // Approximation using Ramanujan's formula
          const h = Math.pow((radiusX - radiusY) / (radiusX + radiusY), 2)
          return Math.PI * (radiusX + radiusY) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
        default:
          return 0
      }
    })

    // Methods
    const getShapeIcon = (type) => {
      const iconMap = {
        'rect': 'mdi-rectangle',
        'circle': 'mdi-circle',
        'ellipse': 'mdi-ellipse',
        'triangle': 'mdi-triangle',
        'line': 'mdi-minus',
        'path': 'mdi-vector-polyline',
        'garden-bed': 'mdi-rectangle-outline',
        'pond': 'mdi-water',
        'path-way': 'mdi-route'
      }
      return iconMap[type] || 'mdi-shape'
    }

    const formatShapeType = (type) => {
      return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    const hasSizeProperty = (shape) => {
      return ['rect', 'ellipse', 'image', 'text'].includes(shape?.type)
    }

    const formatMeasurement = (value) => {
      return value.toFixed(2)
    }

    const updateProperty = (property) => {
      if (!props.selectedShape) return

      const updatedShape = {
        ...props.selectedShape,
        [property]: localShape.value[property]
      }

      emit('shape-updated', updatedShape)
    }

    const updateShadow = () => {
      if (!props.selectedShape) return

      const updatedShape = {
        ...props.selectedShape,
        shadowEnabled: shadowEnabled.value,
        shadowBlur: shadowEnabled.value ? (localShape.value.shadowBlur || 10) : 0,
        shadowColor: localShape.value.shadowColor || 'rgba(0,0,0,0.3)',
        shadowOpacity: shadowEnabled.value ? 0.3 : 0
      }

      emit('shape-updated', updatedShape)
    }

    const updateConstraints = () => {
      if (!props.selectedShape) return

      const constraints = {
        maintainAspectRatio: maintainAspectRatio.value,
        snapToAngle: snapToAngles.value ? 15 : 0
      }

      const updatedShape = {
        ...props.selectedShape,
        metadata: {
          ...props.selectedShape.metadata,
          architectural: {
            ...props.selectedShape.metadata?.architectural,
            constraints
          }
        }
      }

      emit('shape-updated', updatedShape)
    }

    const updateGardenProperty = (property) => {
      if (!props.selectedShape) return

      const propertyMap = {
        soilType: soilType.value,
        irrigation: irrigation.value,
        sunExposure: sunExposure.value
      }

      const updatedShape = {
        ...props.selectedShape,
        metadata: {
          ...props.selectedShape.metadata,
          garden: {
            ...props.selectedShape.metadata?.garden,
            [property]: propertyMap[property]
          }
        }
      }

      emit('shape-updated', updatedShape)
    }

    const resetRotation = () => {
      if (!props.selectedShape) return

      localShape.value.rotation = 0
      updateProperty('rotation')
    }

    const duplicateShape = () => {
      if (!props.selectedShape) return
      emit('shape-duplicated', props.selectedShape)
    }

    const deleteShape = () => {
      if (!props.selectedShape) return
      emit('shape-deleted', props.selectedShape.id)
    }

    // Watch for selected shape changes
    watch(() => props.selectedShape, (newShape) => {
      if (newShape) {
        localShape.value = { ...newShape }
        shadowEnabled.value = newShape.shadowBlur > 0
        maintainAspectRatio.value = newShape.metadata?.architectural?.constraints?.maintainAspectRatio || false
        snapToAngles.value = newShape.metadata?.architectural?.constraints?.snapToAngle > 0

        // Garden properties
        if (newShape.metadata?.garden) {
          soilType.value = newShape.metadata.garden.soilType || 'loam'
          irrigation.value = newShape.metadata.garden.irrigation || false
          sunExposure.value = newShape.metadata.garden.sunExposure || 'partial'
        }
      } else {
        localShape.value = {}
      }
    }, { immediate: true, deep: true })

    return {
      // State
      localShape,
      shadowEnabled,
      maintainAspectRatio,
      snapToAngles,
      soilType,
      irrigation,
      sunExposure,

      // Options
      lineStyles,
      lineCapOptions,
      soilTypes,
      sunExposureOptions,

      // Computed
      hasProfessionalProperties,
      isArchitecturalShape,
      isGardenShape,
      widthInMeters,
      heightInMeters,
      areaInMeters,
      perimeterInMeters,

      // Methods
      getShapeIcon,
      formatShapeType,
      hasSizeProperty,
      formatMeasurement,
      updateProperty,
      updateShadow,
      updateConstraints,
      updateGardenProperty,
      resetRotation,
      duplicateShape,
      deleteShape
    }
  }
}
</script>

<style scoped>
.shape-properties {
  padding: 16px;
  background: var(--v-theme-surface);
  border-radius: 8px;
  max-height: 600px;
  overflow-y: auto;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: var(--v-theme-on-surface-variant);
}

.shape-icon {
  font-size: 48px;
  opacity: 0.3;
}

.properties-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.shape-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--v-theme-outline);
}

.shape-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shape-details {
  display: flex;
  flex-direction: column;
}

.shape-name {
  font-weight: 600;
  font-size: 14px;
}

.shape-type {
  font-size: 12px;
  color: var(--v-theme-on-surface-variant);
}

.shape-actions {
  display: flex;
  gap: 4px;
}

.property-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 13px;
  color: var(--v-theme-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.property-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.property-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--v-theme-on-surface-variant);
}

.property-inputs {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-picker {
  width: 40px;
  height: 32px;
  border: 1px solid var(--v-theme-outline);
  border-radius: 4px;
  cursor: pointer;
}

.opacity-value,
.radius-value {
  font-size: 12px;
  color: var(--v-theme-on-surface-variant);
  min-width: 40px;
  text-align: right;
}

.reset-btn {
  margin-left: 8px;
}

.measurements {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.measurement-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.measurement-label {
  color: var(--v-theme-on-surface-variant);
}

.measurement-value {
  font-weight: 500;
  font-family: 'Monaco', 'Consolas', monospace;
}

.constraints {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Scrollbar styling */
.shape-properties::-webkit-scrollbar {
  width: 6px;
}

.shape-properties::-webkit-scrollbar-track {
  background: var(--v-theme-surface-variant);
  border-radius: 3px;
}

.shape-properties::-webkit-scrollbar-thumb {
  background: var(--v-theme-outline);
  border-radius: 3px;
}

.shape-properties::-webkit-scrollbar-thumb:hover {
  background: var(--v-theme-on-surface-variant);
}
</style>