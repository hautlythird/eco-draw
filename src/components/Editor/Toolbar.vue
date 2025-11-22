<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ToolOptions from './ToolOptions.vue'
import IconBrush from '../Icons/IconBrush.vue'
import IconEraser from '../Icons/IconEraser.vue'
import IconSquare from '../Icons/IconSquare.vue'
import IconCircle from '../Icons/IconCircle.vue'
import IconTriangle from '../Icons/IconTriangle.vue'
import IconText from '../Icons/IconText.vue'
import IconImage from '../Icons/IconImage.vue'
import IconHand from '../Icons/IconHand.vue'
import IconUndo from '../Icons/IconUndo.vue'
import IconRedo from '../Icons/IconRedo.vue'
import IconZoomIn from '../Icons/IconZoomIn.vue'
import IconZoomOut from '../Icons/IconZoomOut.vue'
import IconSave from '../Icons/IconSave.vue'
import IconGrid from '../Icons/IconGrid.vue'
import IconDownload from '../Icons/IconDownload.vue'
import IconProjects from '../Icons/IconProjects.vue'
import IconKeyboard from '../Icons/IconKeyboard.vue'

const props = defineProps({
  currentTool: String,
  currentToolOption: String,
  canUndo: Boolean,
  canRedo: Boolean,
  showGrid: Boolean
})

const emit = defineEmits(['tool-change', 'undo', 'redo', 'save', 'open-projects', 'toggle-grid', 'export', 'open-shortcuts'])

// Toolbar state
const isCompact = ref(false)
const showTooltips = ref(true)
const activeGroup = ref(null)

const hoveredTool = ref(null)
const toolPosition = ref({ x: 0 })
const optionsMenuTimeout = ref(null)

// Tool groups for better organization
const toolGroups = {
  draw: { label: 'Drawing', icon: '✏️' },
  shapes: { label: 'Shapes', icon: '⬜' },
  tools: { label: 'Tools', icon: '🛠️' },
  history: { label: 'History', icon: '↩️' },
  view: { label: 'View', icon: '👁️' },
  file: { label: 'File', icon: '💾' }
}

const tools = [
  // Drawing tools
  { id: 'brush', component: IconBrush, group: 'draw', hasOptions: true, tooltip: 'Brush', shortcut: 'B', priority: 1 },
  { id: 'eraser', component: IconEraser, group: 'draw', hasOptions: true, tooltip: 'Eraser', shortcut: 'E', priority: 1 },
  
  // Shape tools
  { id: 'square', component: IconSquare, group: 'shapes', hasOptions: true, tooltip: 'Rectangle', shortcut: 'R', priority: 2 },
  { id: 'circle', component: IconCircle, group: 'shapes', hasOptions: true, tooltip: 'Circle', shortcut: 'C', priority: 2 },
  { id: 'triangle', component: IconTriangle, group: 'shapes', hasOptions: true, tooltip: 'Triangle', shortcut: '', priority: 2 },
  
  // Utility tools
  { id: 'text', component: IconText, group: 'tools', hasOptions: true, tooltip: 'Text', shortcut: 'T', priority: 2 },
  { id: 'image', component: IconImage, group: 'tools', hasOptions: true, tooltip: 'Image', shortcut: 'I', priority: 2 },
  { id: 'move', component: IconHand, group: 'tools', hasOptions: false, tooltip: 'Move', shortcut: 'M', priority: 2 },
  
  { id: 'divider-1', type: 'divider' },
  
  // History actions
  { id: 'undo', component: IconUndo, group: 'history', hasOptions: false, tooltip: 'Undo', shortcut: 'Ctrl+Z', priority: 3 },
  { id: 'redo', component: IconRedo, group: 'history', hasOptions: false, tooltip: 'Redo', shortcut: 'Ctrl+Y', priority: 3 },
  
  { id: 'divider-2', type: 'divider' },
  
  // View controls
  { id: 'grid', component: IconGrid, group: 'view', hasOptions: false, tooltip: 'Toggle Grid', shortcut: 'G', priority: 3 },
  { id: 'zoom-in', component: IconZoomIn, group: 'view', hasOptions: false, tooltip: 'Zoom In', shortcut: 'Ctrl++', priority: 3 },
  { id: 'zoom-out', component: IconZoomOut, group: 'view', hasOptions: false, tooltip: 'Zoom Out', shortcut: 'Ctrl+-', priority: 3 },
  
  { id: 'divider-3', type: 'divider' },
  
  // File operations
  { id: 'projects', component: IconProjects, group: 'file', hasOptions: false, tooltip: 'My Projects', shortcut: 'Ctrl+O', priority: 4 },
  { id: 'save', component: IconSave, group: 'file', hasOptions: false, tooltip: 'Save Project', shortcut: 'Ctrl+S', priority: 4 },
  { id: 'export', component: IconDownload, group: 'file', hasOptions: false, tooltip: 'Export', shortcut: 'Ctrl+E', priority: 4 },
  { id: 'shortcuts', component: IconKeyboard, group: 'file', hasOptions: false, tooltip: 'Shortcuts', shortcut: '?', priority: 4 }
]

