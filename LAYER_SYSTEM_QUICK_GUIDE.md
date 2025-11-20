# Layer System - Quick Visual Guide

## 🎨 What You'll See

### 1. **Layers Panel (Left Sidebar)**
```
┌─────────────────────────┐
│ 👤 HAUTLY              │
├─────────────────────────┤
│ 🌿 LIBRARY             │
│ 📚 LAYERS ◄── Click!   │
│ 📐 SIZE                │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ LAYERS (3)          │ │
│ ├─────────────────────┤ │
│ │ 🖼️ 👁️ Plant 1    🔓🗑│ │ ◄── Image Layer
│ │ ⬛ 👁️ Rectangle  🔓🗑│ │ ◄── Shape Layer
│ │ ✏️ 👁️ Sketch     🔓🗑│ │ ◄── Line Layer
│ └─────────────────────┘ │
└─────────────────────────┘
```

### 2. **Canvas with Selected Layer**
```
┌────────────────────────────────────────┐
│                                        │
│    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐               │
│    ┆  ┌───────────┐  ┆  ◄── Dotted   │
│    ┆  │           │  ┆      Border    │
│    ┆  │  Element  │  ┆               │
│    ┆  │           │  ┆               │
│    ┆  └───────────┘  ┆               │
│    └ ─ ─ ─ ─ ─ ─ ─ ─ ┘               │
│         ▲                              │
│         └─ Layer Name Tag              │
│                                        │
└────────────────────────────────────────┘
```

### 3. **Transform Handles (When Selected)**
```
┌────────────────────────────────────────┐
│                                        │
│    ●─────────────────●                │
│    │                 │                │
│    │                 │                │
│    │    Element      │  ◄── Resize   │
│    │                 │      Handles   │
│    │                 │                │
│    ●─────────────────●                │
│              ↻                         │
│         Rotation Handle                │
│                                        │
└────────────────────────────────────────┘
```

## 🚀 Quick Actions

### Create a Layer
1. **Draw anything** → Layer created automatically!
   - Brush stroke → Line layer
   - Rectangle → Shape layer
   - Image → Image layer
   - Text → Text layer

### Select a Layer
**Option A: Click on Canvas**
```
Click element → Layer selected
Ctrl+Click → Add to selection
```

**Option B: Click in Layers Panel**
```
Click layer → Selected
Ctrl+Click → Multi-select
```

### Transform a Layer
```
1. Select layer
2. Drag corners → Resize
3. Drag rotation handle → Rotate
4. Drag element → Move
```

### Manage Layers
```
👁️ Eye Icon    → Hide/Show layer
🔓 Lock Icon   → Lock/Unlock layer
🗑️ Trash Icon  → Delete layer
Double-click  → Rename layer
```

## 🎯 Common Workflows

### Workflow 1: Draw and Organize
```
1. Draw multiple shapes
2. Open Layers panel
3. See all layers listed
4. Rename layers (double-click on canvas)
5. Hide/lock layers as needed
```

### Workflow 2: Multi-Select Transform
```
1. Ctrl+Click multiple layers
2. All show dotted borders
3. Drag corner to resize all
4. Rotate all together
5. Move all as a group
```

### Workflow 3: Layer Management
```
1. Click layer in panel
2. Toggle visibility (eye icon)
3. Lock to prevent edits (lock icon)
4. Delete unwanted layers (trash icon)
```

## 🎨 Visual Indicators

### Layer States
```
✅ Selected:  Glowing border + transform handles
👁️ Visible:   Normal appearance
🙈 Hidden:    Not rendered (40% opacity in panel)
🔒 Locked:    Can't edit (60% opacity in panel)
```

### Border Colors
```
Dotted border color = Current brush color
Changes dynamically with color picker
```

## ⌨️ Keyboard Shortcuts

```
Delete/Backspace  → Delete selected layers
Escape           → Deselect all
Ctrl+Click       → Multi-select
```

## 💡 Pro Tips

1. **Name Your Layers**: Double-click elements to give them meaningful names
2. **Use Multi-Select**: Ctrl+Click to transform multiple elements at once
3. **Lock Background**: Lock layers you don't want to accidentally modify
4. **Hide Temporarily**: Use eye icon to hide layers while working on others
5. **Layer Order**: Newest layers appear at top of panel

## 🔧 Troubleshooting

### "I can't see transform handles"
- Make sure layer is selected (click it)
- Check if layer is locked (unlock it)

### "Layer panel is empty"
- Draw something on canvas first
- Layers are created automatically when you draw

### "Can't select multiple layers"
- Hold Ctrl (Windows) or Cmd (Mac) while clicking
- Works in both canvas and layer panel

## 📊 Layer Types Reference

| Icon | Type  | Created By                    |
|------|-------|-------------------------------|
| ✏️   | Line  | Brush, Eraser tools          |
| ⬛   | Shape | Rectangle, Circle, Triangle   |
| 🖼️   | Image | Upload, Plant Library        |
| 📝   | Text  | Text tool                    |

## 🎬 Example Scenario

**Creating a Garden Plan:**

```
1. Draw garden boundary (Rectangle)
   → "Garden Boundary" layer created

2. Add plants from library
   → "Tomato Plant" layer created
   → "Basil Plant" layer created

3. Add text labels
   → "North Side" layer created

4. Select all plants (Ctrl+Click)
   → All show dotted borders

5. Resize all plants together
   → Drag corner handle

6. Lock boundary layer
   → Prevents accidental edits

7. Hide text labels temporarily
   → Click eye icon

Result: Organized, manageable garden plan!
```

## 🌟 Key Benefits

✅ **Every element is a layer** - No manual layer creation needed
✅ **Visual feedback** - See what's selected with dotted borders
✅ **Easy transformation** - Resize, rotate, move with handles
✅ **Organized workflow** - Manage all elements in one panel
✅ **Multi-select power** - Transform multiple elements together
✅ **Non-destructive** - Hide/lock layers without deleting

---

**Ready to start?** Just draw something and watch the layer system work its magic! 🎨✨
