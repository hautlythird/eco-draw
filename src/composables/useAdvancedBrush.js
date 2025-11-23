import { ref, computed } from 'vue'

// Professional pencil configurations with realistic physics
export const PENCIL_TYPES = {
  // Graphite pencils
  HB: {
    name: 'HB Pencil',
    hardness: 0.5,
    opacity: 0.85,
    texture: 0.3,
    smoothing: 0.4,
    pressureSensitivity: 1.2,
    colorVariation: 0.05,
    tipWear: 0.02,
    description: 'Standard drawing pencil - medium hardness'
  },
  '2B': {
    name: '2B Pencil',
    hardness: 0.35,
    opacity: 0.88,
    texture: 0.5,
    smoothing: 0.6,
    pressureSensitivity: 1.5,
    colorVariation: 0.08,
    tipWear: 0.03,
    description: 'Soft graphite - darker, smoother lines'
  },
  '4B': {
    name: '4B Pencil',
    hardness: 0.25,
    opacity: 0.91,
    texture: 0.7,
    smoothing: 0.7,
    pressureSensitivity: 1.8,
    colorVariation: 0.12,
    tipWear: 0.04,
    description: 'Very soft graphite - very dark, textured lines'
  },
  '6B': {
    name: '6B Pencil',
    hardness: 0.15,
    opacity: 0.94,
    texture: 0.85,
    smoothing: 0.8,
    pressureSensitivity: 2.2,
    colorVariation: 0.15,
    tipWear: 0.05,
    description: 'Extremely soft graphite - darkest, most textured'
  },

  // Charcoal pencils
  CHARCOAL_SOFT: {
    name: 'Soft Charcoal',
    hardness: 0.1,
    opacity: 0.92,
    texture: 0.9,
    smoothing: 0.3,
    pressureSensitivity: 2.5,
    colorVariation: 0.2,
    tipWear: 0.08,
    description: 'Soft charcoal - expressive, textured strokes'
  },
  CHARCOAL_MEDIUM: {
    name: 'Medium Charcoal',
    hardness: 0.2,
    opacity: 0.89,
    texture: 0.8,
    smoothing: 0.4,
    pressureSensitivity: 2.0,
    colorVariation: 0.15,
    tipWear: 0.06,
    description: 'Medium charcoal - balanced texture and control'
  },
  CHARCOAL_HARD: {
    name: 'Hard Charcoal',
    hardness: 0.3,
    opacity: 0.86,
    texture: 0.6,
    smoothing: 0.5,
    pressureSensitivity: 1.7,
    colorVariation: 0.12,
    tipWear: 0.04,
    description: 'Hard charcoal - more controlled strokes'
  },

  // Technical pencils
  MECHANICAL: {
    name: 'Mechanical Pencil',
    hardness: 0.7,
    opacity: 0.82,
    texture: 0.1,
    smoothing: 0.2,
    pressureSensitivity: 0.8,
    colorVariation: 0.02,
    tipWear: 0.01,
    description: 'Precision mechanical pencil - consistent lines'
  },
  DRAFTING: {
    name: 'Drafting Pencil',
    hardness: 0.8,
    opacity: 0.80,
    texture: 0.05,
    smoothing: 0.1,
    pressureSensitivity: 0.6,
    colorVariation: 0.01,
    tipWear: 0.005,
    description: 'Technical drafting pencil - ultra-precise lines'
  },

  // Artistic pencils
  WATERCOLOR: {
    name: 'Watercolor Pencil',
    hardness: 0.4,
    opacity: 0.75,
    texture: 0.4,
    smoothing: 0.8,
    pressureSensitivity: 1.3,
    colorVariation: 0.1,
    tipWear: 0.03,
    description: 'Water-soluble pencil - soft, blendable strokes'
  },
  COLORED: {
    name: 'Colored Pencil',
    hardness: 0.45,
    opacity: 0.78,
    texture: 0.35,
    smoothing: 0.5,
    pressureSensitivity: 1.1,
    colorVariation: 0.03,
    tipWear: 0.025,
    description: 'Colored pencil - vibrant, waxy texture'
  },
  PASTEL: {
    name: 'Pastel Pencil',
    hardness: 0.25,
    opacity: 0.70,
    texture: 0.8,
    smoothing: 0.6,
    pressureSensitivity: 1.6,
    colorVariation: 0.18,
    tipWear: 0.07,
    description: 'Soft pastel - powdery, artistic texture'
  }
}

