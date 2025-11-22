<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useBotanicalData } from '@/composables/useBotanicalData'

const emit = defineEmits(['expand', 'drag-start'])

// Get accent color from app theme
const accentColor = inject('primaryColor', ref('#FF4015'))

const { 
  getPlants, 
  searchPlants, 
  isInitialized,
  initDataSource
} = useBotanicalData()

const searchQuery = ref('')
const allPlants = ref([])
const isLoading = ref(false)

onMounted(async () => {
  if (!isInitialized.value) {
    await initDataSource()
  }
  isLoading.value = true
  try {
    allPlants.value = await getPlants()
  } finally {
    isLoading.value = false
  }
})

const filteredPlants = computed(() => {
  if (!searchQuery.value) return allPlants.value // Show all plants
  const query = searchQuery.value.toLowerCase()
  return allPlants.value.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.scientificName?.toLowerCase().includes(query)
  )
})

const handleDragStart = (event, plant) => {
  // Set data for HTML5 drag and drop
  event.dataTransfer.setData('application/json', JSON.stringify({
    type: 'plant',
    data: plant
  }))
  event.dataTransfer.effectAllowed = 'copy'
  
  // Also emit for internal handling if needed
  emit('drag-start', plant)
}

const getItemIcon = (type) => {
  const iconMap = {
    'FRUITS': '🍎',
    'HERBS': '🌿',
    'VEGETABLES': '🥕',
    'ROOTS': '🥔',
    'TREES': '🌳',
    'FLOWERS': '🌸',
    'CROPS': '🌾',
    'INVASIVE_SPECIES': '⚠️'
  }
  return iconMap[type] || '🌱'
}
</script>

<template>
  <div class="mini-library">
    <div class="search-bar">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Search plants..."
        class="search-input"
      >
      <button class="expand-btn" @click="emit('expand')" title="Open Full Library">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
      </button>
    </div>

    <div class="plants-grid">
      <div v-if="isLoading" class="loading">Loading...</div>
      
      <div 
        v-else
        v-for="plant in filteredPlants" 
        :key="plant.id"
        class="plant-item"
        draggable="true"
        @dragstart="handleDragStart($event, plant)"
        :title="plant.name"
      >
        <div class="plant-icon">{{ getItemIcon(plant.type) }}</div>
        <div class="plant-name">{{ plant.name }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mini-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.search-bar {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 12px;
  color: white;
  font-size: 12px;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.expand-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.expand-btn svg {
  width: 16px;
  height: 16px;
}

.plants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  grid-auto-rows: 90px;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1;
  max-height: calc(100vh - 250px);
  align-content: start;
}

.plants-grid::-webkit-scrollbar {
  width: 6px;
}

.plants-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.plants-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.plants-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.plant-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: grab;
  transition: all 0.2s;
  height: 100%;
}

.plant-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(128, 128, 128, 0.5);
  transform: translateY(-2px);
}

.plant-item:active {
  cursor: grabbing;
}

.plant-icon {
  font-size: 24px;
}

.plant-name {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.loading {
  grid-column: 1 / -1;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  padding: 20px;
}
</style>
