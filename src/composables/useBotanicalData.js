/**
 * Smart Botanical Data Loader
 * Automatically detects environment and uses appropriate data source:
 * - Development (localhost): Flask API (if available) or Browser SQLite
 * - Production: Browser SQLite
 */

import { ref, computed } from 'vue'
import { useBotanicalAPI } from './useBotanicalAPI'
import { useSQLite } from './useSQLite'

// Shared state
const dataSource = ref(null) // 'api' or 'sqlite'
const isDetecting = ref(false)
const detectionError = ref(null)

export function useBotanicalData() {
  const apiComposable = useBotanicalAPI()
  const sqliteComposable = useSQLite()

  /**
   * Detect if Flask API is available (localhost only)
   */
  const detectAPI = async () => {
    // Only check for API on localhost
    if (!isLocalhost()) {
      return false
    }

    try {
      const response = await fetch('http://localhost:5000/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      })

      if (response.ok) {
        const data = await response.json()
        return data.success === true
      }
      return false
    } catch (err) {
      // API not available
      return false
    }
  }

  /**
   * Check if running on localhost
   */
  const isLocalhost = () => {
    const hostname = window.location.hostname
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname === '[::1]' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.') ||
           hostname.endsWith('.local')
  }

  /**
   * Auto-detect and initialize the best data source
   */
  const initDataSource = async () => {
    if (dataSource.value) {
      // Already initialized
      return dataSource.value
    }

    isDetecting.value = true
    detectionError.value = null

    try {
      console.log('🔍 Detecting data source...')
      console.log('  Environment:', isLocalhost() ? 'Development (localhost)' : 'Production')

      // Try API first if on localhost
      if (isLocalhost()) {
        console.log('  Checking for Flask API...')
        const apiAvailable = await detectAPI()

        if (apiAvailable) {
          console.log('  ✓ Flask API detected at http://localhost:5000')
          console.log('  Using API for development (faster iteration)')
          dataSource.value = 'api'
          return 'api'
        } else {
          console.log('  ✗ Flask API not available')
          console.log('  Falling back to browser SQLite')
        }
      }

      // Use browser SQLite (production or API not available)
      console.log('  Initializing browser SQLite...')
      await sqliteComposable.initDatabase('/ecodraw/botanical_library.db')
      console.log('  ✓ Browser SQLite initialized')
      dataSource.value = 'sqlite'
      return 'sqlite'

    } catch (err) {
      detectionError.value = err.message
      console.error('Failed to initialize data source:', err)
      throw err
    } finally {
      isDetecting.value = false
    }
  }

  /**
   * Get plants with filters
   */
  const getPlants = async (filters = {}) => {
    if (!dataSource.value) {
      await initDataSource()
    }

    if (dataSource.value === 'api') {
      const result = await apiComposable.fetchPlants(filters)
      return result.data || []
    } else {
      return sqliteComposable.getPlants(filters)
    }
  }

  /**
   * Get single plant by ID
   */
  const getPlant = async (plantId) => {
    if (!dataSource.value) {
      await initDataSource()
    }

    if (dataSource.value === 'api') {
      return await apiComposable.fetchPlant(plantId)
    } else {
      return sqliteComposable.getPlant(plantId)
    }
  }

  /**
   * Search plants
   */
  const searchPlants = async (query) => {
    if (!dataSource.value) {
      await initDataSource()
    }

    if (dataSource.value === 'api') {
      const result = await apiComposable.searchPlants(query)
      return result.data || []
    } else {
      return sqliteComposable.searchPlants(query)
    }
  }

  /**
   * Get statistics
   */
  const getStats = async () => {
    if (!dataSource.value) {
      await initDataSource()
    }

    if (dataSource.value === 'api') {
      return await apiComposable.fetchStats()
    } else {
      return sqliteComposable.getStats()
    }
  }

  /**
   * Get categories
   */
  const getCategories = async () => {
    if (!dataSource.value) {
      await initDataSource()
    }

    if (dataSource.value === 'api') {
      return await apiComposable.fetchCategories()
    } else {
      return sqliteComposable.getCategories()
    }
  }

  /**
   * Force switch to specific data source
   */
  const switchDataSource = async (source) => {
    if (source === 'api' && !isLocalhost()) {
      throw new Error('API source only available on localhost')
    }

    if (source === 'api') {
      const apiAvailable = await detectAPI()
      if (!apiAvailable) {
        throw new Error('Flask API not available at http://localhost:5000')
      }
    } else if (source === 'sqlite') {
      await sqliteComposable.initDatabase('/ecodraw/botanical_library.db')
    }

    dataSource.value = source
    console.log(`Switched to ${source} data source`)
  }

  /**
   * Get current loading state
   */
  const isLoading = computed(() => {
    if (isDetecting.value) return true
    if (dataSource.value === 'api') return apiComposable.loading.value
    if (dataSource.value === 'sqlite') return sqliteComposable.isLoading.value
    return false
  })

  /**
   * Get current error state
   */
  const error = computed(() => {
    if (detectionError.value) return detectionError.value
    if (dataSource.value === 'api') return apiComposable.error.value
    if (dataSource.value === 'sqlite') return sqliteComposable.error.value
    return null
  })

  /**
   * Check if initialized
   */
  const isInitialized = computed(() => {
    if (!dataSource.value) return false
    if (dataSource.value === 'api') return true
    if (dataSource.value === 'sqlite') return sqliteComposable.isInitialized.value
    return false
  })

  return {
    // State
    dataSource: computed(() => dataSource.value),
    isLocalhost: isLocalhost(),
    isDetecting: computed(() => isDetecting.value),
    isLoading,
    error,
    isInitialized,

    // Methods
    initDataSource,
    getPlants,
    getPlant,
    searchPlants,
    getStats,
    getCategories,
    switchDataSource,

    // Direct access to underlying composables (for advanced use)
    api: apiComposable,
    sqlite: sqliteComposable
  }
}
