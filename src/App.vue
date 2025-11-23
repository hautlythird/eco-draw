<script setup>
import { ref, computed, provide, watch } from 'vue'
import { useUiStore } from './stores/ui'
import { useToolStore } from './stores/tool'
import { storeToRefs } from 'pinia'
import EditorCanvas from './components/Editor/EditorCanvas.vue'
import Sidebar from './components/Editor/Sidebar.vue'
import Toolbar from './components/Editor/Toolbar.vue'
import BrushControls from './components/Editor/BrushControls.vue'
import BotanicalLibrary from './components/Library/BotanicalLibrary.vue'
import KeyboardShortcuts from './components/Editor/KeyboardShortcuts.vue'
import GridGuide from './components/Editor/GridGuide.vue'
import ExportDialog from './components/Editor/ExportDialog.vue'
import ProjectsGallery from './components/Editor/ProjectsGallery.vue'
import RightPanel from './components/Editor/RightPanel.vue'
import GardenStats from './components/GardenStats.vue'
import GardenCalendar from './components/GardenCalendar.vue'
import SplashScreen from './components/SplashScreen.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import AccessibilityMenu from './components/AccessibilityMenu.vue'
import { useBrush } from './composables/useBrush'
import { useHistory } from './composables/useHistory'
import { useTheme } from './composables/useTheme'
import { useKeyboard } from './composables/useKeyboard'
import { useLocalStorage } from './composables/useLocalStorage'
import { useZoom } from './composables/useZoom'
import { useProjects } from './composables/useProjects'
import { logger } from './utils/logger'

const showSplash = ref(true)

const uiStore = useUiStore()
const toolStore = useToolStore()
const {
  showLibrary,
  showShortcuts,
  showExport,
  showAccessibility,
  showProjects,
  showStats,
  showCalendar,
  showGrid
} = storeToRefs(uiStore)

const currentTool = ref('brush')
const currentToolOption = ref('pencil')
const canvasRef = ref(null)
const canvasSize = ref({ width: 20, height: 15 }) // in meters
const projectName = ref('')

// Use composables for better state management
const { color: brushColor, thickness: brushThickness, hardness: brushHardness, opacity: brushOpacity } = useBrush()
const { canUndo, canRedo } = useHistory()
const { primaryColor } = useTheme()
const { zoomIn, zoomOut, resetZoom } = useZoom()
const {
  currentProjectId,
  currentProject,
  openProjects,
  saveProject,
  loadProject,
  switchToProject,
  closeProject,
  updateThumbnail,
  createNewProject,
  markUnsaved,
  markSaved
} = useProjects()

// Store canvas data for each open project
const projectCanvasData = ref(new Map())

// Sync brush color with theme color
const syncedBrushColor = computed({
  get: () => brushColor.value,
  set: (val) => {
    brushColor.value = val
    primaryColor.value = val
  }
})

// Provide accent color to child components
provide('primaryColor', primaryColor)

// Auto-save preferences
const { data: preferences } = useLocalStorage('ecodraw-preferences', {
  showGrid: true,
  lastColor: '#FF4015',
  lastThickness: 50
})

// Load saved preferences
if (preferences.value.lastColor) {
  syncedBrushColor.value = preferences.value.lastColor
}
if (preferences.value.lastThickness) {
  brushThickness.value = preferences.value.lastThickness
}
if (preferences.value.showGrid !== undefined) {
  showGrid.value = preferences.value.showGrid
}

const handleToolChange = (tool, option) => {
  logger.log('Tool change:', tool, 'Option:', option)

  // Handle action tools immediately using centralized zoom
  if (tool === 'zoom-in') {
    zoomIn()
    return
  } else if (tool === 'zoom-out') {
    zoomOut()
    return
  } else if (tool === 'library') {
    uiStore.showLibrary = true
    return
  }

  // Handle image tool with options
  if (tool === 'image') {
    if (option === 'upload') {
      handleImageUpload()
      return
    } else if (option === 'plant') {
      uiStore.showLibrary = true
      return
    }
  }

  // Set current tool
  currentTool.value = tool

  // Set option or use default
  if (option) {
    currentToolOption.value = option
  } else {
    // Set default options for tools
    const defaults = {
      brush: 'pencil',
      eraser: 'soft',
      square: 'rect',
      circle: 'circle',
      triangle: 'triangle',
      text: 'normal',
      image: 'upload'
    }
    if (defaults[tool]) {
      currentToolOption.value = defaults[tool]
    }
  }

  logger.log(`Active Tool: ${currentTool.value}, Option: ${currentToolOption.value}`)
}

const handleImageUpload = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          if (canvasRef.value) {
            canvasRef.value.addImage({
              image: img,
              x: 100,
              y: 100,
              width: img.width,
              height: img.height,
              draggable: true
            })
          }
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

const handleColorChange = (color) => {
  syncedBrushColor.value = color
  preferences.value.lastColor = color
}