// Paper texture types
export const PAPER_TEXTURES = {
  SMOOTH: {
    name: 'Smooth Paper',
    grain: 0.1,
    tooth: 0.2,
    roughness: 0.1
  },
  MEDIUM: {
    name: 'Medium Paper',
    grain: 0.3,
    tooth: 0.5,
    roughness: 0.3
  },
  ROUGH: {
    name: 'Rough Paper',
    grain: 0.6,
    tooth: 0.8,
    roughness: 0.6
  },
  WATERCOLOR: {
    name: 'Watercolor Paper',
    grain: 0.8,
    tooth: 0.9,
    roughness: 0.7
  },
  CANVAS: {
    name: 'Canvas',
    grain: 0.9,
    tooth: 1.0,
    roughness: 0.9
  }
}

export function useAdvancedBrush() {
  const color = ref('#2c2c2c')
  const thickness = ref(50)
  const selectedPencil = ref('HB')
  const selectedPaper = ref('MEDIUM')
  const pressure = ref(1.0)
  const velocity = ref(0)
  const angle = ref(0)

  // Physics simulation properties
  const tipWear = ref(0)
  const graphiteDeposited = ref(0)
  const smudgeFactor = ref(0)
  const blendMode = ref('source-over')

  // Get current pencil configuration
  const currentPencil = computed(() => PENCIL_TYPES[selectedPencil.value])
  const currentPaper = computed(() => PAPER_TEXTURES[selectedPaper.value])

  // Calculate pressure-sensitive stroke width
  const calculateStrokeWidth = (baseThickness, currentPressure, velocity) => {
    // Simulate pressure response - wider strokes with more pressure
    const pressureFactor = Math.pow(currentPressure, currentPencil.value.pressureSensitivity)

    // Velocity affects line thickness (faster = thinner, simulating lighter contact)
    const velocityFactor = 1.0 - Math.min(velocity * 0.1, 0.3)

    // Tip wear affects consistency (worn tip = less precise)
    const wearFactor = 1.0 + (tipWear.value * 0.2)

    const strokeWidth = (baseThickness / 10) * pressureFactor * velocityFactor * wearFactor

    // Add slight jitter for realism
    const jitter = (Math.random() - 0.5) * currentPencil.value.texture * 0.1

    return Math.max(0.5, strokeWidth + jitter)
  }

  // Calculate texture and shadow effects
  const calculateTextureEffects = (strokeWidth) => {
    const pencil = currentPencil.value
    const paper = currentPaper.value

    // Paper grain interaction
    const paperInteraction = pencil.texture * paper.tooth

    // Shadow blur for pencil softness
    const shadowBlur = (1.0 - pencil.hardness) * 15 * paperInteraction

    // Shadow opacity for depth
    const shadowOpacity = pencil.opacity * 0.4 * paper.roughness

    // Color variation for graphite texture
    const colorVariation = pencil.colorVariation * (1.0 + tipWear.value)

    return {
      shadowBlur,
      shadowOpacity,
      colorVariation,
      paperInteraction
    }
  }

  // Calculate opacity with pressure and layering
  const calculateOpacity = (basePressure, layerCount) => {
    const pencil = currentPencil.value

    // Pressure affects opacity
    let opacity = pencil.opacity * Math.pow(basePressure, 0.8)

    // Graphite build-up with multiple layers
    const buildupFactor = 1.0 + (layerCount * 0.05)
    opacity = Math.min(0.95, opacity * buildupFactor)

    // Smudge effects
    opacity *= (1.0 - smudgeFactor.value * 0.3)

    return opacity
  }

  // Simulate paper grain texture
  const generatePaperTexture = (x, y) => {
    const paper = currentPaper.value
    const seed = (x * 12.9898 + y * 78.233) * 43758.5453
    const noise = (Math.sin(seed) * 0.5) + 0.5

    return noise * paper.grain * paper.tooth
  }

  // Apply color variation for realistic graphite
  const applyColorVariation = (baseColor, variation) => {
    const pencil = currentPencil.value

    // Convert hex to RGB
    const hex = baseColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Apply variation based on pencil type
    const variationAmount = pencil.colorVariation * variation
    const factor = 1.0 + ((Math.random() - 0.5) * variationAmount)

    // Adjust RGB values
    const newR = Math.floor(Math.min(255, r * factor))
    const newG = Math.floor(Math.min(255, g * factor))
    const newB = Math.floor(Math.min(255, b * factor))

    // Convert back to hex
    const toHex = (c) => c.toString(16).padStart(2, '0')
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
  }

  // Calculate stroke tension based on pencil type
  const calculateStrokeTension = () => {
    const pencil = currentPencil.value

    // Harder pencils = less smooth (more tension)
    // Softer pencils = smoother (less tension)
    return 0.1 + (pencil.hardness * 0.6) + (pencil.smoothing * 0.3)
  }

  // Update brush physics based on drawing data
  const updatePhysics = (currentVelocity, currentAngle, currentPressure) => {
    velocity.value = currentVelocity
    angle.value = currentAngle
    pressure.value = currentPressure

    // Update tip wear based on pressure and distance
    const wearIncrement = currentPressure * currentVelocity * currentPencil.value.tipWear * 0.001
    tipWear.value = Math.min(1.0, tipWear.value + wearIncrement)

    // Update graphite deposition
    const depositIncrement = currentPressure * currentPencil.value.texture * 0.01
    graphiteDeposited.value = Math.min(1.0, graphiteDeposited.value + depositIncrement)

    // Update smudge factor based on paper roughness
    smudgeFactor.value = currentPaper.value.roughness * 0.3
  }

  // Generate brush configuration for Konva
  const generateBrushConfig = (x, y, layerCount = 0) => {
    const strokeWidth = calculateStrokeWidth(thickness.value, pressure.value, velocity.value)
    const textureEffects = calculateTextureEffects(strokeWidth)
    const opacity = calculateOpacity(pressure.value, layerCount)
    const tension = calculateStrokeTension()

    // Generate paper-specific texture
    const paperTexture = generatePaperTexture(x, y)

    // Apply color variation
    const finalColor = applyColorVariation(color.value, textureEffects.colorVariation + paperTexture)

    return {
      stroke: finalColor,
      strokeWidth,
      opacity,
      tension,
      lineCap: currentPencil.value.hardness > 0.6 ? 'square' : 'round',
      lineJoin: 'round',

      // Shadow and texture effects
      shadowBlur: textureEffects.shadowBlur + paperTexture * 5,
      shadowColor: color.value,
      shadowOpacity: textureEffects.shadowOpacity,

      // Performance optimization
      perfectDrawEnabled: false,

      // Physics tracking
      physicsData: {
        tipWear: tipWear.value,
        pressure: pressure.value,
        velocity: velocity.value,
        graphiteDeposited: graphiteDeposited.value,
        paperTexture
      }
    }
  }

  // Reset physics state
  const resetPhysics = () => {
    tipWear.value = 0
    graphiteDeposited.value = 0
    smudgeFactor.value = 0
    velocity.value = 0
    angle.value = 0
    pressure.value = 1.0
  }

  // Get available pencil options
  const getPencilOptions = () => {
    return Object.entries(PENCIL_TYPES).map(([key, pencil]) => ({
      key,
      ...pencil
    }))
  }

  // Get available paper options
  const getPaperOptions = () => {
    return Object.entries(PAPER_TEXTURES).map(([key, paper]) => ({
      key,
      ...paper
    }))
  }

  return {
    // State
    color,
    thickness,
    selectedPencil,
    selectedPaper,
    pressure,
    velocity,
    angle,
    tipWear,
    graphiteDeposited,
    smudgeFactor,

    // Computed
    currentPencil,
    currentPaper,

    // Methods
    generateBrushConfig,
    updatePhysics,
    resetPhysics,
    getPencilOptions,
    getPaperOptions,
    calculateStrokeWidth,
    calculateTextureEffects,
    applyColorVariation,

    // Constants
    PENCIL_TYPES,
    PAPER_TEXTURES
  }
}