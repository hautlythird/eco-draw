<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import ProjectTabs from './ProjectTabs.vue'
import MiniBotanicalLibrary from '../Library/MiniBotanicalLibrary.vue'
import { useProjects } from '@/composables/useProjects'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { logger } from '@/utils/logger'

const emit = defineEmits(['switch-project', 'close-project', 'new-project', 'open-gallery', 'open-library', 'settings-change'])

const { openProjects, currentProjectId } = useProjects()

const activeSection = ref(null)
const hoveredIcon = ref(null)
const isExpanded = computed(() => activeSection.value !== null)

// Settings state with persistence
const { data: settings } = useLocalStorage('ecodraw-right-panel-settings', {
  gridSnap: false,
  autoSave: true,
  theme: 'dark',
  showFPS: false,
  highContrast: false,
  reducedMotion: false
})

const gridSnap = computed({
  get: () => settings.value.gridSnap,
  set: (val) => {
    settings.value.gridSnap = val
    emit('settings-change', { gridSnap: val })
    logger.log('Grid snap:', val)
  }
})

const autoSave = computed({
  get: () => settings.value.autoSave,
  set: (val) => {
    settings.value.autoSave = val
    emit('settings-change', { autoSave: val })
    logger.log('Auto-save:', val)
  }
})

const theme = computed({
  get: () => settings.value.theme,
  set: (val) => {
    settings.value.theme = val
    applyTheme(val)
    emit('settings-change', { theme: val })
    logger.log('Theme:', val)
  }
})

const showFPS = computed({
  get: () => settings.value.showFPS,
  set: (val) => {
    settings.value.showFPS = val
    emit('settings-change', { showFPS: val })
    logger.log('Show FPS:', val)
  }
})

const highContrast = computed({
  get: () => settings.value.highContrast,
  set: (val) => {
    settings.value.highContrast = val
    document.documentElement.classList.toggle('high-contrast', val)
    emit('settings-change', { highContrast: val })
    logger.log('High contrast:', val)
  }
})

const reducedMotion = computed({
  get: () => settings.value.reducedMotion,
  set: (val) => {
    settings.value.reducedMotion = val
    document.documentElement.classList.toggle('reduced-motion', val)
    emit('settings-change', { reducedMotion: val })
    logger.log('Reduced motion:', val)
  }
})

const applyTheme = (themeValue) => {
  if (themeValue === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', themeValue)
  }
}

const handleSwitchProject = (projectId) => {
  emit('switch-project', projectId)
}

const handleCloseProject = (projectId) => {
  emit('close-project', projectId)
}

const handleNewProject = () => {
  emit('new-project')
}

const handleOpenGallery = () => {
  emit('open-gallery')
}

const handleOpenLibrary = () => {
  // Emit event to open the full botanical library
  emit('open-library')
}

const toggleSection = (section) => {
  if (activeSection.value === section) {
    activeSection.value = null
  } else {
    activeSection.value = section
  }
}

// Apply theme on mount
onMounted(() => {
  applyTheme(theme.value)
  if (highContrast.value) {
    document.documentElement.classList.add('high-contrast')
  }
  if (reducedMotion.value) {
    document.documentElement.classList.add('reduced-motion')
  }
})

// Watch for system theme changes when in auto mode
if (window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (theme.value === 'auto') {
      applyTheme('auto')
    }
  })
}

const dockItems = [
  {
    id: 'projects',
    icon: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z',
    label: 'Projects'
  },
  {
    id: 'gallery',
    icon: 'M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z',
    label: 'Gallery',
    action: 'open-gallery'
  },
  {
    id: 'library',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    label: 'Library'
  },
  {
    id: 'new',
    icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    label: 'New Project',
    action: 'new-project'
  },
  {
    id: 'settings',
    icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
    label: 'Settings'
  },
  {
    id: 'help',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
    label: 'Help'
  }
]

const getIconScale = (itemId) => {
  if (hoveredIcon.value === itemId) return 1.15
  if (!hoveredIcon.value) return 1
  
  const hoveredIndex = dockItems.findIndex(item => item.id === hoveredIcon.value)
  const currentIndex = dockItems.findIndex(item => item.id === itemId)
  const distance = Math.abs(hoveredIndex - currentIndex)
  
  if (distance === 1) return 1.08
  return 1
}

const handleDockItemClick = (item) => {
  if (item.action === 'open-gallery') {
    handleOpenGallery()
  } else if (item.action === 'new-project') {
    handleNewProject()
  } else {
    toggleSection(item.id)
  }
}

// Keyboard navigation for dock items
const handleDockKeydown = (event, item) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleDockItemClick(item)
  } else if (event.key === 'Escape' && activeSection.value) {
    activeSection.value = null
  }
}