// Filtered tools based on compact mode
const visibleTools = computed(() => {
  if (!isCompact.value) return tools
  // In compact mode, show only priority 1 and 2 tools
  return tools.filter(tool => tool.type === 'divider' || tool.priority <= 2)
})

// Get the base tool name (without option suffix)
const baseTool = computed(() => {
  if (!props.currentTool) return null
  return props.currentTool.split('-')[0]
})

const handleToolClick = (tool, event) => {
  if (tool.type === 'divider') return
  
  // Handle action buttons
  if (tool.id === 'undo') {
    emit('undo')
    return
  } else if (tool.id === 'redo') {
    emit('redo')
    return
  } else if (tool.id === 'save') {
    emit('save')
    return
  } else if (tool.id === 'export') {
    emit('export')
    return
  } else if (tool.id === 'grid') {
    emit('toggle-grid')
    return
  } else if (tool.id === 'projects') {
    emit('open-projects')
    return
  } else if (tool.id === 'zoom-in') {
    emit('tool-change', 'zoom-in')
    return
  } else if (tool.id === 'zoom-out') {
    emit('tool-change', 'zoom-out')
    return
  } else if (tool.id === 'shortcuts') {
    emit('open-shortcuts')
    return
  }
  
  // For tools with options, activate tool with default option if not already active
  if (tool.hasOptions) {
    if (baseTool.value !== tool.id) {
      // Activate tool with default option
      const defaultOption = getDefaultOption(tool.id)
      emit('tool-change', tool.id, defaultOption)
    }
    // Show options menu on click
    const rect = event.currentTarget.getBoundingClientRect()
    toolPosition.value = { x: rect.left + rect.width / 2 }
    hoveredTool.value = tool.id
  } else {
    emit('tool-change', tool.id)
  }
}

const getDefaultOption = (toolId) => {
  const defaults = {
    brush: 'pencil',
    eraser: 'soft',
    square: 'rect',
    circle: 'circle',
    triangle: 'triangle',
    text: 'normal',
    image: 'upload'
  }
  return defaults[toolId] || null
}

const handleToolHover = (tool, event) => {
  // Only show options for tools that have them
  if (!tool.hasOptions || tool.type === 'divider') return
  
  clearTimeout(optionsMenuTimeout.value)
  const rect = event.currentTarget.getBoundingClientRect()
  toolPosition.value = { x: rect.left + rect.width / 2 }
  hoveredTool.value = tool.id
}

const handleToolLeave = () => {
  clearTimeout(optionsMenuTimeout.value)
  optionsMenuTimeout.value = setTimeout(() => {
    hoveredTool.value = null
  }, 200)
}

const handleOptionsMouseEnter = () => {
  clearTimeout(optionsMenuTimeout.value)
}

const handleOptionsMouseLeave = () => {
  handleToolLeave()
}

const handleOptionSelect = (data) => {
  emit('tool-change', data.tool, data.option)
  hoveredTool.value = null
  clearTimeout(optionsMenuTimeout.value)
}

// Responsive toolbar detection
const checkCompactMode = () => {
  isCompact.value = window.innerWidth < 1024
}

onMounted(() => {
  checkCompactMode()
  window.addEventListener('resize', checkCompactMode)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkCompactMode)
  clearTimeout(optionsMenuTimeout.value)
})

