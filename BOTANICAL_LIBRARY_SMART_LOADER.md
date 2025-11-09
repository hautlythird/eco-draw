# Botanical Library - Smart Data Loader 🧠

## Overview

The Botanical Library now features a **smart data loader** that automatically detects your environment and chooses the best data source:

- **Development (localhost)**: Flask API (if running) → Browser SQLite (fallback)
- **Production**: Browser SQLite only

## How It Works

### Auto-Detection Flow

```
┌─────────────────────────────────────────────────────────┐
│  Component Mounts                                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  useBotanicalData.initDataSource()                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Is Localhost? │
         └───────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
       YES               NO
        │                 │
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ Check Flask  │   │ Use Browser  │
│ API Health   │   │ SQLite       │
└──────┬───────┘   └──────────────┘
       │
   ┌───┴───┐
   │       │
  API     API
  UP     DOWN
   │       │
   ▼       ▼
┌─────┐ ┌─────┐
│ Use │ │ Use │
│ API │ │ SQL │
└─────┘ └─────┘
```

### Detection Logic

```javascript
// 1. Check if localhost
const isLocalhost = () => {
  const hostname = window.location.hostname
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '[::1]' ||
         hostname.startsWith('192.168.') ||
         hostname.startsWith('10.') ||
         hostname.endsWith('.local')
}

// 2. If localhost, try API
if (isLocalhost()) {
  const apiAvailable = await fetch('http://localhost:5000/api/health', {
    signal: AbortSignal.timeout(2000) // 2 second timeout
  })
  
  if (apiAvailable) {
    return 'api' // Use Flask API
  }
}

// 3. Fallback to browser SQLite
return 'sqlite'
```

## Usage

### In Components

```javascript
import { useBotanicalData } from '@/composables/useBotanicalData'

const { 
  initDataSource,
  getPlants,
  searchPlants,
  dataSource,
  isLocalhost,
  isInitialized
} = useBotanicalData()

// Initialize (auto-detects)
await initDataSource()

// Use the same API regardless of source
const plants = await getPlants({ type: 'FRUITS' })
const results = await searchPlants('açaí')
```

### Data Source Indicator

The component shows which source is active:

- **🟢 API (Dev)** - Flask API on localhost
- **🟢 SQLite** - Browser SQLite
- **💡 Start Flask API for faster dev** - Hint when on localhost without API

## Development Workflow

### Option 1: With Flask API (Recommended for Development)

**Advantages:**
- Faster iteration (no database reload)
- Real-time data updates
- Better debugging
- Server-side logging

**Setup:**
```bash
# Terminal 1: Start Flask API
python src/components/Library/api_server.py

# Terminal 2: Start Vue app
npm run dev
```

**Result:** Component shows **🟢 API (Dev)**

### Option 2: Without Flask API (Production-like)

**Advantages:**
- Tests production behavior
- No server needed
- Works offline

**Setup:**
```bash
# Just start Vue app
npm run dev
```

**Result:** Component shows **🟢 SQLite** + hint to start API

## API Methods

All methods work the same regardless of data source:

### `initDataSource()`
Auto-detect and initialize data source.

```javascript
await initDataSource()
// Logs:
// 🔍 Detecting data source...
// Environment: Development (localhost)
// Checking for Flask API...
// ✓ Flask API detected at http://localhost:5000
// Using API for development (faster iteration)
```

### `getPlants(filters)`
Get plants with filters.

```javascript
const plants = await getPlants({
  type: 'FRUITS',
  origin: 'NATIVE',
  minNutrition: 8.0
})
```

### `searchPlants(query)`
Full-text search.

```javascript
const results = await searchPlants('açaí amazônico')
```

### `getStats()`
Get database statistics.

```javascript
const stats = await getStats()
// { total, byType, byOrigin, withWarnings, uniqueUses }
```

### `switchDataSource(source)`
Manually switch data source (advanced).

```javascript
// Force use SQLite even on localhost
await switchDataSource('sqlite')

// Switch back to API
await switchDataSource('api')
```

## Environment Detection

### Localhost Detection

Detects these as localhost:
- `localhost`
- `127.0.0.1`
- `[::1]` (IPv6)
- `192.168.x.x` (local network)
- `10.x.x.x` (local network)
- `*.local` (mDNS)

### Production Detection

Everything else is considered production:
- `yourdomain.com`
- `app.yourdomain.com`
- Netlify/Vercel URLs
- GitHub Pages URLs

## Console Output

### Development with API

```
🔍 Detecting data source...
  Environment: Development (localhost)
  Checking for Flask API...
  ✓ Flask API detected at http://localhost:5000
  Using API for development (faster iteration)
```

### Development without API

```
🔍 Detecting data source...
  Environment: Development (localhost)
  Checking for Flask API...
  ✗ Flask API not available
  Falling back to browser SQLite
  Initializing browser SQLite...
  ✓ Browser SQLite initialized
```

### Production

```
🔍 Detecting data source...
  Environment: Production
  Initializing browser SQLite...
  ✓ Browser SQLite initialized
```

## Performance Comparison

| Feature | Flask API | Browser SQLite |
|---------|-----------|----------------|
| **First Load** | ~100ms | ~500ms |
| **Subsequent Queries** | 50-200ms | < 5ms |
| **Search** | 50-100ms | < 10ms |
| **Data Updates** | Instant | Requires reload |
| **Offline** | No | Yes |
| **Network** | Required | Not required |

## When to Use Each

### Use Flask API (Development)

✅ **Best for:**
- Active development
- Testing data changes
- Debugging queries
- Rapid iteration

❌ **Not for:**
- Production
- Offline testing
- Performance testing

### Use Browser SQLite

✅ **Best for:**
- Production deployment
- Offline functionality
- Performance testing
- End-to-end testing