// Close panel with Escape key
const handlePanelKeydown = (event) => {
  if (event.key === 'Escape') {
    activeSection.value = null
  }
}
</script>

<template>
  <div class="right-panel" :class="{ expanded: isExpanded }">
    <!-- Project Tabs -->
    <div class="tabs-section">
      <ProjectTabs 
        @switch-project="handleSwitchProject"
        @close-project="handleCloseProject"
        @new-project="handleNewProject"
      />
    </div>

    <!-- Dock Container -->
    <div class="dock-container">
      <div class="dock">
        <div 
          v-for="item in dockItems" 
          :key="item.id"
          class="dock-item"
          :class="{ active: activeSection === item.id }"
          :style="{
            transform: `scale(${getIconScale(item.id)}) translateY(${hoveredIcon === item.id ? '-4px' : '0'})`,
            zIndex: hoveredIcon === item.id ? 10 : 1
          }"
          @mouseenter="hoveredIcon = item.id"
          @mouseleave="hoveredIcon = null"
          @click="handleDockItemClick(item)"
          @keydown="handleDockKeydown($event, item)"
          :title="item.label"
          :aria-label="item.label"
          :aria-pressed="activeSection === item.id"
          tabindex="0"
          role="button"
        >
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path :d="item.icon"/>
            </svg>
          </div>
          <Transition name="fade">
            <div v-if="hoveredIcon === item.id" class="dock-label">{{ item.label }}</div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Expandable Content Panel -->
    <Transition name="slide-panel">
      <div 
        v-if="isExpanded" 
        class="content-panel"
        @keydown="handlePanelKeydown"
        role="region"
        :aria-label="`${dockItems.find(i => i.id === activeSection)?.label} panel`"
      >
        <div class="panel-header">
          <h3>{{ dockItems.find(i => i.id === activeSection)?.label }}</h3>
          <button @click="activeSection = null" class="close-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="panel-body">
          <!-- Projects Section -->
          <div v-if="activeSection === 'projects'" class="content-section">
            <div class="info-card">
              <div class="info-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <div class="info-content">
                <h4>Open Projects</h4>
                <p>{{ openProjects.length }} project{{ openProjects.length !== 1 ? 's' : '' }} currently open</p>
              </div>
            </div>

            <div v-if="openProjects.length > 0" class="projects-list">
              <div 
                v-for="project in openProjects" 
                :key="project.id"
                class="project-item"
                :class="{ active: project.id === currentProjectId }"
                @click="handleSwitchProject(project.id)"
              >
                <div class="project-info">
                  <div class="project-name">{{ project.name }}</div>
                  <div v-if="project.unsaved" class="project-status unsaved">Unsaved changes</div>
                  <div v-else class="project-status saved">Saved</div>
                </div>
                <button 
                  @click.stop="handleCloseProject(project.id)" 
                  class="project-close"
                  :aria-label="`Close ${project.name}`"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div v-else class="empty-state">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
              </svg>
              <p>No projects open</p>
            </div>
            
            <div class="tip-card">
              <strong>💡 Tip:</strong> Press <kbd>Ctrl+N</kbd> to create a new project or <kbd>Ctrl+O</kbd> to open the gallery
            </div>
          </div>

          <!-- Library Section -->
          <div v-if="activeSection === 'library'" class="content-section library-section">
            <MiniBotanicalLibrary @expand="handleOpenLibrary" />
          </div>

          <!-- Settings Section -->
          <div v-if="activeSection === 'settings'" class="content-section">
            <div class="settings-group">
              <h4>Canvas Settings</h4>
              <div class="setting-item">
                <div class="setting-label">
                  <label>Grid Snap</label>
                  <span class="setting-description">Snap objects to grid</span>
                </div>
                <div class="toggle">
                  <input type="checkbox" id="grid-snap" v-model="gridSnap">
                  <label for="grid-snap"></label>
                </div>
              </div>
              <div class="setting-item">
                <div class="setting-label">
                  <label>Auto-save</label>
                  <span class="setting-description">Save changes automatically</span>
                </div>
                <div class="toggle">
                  <input type="checkbox" id="auto-save" v-model="autoSave">
                  <label for="auto-save"></label>
                </div>
              </div>
              <div class="setting-item">
                <div class="setting-label">
                  <label>Show FPS</label>
                  <span class="setting-description">Display performance metrics</span>
                </div>
                <div class="toggle">
                  <input type="checkbox" id="show-fps" v-model="showFPS">
                  <label for="show-fps"></label>
                </div>
              </div>
            </div>

            <div class="settings-group">
              <h4>Appearance</h4>
              <div class="setting-item">
                <div class="setting-label">
                  <label>Theme</label>
                  <span class="setting-description">Color scheme preference</span>
                </div>
                <select class="setting-select" v-model="theme">
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            <div class="settings-group">
              <h4>Accessibility</h4>
              <div class="setting-item">
                <div class="setting-label">
                  <label>High Contrast</label>
                  <span class="setting-description">Increase visual contrast</span>
                </div>
                <div class="toggle">
                  <input type="checkbox" id="high-contrast" v-model="highContrast">
                  <label for="high-contrast"></label>
                </div>
              </div>
              <div class="setting-item">
                <div class="setting-label">
                  <label>Reduced Motion</label>
                  <span class="setting-description">Minimize animations</span>
                </div>
                <div class="toggle">
                  <input type="checkbox" id="reduced-motion" v-model="reducedMotion">
                  <label for="reduced-motion"></label>
                </div>
              </div>
            </div>
          </div>

          <!-- Help Section -->
          <div v-if="activeSection === 'help'" class="content-section">
            <div class="shortcuts-grid">
              <div class="shortcut-card">
                <kbd>Ctrl+S</kbd>
                <span>Save Project</span>
              </div>
              <div class="shortcut-card">
                <kbd>Ctrl+O</kbd>
                <span>Open Gallery</span>
              </div>
              <div class="shortcut-card">
                <kbd>Ctrl+N</kbd>
                <span>New Project</span>
              </div>
              <div class="shortcut-card">
                <kbd>Ctrl+Z</kbd>
                <span>Undo</span>
              </div>
              <div class="shortcut-card">
                <kbd>Ctrl+Y</kbd>
                <span>Redo</span>
              </div>
              <div class="shortcut-card">
                <kbd>B</kbd>
                <span>Brush Tool</span>
              </div>
              <div class="shortcut-card">
                <kbd>E</kbd>
                <span>Eraser</span>
              </div>
              <div class="shortcut-card">
                <kbd>G</kbd>
                <span>Toggle Grid</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.right-panel {
  width: 72px;
  background: transparent;
  display: flex;
  flex-direction: column;
  overflow: visible;
  transition: width 0.25s ease;
  position: relative;
}

