<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  selectedColor: {
    type: String,
    default: '#FF4015'
  }
})

const emit = defineEmits(['color-change', 'close'])

const canvas = ref(null)
const isSelecting = ref(false)
const wheelSize = 280
const centerX = wheelSize / 2
const centerY = wheelSize / 2
const radius = wheelSize / 2 - 20

const selectedHue = ref(0)
const selectedSaturation = ref(100)
const selectedLightness = ref(50)

// Convert HSL to Hex
const hslToHex = (h, s, l) => {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Convert Hex to HSL
const hexToHsl = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 100, l: 50 }
  
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

const currentColor = computed(() => {
  return hslToHex(selectedHue.value, selectedSaturation.value, selectedLightness.value)
})

const drawColorWheel = () => {
  if (!canvas.value) return
  
  const ctx = canvas.value.getContext('2d')
  ctx.clearRect(0, 0, wheelSize, wheelSize)
  
  // Draw color wheel
  for (let angle = 0; angle < 360; angle += 1) {
    const startAngle = (angle - 90) * Math.PI / 180
    const endAngle = (angle - 89) * Math.PI / 180
    
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.closePath()
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'white')
    gradient.addColorStop(0.7, `hsl(${angle}, 100%, 50%)`)
    gradient.addColorStop(1, `hsl(${angle}, 100%, 30%)`)
    
    ctx.fillStyle = gradient
    ctx.fill()
  }
  
  // Draw center white circle
  ctx.beginPath()
  ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
  ctx.fillStyle = 'white'
  ctx.fill()
  
  // Draw selection indicator
  const angle = (selectedHue.value - 90) * Math.PI / 180
  const distance = (selectedSaturation.value / 100) * (radius - 30) + 30
  const x = centerX + Math.cos(angle) * distance
  const y = centerY + Math.sin(angle) * distance
  
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, 2 * Math.PI)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 3
  ctx.stroke()
  
  ctx.beginPath()
  ctx.arc(x, y, 10, 0, 2 * Math.PI)
  ctx.fillStyle = currentColor.value
  ctx.fill()
}

const handleCanvasClick = (e) => {
  const rect = canvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  const dx = x - centerX
  const dy = y - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance <= radius && distance >= 30) {
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
    if (angle < 0) angle += 360
    
    selectedHue.value = Math.round(angle)
    selectedSaturation.value = Math.round(((distance - 30) / (radius - 30)) * 100)
    
    drawColorWheel()
    emit('color-change', currentColor.value)
  }
}

const handleMouseDown = () => {
  isSelecting.value = true
}

const handleMouseMove = (e) => {
  if (isSelecting.value) {
    handleCanvasClick(e)
  }
}

const handleMouseUp = () => {
  isSelecting.value = false
}

// Touch support
const handleTouchStart = (e) => {
  e.preventDefault()
  isSelecting.value = true
  const touch = e.touches[0]
  const rect = canvas.value.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  
  const dx = x - centerX
  const dy = y - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance <= radius && distance >= 30) {
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
    if (angle < 0) angle += 360
    
    selectedHue.value = Math.round(angle)
    selectedSaturation.value = Math.round(((distance - 30) / (radius - 30)) * 100)
    
    drawColorWheel()
    emit('color-change', currentColor.value)
  }
}

const handleTouchMove = (e) => {
  if (!isSelecting.value) return
  e.preventDefault()
  const touch = e.touches[0]
  const rect = canvas.value.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  
  const dx = x - centerX
  const dy = y - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance <= radius && distance >= 30) {
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
    if (angle < 0) angle += 360
    
    selectedHue.value = Math.round(angle)
    selectedSaturation.value = Math.round(((distance - 30) / (radius - 30)) * 100)
    
    drawColorWheel()
    emit('color-change', currentColor.value)
  }
}

const handleTouchEnd = () => {
  isSelecting.value = false
}

onMounted(() => {
  // Initialize from selected color
  const hsl = hexToHsl(props.selectedColor)
  selectedHue.value = hsl.h
  selectedSaturation.value = hsl.s
  selectedLightness.value = hsl.l
  
  drawColorWheel()
  
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
})
</script>

<template>
  <div class="color-wheel-container">
    <div class="color-wheel-panel">
      <div class="wheel-header">
        <h3>Color Wheel</h3>
        <button class="close-btn" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="wheel-content">
        <canvas
          ref="canvas"
          :width="wheelSize"
          :height="wheelSize"
          @click="handleCanvasClick"
          @mousedown="handleMouseDown"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          class="color-canvas"
        />
        
        <div class="color-info">
          <div class="color-preview" :style="{ background: currentColor }"></div>
          <div class="color-values">
            <div class="color-hex">{{ currentColor }}</div>
            <div class="color-hsl">
              H: {{ selectedHue }}° S: {{ selectedSaturation }}% L: {{ selectedLightness }}%
            </div>
          </div>
        </div>
        
        <div class="lightness-slider">
          <label>Lightness</label>
          <input
            type="range"
            min="0"
            max="100"
            v-model="selectedLightness"
            @input="drawColorWheel(); emit('color-change', currentColor)"
            class="slider"
          />
          <span>{{ selectedLightness }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-wheel-container {
  position: fixed;
  left: 300px;
  bottom: 120px;
  z-index: 1100;
  animation: slideIn 0.3s ease;
  touch-action: none;
}

/* Mobile positioning */
@media (max-width: 768px) {
  .color-wheel-container {
    left: 50%;
    bottom: 110px;
    transform: translateX(-50%);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@media (max-width: 768px) {
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }
}

.color-wheel-panel {
  background: rgba(15, 15, 15, 0.98);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 340px;
}

@media (max-width: 768px) {
  .color-wheel-panel {
    min-width: 300px;
    max-width: 90vw;
    padding: 20px;
    border-radius: 20px;
  }
}

.wheel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.wheel-header h3 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.95);
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
  transition: all 0.2s ease;
  border-radius: 8px;
}

.close-btn:hover {
  color: var(--primary-color);
  background: rgba(var(--primary-rgb), 0.1);
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

.wheel-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.color-canvas {
  cursor: crosshair;
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  touch-action: none;
  user-select: none;
}

@media (max-width: 768px) {
  .color-canvas {
    max-width: 240px;
    max-height: 240px;
    width: 100%;
    height: auto;
  }
}

.color-info {
  display: flex;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.color-preview {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.color-values {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-hex {
  font-size: 20px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 1px;
}

.color-hsl {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Courier New', monospace;
}

.lightness-slider {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.lightness-slider label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  min-width: 80px;
}

.lightness-slider span {
  min-width: 45px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.slider {
  flex: 1;
  height: 6px;
  background: linear-gradient(90deg, #000 0%, #fff 100%);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.6);
}
</style>
