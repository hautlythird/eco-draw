import { defineStore } from 'pinia'

export const useToolStore = defineStore('tool', {
  state: () => ({
    currentTool: 'brush',
    currentToolOption: 'pencil',
  }),
  actions: {
    setTool(tool, option) {
      this.currentTool = tool
      if (option) {
        this.currentToolOption = option
      } else {
        const defaults = {
          brush: 'pencil',
          eraser: 'soft',
          square: 'rect',
          circle: 'circle',
          triangle: 'triangle',
          text: 'normal',
          image: 'upload'
        }
        if (defaults[tool]) {
          this.currentToolOption = defaults[tool]
        }
      }
    },
  },
})
