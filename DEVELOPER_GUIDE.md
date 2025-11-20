# Layer System - Developer Guide

## 🚀 Quick Start

### Running the Application
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Testing the Layer System
1. Open the application in your browser
2. Click the "LAYERS" button in the left sidebar
3. Draw some elements (shapes, lines, text, images)
4. Watch layers appear automatically in the panel
5. Click elements to select them
6. Use transform handles to resize/rotate
7. Try multi-select with Ctrl+Click

## 📚 Core Concepts

### 1. Layer Composable (`useLayers.js`)

The heart of the layer system. Import and use it in any component:

```javascript
import { useLayers } from '@/composables/useLayers'

const {
  layers,              // Array of all layers
  selectedLayerIds,    // Array of selected layer IDs
  selectedElements,    // Computed: selected element objects
  createLayer,         // Create a new layer
  selectLayer,         // Select/deselect layers
  deleteLayer,         // Delete a layer
  isLayerSelected,     // Check if layer is selected
  syncLayersFromElements  // Sync layers with canvas elements
} = useLayers()
```

### 2. Layer Object Structure

```javascript
{
  id: 'unique-id',           // Unique identifier
  name: 'Rectangle 1',       // Display name
  type: 'shape',             // 'line', 'shape', 'image', 'text'
  visible: true,             // Visibility state
  locked: false,             // Lock state
  element: { /* ... */ },    // Reference to canvas element
  createdAt: 1234567890      // Timestamp
}
```

### 3. Element Object Structure

All canvas elements must have:

```javascript
{
  id: 'unique-id',      // REQUIRED: Unique identifier
  tag: 'My Element',    // Display name (used for layer name)
  x: 100,               // Position X
  y: 100,               // Position Y
  // ... other properties specific to element type
}
```

## 🔧 Common Tasks

### Creating a Layer Programmatically

```javascript
import { useLayers } from '@/composables/useLayers'
import { generateElementId } from '@/utils/idGenerator'

const { createLayer } = useLayers()

// Create an element
const element = {
  id: generateElementId(),
  tag: 'My Rectangle',
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  fill: 'red',
  draggable: true
}

// Add to canvas arrays
shapes.value.push(element)

// Create layer (or let sync do it automatically)
createLayer(element, 'shape', 'My Rectangle')
```

### Selecting Layers

```javascript
const { selectLayer, clearSelection } = useLayers()

// Single select
selectLayer('layer-id', false)

// Multi-select (add to selection)
selectLayer('layer-id', true)

// Deselect all
clearSelection()
```

### Checking Selection State

```javascript
const { isLayerSelected } = useLayers()

if (isLayerSelected('layer-id')) {
  // Layer is selected
  // Show border, enable transform, etc.
}
```

### Syncing Layers

```javascript
const { syncLayersFromElements } = useLayers()

// After modifying canvas elements
watch([lines, shapes, images, texts], () => {
  syncLayersFromElements(
    lines.value,
    shapes.value,
    images.value,
    texts.value
  )
}, { deep: true })
```

## 🎨 Adding Layer Support to New Elements

### Step 1: Ensure Element Has Required Properties

```javascript
const newElement = {
  id: generateElementId(),  // REQUIRED
  tag: 'Element Name',      // REQUIRED for layer name
  // ... other properties
}
```

### Step 2: Add to Canvas Array

```javascript
// Add to appropriate array
shapes.value.push(newElement)
// or
images.value.push(newElement)
// or
texts.value.push(newElement)
```

### Step 3: Render with Layer Support

```vue
<template>
  <!-- Layer border (if selected) -->
  <v-rect
    v-if="isLayerSelected(element.id)"
    :config="{
      x: element.x - 5,
      y: element.y - 5,
      width: element.width + 10,
      height: element.height + 10,
      stroke: brushColor,
      strokeWidth: 2,
      dash: [8, 4],
      listening: false,
      opacity: 0.6
    }"
  />
  
  <!-- Element -->
  <v-rect
    :ref="(el) => { if (el) konvaNodesMap.set(element.id, el.getNode()) }"
    :config="element"
    @click="(e) => handleElementClick(element, e, e.target)"
  />
</template>
```

