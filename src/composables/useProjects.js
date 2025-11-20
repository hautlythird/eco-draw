import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'

const STORAGE_KEY = 'ecodraw-projects'
const MAX_PROJECTS = 50 // Limit to prevent localStorage overflow

export function useProjects() {
  const projects = ref([])
  const currentProjectId = ref(null)
  const openProjects = ref([]) // Array of currently open project tabs

  // Load projects from localStorage
  const loadProjects = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        projects.value = JSON.parse(stored)
        logger.log(`Loaded ${projects.value.length} projects from localStorage`)
      }
    } catch (error) {
      logger.error('Failed to load projects:', error)
      projects.value = []
    }
  }

  // Save projects to localStorage
  const saveProjects = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.value))
      logger.log('Projects saved to localStorage')
    } catch (error) {
      logger.error('Failed to save projects:', error)
      // If quota exceeded, remove oldest projects
      if (error.name === 'QuotaExceededError') {
        projects.value = projects.value.slice(-MAX_PROJECTS / 2)
        saveProjects()
      }
    }
  }

  // Create or update a project
  const saveProject = (projectData, projectName = null) => {
    try {
      const timestamp = Date.now()
      const name = projectName || `Project ${new Date().toLocaleString()}`
      
      // Check if updating existing project
      if (currentProjectId.value) {
        const index = projects.value.findIndex(p => p.id === currentProjectId.value)
        if (index > -1) {
          projects.value[index] = {
            ...projects.value[index],
            name,
            data: projectData,
            updatedAt: timestamp
          }
          logger.log('Project updated:', name)
        }
      } else {
        // Create new project
        const newProject = {
          id: `project-${timestamp}`,
          name,
          data: projectData,
          createdAt: timestamp,
          updatedAt: timestamp,
          thumbnail: null // Will be generated from canvas
        }
        
        projects.value.unshift(newProject)
        currentProjectId.value = newProject.id
        
        // Limit number of projects
        if (projects.value.length > MAX_PROJECTS) {
          projects.value = projects.value.slice(0, MAX_PROJECTS)
        }
        
        logger.log('New project created:', name)
      }
      
      saveProjects()
      return currentProjectId.value
    } catch (error) {
      logger.error('Failed to save project:', error)
      return null
    }
  }

  // Load a project
  const loadProject = (projectId) => {
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      currentProjectId.value = projectId
      
      // Add to open projects if not already open
      if (!openProjects.value.find(p => p.id === projectId)) {
        openProjects.value.push({
          id: project.id,
          name: project.name,
          unsaved: false
        })
      }
      
      logger.log('Project loaded:', project.name)
      return project.data
    }
    return null
  }
  
  // Switch to an already open project
  const switchToProject = (projectId) => {
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      currentProjectId.value = projectId
      logger.log('Switched to project:', project.name)
      return project.data
    }
    return null
  }
  
  // Close a project tab
  const closeProject = (projectId) => {
    const index = openProjects.value.findIndex(p => p.id === projectId)
    if (index > -1) {
      openProjects.value.splice(index, 1)
      
      // If closing current project, switch to another open project
      if (currentProjectId.value === projectId) {
        if (openProjects.value.length > 0) {
          currentProjectId.value = openProjects.value[openProjects.value.length - 1].id
        } else {
          currentProjectId.value = null
        }
      }
      
      logger.log('Project tab closed:', projectId)
      return true
    }
    return false
  }
  
  // Mark project as having unsaved changes
  const markUnsaved = (projectId) => {
    const project = openProjects.value.find(p => p.id === projectId)
    if (project) {
      project.unsaved = true
    }
  }
  
  // Mark project as saved
  const markSaved = (projectId) => {
    const project = openProjects.value.find(p => p.id === projectId)
    if (project) {
      project.unsaved = false
    }
  }

  // Delete a project
  const deleteProject = (projectId) => {
    const index = projects.value.findIndex(p => p.id === projectId)
    if (index > -1) {
      const project = projects.value[index]
      projects.value.splice(index, 1)
      saveProjects()
      
      if (currentProjectId.value === projectId) {
        currentProjectId.value = null
      }
      
      logger.log('Project deleted:', project.name)
      return true
    }
    return false
  }

  // Rename a project
  const renameProject = (projectId, newName) => {
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      project.name = newName
      project.updatedAt = Date.now()
      saveProjects()
      logger.log('Project renamed:', newName)
      return true
    }
    return false
  }

  // Duplicate a project
  const duplicateProject = (projectId) => {
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      const timestamp = Date.now()
      const newProject = {
        id: `project-${timestamp}`,
        name: `${project.name} (Copy)`,
        data: JSON.parse(JSON.stringify(project.data)), // Deep clone
        createdAt: timestamp,
        updatedAt: timestamp,
        thumbnail: project.thumbnail
      }
      
      projects.value.unshift(newProject)
      saveProjects()
      logger.log('Project duplicated:', newProject.name)
      return newProject.id
    }
    return null
  }

  // Update project thumbnail
  const updateThumbnail = (projectId, thumbnailDataUrl) => {
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      project.thumbnail = thumbnailDataUrl
      saveProjects()
      return true
    }
    return false
  }

  // Export project as JSON file
  const exportProject = (projectId) => {
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      const dataStr = JSON.stringify(project.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
      logger.log('Project exported:', project.name)
      return true
    }
    return false
  }

  // Import project from JSON file
  const importProject = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          const timestamp = Date.now()
          const newProject = {
            id: `project-${timestamp}`,
            name: file.name.replace('.json', ''),
            data: data,
            createdAt: timestamp,
            updatedAt: timestamp,
            thumbnail: null
          }
          
          projects.value.unshift(newProject)
          saveProjects()
          logger.log('Project imported:', newProject.name)
          resolve(newProject.id)
        } catch (error) {
          logger.error('Failed to import project:', error)
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  // Create new project
  const createNewProject = () => {
    const timestamp = Date.now()
    const newId = `project-${timestamp}`
    const newName = `Untitled ${openProjects.value.length + 1}`
    
    // Add to open projects
    openProjects.value.push({
      id: newId,
      name: newName,
      unsaved: true
    })
    
    currentProjectId.value = newId
    logger.log('New project started:', newName)
    return newId
  }

  // Get current project
  const currentProject = computed(() => {
    if (!currentProjectId.value) return null
    return projects.value.find(p => p.id === currentProjectId.value)
  })

  // Sort projects by date
  const sortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => b.updatedAt - a.updatedAt)
  })

  // Initialize
  loadProjects()

  return {
    projects: sortedProjects,
    currentProjectId,
    currentProject,
    openProjects,
    saveProject,
    loadProject,
    switchToProject,
    closeProject,
    deleteProject,
    renameProject,
    duplicateProject,
    updateThumbnail,
    exportProject,
    importProject,
    createNewProject,
    markUnsaved,
    markSaved
  }
}