// Get formatted tooltip with shortcut
const getTooltipText = (tool) => {
  if (!showTooltips.value) return ''
  return tool.shortcut ? `${tool.tooltip} (${tool.shortcut})` : tool.tooltip
}

// Check if tool is disabled
const isToolDisabled = (tool) => {
  if (tool.id === 'undo') return !props.canUndo
  if (tool.id === 'redo') return !props.canRedo
  return false
}
</script>

<template>
  <div :class="['toolbar', { compact: isCompact }]">
    <div class="toolbar-wrapper">
      <!-- Tool groups section -->
      <div class="toolbar-content">
        <template v-for="tool in visibleTools" :key="tool.id">
          <div v-if="tool.type === 'divider'" class="toolbar-divider"></div>
          <button
            v-else
            :class="[
              'tool-btn', 
              { 
                active: baseTool === tool.id || (tool.id === 'grid' && showGrid),
                disabled: isToolDisabled(tool),
                'has-options': tool.hasOptions,
                'has-shortcut': tool.shortcut
              }
            ]"
            @click="handleToolClick(tool, $event)"
            @mouseenter="handleToolHover(tool, $event)"
            @mouseleave="handleToolLeave"
            :disabled="isToolDisabled(tool)"
            :title="getTooltipText(tool)"
            :aria-label="getTooltipText(tool)"
            :aria-pressed="baseTool === tool.id"
            :data-group="tool.group"
          >
            <component :is="tool.component" />
            
            <!-- Active indicator -->
            <div v-if="baseTool === tool.id || (tool.id === 'grid' && showGrid)" class="tool-underline"></div>
            
            <!-- Options dropdown indicator -->
            <div v-if="tool.hasOptions" class="options-indicator">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
            
            <!-- Current option badge -->
            <div v-if="tool.hasOptions && baseTool === tool.id && currentToolOption" class="option-badge">
              {{ currentToolOption.charAt(0).toUpperCase() }}
            </div>
            
            <!-- Keyboard shortcut hint -->
            <div v-if="tool.shortcut && !isCompact" class="shortcut-hint">
              {{ tool.shortcut }}
            </div>
          </button>
        </template>
        
        <!-- Extra tools slot -->
        <slot name="extra-tools"></slot>
      </div>
      
      <!-- Toolbar actions (right side) -->
      <div class="toolbar-actions">
        <button 
          class="action-btn"
          @click="showTooltips = !showTooltips"
          :title="showTooltips ? 'Hide tooltips' : 'Show tooltips'"
          :aria-label="showTooltips ? 'Hide tooltips' : 'Show tooltips'"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
  
  <!-- Render ToolOptions outside toolbar using Teleport -->
  <Teleport to="body">
    <ToolOptions
      v-if="hoveredTool"
      :tool="hoveredTool"
      :current-option="currentToolOption"
      :position="toolPosition"
      @option-select="handleOptionSelect"
      @close="hoveredTool = null"
      @mouseenter="handleOptionsMouseEnter"
      @mouseleave="handleOptionsMouseLeave"
    />
  </Teleport>
</template>

<style scoped>
.toolbar {
  position: relative;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.98) 0%, rgba(15, 15, 15, 0.95) 100%);
  backdrop-filter: blur(30px) saturate(150%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
  transition: all 0.3s ease;
}

.toolbar.compact {
  height: 64px;
}

.toolbar-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1800px;
  padding: 0 24px;
  gap: 24px;
}

.toolbar-content {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Action buttons */
.action-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  outline: none;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(var(--primary-rgb), 0.3);
  transform: scale(1.05);
}

.action-btn svg {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s ease;
}