const handleUndo = () => {
  if (canvasRef.value && canUndo()) {
    canvasRef.value.undo()
  }
}

const handleRedo = () => {
  if (canvasRef.value && canRedo()) {
    canvasRef.value.redo()
  }
}

const handleSave = () => {
  if (canvasRef.value) {
    const data = canvasRef.value.getCanvasData()
    logger.log('Saving canvas data:', data)

    // Get project name from user if not set
    let name = projectName.value || currentProject.value?.name
    if (!name) {
      name = prompt('Enter project name:', `Project ${new Date().toLocaleString()}`)
      if (!name) return // User cancelled
      projectName.value = name
    }

    // Save to localStorage
    const projectId = saveProject(data, name)

    // Mark as saved
    if (projectId) {
      markSaved(projectId)

      // Update in-memory data
      projectCanvasData.value.set(projectId, data)

      // Generate and save thumbnail
      try {
        const stage = canvasRef.value.getStage()
        if (stage) {
          const thumbnail = stage.toDataURL({ pixelRatio: 0.2 })
          updateThumbnail(projectId, thumbnail)
        }
      } catch (error) {
        logger.error('Failed to generate thumbnail:', error)
      }
    }

    // Also download as JSON
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${name.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)

    logger.log('Project saved:', name)
  }
}

const handleLoadProject = (projectId) => {
  // Save current project data before switching
  if (currentProjectId.value && canvasRef.value) {
    const currentData = canvasRef.value.getCanvasData()
    projectCanvasData.value.set(currentProjectId.value, currentData)
  }

  // Load the new project
  const data = loadProject(projectId)
  if (data && canvasRef.value) {
    canvasRef.value.loadCanvas(data)
    projectName.value = currentProject.value?.name || ''
    logger.log('Project loaded:', projectName.value)
    uiStore.showProjects = false // Close gallery after loading
  }
}

const handleSwitchProject = (projectId) => {
  // Save current project data before switching
  if (currentProjectId.value && canvasRef.value) {
    const currentData = canvasRef.value.getCanvasData()
    projectCanvasData.value.set(currentProjectId.value, currentData)
  }

  // Check if project data is already in memory
  if (projectCanvasData.value.has(projectId)) {
    const data = projectCanvasData.value.get(projectId)
    if (canvasRef.value) {
      canvasRef.value.loadCanvas(data)
    }
  } else {
    // Load from storage
    const data = switchToProject(projectId)
    if (data && canvasRef.value) {
      canvasRef.value.loadCanvas(data)
      projectCanvasData.value.set(projectId, data)
    }
  }

  projectName.value = currentProject.value?.name || ''
  logger.log('Switched to project:', projectName.value)
}

const handleCloseProject = (projectId) => {
  // Remove from memory
  projectCanvasData.value.delete(projectId)
  closeProject(projectId)

  // Load the new current project if one exists
  if (currentProjectId.value && currentProjectId.value !== projectId) {
    handleSwitchProject(currentProjectId.value)
  } else if (canvasRef.value) {
    // Clear canvas if no projects open
    canvasRef.value.clear()
    projectName.value = ''
  }
}


const handleNewProject = () => {
  // Save current project data before creating new
  if (currentProjectId.value && canvasRef.value) {
    const currentData = canvasRef.value.getCanvasData()
    projectCanvasData.value.set(currentProjectId.value, currentData)
  }

  const newId = createNewProject()

  // Clear canvas for new project
  if (canvasRef.value) {
    canvasRef.value.clear()
  }

  projectName.value = currentProject.value?.name || ''
  logger.log('New project created')
}

const handleOpenProjects = () => {
  uiStore.toggleProjects()
}

const handleCanvasSizeChange = (size) => {
  canvasSize.value = size
  logger.log('Canvas size changed:', size)
  // The canvas will automatically adjust based on the new size
}

const handleLayerSelect = (layerId, multiSelect) => {
  // Layer selection is handled by the layer system
  logger.log('Layer selected:', layerId, 'Multi:', multiSelect)
}

const handleLayerDelete = (layerId) => {
  // Layer deletion is handled by the layer system
  logger.log('Layer deleted:', layerId)
}

// Keyboard shortcuts using composable with centralized zoom
useKeyboard({
  'ctrl+z': handleUndo,
  'ctrl+shift+z': handleRedo,
  'ctrl+y': handleRedo,
  'ctrl+s': handleSave,
  'ctrl+o': handleOpenProjects,
  'ctrl+n': handleNewProject,
  'ctrl+=': zoomIn,
  'ctrl++': zoomIn,
  'ctrl+-': zoomOut,
  'ctrl+0': resetZoom,
  'b': () => handleToolChange('brush', 'pencil'),
  'e': () => handleToolChange('eraser', 'soft'),
  'r': () => handleToolChange('square', 'rect'),
  'c': () => handleToolChange('circle', 'circle'),
  't': () => handleToolChange('text', 'normal'),
  'i': () => handleToolChange('image', 'upload'),
  'm': () => handleToolChange('move'),
  'g': () => {
    uiStore.toggleGrid()
    preferences.value.showGrid = showGrid.value
  },
  '?': () => uiStore.toggleShortcuts(),
  'ctrl+e': () => uiStore.toggleExport(),
  'ctrl+shift+a': () => uiStore.toggleAccessibility()
})

