<script setup>
import { computed } from 'vue'
import { useBotanicalData } from '@/composables/useBotanicalData'

const props = defineProps({
  plants: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const { getPlant } = useBotanicalData()

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Group plants by name to avoid clutter
const groupedPlants = computed(() => {
  const groups = {}
  props.plants.forEach(p => {
    if (!groups[p.tag]) {
      groups[p.tag] = {
        name: p.tag,
        count: 0,
        plantingDate: p.plantingDate || new Date().toISOString(),
        // Mock harvest duration (in months)
        harvestDuration: 3 
      }
    }
    groups[p.tag].count++
  })
  return Object.values(groups)
})

const getPlantingMonthIndex = (dateString) => {
  return new Date(dateString).getMonth()
}

const getHarvestMonthIndex = (dateString, duration) => {
  return (new Date(dateString).getMonth() + duration) % 12
}
</script>

<template>
  <div class="garden-calendar-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Seasonal Timeline</h2>
        <button @click="emit('close')" class="close-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="timeline-container">
        <div class="timeline-header">
          <div v-for="month in months" :key="month" class="month-label">{{ month }}</div>
        </div>
        
        <div class="timeline-body">
          <div v-for="plant in groupedPlants" :key="plant.name" class="plant-row">
            <div class="plant-info">
              <span class="plant-name">{{ plant.name }}</span>
              <span class="plant-count">x{{ plant.count }}</span>
            </div>
            <div class="timeline-track">
              <!-- Planting Marker -->
              <div 
                class="event-marker planting"
                :style="{ left: `${(getPlantingMonthIndex(plant.plantingDate) / 12) * 100}%` }"
                title="Planting"
              ></div>
              
              <!-- Harvest Window -->
              <div 
                class="event-bar harvest"
                :style="{ 
                  left: `${(getPlantingMonthIndex(plant.plantingDate) / 12) * 100}%`,
                  width: `${(plant.harvestDuration / 12) * 100}%`
                }"
                title="Harvest Window"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.garden-calendar-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 800px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h2 {
  margin: 0;
  color: var(--primary-color);
  font-size: 24px;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
}

.close-btn:hover {
  color: white;
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-header {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  padding-left: 120px; /* Space for plant names */
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}

.month-label {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.plant-row {
  display: flex;
  align-items: center;
  height: 30px;
}

.plant-info {
  width: 120px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.plant-name {
  color: white;
  font-size: 14px;
}

.plant-count {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.timeline-track {
  flex: 1;
  height: 100%;
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.event-marker.planting {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background: #3498db;
  border-radius: 50%;
  z-index: 2;
}

.event-bar.harvest {
  position: absolute;
  top: 8px;
  bottom: 8px;
  background: rgba(46, 204, 113, 0.3);
  border: 1px solid #2ecc71;
  border-radius: 4px;
}
</style>
