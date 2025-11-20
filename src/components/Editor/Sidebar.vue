<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useLayers } from '@/composables/useLayers'
import ColorWheel from '../ColorPicker/ColorWheel.vue'

const emit = defineEmits(['tool-change', 'canvas-size-change', 'color-change', 'layer-select', 'layer-delete'])

const { primaryColor, colorVariants } = useTheme()
const { 
  layers, 
  selectedLayerIds, 
  toggleLayerVisibility, 
  toggleLayerLock, 
  deleteLayer: removeLayer,
  selectLayer,
  isLayerSelected
} = useLayers()

const showColorWheel = ref(false)
const showLayers = ref(false)
const showCanvasSize = ref(false)
const colorWheelRef = ref(null)

// Canvas size in meters
const canvasWidth = ref(20)
const canvasHeight = ref(15)

const currentTime = ref(new Date().toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit' 
}))

let timeInterval = null

onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })
  }, 60000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})

const handleColorWheelClick = () => {
  showColorWheel.value = !showColorWheel.value
}

const handleColorWheelLeave = () => {
  // Delay to allow moving to the color wheel panel
  setTimeout(() => {
    if (!showColorWheel.value) return
    showColorWheel.value = false
  }, 300)
}

const handleColorChange = (color) => {
  primaryColor.value = color
  // Emit color change event to update brush color
  emit('color-change', color)
}

const toggleLayers = () => {
  showLayers.value = !showLayers.value
  showCanvasSize.value = false
}

const toggleCanvasSize = () => {
  showCanvasSize.value = !showCanvasSize.value
  showLayers.value = false
}

const updateCanvasSize = () => {
  emit('canvas-size-change', {
    width: canvasWidth.value,
    height: canvasHeight.value
  })
}

// Layer management
const handleLayerClick = (layer, event) => {
  const multiSelect = event.ctrlKey || event.metaKey
  selectLayer(layer.id, multiSelect)
  emit('layer-select', layer.id, multiSelect)
}

const handleToggleVisibility = (layer) => {
  toggleLayerVisibility(layer.id)
}

const handleToggleLock = (layer) => {
  toggleLayerLock(layer.id)
}

const handleDeleteLayer = (layer) => {
  if (layers.value.length > 0) {
    removeLayer(layer.id)
    emit('layer-delete', layer.id)
  }
}

// Get layer icon based on type
const getLayerIcon = (type) => {
  const icons = {
    line: '✏️',
    shape: '⬛',
    image: '🖼️',
    text: '📝'
  }
  return icons[type] || '📄'
}

// Reverse layers for display (newest on top)
const displayLayers = computed(() => {
  return [...layers.value].reverse()
})
</script>

<template>
  <div class="sidebar">
    <div class="user-section">
      <div class="user-avatar">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <div class="user-name">HAUTLY</div>
    </div>

    <nav class="nav-section">
      <button class="nav-item" @click="emit('tool-change', 'library')">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1.25-.93-2.3-2.14-2.46.21-.34.34-.74.34-1.16 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C12.5 2.12 11.38 1 10 1S7.5 2.12 7.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 .42.13.82.34 1.16-1.21.16-2.14 1.21-2.14 2.46z" fill="currentColor"/>
        </svg>
        <span>LIBRARY</span>
      </button>

      <button class="nav-item" :class="{ active: showLayers }" @click="toggleLayers">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z" fill="currentColor"/>
        </svg>
        <span>LAYERS</span>
      </button>

      <button class="nav-item" :class="{ active: showCanvasSize }" @click="toggleCanvasSize">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 10h5V8H5v2zm0 4h5v-2H5v2zm6-4h8V8h-8v2zm0 4h8v-2h-8v2z" fill="currentColor"/>
        </svg>
        <span>SIZE</span>
      </button>
    </nav>

    <!-- Layers Panel -->
    <Transition name="slide-panel">
      <div v-if="showLayers" class="layers-panel">
        <div class="panel-header">
          <h3>Layers ({{ layers.length }})</h3>
        </div>
        <div class="layers-list">
          <div 
            v-for="layer in displayLayers" 
            :key="layer.id" 
            class="layer-item"
            :class="{ 
              selected: isLayerSelected(layer.id),
              locked: layer.locked,
              hidden: !layer.visible
            }"
            @click="handleLayerClick(layer, $event)"
          >
            <span class="layer-icon">{{ getLayerIcon(layer.type) }}</span>
            <button @click.stop="handleToggleVisibility(layer)" class="layer-visibility" :title="layer.visible ? 'Hide' : 'Show'">
              <svg v-if="layer.visible" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
              </svg>
            </button>
            <div class="layer-info">
              <span class="layer-name">{{ layer.name }}</span>
              <span class="layer-type">{{ layer.type }}</span>
            </div>
            <button @click.stop="handleToggleLock(layer)" class="layer-lock" :title="layer.locked ? 'Unlock' : 'Lock'">
              <svg v-if="layer.locked" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
              </svg>
            </button>
            <button @click.stop="handleDeleteLayer(layer)" class="layer-delete" title="Delete Layer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
          <div v-if="layers.length === 0" class="no-layers">
            <p>No layers yet</p>
            <p class="hint">Start drawing to create layers</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Canvas Size Panel -->
    <Transition name="slide-panel">
      <div v-if="showCanvasSize" class="canvas-size-panel">
        <div class="panel-header">
          <h3>Canvas Size</h3>
        </div>
        <div class="size-controls">
          <div class="size-input-group">
            <label>Width (m)</label>
            <input 
              type="number" 
              v-model.number="canvasWidth" 
              min="1" 
              max="100"
              @change="updateCanvasSize"
              class="size-input"
            />
          </div>
          <div class="size-divider">×</div>
          <div class="size-input-group">
            <label>Height (m)</label>
            <input 
              type="number" 
              v-model.number="canvasHeight" 
              min="1" 
              max="100"
              @change="updateCanvasSize"
              class="size-input"
            />
          </div>
        </div>
        <div class="size-info">
          Total: {{ canvasWidth * canvasHeight }} m²
        </div>
        <button @click="updateCanvasSize" class="apply-size-btn">
          Apply Size
        </button>
      </div>
    </Transition>

    <div 
      ref="colorWheelRef"
      class="color-wheel" 
      @click="handleColorWheelClick"
      :style="{ background: colorVariants.gradient }"
    >
      <div class="color-wheel-inner"></div>
    </div>

    <ColorWheel
      v-if="showColorWheel"
      :selected-color="primaryColor"
      @color-change="handleColorChange"
      @close="showColorWheel = false"
      @mouseenter="showColorWheel = true"
      @mouseleave="handleColorWheelLeave"
    />

    <div class="time-display">{{ currentTime }}</div>
  </div>
