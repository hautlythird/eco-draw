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

// Calculate Biodiversity Score
const biodiversityScore = computed(() => {
  if (props.plants.length === 0) return 0
  
  // Count unique species
  const uniqueSpecies = new Set(props.plants.map(p => p.tag)).size
  const totalPlants = props.plants.length
  
  // Simple score: (unique species / total plants) * 100, weighted by total count
  // We want to encourage both variety and quantity (up to a point)
  const varietyRatio = uniqueSpecies / totalPlants
  const quantityBonus = Math.min(totalPlants, 20) / 20 // Max bonus at 20 plants
  
  return Math.round((varietyRatio * 0.7 + quantityBonus * 0.3) * 100)
})

// Calculate Origin Distribution
const originDistribution = computed(() => {
  const distribution = {
    Native: 0,
    Exotic: 0,
    Unknown: 0
  }
  
  props.plants.forEach(p => {
    // In a real app, we'd fetch the full plant data to get origin
    // For now, we'll simulate based on some known types or default to Unknown/Native mix
    // This is a placeholder logic as 'origin' isn't strictly in our current minimal data
    if (['Tomato', 'Potato', 'Corn', 'Pumpkin'].includes(p.tag)) {
      distribution.Native += 1 // Americas
    } else if (['Basil', 'Carrot', 'Onion'].includes(p.tag)) {
      distribution.Exotic += 1
    } else {
      distribution.Unknown += 1
    }
  })
  
  return distribution
})

const totalPlants = computed(() => props.plants.length)
</script>

<template>
  <div class="garden-stats-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Garden Dashboard</h2>
        <button @click="emit('close')" class="close-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="stats-grid">
        <!-- Biodiversity Card -->
        <div class="stat-card biodiversity">
          <h3>Biodiversity Score</h3>
          <div class="score-circle">
            <span class="score-value">{{ biodiversityScore }}</span>
            <span class="score-label">/ 100</span>
          </div>
          <p class="stat-desc">Based on {{ new Set(props.plants.map(p => p.tag)).size }} unique species among {{ totalPlants }} plants.</p>
        </div>
        
        <!-- Origin Distribution -->
        <div class="stat-card origin">
          <h3>Origin Distribution</h3>
          <div class="distribution-bars">
            <div class="bar-group">
              <div class="bar-label">Native</div>
              <div class="bar-track">
                <div class="bar-fill native" :style="{ width: `${(originDistribution.Native / totalPlants) * 100}%` }"></div>
              </div>
              <div class="bar-value">{{ originDistribution.Native }}</div>
            </div>
            <div class="bar-group">
              <div class="bar-label">Exotic</div>
              <div class="bar-track">
                <div class="bar-fill exotic" :style="{ width: `${(originDistribution.Exotic / totalPlants) * 100}%` }"></div>
              </div>
              <div class="bar-value">{{ originDistribution.Exotic }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.garden-stats-modal {
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
  max-width: 600px;
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

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid var(--primary-color);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0 auto 16px auto;
  background: rgba(var(--primary-rgb), 0.1);
}

.score-value {
  font-size: 36px;
  font-weight: bold;
  color: white;
}

.score-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  width: 50px;
  font-size: 12px;
  text-align: right;
  color: rgba(255, 255, 255, 0.7);
}

.bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
}

.bar-fill.native { background: #2ecc71; }
.bar-fill.exotic { background: #e74c3c; }

.bar-value {
  width: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}
</style>