.right-panel.expanded {
  width: 340px;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .right-panel {
    position: fixed;
    right: 0;
    top: 60px;
    bottom: 0;
    width: 56px;
    z-index: 900;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .right-panel.expanded {
    width: 100%;
    max-width: 320px;
  }
  
  .tabs-section {
    display: none;
  }
  
  .dock-container {
    padding: 10px 0;
  }
  
  .dock {
    padding: 8px 6px;
    gap: 6px;
  }
  
  .dock-icon {
    width: 40px !important;
    height: 40px !important;
  }
  
  .dock-icon svg {
    width: 20px !important;
    height: 20px !important;
  }
  
  .dock-label {
    left: -100px !important;
    font-size: 11px !important;
  }
  
  .content-panel {
    left: 56px;
    width: calc(100% - 56px);
    max-width: 280px;
  }
  
  .panel-body {
    padding: 16px;
  }
  
  .shortcuts-grid {
    grid-template-columns: 1fr !important;
  }
}

.tabs-section {
  flex-shrink: 0;
  background: rgba(15, 15, 15, 0.98);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 1px solid rgba(255, 255, 255, 0.05);
}

.dock-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  position: relative;
  z-index: 1;
}

.dock {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  z-index: 2;
}

.right-panel.expanded .dock {
  transform: translateX(-15vh);
  transition: transform 0.25s ease;
}

.dock-item {
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  transform-origin: center;
}

.dock-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
  position: relative;
}

.dock-item:hover .dock-icon {
  background: rgba(var(--primary-rgb), 0.15);
  border-color: rgba(var(--primary-rgb), 0.3);
}

.dock-item.active .dock-icon {
  background: rgba(var(--primary-rgb), 0.2);
  border-color: var(--primary-color);
  box-shadow: 0 0 16px rgba(var(--primary-rgb), 0.3);
}

.dock-icon svg {
  width: 24px;
  height: 24px;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s ease;
}

.dock-item:hover .dock-icon svg {
  color: var(--primary-color);
}

.dock-item.active .dock-icon svg {
  color: var(--primary-color);
}

.dock-item:focus {
  outline: none;
}

.dock-item:focus .dock-icon {
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.5);
}

.dock-label {
  position: absolute;
  left: -110px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
  z-index: 100;
}

