import { ref, computed } from 'vue'
import { generateElementId } from '@/utils/idGenerator'

// Centralized layer management system
const layers = ref([])
const selectedLayerIds = ref([])
const activeLayerId = ref(null)

export function useLayers() {
  // Create a new layer from an element
  const createLayer = (element, type, name = null) => {
    const layer = {
      id: element.id || generateElementId(),
      name: name || `${type} ${layers.value.length + 1}`,
      type: type, // 'line', 'shape', 'image', 'text'
      visible: true,
      locked: false,
      element: element,
      createdAt: Date.now()
    }
    
    layers.value.push(layer)
    return layer
  }

  // Get layer by ID
  const getLayerById = (id) => {
    return layers.value.find(l => l.id === id)
  }

  // Get layer by element ID
  const getLayerByElementId = (elementId) => {
    return layers.value.find(l => l.element.id === elementId)
  }

  // Update layer
  const updateLayer = (layerId, updates) => {
    const layer = getLayerById(layerId)
    if (layer) {
      Object.assign(layer, updates)
    }
  }

  // Delete layer
  const deleteLayer = (layerId) => {
    const index = layers.value.findIndex(l => l.id === layerId)
    if (index > -1) {
      layers.value.splice(index, 1)
      // Remove from selection if selected
      const selIndex = selectedLayerIds.value.indexOf(layerId)
      if (selIndex > -1) {
        selectedLayerIds.value.splice(selIndex, 1)
      }
      if (activeLayerId.value === layerId) {
        activeLayerId.value = null
      }
    }
  }

  // Select layer(s)
  const selectLayer = (layerId, multiSelect = false) => {
    if (multiSelect) {
      const index = selectedLayerIds.value.indexOf(layerId)
      if (index > -1) {
        selectedLayerIds.value.splice(index, 1)
      } else {
        selectedLayerIds.value.push(layerId)
      }
    } else {
      selectedLayerIds.value = [layerId]
    }
    activeLayerId.value = layerId
  }

  // Clear selection
  const clearSelection = () => {
    selectedLayerIds.value = []
    activeLayerId.value = null
  }

  // Get selected layers
  const selectedLayers = computed(() => {
    return layers.value.filter(l => selectedLayerIds.value.includes(l.id))
  })

  // Get selected elements (for transformer)
  const selectedElements = computed(() => {
    return selectedLayers.value.map(l => l.element)
  })

  // Check if layer is selected
  const isLayerSelected = (layerId) => {
    return selectedLayerIds.value.includes(layerId)
  }

  // Toggle layer visibility
  const toggleLayerVisibility = (layerId) => {
    const layer = getLayerById(layerId)
    if (layer) {
      layer.visible = !layer.visible
    }
  }

  // Toggle layer lock
  const toggleLayerLock = (layerId) => {
    const layer = getLayerById(layerId)
    if (layer) {
      layer.locked = !layer.locked
    }
  }

  // Rename layer
  const renameLayer = (layerId, newName) => {
    const layer = getLayerById(layerId)
    if (layer) {
      layer.name = newName
      layer.element.tag = newName
    }
  }

  // Clear all layers
  const clearLayers = () => {
    layers.value = []
    selectedLayerIds.value = []
    activeLayerId.value = null
  }

  // Sync layers from canvas elements
  const syncLayersFromElements = (lines, shapes, images, texts) => {
    const existingIds = new Set(layers.value.map(l => l.id))
    
    // Add new layers for elements that don't have layers yet
    lines.forEach(line => {
      if (!existingIds.has(line.id)) {
        createLayer(line, 'line', line.tag)
      }
    })
    
    shapes.forEach(shape => {
      if (!existingIds.has(shape.id)) {
        createLayer(shape, 'shape', shape.tag)
      }
    })
    
    images.forEach(image => {
      if (!existingIds.has(image.id)) {
        createLayer(image, 'image', image.tag)
      }
    })
    
    texts.forEach(text => {
      if (!existingIds.has(text.id)) {
        createLayer(text, 'text', text.tag)
      }
    })
    
    // Remove layers for elements that no longer exist
    const allElementIds = new Set([
      ...lines.map(l => l.id),
      ...shapes.map(s => s.id),
      ...images.map(i => i.id),
      ...texts.map(t => t.id)
    ])
    
    layers.value = layers.value.filter(layer => allElementIds.has(layer.id))
  }

  return {
    layers,
    selectedLayerIds,
    activeLayerId,
    selectedLayers,
    selectedElements,
    createLayer,
    getLayerById,
    getLayerByElementId,
    updateLayer,
    deleteLayer,
    selectLayer,
    clearSelection,
    isLayerSelected,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    clearLayers,
    syncLayersFromElements
  }
}