### Step 4: Handle Click Events

```javascript
const handleElementClick = (element, event, konvaNode) => {
  // Store Konva node for transformer
  if (konvaNode) {
    konvaNodesMap.value.set(element.id, konvaNode)
  }
  
  // Select layer
  const multiSelect = event.evt.ctrlKey || event.evt.metaKey
  selectLayer(element.id, multiSelect)
}
```

## 🔄 Integration Patterns

### Pattern 1: Automatic Layer Creation

```javascript
// In EditorCanvas.vue
watch([lines, shapes, images, texts], () => {
  syncLayersFromElements(
    lines.value,
    shapes.value,
    images.value,
    texts.value
  )
}, { deep: true })
```

### Pattern 2: Manual Layer Creation

```javascript
// When creating element
const element = createNewElement()
shapes.value.push(element)

// Manually create layer
const layer = createLayer(element, 'shape', 'My Shape')
```

### Pattern 3: Layer-First Approach

```javascript
// Create layer first
const layer = {
  id: generateElementId(),
  name: 'New Element',
  type: 'shape',
  visible: true,
  locked: false,
  element: null
}

// Create element with same ID
const element = {
  id: layer.id,
  tag: layer.name,
  // ... properties
}

layer.element = element
layers.value.push(layer)
shapes.value.push(element)
```

## 🎯 Best Practices

### 1. Always Use Unique IDs

```javascript
import { generateElementId } from '@/utils/idGenerator'

const element = {
  id: generateElementId(),  // ✅ Good
  // NOT: id: Date.now()     // ❌ Bad (collisions possible)
}
```

### 2. Keep Element and Layer in Sync

```javascript
// When renaming
const renameElement = (elementId, newName) => {
  // Update element
  const element = findElement(elementId)
  element.tag = newName
  
  // Update layer
  const layer = getLayerById(elementId)
  layer.name = newName
}
```

### 3. Clean Up on Delete

```javascript
const deleteElement = (elementId) => {
  // Remove from canvas array
  shapes.value = shapes.value.filter(s => s.id !== elementId)
  
  // Remove layer
  deleteLayer(elementId)
  
  // Remove Konva node reference
  konvaNodesMap.value.delete(elementId)
  
  // Save history
  saveHistory()
}
```

### 4. Handle Visibility and Lock

```javascript
// Check before allowing interaction
const handleElementClick = (element, event) => {
  const layer = getLayerById(element.id)
  
  if (!layer.visible) return  // Hidden
  if (layer.locked) return    // Locked
  
  // Proceed with selection
  selectLayer(element.id)
}
```

## 🐛 Debugging

### Check Layer State

```javascript
import { useLayers } from '@/composables/useLayers'

const { layers, selectedLayerIds } = useLayers()

// In console or component
console.log('All layers:', layers.value)
console.log('Selected:', selectedLayerIds.value)
```

### Verify Konva Nodes

```javascript
// Check if node is registered
console.log('Konva nodes:', konvaNodesMap.value)

// Get specific node
const node = konvaNodesMap.value.get('element-id')
console.log('Node:', node)
```

### Debug Selection

```javascript
const { isLayerSelected, selectedElements } = useLayers()

console.log('Is selected:', isLayerSelected('element-id'))
console.log('Selected elements:', selectedElements.value)
```

### Check Sync Status

