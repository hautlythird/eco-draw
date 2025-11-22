<script setup>
import { ref, computed, watch } from 'vue'
import ColorPickerPalette from '../ColorPicker/ColorPickerPalette.vue'

const props = defineProps({
  color: String,
  thickness: Number,
  hardness: Number,
  opacity: Number,
  currentTool: String
})

const emit = defineEmits(['update:color', 'update:thickness', 'update:hardness', 'update:opacity', 'color-change'])

const isHovered = ref(false)
const showColorPicker = ref(true)
const localThickness = ref(props.thickness)
const localHardness = ref(props.hardness)
const localOpacity = ref(props.opacity)

// Watch for prop changes
watch(() => props.thickness, (val) => localThickness.value = val)
watch(() => props.hardness, (val) => localHardness.value = val)
watch(() => props.opacity, (val) => localOpacity.value = val)

const shouldShow = computed(() => {
  return (props.currentTool === 'brush' || props.currentTool === 'eraser') && isHovered.value
})

const updateThickness = (e) => {
  localThickness.value = parseInt(e.target.value)
  emit('update:thickness', localThickness.value)
}

const updateHardness = (e) => {
  localHardness.value = parseInt(e.target.value)
  emit('update:hardness', localHardness.value)
}

const updateOpacity = (e) => {
  localOpacity.value = parseInt(e.target.value)
  emit('update:opacity', localOpacity.value)
}

const handleColorChange = (color) => {
  emit('update:color', color)
  emit('color-change', color)
}

// Brush preview
const brushPreviewStyle = computed(() => {
  const size = Math.max(20, Math.min(80, localThickness.value))
  const blur = (100 - localHardness.value) / 10
  return {
    width: `${size}px`,
    height: `${size}px`,
    background: props.color,
    opacity: localOpacity.value / 100,
    filter: `blur(${blur}px)`,
    boxShadow: `0 0 ${blur * 2}px ${props.color}`
  }
})
</script>

<template>
  <Transition name="slide-fade">
    <div 
      v-if="shouldShow"
      class="brush-controls"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <ColorPickerPalette 
        v-if="showColorPicker"
        :selected-color="color"
        @color-change="handleColorChange"
      />

      <div class="slider-control">
        <label>Brush Thickness</label>
        <div class="slider-row">
          <input 
            type="range" 
            min="1" 
            max="100" 
            :value="localThickness"
            @input="updateThickness"
            class="slider"
          />
          <div class="value-display">{{ localThickness }}%</div>
        </div>
      </div>

      <div class="slider-control">
        <label>Brush Hardness</label>
        <div class="slider-row">
          <input 
            type="range" 
            min="1" 
            max="100" 
            :value="localHardness"
            @input="updateHardness"
            class="slider"
          />
          <div class="value-display">{{ localHardness }}%</div>
        </div>
      </div>

      <div class="slider-control">
        <label>Opacity</label>
        <div class="slider-row">
          <input 
            type="range" 
            min="1" 
            max="100" 
            :value="localOpacity"
            @input="updateOpacity"
            class="slider"
          />
          <div class="value-display">{{ localOpacity }}%</div>
        </div>
      </div>

      <div class="brush-preview-section">
        <label>Brush Preview</label>
        <div class="preview-container">
          <div class="brush-preview" :style="brushPreviewStyle"></div>
        </div>
      </div>
    </div>
  </Transition>
  
  <!-- Hover trigger area -->
  <div 
    v-if="props.currentTool === 'brush' || props.currentTool === 'eraser'"
    class="hover-trigger"
    @mouseenter="isHovered = true"
  ></div>
</template>

<style scoped>
.brush-controls {
  position: fixed;
  left: 300px;
  top: 100px;
  width: 380px;
  background: rgba(20, 20, 20, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
}

.hover-trigger {
  position: fixed;
  left: 280px;
  top: 80px;
  width: 60px;
  height: 200px;
  z-index: 99;
}

.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  transform: translateX(-20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

.slider-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-control label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-runnable-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.4);
  transition: all 0.2s ease;
  margin-top: -6px;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.6);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.4);
  transition: all 0.2s ease;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.6);
}

.value-display {
  min-width: 56px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>

.brush-preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.brush-preview-section label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.preview-container::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  opacity: 0.3;
}

.brush-preview {
  border-radius: 50%;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}


/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .brush-controls {
    left: 50% !important;
    top: 70px !important;
    transform: translateX(-50%) !important;
    width: calc(100% - 32px) !important;
    max-width: 340px !important;
    padding: 16px !important;
    gap: 16px !important;
  }
  
  .hover-trigger {
    display: none !important;
  }
  
  .slider-control label {
    font-size: 11px !important;
  }
  
  .value-display {
    min-width: 48px !important;
    padding: 4px 8px !important;
    font-size: 12px !important;
  }
  
  .preview-container {
    min-height: 80px !important;
  }
}
