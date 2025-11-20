<script setup>
import { ref, computed } from 'vue'
import { useProjects } from '@/composables/useProjects'

const emit = defineEmits(['close', 'load-project'])

const {
  projects,
  currentProjectId,
  deleteProject,
  renameProject,
  duplicateProject,
  exportProject,
  importProject,
  createNewProject
} = useProjects()

const searchQuery = ref('')
const editingProjectId = ref(null)
const editingName = ref('')
const showDeleteConfirm = ref(null)

// Filter projects by search
const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value
  const query = searchQuery.value.toLowerCase()
  return projects.value.filter(p => 
    p.name.toLowerCase().includes(query)
  )
})

const handleLoadProject = (project) => {
  emit('load-project', project.id)
  emit('close')
}

const handleNewProject = () => {
  createNewProject()
  emit('close')
}

const startRename = (project) => {
  editingProjectId.value = project.id
  editingName.value = project.name
}

const saveRename = (projectId) => {
  if (editingName.value.trim()) {
    renameProject(projectId, editingName.value.trim())
  }
  editingProjectId.value = null
}

const cancelRename = () => {
  editingProjectId.value = null
  editingName.value = ''
}

const handleDelete = (projectId) => {
  showDeleteConfirm.value = projectId
}

const confirmDelete = (projectId) => {
  deleteProject(projectId)
  showDeleteConfirm.value = null
}

const handleDuplicate = (projectId) => {
  duplicateProject(projectId)
}

const handleExport = (projectId) => {
  exportProject(projectId)
}

const handleImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        await importProject(file)
      } catch (error) {
        alert('Failed to import project. Please check the file format.')
      }
    }
  }
  input.click()
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now'
  // Less than 1 hour
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  // Less than 1 day
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  // Less than 7 days
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="projects-overlay" @click.self="emit('close')">
    <div class="projects-dialog">
      <div class="dialog-header">
        <h2>My Projects</h2>
        <button @click="emit('close')" class="close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="dialog-actions">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search projects..."
            class="search-input"
          />
        </div>
        <div class="action-buttons">
          <button @click="handleNewProject" class="action-btn new-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New Project
          </button>
          <button @click="handleImport" class="action-btn import-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
            </svg>
            Import
          </button>
        </div>
      </div>

      <div class="projects-grid">
        <div 
          v-for="project in filteredProjects" 
          :key="project.id"
          class="project-card"
          :class="{ active: project.id === currentProjectId }"
        >
          <div class="project-thumbnail" @click="handleLoadProject(project)">
            <img v-if="project.thumbnail" :src="project.thumbnail" alt="Project thumbnail" />
            <div v-else class="thumbnail-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
            <div v-if="project.id === currentProjectId" class="current-badge">Current</div>
          </div>

          <div class="project-info">
            <div v-if="editingProjectId === project.id" class="project-name-edit">
              <input 
                v-model="editingName"
                @keyup.enter="saveRename(project.id)"
                @keyup.esc="cancelRename"
                @blur="saveRename(project.id)"
                class="name-input"
                autofocus
              />
            </div>
            <h3 v-else class="project-name" @dblclick="startRename(project)">
              {{ project.name }}
            </h3>
            <p class="project-date">{{ formatDate(project.updatedAt) }}</p>
          </div>

          <div class="project-actions">
            <button 
              @click="handleLoadProject(project)" 
              class="project-action-btn load-btn"
              title="Load Project"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
            </button>
            <button 
              @click="startRename(project)" 
              class="project-action-btn"
              title="Rename"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button 
              @click="handleDuplicate(project.id)" 
              class="project-action-btn"
              title="Duplicate"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </button>
            <button 
              @click="handleExport(project.id)" 
              class="project-action-btn"
              title="Export JSON"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
              </svg>
            </button>
            <button 
              @click="handleDelete(project.id)" 
              class="project-action-btn delete-btn"
              title="Delete"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="filteredProjects.length === 0" class="no-projects">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <p>{{ searchQuery ? 'No projects found' : 'No projects yet' }}</p>
          <button @click="handleNewProject" class="create-first-btn">Create Your First Project</button>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="showDeleteConfirm = null">
        <div class="confirm-dialog">
          <h3>Delete Project?</h3>
          <p>This action cannot be undone.</p>
          <div class="confirm-actions">
            <button @click="showDeleteConfirm = null" class="cancel-btn">Cancel</button>
            <button @click="confirmDelete(showDeleteConfirm)" class="confirm-btn">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.projects-dialog {
  background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 90%;
  max-width: 1200px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 1);
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

.dialog-actions {
  display: flex;
  gap: 16px;
  padding: 20px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
}

.search-box svg {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.4);
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  outline: none;
  font-family: 'Inter', sans-serif;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
}

.new-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
}

.new-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--primary-rgb), 0.4);
}

.import-btn {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.import-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.projects-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  align-content: start;
}

.project-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--primary-rgb), 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.project-card.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3);
}

.project-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.thumbnail-placeholder svg {
  width: 48px;
  height: 48px;
  color: rgba(255, 255, 255, 0.2);
}

.current-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--primary-color);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.project-info {
  padding: 16px;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-name-edit {
  margin-bottom: 6px;
}

.name-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(var(--primary-rgb), 0.5);
  border-radius: 6px;
  padding: 6px 10px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 16px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  outline: none;
}

.project-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.project-actions {
  display: flex;
  gap: 4px;
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  justify-content: space-between;
}

.project-action-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.project-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.project-action-btn.load-btn:hover {
  background: rgba(var(--primary-rgb), 0.2);
  color: var(--primary-color);
}

.project-action-btn.delete-btn:hover {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.project-action-btn svg {
  width: 18px;
  height: 18px;
}

.no-projects {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}

.no-projects svg {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  opacity: 0.3;
}

.no-projects p {
  font-size: 18px;
  margin: 0 0 24px 0;
}

.create-first-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, rgba(var(--primary-rgb), 0.8) 100%);
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
}

.create-first-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--primary-rgb), 0.4);
}

/* Confirm Dialog */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.confirm-dialog {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  text-align: center;
}

.confirm-dialog h3 {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 12px 0;
}

.confirm-dialog p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 24px 0;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.cancel-btn,
.confirm-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.confirm-btn {
  background: #ff4444;
  color: white;
}

.confirm-btn:hover {
  background: #ff2222;
}
</style>
