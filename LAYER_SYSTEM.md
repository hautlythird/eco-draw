# Layer System Implementation

## Overview

The EcoDraw application now features a comprehensive layer system where **every canvas element automatically becomes a layer**. Each layer can be selected, transformed, resized, rotated, and managed independently.

## Key Features

### 1. **Automatic Layer Creation**
- Every element drawn on the canvas (lines, shapes, images, text) automatically creates a new layer
- Layers are tracked in real-time and synchronized with canvas elements
- Each layer has a unique ID, name, type, and visibility/lock state

### 2. **Layer Types**
- **Line**: Brush strokes and eraser marks
- **Shape**: Rectangles, circles, ellipses, triangles
- **Image**: Uploaded images and plant library items
- **Text**: Text elements with various styles

### 3. **Layer Panel (Sidebar)**
- Located in the left sidebar under "LAYERS" button
- Shows all layers in reverse order (newest on top)
- Each layer displays:
  - Icon indicating layer type (✏️ 📝 🖼️ ⬛)
  - Layer name (editable via double-click on canvas)
  - Layer type label
  - Visibility toggle (eye icon)
  - Lock toggle (lock icon)
  - Delete button (trash icon)
- Selected layers are highlighted with accent color
- Click to select a layer (Ctrl/Cmd+Click for multi-select)

### 4. **Visual Layer Indicators on Canvas**
- **Dotted Border**: Selected layers show a dotted border around them
  - Color matches the current brush color
  - 8px dash pattern with 4px gaps
  - Semi-transparent (60% opacity)
- **Transform Handles**: Selected layers show transformation controls
  - Corner anchors for resizing
  - Rotation handle
  - Maintains aspect ratio option

### 5. **Layer Transformation (Resize.vue Integration)**
- **Resize**: Drag corner handles to resize elements
- **Rotate**: Use rotation handle to rotate elements
- **Move**: Drag elements to reposition them
- **Multi-Select**: Transform multiple layers simultaneously
  - Hold Ctrl/Cmd and click to select multiple layers
  - All selected layers transform together

### 6. **Layer Management**
- **Rename**: Double-click any element on canvas to rename its layer
- **Visibility**: Toggle layer visibility (hidden layers are not rendered)
- **Lock**: Lock layers to prevent accidental modifications
- **Delete**: Delete layers (removes element from canvas)
- **Selection**: 
  - Click element on canvas to select its layer
  - Click layer in sidebar to select it
  - Ctrl/Cmd+Click for multi-selection
  - Escape to deselect all

### 7. **Keyboard Shortcuts**
- **Delete/Backspace**: Delete selected layers
- **Escape**: Deselect all layers
- **Ctrl/Cmd+Click**: Multi-select layers

## Technical Implementation

### Components

#### 1. **useLayers.js** (Composable)
Centralized layer management system:
```javascript
- layers: Array of all layers
- selectedLayerIds: Array of selected layer IDs
- createLayer(): Create new layer from element
- selectLayer(): Select/deselect layers
- deleteLayer(): Remove layer
- syncLayersFromElements(): Sync layers with canvas elements
```

#### 2. **LayerTransformer.vue**
Konva transformer component for resizing/rotating:
- Integrates with vue-konva's v-transformer
- Handles multiple selected nodes
- Provides visual transformation handles
- Supports rotation and resizing

#### 3. **Sidebar.vue** (Updated)
Layer panel UI:
- Displays all layers with icons and controls
- Handles layer selection, visibility, locking
- Emits events for layer operations
- Shows layer count and empty state

#### 4. **EditorCanvas.vue** (Updated)
Main canvas with layer integration:
- Creates layers automatically when elements are drawn
- Renders layer borders for selected elements
- Integrates LayerTransformer component
- Handles element clicks for layer selection
- Syncs Konva nodes with layer system

## Usage Guide

### Creating Layers
1. Select any drawing tool (brush, shape, text, image)
2. Draw or place an element on the canvas
3. A new layer is automatically created and appears in the Layers panel

### Selecting Layers
**Method 1: Click on Canvas**
- Click any element to select its layer
- Ctrl/Cmd+Click to add to selection