❌ **Not for:**
- Rapid data iteration (requires rebuild)

## Troubleshooting

### API Not Detected on Localhost

**Symptoms:**
- Shows "🟢 SQLite" on localhost
- Hint: "Start Flask API for faster dev"

**Causes:**
1. Flask API not running
2. Running on wrong port
3. CORS issues

**Solutions:**
```bash
# Start Flask API
python src/components/Library/api_server.py

# Check it's running
curl http://localhost:5000/api/health

# Should return:
# {"success": true, "status": "healthy", ...}
```

### SQLite Not Loading

**Symptoms:**
- Error: "Failed to load database"
- Shows "🔴 Erro"

**Causes:**
1. Database file missing
2. Database corrupted
3. Network error (if loading from CDN)

**Solutions:**
```bash
# Rebuild database
python src/components/Library/convert_to_sqlite.py

# Check file exists
ls -lh src/components/Library/botanical_library.db
# Should be ~360 KB

# Check it's copied to public
ls -lh public/botanical_library.db
```

### Wrong Data Source

**Symptoms:**
- Using SQLite when you want API
- Using API when you want SQLite

**Solutions:**
```javascript
// Force specific source
const { switchDataSource } = useBotanicalData()

// Force SQLite
await switchDataSource('sqlite')

// Force API (only on localhost)
await switchDataSource('api')
```

## Advanced Usage

### Custom Detection Logic

```javascript
import { useBotanicalData } from '@/composables/useBotanicalData'

const { initDataSource, dataSource } = useBotanicalData()

// Initialize with custom logic
await initDataSource()

if (dataSource.value === 'api') {
  console.log('Using Flask API - great for development!')
} else {
  console.log('Using Browser SQLite - production mode')
}
```

### Direct Access to Underlying Composables

```javascript
const { api, sqlite } = useBotanicalData()

// Direct API access
const apiHealth = await api.checkHealth()

// Direct SQLite access
const sqlQuery = sqlite.query('SELECT COUNT(*) FROM plants')
```

### Environment-Specific Behavior

```javascript
const { isLocalhost, dataSource } = useBotanicalData()

if (isLocalhost && dataSource.value === 'api') {
  // Development-only features
  console.log('Dev mode: Enable debug logging')
}

if (!isLocalhost) {
  // Production-only features
  console.log('Production mode: Enable analytics')
}
```

## Testing

### Test API Detection

```javascript
// In browser console
const { detectAPI } = useBotanicalData()
const apiAvailable = await detectAPI()
console.log('API available:', apiAvailable)
```

### Test Data Source Switch

```javascript
// Switch to SQLite
await switchDataSource('sqlite')
const plants1 = await getPlants()

// Switch to API (if on localhost)
await switchDataSource('api')
const plants2 = await getPlants()

// Should return same data
console.log('Same data:', JSON.stringify(plants1) === JSON.stringify(plants2))
```

## Best Practices

### 1. Let Auto-Detection Work

Don't force a specific source unless you have a good reason:

```javascript
// ✅ Good - let it auto-detect
await initDataSource()

// ❌ Bad - forcing without reason
await switchDataSource('sqlite')
```

### 2. Handle Both Sources

Write code that works with both:

```javascript
// ✅ Good - works with both
const plants = await getPlants({ type: 'FRUITS' })

// ❌ Bad - assumes API
const response = await fetch('/api/plants')
```

### 3. Check Data Source for Dev Features

```javascript
// ✅ Good - check before using dev features
if (dataSource.value === 'api') {
  // API-specific features
}

// ❌ Bad - assuming API is available
await fetch('http://localhost:5000/api/debug')
```

## Migration Guide

### From useBotanicalAPI

```javascript
// Before
import { useBotanicalAPI } from '@/composables/useBotanicalAPI'
const { fetchPlants } = useBotanicalAPI()
const result = await fetchPlants({ type: 'FRUITS' })
const plants = result.data

// After
import { useBotanicalData } from '@/composables/useBotanicalData'
const { getPlants } = useBotanicalData()
await initDataSource()
const plants = await getPlants({ type: 'FRUITS' })
```

### From useSQLite

```javascript
// Before
import { useSQLite } from '@/composables/useSQLite'
const { initDatabase, getPlants } = useSQLite()
await initDatabase('/botanical_library.db')
const plants = getPlants({ type: 'FRUITS' })

// After
import { useBotanicalData } from '@/composables/useBotanicalData'
const { initDataSource, getPlants } = useBotanicalData()
await initDataSource()
const plants = await getPlants({ type: 'FRUITS' })
```

## Conclusion

The smart data loader provides:

- ✅ **Automatic detection** - No configuration needed
- ✅ **Best of both worlds** - API for dev, SQLite for production
- ✅ **Seamless switching** - Same API for both sources
- ✅ **Clear indicators** - Always know which source is active
- ✅ **Helpful hints** - Suggests starting API when beneficial

**Just use `useBotanicalData()` and let it handle the rest!**

## Quick Reference

```javascript
import { useBotanicalData } from '@/composables/useBotanicalData'

const {
  // State
  dataSource,        // 'api' or 'sqlite'
  isLocalhost,       // true if on localhost
  isInitialized,     // true when ready
  isLoading,         // true while loading
  error,             // error message if any
  
  // Methods
  initDataSource,    // Initialize (auto-detect)
  getPlants,         // Get plants with filters
  getPlant,          // Get single plant
  searchPlants,      // Full-text search
  getStats,          // Get statistics
  switchDataSource   // Force specific source
} = useBotanicalData()

// Initialize
await initDataSource()

// Use
const plants = await getPlants({ type: 'FRUITS' })
```

---

**Smart, automatic, and just works! 🎉**
