<template>
  <div class="tool-presets">
    <div class="presets-header">
      <div class="header-title">
        <v-icon class="mr-2">mdi-bookmark-multiple</v-icon>
        Workflow Presets
      </div>
      <v-btn
        variant="text"
        size="small"
        @click="showCreateDialog = true"
        class="create-preset-btn"
      >
        <v-icon class="mr-1">mdi-plus</v-icon>
        Create
      </v-btn>
    </div>

    <!-- Built-in Presets -->
    <div class="presets-section">
      <div class="section-label">Garden Planning Workflows</div>
      <div class="presets-grid">
        <div
          v-for="preset in gardenPresets"
          :key="preset.id"
          class="preset-card built-in"
          :class="{ active: activePreset?.id === preset.id }"
          @click="applyPreset(preset)"
        >
          <div class="preset-icon">{{ preset.icon }}</div>
          <div class="preset-info">
            <div class="preset-name">{{ preset.name }}</div>
            <div class="preset-description">{{ preset.description }}</div>
          </div>
          <div class="preset-tools">
            <v-icon
              v-for="tool in preset.tools.slice(0, 3)"
              :key="tool"
              size="16"
              class="tool-icon"
            >
              {{ getToolIcon(tool) }}
            </v-icon>
            <span v-if="preset.tools.length > 3" class="more-tools">
              +{{ preset.tools.length - 3 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Presets -->
    <div class="presets-section" v-if="customPresets.length > 0">
      <div class="section-label">Your Custom Presets</div>
      <div class="presets-grid">
        <div
          v-for="preset in customPresets"
          :key="preset.id"
          class="preset-card custom"
          :class="{ active: activePreset?.id === preset.id }"
          @click="applyPreset(preset)"
        >
          <div class="preset-actions">
            <v-btn
              variant="text"
              size="x-small"
              icon="mdi-pencil"
              @click.stop="editPreset(preset)"
              class="action-btn"
            />
            <v-btn
              variant="text"
              size="x-small"
              icon="mdi-delete"
              @click.stop="deletePreset(preset.id)"
              class="action-btn delete"
            />
          </div>
          <div class="preset-icon">{{ preset.icon || '🎨' }}</div>
          <div class="preset-info">
            <div class="preset-name">{{ preset.name }}</div>
            <div class="preset-description">{{ preset.description }}</div>
          </div>
          <div class="preset-tools">
            <v-icon
              v-for="tool in preset.tools.slice(0, 3)"
              :key="tool"
              size="16"
              class="tool-icon"
            >
              {{ getToolIcon(tool) }}
            </v-icon>
            <span v-if="preset.tools.length > 3" class="more-tools">
              +{{ preset.tools.length - 3 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Current Preset Display -->
    <div v-if="activePreset" class="active-preset-display">
      <div class="active-preset-header">
        <v-icon class="mr-2">mdi-check-circle</v-icon>
        Active: {{ activePreset.name }}
      </div>
      <div class="active-preset-tools">
        <div class="tool-group" v-for="group in getPresetToolGroups(activePreset)" :key="group.name">
          <div class="group-name">{{ group.name }}</div>
          <div class="group-tools">
            <v-chip
              v-for="tool in group.tools"
              :key="tool"
              size="small"
              variant="outlined"
              class="tool-chip"
            >
              <v-icon size="12" class="mr-1">{{ getToolIcon(tool) }}</v-icon>
              {{ getToolName(tool) }}
            </v-chip>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Preset Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingPreset ? 'Edit Preset' : 'Create New Preset' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="presetForm" v-model="formValid">
            <v-text-field
              v-model="newPreset.name"
              label="Preset Name"
              required
              :rules="[v => !!v || 'Name is required']"
              variant="outlined"
              density="compact"
            />
            <v-textarea
              v-model="newPreset.description"
              label="Description"
              rows="2"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="newPreset.icon"
              label="Icon (emoji)"
              placeholder="🎨"
              variant="outlined"
              density="compact"
            />

            <div class="tools-selection">
              <div class="selection-header">Select Tools:</div>
              <div class="tools-grid">
                <div
                  v-for="tool in availableTools"
                  :key="tool.id"
                  class="tool-select-item"
                  :class="{ selected: newPreset.tools.includes(tool.id) }"
                  @click="toggleTool(tool.id)"
                >
                  <v-icon>{{ getToolIcon(tool.id) }}</v-icon>
                  <span>{{ getToolName(tool.id) }}</span>
                  <v-checkbox
                    :model-value="newPreset.tools.includes(tool.id)"
                    hide-details
                    density="compact"
                  />
                </div>
              </div>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeCreateDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="savePreset"
            :disabled="!formValid || newPreset.tools.length === 0"
          >
            {{ editingPreset ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'

export default {
  name: 'ToolPresets',
  props: {
    currentTool: String,
    currentTools: {
      type: Array,
      default: () => []
    }
  },
  emits: ['preset-applied', 'preset-updated'],
  setup(props, { emit }) {
    // State
    const activePreset = ref(null)
    const customPresets = ref([])
    const showCreateDialog = ref(false)
    const editingPreset = ref(null)
    const formValid = ref(false)

    // Form data
    const newPreset = ref({
      name: '',
      description: '',
      icon: '🎨',
      tools: []
    })

    // Built-in garden planning presets
    const gardenPresets = ref([
      {
        id: 'garden-layout',
        name: 'Garden Layout',
        description: 'Design garden beds and pathways',
        icon: '🏡',
        category: 'layout',
        tools: ['brush', 'square', 'circle', 'text', 'move'],
        brushSettings: {
          pencilType: 'HB',
          thickness: 50,
          color: '#2c2c2c'
        }
      },
      {
        id: 'planting-design',
        name: 'Planting Design',
        description: 'Plan plant placement and companion planting',
        icon: '🌱',
        category: 'planting',
        tools: ['brush', 'circle', 'text', 'move'],
        brushSettings: {
          pencilType: '2B',
          thickness: 30,
          color: '#4CAF50'
        }
      },
      {
        id: 'technical-drawing',
        name: 'Technical Drawing',
        description: 'Precise measurements and architectural plans',
        icon: '📐',
        category: 'technical',
        tools: ['brush', 'square', 'circle', 'triangle', 'text', 'move'],
        brushSettings: {
          pencilType: 'MECHANICAL',
          thickness: 20,
          color: '#1a1a1a'
        }
      },
      {
        id: 'sketching',
        name: 'Artistic Sketching',
        description: 'Free-form garden sketches and ideas',
        icon: '✏️',
        category: 'artistic',
        tools: ['brush', 'eraser', 'text', 'move'],
        brushSettings: {
          pencilType: '4B',
          thickness: 60,
          color: '#8B4513'
        }
      },
      {
        id: 'annotation',
        name: 'Annotations & Notes',
        description: 'Add labels, measurements, and notes',
        icon: '📝',
        category: 'annotation',
        tools: ['text', 'brush', 'move'],
        brushSettings: {
          pencilType: 'HB',
          thickness: 25,
          color: '#191970'
        }
      },
      {
        id: 'companion-planning',
        name: 'Companion Planning',
        description: 'Design companion plant relationships',
        icon: '🤝',
        category: 'planting',
        tools: ['circle', 'brush', 'text', 'move'],
        brushSettings: {
          pencilType: '2B',
          thickness: 35,
          color: '#FF6B35'
        }
      }
    ])

    // Available tools for selection
    const availableTools = ref([
      { id: 'brush', name: 'Brush', category: 'drawing' },
      { id: 'eraser', name: 'Eraser', category: 'drawing' },
      { id: 'square', name: 'Rectangle', category: 'shapes' },
      { id: 'circle', name: 'Circle', category: 'shapes' },
      { id: 'triangle', name: 'Triangle', category: 'shapes' },
      { id: 'text', name: 'Text', category: 'tools' },
      { id: 'image', name: 'Image', category: 'tools' },
      { id: 'move', name: 'Move', category: 'tools' }
    ])

    // Load custom presets from localStorage
    const loadCustomPresets = () => {
      try {
        const saved = localStorage.getItem('eco-draw-custom-presets')
        if (saved) {
          customPresets.value = JSON.parse(saved)
        }
      } catch (error) {
        console.warn('Failed to load custom presets:', error)
      }
    }

    // Save custom presets to localStorage
    const saveCustomPresets = () => {
      try {
        localStorage.setItem('eco-draw-custom-presets', JSON.stringify(customPresets.value))
      } catch (error) {
        console.warn('Failed to save custom presets:', error)
      }
    }

    // Apply a preset
    const applyPreset = (preset) => {
      activePreset.value = preset

      const presetData = {
        id: preset.id,
        name: preset.name,
        tools: preset.tools,
        brushSettings: preset.brushSettings,
        category: preset.category
      }

      emit('preset-applied', presetData)
    }

    // Edit a preset
    const editPreset = (preset) => {
      editingPreset.value = preset
      newPreset.value = {
        name: preset.name,
        description: preset.description,
        icon: preset.icon || '🎨',
        tools: [...preset.tools]
      }
      showCreateDialog.value = true
    }

    // Delete a preset
    const deletePreset = (presetId) => {
      if (confirm('Are you sure you want to delete this preset?')) {
        customPresets.value = customPresets.value.filter(p => p.id !== presetId)
        saveCustomPresets()

        if (activePreset.value?.id === presetId) {
          activePreset.value = null
        }
      }
    }

    // Toggle tool selection
    const toggleTool = (toolId) => {
      const index = newPreset.value.tools.indexOf(toolId)
      if (index > -1) {
        newPreset.value.tools.splice(index, 1)
      } else {
        newPreset.value.tools.push(toolId)
      }
    }

    // Save preset
    const savePreset = () => {
      if (!formValid.value || newPreset.value.tools.length === 0) return

      const presetData = {
        id: editingPreset.value ? editingPreset.value.id : `custom-${Date.now()}`,
        name: newPreset.value.name,
        description: newPreset.value.description,
        icon: newPreset.value.icon,
        tools: [...newPreset.value.tools],
        category: 'custom',
        createdAt: editingPreset.value?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (editingPreset.value) {
        const index = customPresets.value.findIndex(p => p.id === editingPreset.value.id)
        if (index > -1) {
          customPresets.value[index] = presetData
        }
      } else {
        customPresets.value.push(presetData)
      }

      saveCustomPresets()
      emit('preset-updated')
      closeCreateDialog()
    }

    // Close create dialog
    const closeCreateDialog = () => {
      showCreateDialog.value = false
      editingPreset.value = null
      newPreset.value = {
        name: '',
        description: '',
        icon: '🎨',
        tools: []
      }
    }

    // Get tool icon
    const getToolIcon = (toolId) => {
      const iconMap = {
        'brush': 'mdi-brush',
        'eraser': 'mdi-eraser',
        'square': 'mdi-square',
        'circle': 'mdi-circle',
        'triangle': 'mdi-triangle',
        'text': 'mdi-format-text',
        'image': 'mdi-image',
        'move': 'mdi-cursor-move'
      }
      return iconMap[toolId] || 'mdi-tools'
    }

    // Get tool name
    const getToolName = (toolId) => {
      const tool = availableTools.value.find(t => t.id === toolId)
      return tool ? tool.name : toolId
    }

    // Get preset tool groups
    const getPresetToolGroups = (preset) => {
      const categories = {
        drawing: { name: 'Drawing', tools: [] },
        shapes: { name: 'Shapes', tools: [] },
        tools: { name: 'Tools', tools: [] }
      }

      preset.tools.forEach(toolId => {
        const tool = availableTools.value.find(t => t.id === toolId)
        if (tool && categories[tool.category]) {
          categories[tool.category].tools.push(toolId)
        }
      })

      return Object.values(categories).filter(group => group.tools.length > 0)
    }

    // Initialize
    onMounted(() => {
      loadCustomPresets()
    })

    return {
      // State
      activePreset,
      customPresets,
      gardenPresets,
      showCreateDialog,
      editingPreset,
      formValid,
      newPreset,
      availableTools,

      // Methods
      applyPreset,
      editPreset,
      deletePreset,
      toggleTool,
      savePreset,
      closeCreateDialog,
      getToolIcon,
      getToolName,
      getPresetToolGroups
    }
  }
}
</script>

<style scoped>
.tool-presets {
  padding: 16px;
  background: var(--v-theme-surface);
  border-radius: 8px;
  max-height: 500px;
  overflow-y: auto;
}

.presets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--v-theme-outline);
}

.header-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: var(--v-theme-primary);
  font-size: 16px;
}

.create-preset-btn {
  font-size: 12px;
}

.presets-section {
  margin-bottom: 24px;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--v-theme-on-surface-variant);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.presets-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.preset-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--v-theme-surface-variant);
}

.preset-card:hover {
  border-color: var(--v-theme-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.preset-card.active {
  border-color: var(--v-theme-primary);
  background: var(--v-theme-primary-container);
  color: var(--v-theme-on-primary-container);
}

.preset-card.built-in {
  background: linear-gradient(135deg, var(--v-theme-surface-variant) 0%, var(--v-theme-surface) 100%);
}

.preset-card.custom {
  border-style: dashed;
}

.preset-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.preset-card:hover .preset-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  background: rgba(0,0,0,0.1);
}

.action-btn.delete {
  color: var(--v-theme-error);
}

.preset-icon {
  font-size: 24px;
  margin-right: 12px;
  width: 32px;
  text-align: center;
}

.preset-info {
  flex: 1;
  margin-right: 12px;
}

.preset-name {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 2px;
}

.preset-description {
  font-size: 12px;
  opacity: 0.7;
  line-height: 1.3;
}

.preset-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-icon {
  opacity: 0.6;
  font-size: 14px;
}

.more-tools {
  font-size: 11px;
  opacity: 0.5;
  font-weight: 500;
}

.active-preset-display {
  padding: 12px;
  background: var(--v-theme-primary-container);
  border-radius: 8px;
  margin-top: 16px;
}

.active-preset-header {
  display: flex;
  align-items: center;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--v-theme-on-primary-container);
}

.active-preset-tools {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-name {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.group-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tool-chip {
  font-size: 11px;
}

.tools-selection {
  margin-top: 16px;
}

.selection-header {
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--v-theme-on-surface-variant);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--v-theme-outline);
  border-radius: 4px;
  padding: 8px;
}

.tool-select-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--v-theme-outline);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.tool-select-item:hover {
  background: var(--v-theme-surface-variant);
}

.tool-select-item.selected {
  background: var(--v-theme-primary-container);
  border-color: var(--v-theme-primary);
}

.tool-select-item span {
  flex: 1;
  font-weight: 500;
}

/* Scrollbar styling */
.tool-presets::-webkit-scrollbar,
.tools-grid::-webkit-scrollbar {
  width: 6px;
}

.tool-presets::-webkit-scrollbar-track,
.tools-grid::-webkit-scrollbar-track {
  background: var(--v-theme-surface-variant);
  border-radius: 3px;
}

.tool-presets::-webkit-scrollbar-thumb,
.tools-grid::-webkit-scrollbar-thumb {
  background: var(--v-theme-outline);
  border-radius: 3px;
}

.tool-presets::-webkit-scrollbar-thumb:hover,
.tools-grid::-webkit-scrollbar-thumb:hover {
  background: var(--v-theme-on-surface-variant);
}
</style>