<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  stageScale: { type: Number, required: true },
  isTwoFingerGesture: { type: Boolean, default: false },
  isMiddleMousePanning: { type: Boolean, default: false },
  isDrawing: { type: Boolean, default: false },
  tool: { type: String, default: '' },
  currentRotationAngle: { type: Number, default: 0 },
  showTagDialog: { type: Boolean, default: false },
  tagDialogPosition: { type: Object, default: () => ({ x: 0, y: 0 }) },
  currentTag: { type: String, default: '' }
})

const emit = defineEmits(['update:currentTag', 'update:showTagDialog', 'updateTag', 'closeTagDialog'])

const localTag = ref(props.currentTag)

const handleUpdateTag = () => {
  emit('update:currentTag', localTag.value)
  emit('updateTag')
}

const handleCloseDialog = () => {
  emit('closeTagDialog')
}

// Watch for prop changes
const updateLocalTag = (newVal) => {
  localTag.value = newVal
}

// Focus input when dialog appears
const focusInput = () => {
  nextTick(() => {
    const input = document.querySelector('.tag-input')
    if (input) {
      input.focus()
      input.select()
    }
  })
}

// Call focus when dialog shows
if (props.showTagDialog) {
  focusInput()
}
</script>

<template>
  <div>
    <!-- Zoom indicator -->
    <div v-if="stageScale !== 1" class="zoom-indicator">
      {{ Math.round(stageScale * 100) }}%
    </div>
    
    <!-- Two-finger gesture indicator -->
    <div v-if="isTwoFingerGesture || isMiddleMousePanning" class="gesture-indicator">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"/>
      </svg>
      <span>{{ isMiddleMousePanning ? 'Pan Mode (Middle Mouse)' : 'Pan Mode (Trackpad)' }}</span>
    </div>
    
    <!-- Rotation indicator during shape creation -->
    <div v-if="isDrawing && (tool === 'square' || tool === 'circle' || tool === 'triangle')" class="rotation-indicator">
      <svg viewBox="0 0 24 24" fill="currentColor" class="rotate-icon">
        <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
      </svg>
      <div class="rotation-info">
        <span class="rotation-label">Rotation</span>
        <span class="rotation-value">{{ Math.round(currentRotationAngle) }}°</span>
      </div>
    </div>
    
    <!-- Tag Dialog -->
    <div v-if="showTagDialog" class="tag-dialog" :style="{ left: `${tagDialogPosition.x}px`, top: `${tagDialogPosition.y}px` }">
      <div class="tag-dialog-header">
        <h3>Rename Element</h3>
        <button @click="handleCloseDialog" class="close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <input 
        v-model="localTag"
        type="text" 
        class="tag-input"
        placeholder="Enter element name..."
        @keyup.enter="handleUpdateTag"
        @keyup.esc="handleCloseDialog"
        @input="emit('update:currentTag', localTag)"
        autofocus
      />
      <div class="tag-dialog-actions">
        <button @click="handleCloseDialog" class="cancel-btn">Cancel</button>
        <button @click="handleUpdateTag" class="save-btn">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zoom-indicator {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag-dialog {
  position: fixed;
  background: linear-gradient(145deg, rgba(20, 20, 20, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 0 40px rgba(var(--primary-rgb), 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(var(--primary-rgb), 0.5);
  min-width: 360px;
  animation: dialogSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: translate(-50%, -100%);
  margin-top: -20px;
  z-index: 1000;
}

@keyframes dialogSlideIn {
  0% {
    opacity: 0;
    transform: translate(-50%, -100%) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -100%) scale(1);
  }
}

.tag-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tag-dialog-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
  text-shadow: 0 0 10px rgba(var(--primary-rgb), 0.6);
  letter-spacing: 0.5px;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.tag-input {
  width: 100%;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s ease;
  outline: none;
  margin-bottom: 16px;
}

.tag-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.tag-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color);
  box-shadow: 
    0 0 0 3px rgba(var(--primary-rgb), 0.2),
    0 0 20px rgba(var(--primary-rgb), 0.3),
    inset 0 0 10px rgba(var(--primary-rgb), 0.1);
}

.tag-dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: 'Inter', sans-serif;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.save-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  color: white;
  box-shadow: 
    0 4px 12px rgba(var(--primary-rgb), 0.4),
    0 0 20px rgba(var(--primary-rgb), 0.3);
  border: 1px solid rgba(var(--primary-rgb), 0.6);
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 20px rgba(var(--primary-rgb), 0.5),
    0 0 30px rgba(var(--primary-rgb), 0.4);
}

.save-btn:active {
  transform: translateY(0);
}

.gesture-indicator {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-color);
  border: 2px solid rgba(var(--primary-rgb), 0.5);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 30px rgba(var(--primary-rgb), 0.4);
  pointer-events: none;
  animation: pulseGlow 2s ease-in-out infinite;
  display: flex;
  align-items: center;
  gap: 10px;
}

.gesture-indicator svg {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
  filter: drop-shadow(0 0 8px currentColor);
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 30px rgba(var(--primary-rgb), 0.4);
  }
  50% {
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 40px rgba(var(--primary-rgb), 0.6),
      0 0 60px rgba(var(--primary-rgb), 0.3);
  }
}

.rotation-indicator {
  position: absolute;
  bottom: 80px;
  right: 20px;
  background: linear-gradient(145deg, rgba(20, 20, 20, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%);
  backdrop-filter: blur(30px) saturate(180%);
  padding: 16px 20px;
  border-radius: 14px;
  border: 2px solid rgba(var(--primary-rgb), 0.5);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(var(--primary-rgb), 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  pointer-events: none;
  animation: rotationSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 180px;
}

@keyframes rotationSlideIn {
  0% {
    opacity: 0;
    transform: translateX(30px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.rotation-indicator .rotate-icon {
  width: 28px;
  height: 28px;
  color: var(--primary-color);
  filter: drop-shadow(0 0 10px rgba(var(--primary-rgb), 0.8));
  animation: continuousRotate 3s linear infinite;
}

@keyframes continuousRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.rotation-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.rotation-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.rotation-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--primary-color);
  text-shadow: 0 0 15px rgba(var(--primary-rgb), 0.8);
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  .zoom-indicator {
    bottom: 20px;
    right: 70px;
    font-size: 12px;
    padding: 8px 16px;
    z-index: 10;
  }
  
  .gesture-indicator {
    top: 60px;
    font-size: 12px;
    padding: 8px 16px;
    z-index: 10;
  }
  
  .gesture-indicator svg {
    width: 16px;
    height: 16px;
  }
  
  .tag-dialog {
    min-width: 280px;
    max-width: calc(100vw - 40px);
    padding: 20px;
    z-index: 1100;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
    margin-top: 0;
  }
  
  .rotation-indicator {
    bottom: 20px;
    left: 20px;
    z-index: 10;
    min-width: 140px;
    padding: 12px 16px;
  }
  
  .rotation-value {
    font-size: 18px;
  }
}
</style>
