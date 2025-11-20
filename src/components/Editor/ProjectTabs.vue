<script setup>
import { ref, computed } from 'vue'
import { useProjects } from '@/composables/useProjects'

const emit = defineEmits(['switch-project', 'close-project', 'new-project'])

const { 
  openProjects,
  currentProjectId,
  closeProject,
  createNewProject
} = useProjects()

const handleTabClick = (projectId) => {
  emit('switch-project', projectId)
}

const handleCloseTab = (projectId, event) => {
  event.stopPropagation()
  closeProject(projectId)
  emit('close-project', projectId)
}

const handleNewProject = () => {
  emit('new-project')
}

// Truncate long project names
const truncateName = (name, maxLength = 15) => {
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength - 3) + '...'
}
</script>

<template>
  <div class="project-tabs">
    <div class="tabs-container">
      <div 
        v-for="project in openProjects" 
        :key="project.id"
        class="tab"
        :class="{ active: project.id === currentProjectId }"
        @click="handleTabClick(project.id)"
        :title="project.name"
      >
        <span class="tab-name">{{ truncateName(project.name) }}</span>
        <button 
          @click="handleCloseTab(project.id, $event)" 
          class="tab-close"
          :aria-label="`Close ${project.name}`"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
        <div v-if="project.unsaved" class="unsaved-indicator" title="Unsaved changes"></div>
      </div>
      
      <button @click="handleNewProject" class="new-tab-btn" title="New Project (Ctrl+N)">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.project-tabs {
  background: rgba(15, 15, 15, 0.98);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  height: 40px;
  overflow: hidden;
}

.tabs-container {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.tabs-container::-webkit-scrollbar {
  height: 4px;
}

.tabs-container::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  max-width: 200px;
  white-space: nowrap;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.tab.active {
  background: rgba(var(--primary-rgb), 0.15);
  border-color: var(--primary-color);
  border-bottom-color: transparent;
  box-shadow: 0 -2px 8px rgba(var(--primary-rgb), 0.2);
}

.tab-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab.active .tab-name {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

.tab-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  opacity: 0;
}

.tab:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.tab-close svg {
  width: 14px;
  height: 14px;
}

.unsaved-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  background: var(--primary-color);
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(var(--primary-rgb), 0.6);
}

.new-tab-btn {
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
  margin-left: 4px;
}

.new-tab-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--primary-color);
}

.new-tab-btn svg {
  width: 18px;
  height: 18px;
}
</style>
