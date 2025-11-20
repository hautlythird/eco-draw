<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import IconDownload from '../Icons/IconDownload.vue'

const props = defineProps({
  canvasRef: Object
})

const emit = defineEmits(['close'])

const exportFormat = ref('png')
const exportQuality = ref(100)
const exportScale = ref(2)
const isExporting = ref(false)
const jsPDFLoaded = ref(false)

const formats = [
  { id: 'png', label: 'PNG', desc: '🌿 Garden plan image' },
  { id: 'pdf', label: 'PDF', desc: '📄 Printable document' },
  { id: 'jpg', label: 'JPG', desc: 'Smaller file size' },
  { id: 'json', label: 'JSON', desc: 'Project data' }
]

// Load jsPDF library
onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    jsPDFLoaded.value = true
  }
  script.onerror = () => {
    console.error('Failed to load jsPDF library')
  }
  document.head.appendChild(script)
})

onUnmounted(() => {
  const script = document.querySelector('script[src*="jspdf"]')
  if (script) {
    document.head.removeChild(script)
  }
})

const handleExport = async () => {
  if (!props.canvasRef) return
  
  isExporting.value = true
  
  try {
    if (exportFormat.value === 'json') {
      const data = props.canvasRef.getCanvasData()
      const dataStr = JSON.stringify(data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `agroecological-garden-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat.value === 'pdf') {
      await handlePDFExport()
    } else {
      // Export PNG/JPG with high quality for garden plans
      const dataURL = props.canvasRef.getCanvasDataURL(
        exportFormat.value,
        exportQuality.value / 100
      )
      
      if (dataURL) {
        const link = document.createElement('a')
        link.href = dataURL
        link.download = `agroecological-garden-${Date.now()}.${exportFormat.value}`
        link.click()
      }
    }
    
    setTimeout(() => {
      isExporting.value = false
      emit('close')
    }, 1000)
  } catch (error) {
    console.error('Export failed:', error)
    isExporting.value = false
  }
}

const handlePDFExport = async () => {
  if (!jsPDFLoaded.value || !window.jspdf) {
    alert('PDF library is still loading. Please try again in a moment.')
    return
  }

  const { jsPDF } = window.jspdf
  
  // Export canvas as high-quality PNG (same as PNG export)
  const canvas = props.canvasRef.exportCanvas()
  if (!canvas) {
    throw new Error('Failed to export canvas')
  }

  // Convert canvas to data URL with high quality
  const dataURL = canvas.toDataURL('image/png', 1.0)
  
  // Get actual canvas dimensions in pixels
  const canvasWidth = canvas.width
  const canvasHeight = canvas.height
  
  // Calculate PDF dimensions to match canvas aspect ratio exactly
  const aspectRatio = canvasWidth / canvasHeight
  
  // Calculate PDF page size to fit canvas perfectly (no borders, no padding)
  // Use pixels as unit and convert to mm (1 pixel ≈ 0.264583 mm at 96 DPI)
  const pxToMm = 0.264583
  const pdfWidth = canvasWidth * pxToMm
  const pdfHeight = canvasHeight * pxToMm
  
  // Create PDF with custom dimensions matching the canvas exactly
  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
    compress: true
  })

  // Add canvas image filling the entire PDF page (no padding, no borders)
  pdf.addImage(
    dataURL,
    'PNG',
    0, // x position - start at 0
    0, // y position - start at 0
    pdfWidth, // full width
    pdfHeight, // full height
    undefined,
    'SLOW' // Use SLOW for better quality
  )
  
  // Save the PDF
  pdf.save(`agroecological-garden-${Date.now()}.pdf`)
}

const handleImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        // Validate the data structure
        if (data && typeof data === 'object') {
          // Load the canvas data
          if (props.canvasRef && props.canvasRef.loadCanvas) {
            props.canvasRef.loadCanvas(data)
            alert('Garden plan imported successfully!')
            emit('close')
          } else {
            throw new Error('Canvas reference not available')
          }
        } else {
          throw new Error('Invalid JSON format')
        }
      } catch (error) {
        console.error('Import failed:', error)
        alert('Failed to import garden plan. Please check the file format.')
      }
    }
  }
  input.click()
}
</script>

<template>
  <Transition name="fade">
    <div class="export-overlay" @click.self="emit('close')">
      <div class="export-panel">
        <div class="export-header">
          <div class="header-icon">
            <IconDownload />
          </div>
          <h2>Export Canvas</h2>
          <button class="close-btn" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="export-content">
          <div class="format-section">
            <label class="section-label">Export Format</label>
            <div class="format-grid">
              <button
                v-for="format in formats"
                :key="format.id"
                :class="['format-btn', { active: exportFormat === format.id }]"
                @click="exportFormat = format.id"
              >
                <div class="format-label">{{ format.label }}</div>
                <div class="format-desc">{{ format.desc }}</div>
              </button>
            </div>
          </div>

          <div v-if="exportFormat === 'png' || exportFormat === 'jpg'" class="settings-section">
            <div class="setting-item">
              <label>Quality: {{ exportQuality }}%</label>
              <input 
                type="range" 
                min="10" 
                max="100" 
                v-model="exportQuality"
                class="slider"
              />
            </div>

            <div class="setting-item">
              <label>Resolution: {{ exportScale }}x</label>
              <input 
                type="range" 
                min="1" 
                max="4" 
                step="0.5"
                v-model="exportScale"
                class="slider"
              />
              <div class="scale-hint">Higher resolution = larger file size</div>
            </div>
          </div>

          <div v-if="exportFormat === 'pdf'" class="pdf-info">
            <div class="info-card">
              <svg viewBox="0 0 24 24" fill="currentColor" class="info-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <div class="info-text">
                <strong>PDF Export</strong>
                <p>Your garden plan will be exported as a high-quality PDF document with the exact canvas dimensions (no borders or margins).</p>
              </div>
            </div>
          </div>

          <div v-if="exportFormat === 'json'" class="json-info">
            <div class="info-card">
              <svg viewBox="0 0 24 24" fill="currentColor" class="info-icon">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              <div class="info-text">
                <strong>Project Data</strong>
                <p>Save your complete garden design including all layers, shapes, and settings. You can import this file later to continue editing.</p>
              </div>
            </div>
            
            <button 
              class="import-btn"
              @click="handleImport"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
              </svg>
              Import JSON
            </button>
          </div>

          <button 
            class="export-btn"
            @click="handleExport"
            :disabled="isExporting"
          >
            <IconDownload v-if="!isExporting" />
            <div v-else class="spinner"></div>
            {{ isExporting ? 'Exporting...' : exportFormat === 'json' ? 'Export Project' : 'Export' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.export-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.export-panel {
  width: 90%;
  max-width: 500px;
  background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
  border-radius: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.export-header {
  padding: 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.02);
}

.header-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.2) 0%, rgba(var(--primary-rgb), 0.1) 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.header-icon svg {
  width: 28px;
  height: 28px;
}

.export-header h2 {
  flex: 1;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.95);
}

.close-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(var(--primary-rgb), 0.15);
  border-color: rgba(var(--primary-rgb), 0.3);
  color: var(--primary-color);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.export-content {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
  display: block;
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.format-btn {
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.format-btn:hover {
  background: rgba(var(--primary-rgb), 0.08);
  border-color: rgba(var(--primary-rgb), 0.2);
  transform: translateY(-2px);
}

.format-btn.active {
  background: rgba(var(--primary-rgb), 0.15);
  border-color: var(--primary-color);
}

.format-label {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 4px;
}

.format-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.slider {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(255, 64, 21, 0.4);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(255, 64, 21, 0.6);
}

.export-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.4);
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.6);
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn svg {
  width: 20px;
  height: 20px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.scale-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.pdf-info,
.json-info {
  padding: 16px;
  background: rgba(101, 255, 134, 0.05);
  border: 1px solid rgba(101, 255, 134, 0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.info-icon {
  width: 24px;
  height: 24px;
  color: rgba(101, 255, 134, 0.8);
  flex-shrink: 0;
  margin-top: 2px;
}

.info-text {
  flex: 1;
}

.info-text strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: rgba(101, 255, 134, 0.9);
  margin-bottom: 6px;
}

.info-text p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin: 0;
}

.import-btn {
  width: 100%;
  padding: 12px;
  background: rgba(101, 255, 134, 0.1);
  border: 2px solid rgba(101, 255, 134, 0.3);
  border-radius: 10px;
  color: rgba(101, 255, 134, 0.95);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
}

.import-btn:hover {
  background: rgba(101, 255, 134, 0.15);
  border-color: rgba(101, 255, 134, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(101, 255, 134, 0.2);
}

.import-btn svg {
  width: 18px;
  height: 18px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
