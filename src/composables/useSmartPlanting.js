import { ref, computed } from 'vue'

export function useSmartPlanting() {
  const plants = ref([])
  const placedPlants = ref([])
  const plantCompatibility = ref(new Map())
  const gardenZones = ref([])
  const environmentalFactors = ref({
    sunZones: [],
    waterZones: [],
    soilTypes: new Map()
  })

  // Smart planting configuration
  const plantingConfig = ref({
    enableAutoSpacing: true,
    enableCompanionSuggestions: true,
    enableSeasonalPlanning: true,
    enableGrowthSimulation: true,
    spacingTolerance: 0.2, // 20% tolerance
    minCompanionDistance: 50, // pixels
    showGrowthOverlays: true,
    showCompatibilityHeatmap: false
  })

  // Companion plant compatibility data
  const COMPATIBILITY_LEVELS = {
    EXCELLENT: 5,
    GOOD: 4,
    NEUTRAL: 3,
    POOR: 2,
    AVOID: 1
  }

  // Plant growth simulation
  const growthConfig = ref({
    enableGrowthAnimation: true,
    growthSpeed: 1.0, // months per second in simulation
    showMatureSize: true,
    showRootZone: true,
    showCanopySpread: true
  })

  // Initialize plant compatibility database
  const initializeCompatibility = () => {
    // This would typically load from a comprehensive database
    const compatibilityData = {
      // Tomatoes companion planting
      'tomato': {
        'basil': COMPATIBILITY_LEVELS.EXCELLENT,
        'marigold': COMPATIBILITY_LEVELS.EXCELLENT,
        'carrot': COMPATIBILITY_LEVELS.GOOD,
        'lettuce': COMPATIBILITY_LEVELS.GOOD,
        'pepper': COMPATIBILITY_LEVELS.GOOD,
        'cabbage': COMPATIBILITY_LEVELS.POOR,
        'fennel': COMPATIBILITY_LEVELS.AVOID,
        'walnut': COMPATIBILITY_LEVELS.AVOID
      },
      // Basil companion planting
      'basil': {
        'tomato': COMPATIBILITY_LEVELS.EXCELLENT,
        'pepper': COMPATIBILITY_LEVELS.GOOD,
        'oregano': COMPATIBILITY_LEVELS.GOOD,
        'rue': COMPATIBILITY_LEVELS.AVOID
      },
      // Carrot companion planting
      'carrot': {
        'tomato': COMPATIBILITY_LEVELS.GOOD,
        'lettuce': COMPATIBILITY_LEVELS.GOOD,
        'radish': COMPATIBILITY_LEVELS.GOOD,
        'sage': COMPATIBILITY_LEVELS.POOR,
        'dill': COMPATIBILITY_LEVELS.AVOID
      },
      // Lettuce companion planting
      'lettuce': {
        'tomato': COMPATIBILITY_LEVELS.GOOD,
        'carrot': COMPATIBILITY_LEVELS.GOOD,
        'radish': COMPATIBILITY_LEVELS.GOOD,
        'cabbage': COMPATIBILITY_LEVELS.POOR
      },
      // Marigold (universal companion)
      'marigold': {
        'tomato': COMPATIBILITY_LEVELS.EXCELLENT,
        'pepper': COMPATIBILITY_LEVELS.EXCELLENT,
        'cabbage': COMPATIBILITY_LEVELS.EXCELLENT,
        'cucumber': COMPATIBILITY_LEVELS.EXCELLENT
      }
    }

    plantCompatibility.value = new Map(Object.entries(compatibilityData))
  }

  // Get companion suggestions for a plant
  const getCompanionSuggestions = (plant) => {
    if (!plantingConfig.value.enableCompanionSuggestions) return []

    const suggestions = []
    const plantName = plant.name.toLowerCase()
    const nearbyPlants = getNearbyPlants(plant.x, plant.y, 200) // Within 200 pixels

    // Get compatible plants from database
    if (plantCompatibility.value.has(plantName)) {
      const compatibility = plantCompatibility.value.get(plantName)

      for (const [companion, level] of Object.entries(compatibility)) {
        if (level >= COMPATIBILITY_LEVELS.GOOD) {
          // Check if already planted nearby
          const alreadyPlanted = nearbyPlants.some(p =>
            p.name.toLowerCase() === companion
          )

          if (!alreadyPlanted) {
            suggestions.push({
              name: companion,
              compatibility: level,
              reason: getCompatibilityReason(plantName, companion, level)
            })
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.compatibility - a.compatibility).slice(0, 5)
  }

  // Get compatibility reason
  const getCompatibilityReason = (plant1, plant2, level) => {
    const reasons = {
      [COMPATIBILITY_LEVELS.EXCELLENT]: [
        'Enhances growth and flavor',
        'Natural pest protection',
        'Improves soil health'
      ],
      [COMPATIBILITY_LEVELS.GOOD]: [
        'Generally beneficial',
        'Shared growing requirements',
        'Mutual support'
      ],
      [COMPATIBILITY_LEVELS.NEUTRAL]: [
        'No significant interaction',
        'Safe to plant together'
      ]
    }

    const levelReasons = reasons[level] || reasons[COMPATIBILITY_LEVELS.NEUTRAL]
    return levelReasons[Math.floor(Math.random() * levelReasons.length)]
  }

  // Check planting compatibility with existing plants
  const checkPlantingCompatibility = (newPlant, existingPlants) => {
    const conflicts = []
    const benefits = []

    for (const existing of existingPlants) {
      const distance = calculateDistance(newPlant, existing)

      // Only check nearby plants
      if (distance < plantingConfig.value.minCompanionDistance * 3) {
        const compatibility = getCompatibilityScore(newPlant, existing)

        if (compatibility <= COMPATIBILITY_LEVELS.POOR) {
          conflicts.push({
            plant: existing,
            distance,
            reason: getConflictReason(newPlant, existing)
          })
        } else if (compatibility >= COMPATIBILITY_LEVELS.GOOD) {
          benefits.push({
            plant: existing,
            distance,
            reason: getCompatibilityReason(newPlant.name.toLowerCase(), existing.name.toLowerCase(), compatibility)
          })
        }
      }
    }

    return { conflicts, benefits }
  }

  // Get compatibility score between two plants
  const getCompatibilityScore = (plant1, plant2) => {
    const name1 = plant1.name.toLowerCase()
    const name2 = plant2.name.toLowerCase()

    // Check both directions (A->B and B->A)
    if (plantCompatibility.value.has(name1)) {
      const compatibility = plantCompatibility.value.get(name1)
      if (compatibility[name2]) {
        return compatibility[name2]
      }
    }

    if (plantCompatibility.value.has(name2)) {
      const compatibility = plantCompatibility.value.get(name2)
      if (compatibility[name1]) {
        return compatibility[name1]
      }
    }

    // Default to neutral if no data available
    return COMPATIBILITY_LEVELS.NEUTRAL
  }

  // Get conflict reason
  const getConflictReason = (plant1, plant2) => {
    const conflicts = {
      'tomato-fennel': 'Fennel inhibits tomato growth',
      'tomato-cabbage': 'Compete for nutrients',
      'carrot-dill': 'Dill attracts carrot pests',
      'lettuce-cabbage': 'Similar nutrient needs'
    }

    const key1 = `${plant1.name.toLowerCase()}-${plant2.name.toLowerCase()}`
    const key2 = `${plant2.name.toLowerCase()}-${plant1.name.toLowerCase()}`

    return conflicts[key1] || conflicts[key2] || 'Incompatible planting'
  }

  // Calculate optimal spacing
  const calculateOptimalSpacing = (plant) => {
    if (!plantingConfig.value.enableAutoSpacing) return null

    const baseSpacing = parsePlantSpacing(plant.spacing || '1m')
    const spacingTolerance = plantingConfig.value.spacingTolerance

    // Consider plant size and growth habits
    const sizeMultiplier = getPlantSizeMultiplier(plant)
    const adjustedSpacing = baseSpacing * sizeMultiplier

    return {
      minimum: adjustedSpacing * (1 - spacingTolerance),
      recommended: adjustedSpacing,
      maximum: adjustedSpacing * (1 + spacingTolerance)
    }
  }

  // Parse plant spacing string
  const parsePlantSpacing = (spacingStr) => {
    if (!spacingStr) return 1 // Default 1 meter

    const match = spacingStr.match(/([\d.]+)(?:-([\d.]+))?m?/)
    if (!match) return 1

    const min = parseFloat(match[1])
    const max = match[2] ? parseFloat(match[2]) : min
    return (min + max) / 2
  }

  // Get plant size multiplier based on growth habits
  const getPlantSizeMultiplier = (plant) => {
    const multipliers = {
      'TREES': 2.0,
      'SHRUBS': 1.5,
      'CROPS': 1.2,
      'VEGETABLES': 1.0,
      'HERBS': 0.8,
      'FLOWERS': 0.6
    }

    return multipliers[plant.type] || 1.0
  }

  // Get nearby plants
  const getNearbyPlants = (x, y, radius) => {
    return placedPlants.value.filter(plant => {
      const distance = calculateDistance({ x, y }, plant)
      return distance <= radius
    })
  }

  // Calculate distance between two points
  const calculateDistance = (point1, point2) => {
    const dx = point1.x - point2.x
    const dy = point1.y - point2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Check for spacing conflicts
  const checkSpacingConflicts = (newPlant) => {
    if (!plantingConfig.value.enableAutoSpacing) return []

    const spacing = calculateOptimalSpacing(newPlant)
    if (!spacing) return []

    const conflicts = []
    const nearbyPlants = getNearbyPlants(newPlant.x, newPlant.y, spacing.maximum * 50) // Convert to pixels

    for (const plant of nearbyPlants) {
      const distance = calculateDistance(newPlant, plant)
      const minDistance = spacing.minimum * 50 // Convert meters to pixels (assuming 50px/m)

      if (distance < minDistance) {
        conflicts.push({
          plant,
          currentDistance: distance,
          recommendedDistance: spacing.minimum * 50,
          severity: distance < minDistance * 0.5 ? 'critical' : 'warning'
        })
      }
    }

    return conflicts
  }

  // Suggest optimal planting location
  const suggestOptimalLocation = (plant, canvasArea) => {
    if (!plantingConfig.value.enableAutoSpacing) return null

    const spacing = calculateOptimalSpacing(plant)
    if (!spacing) return null

    const bestLocations = []
    const gridSize = 50 // Check every 50 pixels

    for (let x = gridSize; x < canvasArea.width - gridSize; x += gridSize) {
      for (let y = gridSize; y < canvasArea.height - gridSize; y += gridSize) {
        const location = { x, y }
        const score = evaluateLocation(location, plant, canvasArea)

        if (score > 0) {
          bestLocations.push({ location, score })
        }
      }
    }

    // Sort by score and return best location
    bestLocations.sort((a, b) => b.score - a.score)
    return bestLocations.length > 0 ? bestLocations[0].location : null
  }

  // Evaluate location suitability
  const evaluateLocation = (location, plant, canvasArea) => {
    let score = 100

    // Check spacing conflicts
    const spacingConflicts = checkSpacingConflicts({ ...plant, ...location })
    score -= spacingConflicts.length * 20

    // Check compatibility with nearby plants
    const nearbyPlants = getNearbyPlants(location.x, location.y, 150)
    for (const nearby of nearbyPlants) {
      const compatibility = getCompatibilityScore(plant, nearby)
      if (compatibility <= COMPATIBILITY_LEVELS.POOR) {
        score -= 30
      } else if (compatibility >= COMPATIBILITY_LEVELS.GOOD) {
        score += 10
      }
    }

    // Check environmental factors
    score += evaluateEnvironmentalFit(location, plant)

    // Check accessibility (distance from edges)
    const edgeDistance = Math.min(
      location.x,
      location.y,
      canvasArea.width - location.x,
      canvasArea.height - location.y
    )
    score += Math.min(edgeDistance / 10, 10) // Bonus for being away from edges

    return Math.max(0, score)
  }

  // Evaluate environmental fit
  const evaluateEnvironmentalFit = (location, plant) => {
    let score = 0

    // Check sun zone
    const sunZone = getSunZone(location)
    if (plant.sunRequirement === sunZone) {
      score += 15
    } else if (isSunCompatible(plant.sunRequirement, sunZone)) {
      score += 5
    } else {
      score -= 10
    }

    // Check water zone
    const waterZone = getWaterZone(location)
    if (plant.waterRequirement === waterZone) {
      score += 10
    }

    // Check soil type
    const soilType = getSoilType(location)
    if (plant.soilPreference === soilType) {
      score += 10
    }

    return score
  }

  // Get sun zone for location
  const getSunZone = (location) => {
    for (const zone of environmentalFactors.value.sunZones) {
      if (isPointInZone(location, zone)) {
        return zone.type
      }
    }
    return 'partial' // Default
  }

  // Get water zone for location
  const getWaterZone = (location) => {
    for (const zone of environmentalFactors.value.waterZones) {
      if (isPointInZone(location, zone)) {
        return zone.type
      }
    }
    return 'normal' // Default
  }

  // Get soil type for location
  const getSoilType = (location) => {
    for (const [type, zone] of environmentalFactors.value.soilTypes) {
      if (isPointInZone(location, zone)) {
        return type
      }
    }
    return 'loam' // Default
  }

  // Check if point is in zone
  const isPointInZone = (point, zone) => {
    if (zone.type === 'circle') {
      const distance = calculateDistance(point, { x: zone.x, y: zone.y })
      return distance <= zone.radius
    } else if (zone.type === 'rect') {
      return point.x >= zone.x && point.x <= zone.x + zone.width &&
             point.y >= zone.y && point.y <= zone.y + zone.height
    }
    return false
  }

  // Check sun compatibility
  const isSunCompatible = (required, available) => {
    const compatibility = {
      'full': ['full', 'partial'],
      'partial': ['full', 'partial', 'shade'],
      'shade': ['partial', 'shade']
    }

    return compatibility[required]?.includes(available) || false
  }

  // Create seasonal planting plan
  const createSeasonalPlan = (plants, zone) => {
    if (!plantingConfig.value.enableSeasonalPlanning) return null

    const seasons = ['spring', 'summer', 'fall', 'winter']
    const plan = {}

    for (const season of seasons) {
      plan[season] = plants.filter(plant => {
        return canPlantInSeason(plant, season, zone)
      })
    }

    return plan
  }

  // Check if plant can be planted in season
  const canPlantInSeason = (plant, season, zone) => {
    if (!plant.plantingSeasons) return true

    return plant.plantingSeasons.includes(season) &&
           (!plant.hardinessZone || isZoneCompatible(plant.hardinessZone, zone))
  }

  // Check zone compatibility
  const isZoneCompatible = (plantZone, currentZone) => {
    // Simplified zone compatibility check
    return Math.abs(plantZone - currentZone) <= 2
  }

  // Simulate plant growth
  const simulateGrowth = (plant, months) => {
    if (!plantingConfig.value.enableGrowthSimulation) return plant

    const growthData = calculateGrowthProgression(plant, months)

    return {
      ...plant,
      currentHeight: growthData.height,
      currentSpread: growthData.spread,
      maturityLevel: growthData.maturity,
      estimatedYield: growthData.yield,
      visualSize: growthData.visualSize
    }
  }

  // Calculate growth progression
  const calculateGrowthProgression = (plant, months) => {
    const matureHeight = plant.matureHeight || 100
    const matureSpread = plant.matureSpread || 80
    const monthsToMaturity = plant.monthsToMaturity || 6
    const yieldPerPlant = plant.yieldPerPlant || 1

    const growthRate = Math.min(months / monthsToMaturity, 1.0)

    // Non-linear growth curve (slower at start and end)
    const adjustedGrowth = growthRate < 0.5
      ? 2 * growthRate * growthRate
      : 1 - 2 * Math.pow(1 - growthRate, 2)

    return {
      height: matureHeight * adjustedGrowth,
      spread: matureSpread * adjustedGrowth,
      maturity: growthRate,
      yield: yieldPerPlant * growthRate,
      visualSize: 20 + (60 * adjustedGrowth) // From 20px to 80px
    }
  }

  // Add plant to garden
  const addPlant = (plant, x, y) => {
    const newPlant = {
      ...plant,
      id: generatePlantId(),
      x,
      y,
      plantedDate: new Date().toISOString(),
      status: 'planted'
    }

    placedPlants.value.push(newPlant)
    return newPlant
  }

  // Remove plant from garden
  const removePlant = (plantId) => {
    const index = placedPlants.value.findIndex(p => p.id === plantId)
    if (index > -1) {
      placedPlants.value.splice(index, 1)
      return true
    }
    return false
  }

  // Update plant position
  const updatePlantPosition = (plantId, x, y) => {
    const plant = placedPlants.value.find(p => p.id === plantId)
    if (plant) {
      plant.x = x
      plant.y = y
      return true
    }
    return false
  }

  // Generate unique plant ID
  const generatePlantId = () => {
    return `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Get garden statistics
  const getGardenStatistics = () => {
    const stats = {
      totalPlants: placedPlants.value.length,
      plantsByType: {},
      companionPairs: 0,
      conflicts: 0,
      estimatedYield: 0,
      diversityScore: 0
    }

    placedPlants.value.forEach(plant => {
      // Count by type
      stats.plantsByType[plant.type] = (stats.plantsByType[plant.type] || 0) + 1

      // Estimate yield
      if (plant.yieldPerPlant) {
        stats.estimatedYield += plant.yieldPerPlant
      }
    })

    // Calculate diversity (number of different plant types)
    stats.diversityScore = Object.keys(stats.plantsByType).length

    return stats
  }

  // Initialize
  initializeCompatibility()

  return {
    // State
    plants,
    placedPlants,
    plantCompatibility,
    gardenZones,
    environmentalFactors,
    plantingConfig,
    growthConfig,

    // Methods
    getCompanionSuggestions,
    checkPlantingCompatibility,
    calculateOptimalSpacing,
    checkSpacingConflicts,
    suggestOptimalLocation,
    createSeasonalPlan,
    simulateGrowth,
    addPlant,
    removePlant,
    updatePlantPosition,
    getGardenStatistics,

    // Environmental
    getSunZone,
    getWaterZone,
    getSoilType,
    evaluateEnvironmentalFit,

    // Constants
    COMPATIBILITY_LEVELS
  }
}