.action-btn:hover svg {
  color: var(--primary-color);
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .toolbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: auto;
    min-height: 50px;
    background: rgba(10, 10, 10, 0.98);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    justify-content: flex-start;
    z-index: 900;
    padding: 0;
  }
  
  .toolbar-wrapper {
    padding: 4px 4px 4px 56px;
    gap: 8px;
  }
  
  .toolbar-content {
    padding: 0;
    gap: 2px;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  
  .toolbar-actions {
    display: none; /* Hide on mobile to save space */
  }
  
  .tool-btn {
    width: 40px !important;
    height: 40px !important;
    flex-shrink: 0;
    border-radius: 10px !important;
  }
  
  .tool-btn :deep(svg) {
    width: 20px !important;
    height: 20px !important;
  }
  
  .toolbar-divider {
    height: 24px !important;
    margin: 0 2px !important;
    align-self: center;
  }
  
  .option-badge {
    width: 12px !important;
    height: 12px !important;
    font-size: 7px !important;
    top: 2px !important;
    right: 2px !important;
  }
  
  .tool-underline {
    width: 20px !important;
    height: 2px !important;
    bottom: 2px !important;
  }
  
  .options-indicator {
    width: 10px !important;
    height: 10px !important;
    bottom: 2px !important;
    right: 2px !important;
  }
  
  .shortcut-hint {
    display: none !important;
  }
}

/* Extra small screens - more aggressive wrapping */
@media (max-width: 480px) {
  .toolbar-wrapper {
    padding: 2px 2px 2px 52px;
  }
  
  .toolbar-content {
    gap: 1px;
  }
  
  .tool-btn {
    width: 36px !important;
    height: 36px !important;
    border-radius: 8px !important;
  }
  
  .tool-btn :deep(svg) {
    width: 18px !important;
    height: 18px !important;
  }
  
  .toolbar-divider {
    height: 20px !important;
    margin: 0 1px !important;
  }
}

.tool-btn {
  position: relative;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 14px;
  flex-direction: column;
  outline: none;
  overflow: hidden;
}

.tool-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(var(--primary-rgb), 0.15) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tool-btn:hover::before {
  opacity: 1;
}

.tool-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.2);
}

.tool-btn :deep(svg) {
  width: 26px;
  height: 26px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  position: relative;
  z-index: 1;
}

.tool-btn:hover {
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.12) 0%, rgba(var(--primary-rgb), 0.06) 100%);
  border-color: rgba(var(--primary-rgb), 0.3);
  transform: translateY(-2px);
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(var(--primary-rgb), 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.tool-btn:hover :deep(svg) {
  color: rgba(255, 255, 255, 0.95);
  transform: scale(1.15) rotate(-3deg);
}

.tool-btn:active {
  transform: translateY(0);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tool-btn.active {
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.25) 0%, rgba(var(--primary-rgb), 0.15) 100%);
  border-color: var(--primary-color);
  box-shadow: 
    0 0 20px rgba(var(--primary-rgb), 0.4),
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.tool-btn.active :deep(svg) {
  color: var(--primary-color);
  transform: scale(1.1);
  filter: drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.6));
}

.tool-btn.disabled {
  opacity: 0.25;
  cursor: not-allowed;
  pointer-events: none;
  filter: grayscale(1);
}

.toolbar-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(255, 255, 255, 0.12) 20%,
    rgba(255, 255, 255, 0.12) 80%,
    transparent 100%
  );
  margin: 0 8px;
  flex-shrink: 0;
}

.options-indicator {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 12px;
  height: 12px;
  opacity: 0.35;
  transition: all 0.3s ease;
  pointer-events: none;
  z-index: 2;
}

.tool-btn.has-options:hover .options-indicator {
  opacity: 0.8;
  transform: translateY(2px);
}

.tool-btn.active .options-indicator {
  opacity: 0.6;
  color: var(--primary-color);
}

.options-indicator svg {
  width: 100%;
  height: 100%;
  color: currentColor;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.option-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: white;
  box-shadow: 
    0 2px 8px rgba(var(--primary-rgb), 0.5),
    0 0 0 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  pointer-events: none;
  animation: badgePop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 2;
  letter-spacing: 0.5px;
}

@keyframes badgePop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.3) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.tool-underline {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    var(--primary-color) 20%, 
    var(--primary-color) 80%, 
    transparent 100%
  );
  border-radius: 2px;
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 
    0 0 12px rgba(var(--primary-rgb), 0.8),
    0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

@keyframes slideIn {
  0% {
    width: 0;
    opacity: 0;
    transform: translateX(-50%) scaleX(0);
  }
  50% {
    opacity: 1;
  }
  100% {
    width: 32px;
    opacity: 1;
    transform: translateX(-50%) scaleX(1);
  }
}

.shortcut-hint {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tool-btn:hover .shortcut-hint {
  opacity: 1;
  bottom: -24px;
}
</style>