// Watch for current project changes
watch(currentProject, (project) => {
  if (project) {
    projectName.value = project.name
  }
})

// Watch for canvas changes to mark as unsaved
let changeTimeout = null
const handleCanvasChange = () => {
  if (currentProjectId.value) {
    markUnsaved(currentProjectId.value)

    // Auto-save current state to memory
    clearTimeout(changeTimeout)
    changeTimeout = setTimeout(() => {
      if (canvasRef.value && currentProjectId.value) {
        const data = canvasRef.value.getCanvasData()
        projectCanvasData.value.set(currentProjectId.value, data)
      }
    }, 1000)
  }
}

// Initialize with a new project on startup
const initializeApp = () => {
  if (openProjects.value.length === 0) {
    handleNewProject()
  }
}

// Call initialization after splash screen
watch(showSplash, (isShowing) => {
  if (!isShowing) {
    initializeApp()
  }
})
</script>

<template>
  <ErrorBoundary>
    <SplashScreen v-if="showSplash" @loaded="showSplash = false" />

    <div v-show="!showSplash" class="app">
    <Sidebar
      @tool-change="handleToolChange"
      @canvas-size-change="handleCanvasSizeChange"
      @color-change="handleColorChange"
      @layer-select="handleLayerSelect"
      @layer-delete="handleLayerDelete"
    />

    <div class="main-content">
      <Toolbar
        :current-tool="currentTool"
        :current-tool-option="currentToolOption"
        :can-undo="canUndo()"
        :can-redo="canRedo()"
        :show-grid="showGrid"
        @tool-change="handleToolChange"
        @undo="handleUndo"
        @redo="handleRedo"
        @save="handleSave"
        @open-projects="uiStore.toggleProjects"
        @toggle-grid="uiStore.toggleGrid"
        @export="uiStore.toggleExport"
        @open-shortcuts="uiStore.toggleShortcuts"
      >
        <template #extra-tools>
          <button class="tool-btn" @click="uiStore.toggleStats" title="Garden Dashboard">
            📊
          </button>
          <button class="tool-btn" @click="uiStore.toggleCalendar" title="Seasonal Timeline">
            📅
          </button>
        </template>
      </Toolbar>

      <EditorCanvas
        ref="canvasRef"
        :tool="currentTool"
        :tool-option="currentToolOption"
        :brush-color="syncedBrushColor"
        :brush-thickness="brushThickness"
        :brush-hardness="brushHardness"
        :brush-opacity="brushOpacity"
        :show-grid="showGrid"
        :canvas-size="canvasSize"
        @mouseup="handleCanvasChange"
        @touchend="handleCanvasChange"
      />
    </div>

    <RightPanel
      @switch-project="handleSwitchProject"
      @close-project="handleCloseProject"
      @new-project="handleNewProject"
      @open-gallery="uiStore.toggleProjects"
      @open-library="uiStore.toggleLibrary"
    />

    <BrushControls
      :current-tool="currentTool"
      v-model:color="syncedBrushColor"
      v-model:thickness="brushThickness"
      v-model:hardness="brushHardness"
      v-model:opacity="brushOpacity"
      @color-change="handleColorChange"
    />

    <BotanicalLibrary
      v-if="showLibrary"
      @close="uiStore.toggleLibrary"
    />

    <GardenStats
      v-if="showStats"
      :plants="canvasRef?.getCanvasData().images || []"
      @close="uiStore.toggleStats"
    />

    <GardenCalendar
      v-if="showCalendar"
      :plants="canvasRef?.getCanvasData().images || []"
      @close="uiStore.toggleCalendar"
    />


    <ProjectsGallery
      v-if="showProjects"
      @close="uiStore.toggleProjects"
      @load-project="handleLoadProject"
    />

    <ExportDialog
      v-if="showExport"
      :canvas-ref="canvasRef"
      @close="uiStore.toggleExport"
    />

    <AccessibilityMenu
      v-if="showAccessibility"
      @close="uiStore.toggleAccessibility"
    />


    <GridGuide />


    </div>
  </ErrorBoundary>
</template>

<style scoped>
.app {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #0a0a0a;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .app {
    flex-direction: row;
    position: relative;
  }
  
  .main-content {
    width: 100%;
    margin-left: 0;
  }
}
</style>


/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .app {
    flex-direction: row;
    position: relative;
  }
  
  /* Hide desktop sidebar completely on mobile */
  .app > .sidebar {
    display: none;
  }
  
  .main-content {
    width: 100vw;
    height: 100vh;
    position: relative;
    z-index: 1;
  }
}