**Method 2: Click in Layers Panel**
- Click a layer in the sidebar to select it
- Ctrl/Cmd+Click for multi-selection

### Transforming Layers
1. Select one or more layers
2. Drag corner handles to resize
3. Drag rotation handle to rotate
4. Drag element body to move

### Managing Layers
- **Rename**: Double-click element on canvas, enter new name
- **Hide**: Click eye icon in layer panel
- **Lock**: Click lock icon in layer panel
- **Delete**: Click trash icon or press Delete/Backspace

### Multi-Layer Operations
1. Hold Ctrl/Cmd and click multiple layers
2. All selected layers will:
   - Show dotted borders
   - Transform together
   - Can be deleted together

## Visual Design

### Layer Borders
- **Color**: Matches current brush color (dynamic)
- **Style**: Dotted line (8px dash, 4px gap)
- **Width**: 2px stroke
- **Opacity**: 60%
- **Padding**: 5px around element

### Transform Handles
- **Anchors**: Corner handles for resizing
- **Color**: Accent color (#FF4015)
- **Size**: 10px
- **Style**: Rounded squares
- **Border**: White stroke

### Layer Panel
- **Selected Layer**: Highlighted with accent color glow
- **Locked Layer**: 60% opacity
- **Hidden Layer**: 40% opacity
- **Icons**: Emoji-based type indicators

## Integration with Resize.vue

The layer system uses the transformation logic from `Resize.vue` as a reference:
- Bounding box calculations
- Multi-node transformation
- Rotation and scaling
- Boundary constraints

Key improvements over Resize.vue:
- Integrated with full layer management system
- Works with all element types (not just rectangles)
- Synchronized with sidebar UI
- Persistent layer state

## Future Enhancements

Potential additions:
- Layer groups/folders
- Layer opacity control
- Layer blending modes
- Layer ordering (bring to front/back)
- Layer duplication
- Layer export (individual layers)
- Layer search/filter
- Layer thumbnails

## Troubleshooting

### Layers not appearing in panel
- Check that elements have unique IDs
- Verify syncLayersFromElements is called after drawing

### Transform handles not showing
- Ensure element is selected (check selectedLayerIds)
- Verify Konva node is registered in konvaNodesMap
- Check that LayerTransformer component is rendered

### Selection not working
- Verify click handlers are attached to elements
- Check that layer IDs match element IDs
- Ensure layer system is initialized

## Code Examples

### Creating a Layer Programmatically
```javascript
import { useLayers } from '@/composables/useLayers'

const { createLayer } = useLayers()

const element = {
  id: 'unique-id',
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  fill: 'red'
}

createLayer(element, 'shape', 'My Rectangle')
```

### Selecting Multiple Layers
```javascript
const { selectLayer } = useLayers()

// Single select
selectLayer('layer-id-1', false)

// Multi-select
selectLayer('layer-id-2', true)
selectLayer('layer-id-3', true)
```

### Checking if Layer is Selected
```javascript
const { isLayerSelected } = useLayers()

if (isLayerSelected('layer-id')) {
  // Layer is selected
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      App.vue                            │
│  - Manages global state                                 │
│  - Handles tool changes                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌──────▼──────────┐
│  Sidebar.vue   │  │ EditorCanvas.vue│
│  - Layer Panel │  │ - Drawing       │
│  - Controls    │  │ - Selection     │
└───────┬────────┘  └──────┬──────────┘
        │                  │
        │         ┌────────┴────────┐
        │         │                 │
        │  ┌──────▼──────┐  ┌──────▼────────────┐
        │  │ useLayers() │  │ LayerTransformer  │
        │  │ Composable  │  │ Component         │
        │  └─────────────┘  └───────────────────┘
        │         │
        └─────────┴─────────────────────────────┐
                                                 │
                                        ┌────────▼────────┐
                                        │  Layer System   │
                                        │  - layers[]     │
                                        │  - selection    │
                                        │  - operations   │
                                        └─────────────────┘
```

## Summary

The layer system transforms EcoDraw into a professional-grade drawing application where every element is a manageable, transformable layer. The integration with Resize.vue's transformation logic ensures smooth, intuitive manipulation of all canvas elements, while the sidebar provides a clear overview and control panel for layer management.