</template>


<style scoped>
.sidebar {
  width: 280px;
  background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  gap: 20px;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.user-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.user-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.2) 0%, rgba(var(--primary-rgb), 0.1) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(var(--primary-rgb), 0.3);
  transition: all 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.05);
  border-color: rgba(var(--primary-rgb), 0.6);
}

.user-avatar svg {
  width: 40px;
  height: 40px;
  color: var(--primary-color);
}

.user-name {
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.9);
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.nav-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  transition: all 0.2s ease;
  width: 100%;
}

.nav-item:hover {
  background: rgba(var(--primary-rgb), 0.1);
  border-color: rgba(var(--primary-rgb), 0.3);
  transform: translateY(-2px);
}

.nav-item.active {
  background: rgba(var(--primary-rgb), 0.2);
  border-color: var(--primary-color);
  box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3);
}

.nav-item svg {
  width: 32px;
  height: 32px;
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.2s ease;
}

.nav-item:hover svg {
  color: var(--primary-color);
}

.nav-item span {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.2s ease;
}

.nav-item:hover span {
  color: rgba(255, 255, 255, 0.95);
}

.color-wheel {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  cursor: pointer;
  margin-top: auto;
  transition: all 0.3s ease;
  filter: drop-shadow(0 4px 12px rgba(var(--primary-rgb), 0.4));
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.2);
}

.color-wheel:hover {
  transform: scale(1.15) rotate(15deg);
  filter: drop-shadow(0 8px 20px rgba(var(--primary-rgb), 0.6));
  border-color: rgba(255, 255, 255, 0.4);
}

.color-wheel-inner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
}

.time-display {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  min-width: 100px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 1px;
}

/* Layers Panel */
.layers-panel,
.canvas-size-panel {
  width: 100%;
  background: rgba(10, 10, 10, 0.95);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 400px;
  overflow-y: auto;
}

.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.3s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.add-layer-btn {
  background: rgba(var(--primary-rgb), 0.2);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
  border-radius: 8px;
  color: var(--primary-color);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.add-layer-btn:hover {
  background: rgba(var(--primary-rgb), 0.3);
  transform: scale(1.1);
}

.add-layer-btn svg {
  width: 18px;
  height: 18px;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.layer-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(var(--primary-rgb), 0.3);
}

.layer-item.selected {
  background: rgba(var(--primary-rgb), 0.2);
  border-color: var(--primary-color);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.3);
}

.layer-item.locked {
  opacity: 0.6;
}

.layer-item.hidden {
  opacity: 0.4;
}

.layer-icon {
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-visibility,
.layer-lock,
.layer-delete {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.layer-visibility:hover,
.layer-lock:hover {
  color: var(--primary-color);
  background: rgba(var(--primary-rgb), 0.1);
}

.layer-delete:hover {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.layer-visibility svg,
.layer-lock svg,
.layer-delete svg {
  width: 18px;
  height: 18px;
}

.layer-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-type {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.no-layers {
  text-align: center;
  padding: 30px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.no-layers p {
  margin: 0;
  font-size: 13px;
}

.no-layers .hint {
  font-size: 11px;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.3);
}

/* Canvas Size Panel */
.size-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.size-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.size-input-group label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.size-input {
  width: 100%;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s ease;
}

.size-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
}

.size-divider {
  font-size: 24px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 20px;
}

.size-info {
  padding: 12px;
  background: rgba(var(--primary-rgb), 0.1);
  border: 1px solid rgba(var(--primary-rgb), 0.2);
  border-radius: 10px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 12px;
}

.apply-size-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
}

.apply-size-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--primary-rgb), 0.4);
}

.apply-size-btn:active {
  transform: translateY(0);
}
</style>