```javascript
// After drawing
console.log('Canvas elements:', {
  lines: lines.value.length,
  shapes: shapes.value.length,
  images: images.value.length,
  texts: texts.value.length
})

console.log('Layers:', layers.value.length)

// Should match total elements
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Draw element → Layer appears in panel
- [ ] Click element → Layer selected
- [ ] Click layer in panel → Element selected
- [ ] Ctrl+Click multiple → Multi-select works
- [ ] Drag corner handle → Element resizes
- [ ] Drag rotation handle → Element rotates
- [ ] Toggle visibility → Element hides/shows
- [ ] Lock layer → Element can't be selected
- [ ] Delete layer → Element removed
- [ ] Double-click element → Rename dialog appears
- [ ] Press Delete key → Selected elements deleted
- [ ] Press Escape → Selection cleared

### Unit Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { useLayers } from '@/composables/useLayers'

describe('useLayers', () => {
  it('creates a layer', () => {
    const { createLayer, layers } = useLayers()
    
    const element = { id: 'test-1', tag: 'Test' }
    createLayer(element, 'shape', 'Test Layer')
    
    expect(layers.value).toHaveLength(1)
    expect(layers.value[0].name).toBe('Test Layer')
  })
  
  it('selects a layer', () => {
    const { createLayer, selectLayer, isLayerSelected } = useLayers()
    
    const element = { id: 'test-1', tag: 'Test' }
    createLayer(element, 'shape', 'Test Layer')
    selectLayer('test-1')
    
    expect(isLayerSelected('test-1')).toBe(true)
  })
})
```

## 📖 API Reference

### useLayers()

#### State
- `layers` - Ref<Layer[]> - All layers
- `selectedLayerIds` - Ref<string[]> - Selected layer IDs
- `activeLayerId` - Ref<string | null> - Active layer ID

#### Computed
- `selectedLayers` - Computed<Layer[]> - Selected layer objects
- `selectedElements` - Computed<Element[]> - Selected element objects

#### Methods
- `createLayer(element, type, name?)` - Create new layer
- `getLayerById(id)` - Get layer by ID
- `getLayerByElementId(id)` - Get layer by element ID
- `updateLayer(id, updates)` - Update layer properties
- `deleteLayer(id)` - Delete layer
- `selectLayer(id, multiSelect?)` - Select/deselect layer
- `clearSelection()` - Clear all selections
- `isLayerSelected(id)` - Check if layer is selected
- `toggleLayerVisibility(id)` - Toggle visibility
- `toggleLayerLock(id)` - Toggle lock
- `renameLayer(id, name)` - Rename layer
- `clearLayers()` - Clear all layers
- `syncLayersFromElements(lines, shapes, images, texts)` - Sync layers

### LayerTransformer Component

#### Props
- `selectedNodes` - Array - Konva nodes to transform
- `stageRef` - Object - Reference to Konva stage

#### Exposed Methods
- `getNode()` - Get transformer Konva node

## 🔗 Related Files

- `src/composables/useLayers.js` - Layer management
- `src/components/Editor/LayerTransformer.vue` - Transform component
- `src/components/Editor/Sidebar.vue` - Layer panel UI
- `src/components/Editor/EditorCanvas.vue` - Canvas integration
- `src/components/Editor/Resize.vue` - Reference implementation
- `src/utils/idGenerator.js` - ID generation utility

## 📚 Further Reading

- [LAYER_SYSTEM.md](./LAYER_SYSTEM.md) - Complete documentation
- [LAYER_SYSTEM_QUICK_GUIDE.md](./LAYER_SYSTEM_QUICK_GUIDE.md) - User guide
- [LAYER_SYSTEM_DIAGRAM.md](./LAYER_SYSTEM_DIAGRAM.md) - Architecture diagrams
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation summary

## 💡 Tips & Tricks

1. **Use Vue DevTools** to inspect layer state in real-time
2. **Console log** `layers.value` to see current layer structure
3. **Check Konva layer** in browser DevTools to see rendered elements
4. **Use unique IDs** always - they're the key to everything
5. **Watch for reactivity** - Vue 3 reactivity can be tricky with nested objects
6. **Test multi-select** thoroughly - it's the most complex feature
7. **Handle edge cases** - empty arrays, null values, missing IDs

## 🆘 Common Issues

### Issue: Layers not syncing
**Solution**: Ensure watch is set up with `{ deep: true }`

### Issue: Transform handles not appearing
**Solution**: Check that Konva nodes are registered in `konvaNodesMap`

### Issue: Selection not working
**Solution**: Verify element IDs match layer IDs exactly

### Issue: Multi-select not working
**Solution**: Check that Ctrl/Cmd key detection is working

### Issue: Deleted elements still showing
**Solution**: Ensure both element array and layer are updated

---

**Happy coding!** 🚀 If you have questions, check the documentation files or examine the implementation in the source code.
