<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useUiStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'
import ColorWheel from '../ColorPicker/ColorWheel.vue'
import LayersPanel from './LayersPanel.vue'

const emit = defineEmits(['tool-change', 'canvas-size-change', 'color-change', 'layer-select', 'layer-delete'])

// Mobile menu state
const isMobileMenuOpen = ref(false)

const { primaryColor, colorVariants } = useTheme()
const uiStore = useUiStore()
const { showLayers, showCanvasSize } = storeToRefs(uiStore)

const showColorWheel = ref(false)
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

const updateCanvasSize = () => {
  emit('canvas-size-change', {
    width: canvasWidth.value,
    height: canvasHeight.value
  })
}
</script>

<template>
  <!-- Mobile Menu Toggle Button -->
  <button class="mobile-menu-toggle" @click="isMobileMenuOpen = !isMobileMenuOpen" :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'">
    <svg v-if="!isMobileMenuOpen" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  </button>
  
  <!-- Mobile Overlay -->
  <div class="mobile-overlay" :class="{ show: isMobileMenuOpen }" @click="isMobileMenuOpen = false"></div>
  
  <div class="sidebar" :class="{ 'mobile-open': isMobileMenuOpen }">
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

  <!-- Mobile Floating Color Wheel -->
  <div 
    class="mobile-color-wheel" 
    @click="handleColorWheelClick"
    @touchstart.prevent="handleColorWheelClick"
    :style="{ background: colorVariants.gradient }"
  >
    <div class="color-wheel-inner"></div>
  </div>

  <!-- Mobile Color Wheel Popup -->
  <ColorWheel
    v-if="showColorWheel"
    :selected-color="primaryColor"
    @color-change="handleColorChange"
    @close="showColorWheel = false"
    class="mobile-color-wheel-popup"
  />
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

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 260px;
    z-index: 1001;
    transform: translateX(-100%);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.7);
    background: rgba(15, 15, 15, 0.98);
    backdrop-filter: blur(20px);
    padding: 60px 16px 20px 16px; /* Top padding for hamburger menu */
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
  }
  
  .user-avatar {
    width: 60px !important;
    height: 60px !important;
  }
  
  .user-avatar svg {
    width: 30px !important;
    height: 30px !important;
  }
  
  .user-name {
    font-size: 14px !important;
  }
  
  .nav-item {
    padding: 10px !important;
  }
  
  .nav-item svg {
    width: 28px !important;
    height: 28px !important;
  }
  
  .nav-item span {
    font-size: 10px !important;
  }
  
  .color-wheel {
    width: 80px !important;
    height: 80px !important;
  }
  
  .color-wheel-inner {
    width: 32px !important;
    height: 32px !important;
  }
  
  .time-display {
    font-size: 16px !important;
    padding: 8px 12px !important;
  }
  
  .layers-panel,
  .canvas-size-panel {
    max-height: 300px !important;
  }
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

.layer-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.layer-action-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.layer-action-btn:hover {
  color: var(--primary-color);
  background: rgba(var(--primary-rgb), 0.1);
}

.layer-action-btn.layer-delete:hover {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.layer-action-btn svg {
  width: 16px;
  height: 16px;
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

/* Mobile Menu Toggle Button - Hidden by default */
.mobile-menu-toggle {
  display: none;
}

/* Mobile Overlay - Hidden by default */
.mobile-overlay {
  display: none;
}

/* Mobile Floating Color Wheel - Hidden by default */
.mobile-color-wheel {
  display: none;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  /* Hamburger menu button */
  .mobile-menu-toggle {
    display: flex !important;
    position: fixed;
    top: 3px;
    left: 4px;
    z-index: 1002;
    width: 44px;
    height: 44px;
    background: rgba(10, 10, 10, 0.9);
    border: 1px solid rgba(var(--primary-rgb), 0.3);
    border-radius: 10px;
    color: var(--primary-color);
    cursor: pointer;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
  }
  
  .mobile-menu-toggle:hover,
  .mobile-menu-toggle:active {
    background: rgba(var(--primary-rgb), 0.2);
    border-color: var(--primary-color);
    transform: scale(1.05);
  }
  
  .mobile-menu-toggle svg {
    width: 22px;
    height: 22px;
  }
  
  /* Overlay - only shows when menu is open */
  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 1000;
    backdrop-filter: blur(4px);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0s linear 0.3s;
    pointer-events: none;
  }
  
  .mobile-overlay.show {
    display: block;
    opacity: 1;
    visibility: visible;
    transition: opacity 0.3s ease, visibility 0s linear 0s;
    pointer-events: all;
  }
  
  /* Sidebar - hidden by default, slides in when open */
  .sidebar {
    position: fixed !important;
    left: 0;
    top: 0;
    bottom: 0;
    width: 260px;
    z-index: 1001;
    transform: translateX(-100%);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.7);
    background: rgba(15, 15, 15, 0.98) !important;
    backdrop-filter: blur(20px);
    padding: 60px 16px 20px 16px;
    transition: transform 0.3s ease, visibility 0s linear 0.3s;
    visibility: hidden;
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
    visibility: visible;
    transition: transform 0.3s ease, visibility 0s linear 0s;
  }
  
  .user-avatar {
    width: 60px !important;
    height: 60px !important;
  }
  
  .user-avatar svg {
    width: 30px !important;
    height: 30px !important;
  }
  
  .user-name {
    font-size: 14px !important;
  }
  
  .nav-item {
    padding: 10px !important;
  }
  
  .nav-item svg {
    width: 28px !important;
    height: 28px !important;
  }
  
  .nav-item span {
    font-size: 10px !important;
  }
  
  .color-wheel {
    width: 80px !important;
    height: 80px !important;
  }
  
  .color-wheel-inner {
    width: 32px !important;
    height: 32px !important;
  }
  
  .time-display {
    font-size: 16px !important;
    padding: 8px 12px !important;
  }
  
  .layers-panel,
  .canvas-size-panel {
    max-height: 300px !important;
  }
  
  /* Hide the sidebar color wheel on mobile */
  .sidebar .color-wheel {
    display: none !important;
  }
  
  /* Show mobile floating color wheel */
  .mobile-color-wheel {
    display: flex !important;
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 999;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
    filter: drop-shadow(0 4px 16px rgba(var(--primary-rgb), 0.6));
    border: 4px solid rgba(255, 255, 255, 0.3);
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
  }
  
  .mobile-color-wheel:active {
    transform: translateX(-50%) scale(1.05);
    filter: drop-shadow(0 6px 20px rgba(var(--primary-rgb), 0.8));
    border-color: rgba(255, 255, 255, 0.5);
  }
  
  .mobile-color-wheel .color-wheel-inner {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: white;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  /* Mobile Color Wheel Popup - show on mobile */
  .mobile-color-wheel-popup {
    display: block !important;
  }
}

/* Hide mobile color wheel popup on desktop */
.mobile-color-wheel-popup {
  display: none;
}
</style>
