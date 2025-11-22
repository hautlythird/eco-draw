<script setup>
import { ref, computed } from 'vue'
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

const hoveredTool = ref(null)
const toolPosition = ref({ x: 0 })
const optionsMenuTimeout = ref(null)

const tools = [
  { id: 'brush', component: IconBrush, group: 'draw', hasOptions: true, tooltip: 'Brush (B)' },
  { id: 'eraser', component: IconEraser, group: 'draw', hasOptions: true, tooltip: 'Eraser (E)' },
  { id: 'square', component: IconSquare, group: 'shapes', hasOptions: true, tooltip: 'Rectangle (R)' },
  { id: 'circle', component: IconCircle, group: 'shapes', hasOptions: true, tooltip: 'Circle (C)' },
  { id: 'triangle', component: IconTriangle, group: 'shapes', hasOptions: true, tooltip: 'Triangle' },
  { id: 'text', component: IconText, group: 'tools', hasOptions: true, tooltip: 'Text (T)' },
  { id: 'image', component: IconImage, group: 'tools', hasOptions: true, tooltip: 'Image (I)' },
  { id: 'move', component: IconHand, group: 'tools', hasOptions: false, tooltip: 'Move (M)' },
  { id: 'divider', type: 'divider' },
  { id: 'undo', component: IconUndo, group: 'actions', hasOptions: false, tooltip: 'Undo (Ctrl+Z)' },
  { id: 'redo', component: IconRedo, group: 'actions', hasOptions: false, tooltip: 'Redo (Ctrl+Y)' },
  { id: 'divider2', type: 'divider' },
  { id: 'grid', component: IconGrid, group: 'actions', hasOptions: false, tooltip: 'Toggle Grid (G)' },
  { id: 'zoom-in', component: IconZoomIn, group: 'actions', hasOptions: false, tooltip: 'Zoom In (Ctrl++)' },
  { id: 'zoom-out', component: IconZoomOut, group: 'actions', hasOptions: false, tooltip: 'Zoom Out (Ctrl+-)' },
  { id: 'divider3', type: 'divider' },
  { id: 'projects', component: IconProjects, group: 'actions', hasOptions: false, tooltip: 'My Projects (Ctrl+O)' },
  { id: 'export', component: IconDownload, group: 'actions', hasOptions: false, tooltip: 'Export (Ctrl+E)' },
  { id: 'save', component: IconSave, group: 'actions', hasOptions: false, tooltip: 'Save Project (Ctrl+S)' },
  { id: 'shortcuts', component: IconKeyboard, group: 'actions', hasOptions: false, tooltip: 'Keyboard Shortcuts (?)' }
]

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
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-content">
      <template v-for="tool in tools" :key="tool.id">
        <div v-if="tool.type === 'divider'" class="toolbar-divider"></div>
        <button
          v-else
          :class="[
            'tool-btn', 
            { 
              active: baseTool === tool.id || (tool.id === 'grid' && showGrid),
              disabled: (tool.id === 'undo' && !canUndo) || (tool.id === 'redo' && !canRedo),
              'has-options': tool.hasOptions
            }
          ]"
          @click="handleToolClick(tool, $event)"
          @mouseenter="handleToolHover(tool, $event)"
          @mouseleave="handleToolLeave"
          :disabled="(tool.id === 'undo' && !canUndo) || (tool.id === 'redo' && !canRedo)"
          :title="tool.tooltip"
          :aria-label="tool.tooltip"
          :aria-pressed="baseTool === tool.id"
        >
          <component :is="tool.component" />
          <div v-if="baseTool === tool.id || (tool.id === 'grid' && showGrid)" class="tool-underline"></div>
          <div v-if="tool.hasOptions" class="options-indicator">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
          <!-- Show current option badge -->
          <div v-if="tool.hasOptions && baseTool === tool.id && currentToolOption" class="option-badge">
            {{ currentToolOption.charAt(0).toUpperCase() }}
          </div>
        </button>
      </template>
      <slot name="extra-tools"></slot>
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
  background: rgba(15, 15, 15, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.toolbar-content {
  display: flex;
  gap: 8px;
  padding: 0 24px;
  align-items: center;
}

.tool-btn {
  position: relative;
  width: 56px;
  height: 56px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 12px;
  flex-direction: column;
  outline: none;
}

.tool-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.tool-btn :deep(svg) {
  width: 28px;
  height: 28px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
}

.tool-btn:hover :deep(svg) {
  color: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.toolbar-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 8px;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.tool-btn.active :deep(svg) {
  color: var(--primary-color);
}

.tool-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.options-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  opacity: 0.4;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.tool-btn.has-options:hover .options-indicator {
  opacity: 0.8;
}

.tool-btn.active .options-indicator {
  opacity: 0.6;
}

.options-indicator svg {
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.8);
}

.option-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  animation: badgePop 0.3s ease;
}

@keyframes badgePop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.tool-underline {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: var(--primary-color);
  border-radius: 2px;
  animation: slideIn 0.2s ease;
  box-shadow: 0 0 8px rgba(var(--primary-rgb), 0.6);
}

@keyframes slideIn {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 32px;
    opacity: 1;
  }
}
</style>
