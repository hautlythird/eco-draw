# Project Management System

## Overview

The EcoDraw application now includes a comprehensive project management system that allows users to save, load, and manage multiple projects directly in their browser using localStorage.

## Features

### 1. Save Projects
- **Keyboard Shortcut**: `Ctrl+S`
- **Location**: Top toolbar "Save" button
- **Functionality**:
  - Saves the current canvas state to browser localStorage
  - Downloads a JSON backup file automatically
  - Generates a thumbnail preview of the canvas
  - Prompts for project name on first save
  - Updates existing project if already saved

### 2. Projects Gallery
- **Keyboard Shortcut**: `Ctrl+O`
- **Location**: Top toolbar "My Projects" button
- **Features**:
  - Grid view of all saved projects
  - Thumbnail previews
  - Search functionality
  - Project metadata (name, last modified date)
  - Current project indicator

### 3. Project Actions

#### Load Project
- Click on any project card or use the "Load" button
- Restores the complete canvas state including:
  - All drawn lines
  - Shapes
  - Images
  - Text elements
  - Layer structure

#### Rename Project
- Double-click on project name
- Or use the "Rename" button
- Press Enter to save, Esc to cancel

#### Duplicate Project
- Creates a copy of the selected project
- Automatically appends "(Copy)" to the name

#### Export Project
- Downloads the project as a JSON file
- Can be imported later or shared with others

#### Delete Project
- Removes project from localStorage
- Shows confirmation dialog before deletion

### 4. Import Projects
- Click "Import" button in Projects Gallery
- Select a previously exported JSON file
- Project is added to your gallery

### 5. New Project
- Click "New Project" button
- Clears the canvas for a fresh start
- Previous work is preserved in saved projects

## Technical Details

### Storage
- Uses browser's localStorage API
- Maximum 50 projects stored (oldest removed if exceeded)
- Each project includes:
  - Unique ID
  - Name
  - Canvas data (lines, shapes, images, texts)
  - Thumbnail (base64 encoded)
  - Creation and update timestamps

### Data Structure
```javascript
{
  id: "project-1234567890",
  name: "My Garden Design",
  data: {
    lines: [...],
    shapes: [...],
    images: [...],
    texts: [...]
  },
  thumbnail: "data:image/png;base64,...",
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

### Browser Compatibility
- Works in all modern browsers that support localStorage
- Typical storage limit: 5-10MB per domain
- Automatic quota management (removes old projects if storage full)

## Usage Tips

1. **Regular Saves**: Press `Ctrl+S` frequently to save your work
2. **Backup Important Projects**: Use the Export feature to download JSON backups
3. **Organize Projects**: Use descriptive names for easy identification
4. **Search**: Use the search box to quickly find projects by name
5. **Thumbnails**: Thumbnails are generated automatically on save

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save Project | `Ctrl+S` |
| Open Projects Gallery | `Ctrl+O` |
| Export Canvas | `Ctrl+E` |

## Limitations

- Projects are stored locally in the browser
- Clearing browser data will delete all projects
- Projects are not synced across devices
- Storage is limited by browser localStorage quota
- Large projects with many images may consume more storage

## Future Enhancements

Potential improvements for future versions:
- Cloud sync across devices
- Project sharing via URL
- Project templates
- Auto-save functionality
- Project tags and categories
- Collaborative editing
- Version history within projects