.dock-label::after {
  content: '';
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid rgba(0, 0, 0, 0.95);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

/* Content Panel */
.content-panel {
  position: absolute;
  left: 72px;
  top: 0;
  bottom: 0;
  width: 268px;
  background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.panel-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.close-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.5);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.content-section.library-section {
  height: 100%;
  overflow: hidden;
}

.info-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: rgba(var(--primary-rgb), 0.08);
  border: 1px solid rgba(var(--primary-rgb), 0.2);
  border-radius: 10px;
}

.info-icon {
  width: 36px;
  height: 36px;
  background: rgba(var(--primary-rgb), 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-icon svg {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
}

.info-content h4 {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 4px 0;
}

.info-content p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.5;
}

.tip-card {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

.tip-card strong {
  color: rgba(255, 255, 255, 0.9);
}

.tip-card kbd {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(var(--primary-rgb), 0.15);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--primary-color);
  font-family: 'Courier New', monospace;
  margin: 0 2px;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-group h4 {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  gap: 12px;
  transition: all 0.2s ease;
}

.setting-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
}

.setting-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  cursor: pointer;
}

.setting-description {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.3;
}

.toggle {
  position: relative;
  width: 40px;
  height: 22px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  transition: 0.3s;
}

.toggle label::before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + label {
  background: var(--primary-color);
}

.toggle input:checked + label::before {
  transform: translateX(18px);
}

.toggle input:focus + label {
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.3);
}

.setting-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 6px 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.setting-select:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.setting-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.shortcut-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.shortcut-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(var(--primary-rgb), 0.3);
  transform: translateY(-2px);
}

.shortcut-card kbd {
  display: block;
  padding: 5px 10px;
  background: rgba(var(--primary-rgb), 0.15);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-color);
  font-family: 'Courier New', monospace;
  min-width: 45px;
  text-align: center;
}

.shortcut-card span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  line-height: 1.3;
}

/* Projects List */
.projects-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  padding: 2px;
}

.projects-list::-webkit-scrollbar {
  width: 6px;
}

.projects-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.projects-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.projects-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 10px;
}

.project-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateX(2px);
}

.project-item.active {
  background: rgba(var(--primary-rgb), 0.15);
  border-color: var(--primary-color);
  box-shadow: 0 0 12px rgba(var(--primary-rgb), 0.2);
}

.project-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.project-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-item.active .project-name {
  color: var(--primary-color);
}

.project-status {
  font-size: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-status.saved {
  color: rgba(76, 175, 80, 0.8);
}

.project-status.saved::before {
  content: '●';
  font-size: 8px;
}

.project-status.unsaved {
  color: rgba(255, 152, 0, 0.8);
}

.project-status.unsaved::before {
  content: '●';
  font-size: 8px;
}

.project-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.project-close:hover {
  background: rgba(255, 0, 0, 0.2);
  color: rgba(255, 100, 100, 0.9);
}

.project-close svg {
  width: 14px;
  height: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  opacity: 0.3;
}

.empty-state p {
  font-size: 13px;
  margin: 0;
}

/* Transitions */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.25s ease;
}

.slide-panel-enter-from {
  opacity: 0;
  transform: translateX(15px);
}

.slide-panel-leave-to {
  opacity: 0;
  transform: translateX(15px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>


/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .right-panel {
    position: fixed;
    right: 0;
    top: 50px;
    bottom: 0;
    width: auto;
    background: transparent;
    border-left: none;
    z-index: 850;
  }
  
  .right-panel.expanded {
    width: 100%;
  }
  
  .tabs-section {
    display: none;
  }
  
  .dock-container {
    padding: 0;
    background: transparent !important;
    visibility: hidden;
  }
  
  .dock {
    padding: 8px 4px;
    gap: 8px;
    background: transparent;
    border: none;
    visibility: visible;
  }
  
  .dock-item {
    transition: all 0.2s ease;
  }
  
  .dock-icon {
    width: 44px !important;
    height: 44px !important;
    background: transparent !important;
    backdrop-filter: none;
    border: none !important;
    box-shadow: none;
  }
  
  .dock-item:hover .dock-icon,
  .dock-item.active .dock-icon {
    background: rgba(var(--primary-rgb), 0.2) !important;
    border-color: rgba(var(--primary-rgb), 0.4) !important;
  }
  
  .dock-icon svg {
    width: 22px !important;
    height: 22px !important;
  }
  
  .dock-label {
    left: -110px !important;
    font-size: 11px !important;
    padding: 4px 10px !important;
  }
  
  .content-panel {
    left: auto;
    right: 56px;
    top: 50px;
    bottom: 0;
    width: 280px;
    max-width: calc(100vw - 72px);
    background: rgba(10, 10, 10, 0.98);
    backdrop-filter: blur(20px);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
  }
  
  .panel-body {
    padding: 16px;
  }
  
  .shortcuts-grid {
    grid-template-columns: 1fr !important;
  }
}
