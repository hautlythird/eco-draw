<script setup>
import { computed } from 'vue'
import { useLayers } from '@/composables/useLayers'

const {
  layers,
  selectedLayerIds,
  toggleLayerVisibility,
  toggleLayerLock,
  deleteLayer: removeLayer,
  selectLayer,
  isLayerSelected,
  moveLayerUp,
  moveLayerDown
} = useLayers()

const emit = defineEmits(['layer-select', 'layer-delete'])

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

const handleMoveLayerUp = (layer) => {
  moveLayerUp(layer.id)
}

const handleMoveLayerDown = (layer) => {
  moveLayerDown(layer.id)
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
  <div class="layers-panel">
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
        <div class="layer-actions">
          <button @click.stop="handleMoveLayerUp(layer)" class="layer-action-btn" title="Move Up">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
            </svg>
          </button>
          <button @click.stop="handleMoveLayerDown(layer)" class="layer-action-btn" title="Move Down">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
          </button>
          <button @click.stop="handleDeleteLayer(layer)" class="layer-action-btn layer-delete" title="Delete Layer">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
      <div v-if="layers.length === 0" class="no-layers">
        <p>No layers yet</p>
        <p class="hint">Start drawing to create layers</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layers-panel {
  width: 100%;
  background: rgba(10, 10, 10, 0.95);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 400px;
  overflow-y: auto;
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
  margin-left: auto;
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
</style>
