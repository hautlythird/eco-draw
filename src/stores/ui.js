import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    showLibrary: false,
    showShortcuts: false,
    showExport: false,
    showAccessibility: false,
    showProjects: false,
    showStats: false,
    showCalendar: false,
    showGrid: true,
  }),
  actions: {
    toggleLibrary() {
      this.showLibrary = !this.showLibrary
    },
    toggleShortcuts() {
      this.showShortcuts = !this.showShortcuts
    },
    toggleExport() {
      this.showExport = !this.showExport
    },
    toggleAccessibility() {
      this.showAccessibility = !this.showAccessibility
    },
    toggleProjects() {
      this.showProjects = !this.showProjects
    },
    toggleStats() {
      this.showStats = !this.showStats
    },
    toggleCalendar() {
      this.showCalendar = !this.showCalendar
    },
    toggleGrid() {
      this.showGrid = !this.showGrid
    },
  },
})
