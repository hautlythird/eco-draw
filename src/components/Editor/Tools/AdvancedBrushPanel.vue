<template>
  <div class="advanced-brush-panel">
    <!-- Pencil Type Selection -->
    <div class="brush-section">
      <div class="section-title">
        <v-icon class="mr-2">mdi-pencil</v-icon>
        Professional Pencils
      </div>

      <div class="pencil-categories">
        <!-- Graphite Pencils -->
        <div class="pencil-category">
          <div class="category-label">Graphite</div>
          <div class="pencil-grid">
            <div
              v-for="pencil in graphitePencils"
              :key="pencil.key"
              class="pencil-option"
              :class="{ active: selectedPencil === pencil.key }"
              @click="selectPencil(pencil.key)"
              :title="pencil.description"
            >
              <div class="pencil-preview" :style="getPencilPreviewStyle(pencil)"></div>
              <div class="pencil-name">{{ pencil.name }}</div>
              <div class="pencil-hardness">H{{ getHardnessDisplay(pencil.hardness) }}</div>
            </div>
          </div>
        </div>

        <!-- Charcoal Pencils -->
        <div class="pencil-category">
          <div class="category-label">Charcoal</div>
          <div class="pencil-grid">
            <div
              v-for="pencil in charcoalPencils"
              :key="pencil.key"
              class="pencil-option"
              :class="{ active: selectedPencil === pencil.key }"
              @click="selectPencil(pencil.key)"
              :title="pencil.description"
            >
              <div class="pencil-preview charcoal" :style="getPencilPreviewStyle(pencil)"></div>
              <div class="pencil-name">{{ pencil.name }}</div>
              <div class="pencil-hardness">{{ getHardnessDisplay(pencil.hardness) }}</div>
            </div>
          </div>
        </div>

        <!-- Technical Pencils -->
        <div class="pencil-category">
          <div class="category-label">Technical</div>
          <div class="pencil-grid">
            <div
              v-for="pencil in technicalPencils"
              :key="pencil.key"
              class="pencil-option"
              :class="{ active: selectedPencil === pencil.key }"
              @click="selectPencil(pencil.key)"
              :title="pencil.description"
            >
              <div class="pencil-preview technical" :style="getPencilPreviewStyle(pencil)"></div>
              <div class="pencil-name">{{ pencil.name }}</div>
              <div class="pencil-hardness">{{ getHardnessDisplay(pencil.hardness) }}</div>
            </div>
          </div>
        </div>

        <!-- Artistic Pencils -->
        <div class="pencil-category">
          <div class="category-label">Artistic</div>
          <div class="pencil-grid">
            <div
              v-for="pencil in artisticPencils"
              :key="pencil.key"
              class="pencil-option"
              :class="{ active: selectedPencil === pencil.key }"
              @click="selectPencil(pencil.key)"
              :title="pencil.description"
            >
              <div class="pencil-preview artistic" :style="getPencilPreviewStyle(pencil)"></div>
              <div class="pencil-name">{{ pencil.name }}</div>
              <div class="pencil-hardness">{{ getHardnessDisplay(pencil.hardness) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Paper Texture Selection -->
    <div class="brush-section">
      <div class="section-title">
        <v-icon class="mr-2">mdi-file-image-outline</v-icon>
        Paper Texture
      </div>

      <div class="paper-options">
        <div
          v-for="paper in paperOptions"
          :key="paper.key"
          class="paper-option"
          :class="{ active: selectedPaper === paper.key }"
          @click="selectPaper(paper.key)"
        >
          <div class="paper-preview" :style="getPaperPreviewStyle(paper)"></div>
          <div class="paper-name">{{ paper.name }}</div>
          <div class="paper-grain">Grain: {{ Math.round(paper.grain * 100) }}%</div>
        </div>
      </div>
    </div>

    <!-- Brush Settings -->
    <div class="brush-section">
      <div class="section-title">
        <v-icon class="mr-2">mdi-cog</v-icon>
        Brush Settings
      </div>

      <!-- Color Picker -->
      <div class="brush-control">
        <label class="control-label">Color</label>
        <div class="color-controls">
          <input
            type="color"
            v-model="brushColor"
            class="color-picker"
            @change="updateBrushSettings"
          />
          <div class="color-presets">
            <div
              v-for="preset in colorPresets"
              :key="preset"
              class="color-preset"
              :style="{ backgroundColor: preset }"
              @click="setColor(preset)"
            ></div>
          </div>
        </div>
      </div>

      <!-- Thickness Slider -->
      <div class="brush-control">
        <label class="control-label">Thickness: {{ thickness }}px</label>
        <input
          type="range"
          v-model="thickness"
          min="1"
          max="200"
          class="slider"
          @input="updateBrushSettings"
        />
        <div class="thickness-preview">
          <div
            class="thickness-line"
            :style="{
              height: `${thickness / 10}px`,
              backgroundColor: brushColor
            }"
          ></div>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div class="advanced-settings">
        <div class="settings-header">
          <v-btn
            variant="text"
            size="small"
            @click="showAdvanced = !showAdvanced"
            class="settings-toggle"
          >
            <v-icon class="mr-1">
              {{ showAdvanced ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
            Advanced Physics
          </v-btn>
        </div>

        <v-expand-transition>
          <div v-show="showAdvanced" class="settings-content">
            <!-- Pressure Sensitivity -->
            <div class="brush-control">
              <label class="control-label">Pressure Sensitivity</label>
              <input
                type="range"
                v-model="pressureSensitivity"
                min="0.1"
                max="3"
                step="0.1"
                class="slider"
                @input="updateBrushSettings"
              />
            </div>

            <!-- Texture Intensity -->
            <div class="brush-control">
              <label class="control-label">Texture Intensity</label>
              <input
                type="range"
                v-model="textureIntensity"
                min="0"
                max="1"
                step="0.05"
                class="slider"
                @input="updateBrushSettings"
              />
            </div>

            <!-- Smudge Factor -->
            <div class="brush-control">
              <label class="control-label">Smudge Effect</label>
              <input
                type="range"
                v-model="smudgeFactor"
                min="0"
                max="1"
                step="0.05"
                class="slider"
                @input="updateBrushSettings"
              />
            </div>

            <!-- Reset Button -->
            <v-btn
              variant="outlined"
              size="small"
              @click="resetToDefaults"
              class="reset-btn"
            >
              <v-icon class="mr-1">mdi-restore</v-icon>
              Reset to Defaults
            </v-btn>
          </div>
        </v-expand-transition>
      </div>
    </div>

    <!-- Live Preview -->
    <div class="brush-section">
      <div class="section-title">
        <v-icon class="mr-2">mdi-eye</v-icon>
        Live Preview
      </div>
      <canvas
        ref="previewCanvas"
        class="preview-canvas"
        width="200"
        height="100"
        @mousedown="startPreviewStroke"
        @mousemove="continuePreviewStroke"
        @mouseup="endPreviewStroke"
        @mouseleave="endPreviewStroke"
      ></canvas>
      <div class="preview-label">Draw here to test brush settings</div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { PENCIL_TYPES, PAPER_TEXTURES, useAdvancedBrush } from '@/composables/useAdvancedBrush'

export default {
  name: 'AdvancedBrushPanel',
  props: {
    currentSettings: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['settings-change'],
  setup(props, { emit }) {
    const previewCanvas = ref(null)
    const showAdvanced = ref(false)

    // Advanced brush composable
    const { currentPencil, currentPaper } = useAdvancedBrush()

    // Brush settings
    const brushColor = ref('#2c2c2c')
    const thickness = ref(50)
    const selectedPencil = ref('HB')
    const selectedPaper = ref('MEDIUM')
    const pressureSensitivity = ref(1.0)
    const textureIntensity = ref(1.0)
    const smudgeFactor = ref(0.3)

    // Color presets
    const colorPresets = [
      '#2c2c2c', // Graphite
      '#1a1a1a', // Charcoal
      '#4a4a4a', // Light graphite
      '#8B4513', // Brown
      '#2F4F4F', // Slate gray
      '#191970', // Midnight blue
      '#8B0000', // Dark red
      '#006400'  // Dark green
    ]

    // Categorized pencils
    const graphitePencils = computed(() => [
      PENCIL_TYPES.HB,
      PENCIL_TYPES['2B'],
      PENCIL_TYPES['4B'],
      PENCIL_TYPES['6B']
    ])

    const charcoalPencils = computed(() => [
      PENCIL_TYPES.CHARCOAL_SOFT,
      PENCIL_TYPES.CHARCOAL_MEDIUM,
      PENCIL_TYPES.CHARCOAL_HARD
    ])

    const technicalPencils = computed(() => [
      PENCIL_TYPES.MECHANICAL,
      PENCIL_TYPES.DRAFTING
    ])

    const artisticPencils = computed(() => [
      PENCIL_TYPES.WATERCOLOR,
      PENCIL_TYPES.COLORED,
      PENCIL_TYPES.PASTEL
    ])

    const paperOptions = computed(() => Object.values(PAPER_TEXTURES))

    // Methods
    const selectPencil = (pencilKey) => {
      selectedPencil.value = pencilKey
      updateBrushSettings()
    }

    const selectPaper = (paperKey) => {
      selectedPaper.value = paperKey
      updateBrushSettings()
    }

    const setColor = (color) => {
      brushColor.value = color
      updateBrushSettings()
    }

    const getPencilPreviewStyle = (pencil) => {
      const baseColor = brushColor.value
      const opacity = pencil.opacity
      const texture = pencil.texture

      return {
        backgroundColor: `rgba(${hexToRgb(baseColor)}, ${opacity})`,
        filter: `blur(${texture * 2}px) contrast(${1.5 - texture})`,
        transform: `scale(${0.8 + texture * 0.4})`
      }
    }

    const getPaperPreviewStyle = (paper) => {
      return {
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent ${2 + paper.grain * 3}px,
          rgba(0,0,0,${paper.grain * 0.1}) ${2 + paper.grain * 3}px,
          rgba(0,0,0,${paper.grain * 0.1}) ${4 + paper.grain * 6}px
        )`
      }
    }

    const getHardnessDisplay = (hardness) => {
      if (hardness >= 0.7) return 'H'
      if (hardness >= 0.5) return 'F'
      if (hardness >= 0.3) return 'B'
      if (hardness >= 0.2) return '2B'
      return '4B+'
    }

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '0, 0, 0'
    }

    const updateBrushSettings = () => {
      const settings = {
        color: brushColor.value,
        thickness: thickness.value,
        pencilType: selectedPencil.value,
        paperTexture: selectedPaper.value,
        pressureSensitivity: pressureSensitivity.value,
        textureIntensity: textureIntensity.value,
        smudgeFactor: smudgeFactor.value
      }

      emit('settings-change', settings)
      drawPreviewStroke()
    }

    const resetToDefaults = () => {
      brushColor.value = '#2c2c2c'
      thickness.value = 50
      selectedPencil.value = 'HB'
      selectedPaper.value = 'MEDIUM'
      pressureSensitivity.value = 1.0
      textureIntensity.value = 1.0
      smudgeFactor.value = 0.3
      updateBrushSettings()
    }

    // Preview canvas drawing
    let isPreviewDrawing = false
    let lastPreviewPoint = null

    const startPreviewStroke = (event) => {
      isPreviewDrawing = true
      const rect = previewCanvas.value.getBoundingClientRect()
      lastPreviewPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    }

    const continuePreviewStroke = (event) => {
      if (!isPreviewDrawing || !lastPreviewPoint) return

      const rect = previewCanvas.value.getBoundingClientRect()
      const currentPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }

      drawPreviewLine(lastPreviewPoint, currentPoint)
      lastPreviewPoint = currentPoint
    }

    const endPreviewStroke = () => {
      isPreviewDrawing = false
      lastPreviewPoint = null
    }

    const drawPreviewLine = (from, to) => {
      const ctx = previewCanvas.value.getContext('2d')
      const pencil = PENCIL_TYPES[selectedPencil.value]

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)

      ctx.strokeStyle = brushColor.value
      ctx.lineWidth = (thickness.value / 10) * (0.5 + pencil.hardness * 0.5)
      ctx.globalAlpha = pencil.opacity * textureIntensity.value
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Apply texture effect
      if (pencil.texture > 0.3) {
        ctx.shadowBlur = pencil.texture * 10
        ctx.shadowColor = brushColor.value
      }

      ctx.stroke()
    }

    const drawPreviewStroke = () => {
      if (!previewCanvas.value) return

      const ctx = previewCanvas.value.getContext('2d')
      ctx.clearRect(0, 0, previewCanvas.value.width, previewCanvas.value.height)

      // Draw sample strokes
      const pencil = PENCIL_TYPES[selectedPencil.value]
      const strokes = [
        { from: { x: 20, y: 30 }, to: { x: 180, y: 30 } },
        { from: { x: 20, y: 50 }, to: { x: 180, y: 50 } },
        { from: { x: 20, y: 70 }, to: { x: 180, y: 70 } }
      ]

      strokes.forEach(stroke => {
        ctx.beginPath()
        ctx.moveTo(stroke.from.x, stroke.from.y)
        ctx.lineTo(stroke.to.x, stroke.to.y)

        ctx.strokeStyle = brushColor.value
        ctx.lineWidth = (thickness.value / 10) * (0.5 + pencil.hardness * 0.5)
        ctx.globalAlpha = pencil.opacity * textureIntensity.value
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Apply texture effects
        if (pencil.texture > 0.3) {
          ctx.shadowBlur = pencil.texture * 5
          ctx.shadowColor = brushColor.value
        }

        ctx.stroke()
      })
    }

    // Initialize with props
    watch(() => props.currentSettings, (newSettings) => {
      if (newSettings.color) brushColor.value = newSettings.color
      if (newSettings.thickness) thickness.value = newSettings.thickness
      if (newSettings.pencilType) selectedPencil.value = newSettings.pencilType
      if (newSettings.paperTexture) selectedPaper.value = newSettings.paperTexture
      if (newSettings.pressureSensitivity) pressureSensitivity.value = newSettings.pressureSensitivity
      if (newSettings.textureIntensity) textureIntensity.value = newSettings.textureIntensity
      if (newSettings.smudgeFactor !== undefined) smudgeFactor.value = newSettings.smudgeFactor
    }, { immediate: true, deep: true })

    onMounted(() => {
      nextTick(() => {
        drawPreviewStroke()
      })
    })

    return {
      // Refs
      previewCanvas,
      showAdvanced,

      // State
      brushColor,
      thickness,
      selectedPencil,
      selectedPaper,
      pressureSensitivity,
      textureIntensity,
      smudgeFactor,
      colorPresets,

      // Computed
      graphitePencils,
      charcoalPencils,
      technicalPencils,
      artisticPencils,
      paperOptions,
      currentPencil,
      currentPaper,

      // Methods
      selectPencil,
      selectPaper,
      setColor,
      getPencilPreviewStyle,
      getPaperPreviewStyle,
      getHardnessDisplay,
      updateBrushSettings,
      resetToDefaults,
      startPreviewStroke,
      continuePreviewStroke,
      endPreviewStroke
    }
  }
}
</script>

<style scoped>
.advanced-brush-panel {
  padding: 16px;
  background: var(--v-theme-surface);
  border-radius: 8px;
  max-height: 600px;
  overflow-y: auto;
}

.brush-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--v-theme-primary);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pencil-category {
  margin-bottom: 16px;
}

.category-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--v-theme-on-surface-variant);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.pencil-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
}

.pencil-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--v-theme-surface-variant);
}

.pencil-option:hover {
  border-color: var(--v-theme-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.pencil-option.active {
  border-color: var(--v-theme-primary);
  background: var(--v-theme-primary-container);
  color: var(--v-theme-on-primary-container);
}

.pencil-preview {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  margin-bottom: 4px;
  position: relative;
  transition: all 0.3s ease;
}

.pencil-preview.charcoal {
  border-radius: 50%;
}

.pencil-preview.technical {
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.2);
}

.pencil-preview.artistic {
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.pencil-name {
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 2px;
}

.pencil-hardness {
  font-size: 9px;
  opacity: 0.7;
}

.paper-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.paper-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--v-theme-surface-variant);
}

.paper-option:hover {
  border-color: var(--v-theme-secondary);
  transform: translateY(-1px);
}

.paper-option.active {
  border-color: var(--v-theme-secondary);
  background: var(--v-theme-secondary-container);
}

.paper-preview {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1);
  margin-bottom: 8px;
  background-color: white;
}

.paper-name {
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 2px;
}

.paper-grain {
  font-size: 9px;
  opacity: 0.7;
}

.brush-control {
  margin-bottom: 16px;
}

.control-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--v-theme-on-surface-variant);
}

.color-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker {
  width: 50px;
  height: 35px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.color-presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.color-preset {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.color-preset:hover {
  transform: scale(1.2);
  border-color: var(--v-theme-primary);
}

.slider {
  width: 100%;
  margin-bottom: 8px;
}

.thickness-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  background: var(--v-theme-surface-variant);
  border-radius: 4px;
}

.thickness-line {
  width: 80%;
  border-radius: 2px;
  transition: all 0.2s ease;
}

.advanced-settings {
  margin-top: 20px;
  border-top: 1px solid var(--v-theme-outline);
  padding-top: 16px;
}

.settings-header {
  margin-bottom: 8px;
}

.settings-toggle {
  font-size: 11px;
  font-weight: 500;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reset-btn {
  margin-top: 8px;
  align-self: flex-start;
}

.preview-canvas {
  width: 100%;
  height: 100px;
  border: 2px solid var(--v-theme-outline);
  border-radius: 4px;
  cursor: crosshair;
  background: white;
}

.preview-label {
  font-size: 11px;
  color: var(--v-theme-on-surface-variant);
  text-align: center;
  margin-top: 4px;
}

/* Scrollbar styling */
.advanced-brush-panel::-webkit-scrollbar {
  width: 6px;
}

.advanced-brush-panel::-webkit-scrollbar-track {
  background: var(--v-theme-surface-variant);
  border-radius: 3px;
}

.advanced-brush-panel::-webkit-scrollbar-thumb {
  background: var(--v-theme-outline);
  border-radius: 3px;
}

.advanced-brush-panel::-webkit-scrollbar-thumb:hover {
  background: var(--v-theme-on-surface-variant);
}
</style>