import { ref, computed, watch } from 'vue'

// Tool usage analytics for workflow optimization
export function useToolUsageAnalytics() {
  // State
  const usageHistory = ref([])
  const currentSession = ref({
    startTime: Date.now(),
    tools: [],
    context: {}
  })
  const suggestedTools = ref([])
  const recentTools = ref([])
  const contextAwareTools = ref([])

  // Load analytics data from localStorage
  const loadAnalyticsData = () => {
    try {
      const saved = localStorage.getItem('eco-draw-tool-analytics')
      if (saved) {
        const data = JSON.parse(saved)
        usageHistory.value = data.usageHistory || []
        currentSession.value = {
          ...currentSession.value,
          ...data.currentSession
        }
      }
    } catch (error) {
      console.warn('Failed to load tool analytics:', error)
    }
  }

  // Save analytics data to localStorage
  const saveAnalyticsData = () => {
    try {
      const data = {
        usageHistory: usageHistory.value.slice(-1000), // Keep last 1000 events
        currentSession: currentSession.value
      }
      localStorage.setItem('eco-draw-tool-analytics', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save tool analytics:', error)
    }
  }

  // Record tool usage
  const recordToolUsage = (toolId, context = {}) => {
    const timestamp = Date.now()
    const usage = {
      toolId,
      timestamp,
      context: {
        ...context,
        sessionDuration: timestamp - currentSession.value.startTime,
        previousTool: currentSession.value.tools[currentSession.value.tools.length - 1]?.toolId
      }
    }

    // Add to current session
    currentSession.value.tools.push(usage)

    // Add to usage history
    usageHistory.value.push(usage)

    // Update analytics
    updateAnalytics()
    saveAnalyticsData()
  }

  // Update analytics calculations
  const updateAnalytics = () => {
    updateRecentTools()
    updateSuggestedTools()
    updateContextAwareTools()
  }

  // Get recent tools (used in last hour)
  const updateRecentTools = () => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    const recentUsage = usageHistory.value.filter(usage => usage.timestamp > oneHourAgo)

    // Count tool frequency and get last usage time
    const toolStats = {}
    recentUsage.forEach(usage => {
      if (!toolStats[usage.toolId]) {
        toolStats[usage.toolId] = {
          count: 0,
          lastUsed: 0
        }
      }
      toolStats[usage.toolId].count++
      toolStats[usage.toolId].lastUsed = Math.max(
        toolStats[usage.toolId].lastUsed,
        usage.timestamp
      )
    })

    // Sort by frequency and recency
    recentTools.value = Object.entries(toolStats)
      .sort(([, a], [, b]) => {
        // Weight recent usage more heavily
        const aScore = a.count + (Date.now() - a.lastUsed) / (60 * 60 * 1000) * 0.5
        const bScore = b.count + (Date.now() - b.lastUsed) / (60 * 60 * 1000) * 0.5
        return bScore - aScore
      })
      .slice(0, 6)
      .map(([toolId]) => toolId)
  }

  // Get tool suggestions based on usage patterns
  const updateSuggestedTools = () => {
    const toolTransitions = {}
    const sessionTools = currentSession.value.tools

    // Analyze tool transitions in current session
    for (let i = 1; i < sessionTools.length; i++) {
      const prevTool = sessionTools[i - 1].toolId
      const currTool = sessionTools[i].toolId
      const nextTool = sessionTools[i + 1]?.toolId

      if (prevTool && currTool && nextTool && nextTool !== currTool) {
        const key = `${prevTool}->${currTool}`
        if (!toolTransitions[key]) {
          toolTransitions[key] = {}
        }
        toolTransitions[key][nextTool] = (toolTransitions[key][nextTool] || 0) + 1
      }
    }

    // Analyze historical patterns
    for (let i = 2; i < usageHistory.value.length; i++) {
      const prevTool = usageHistory.value[i - 2].toolId
      const currTool = usageHistory.value[i - 1].toolId
      const nextTool = usageHistory.value[i].toolId

      if (prevTool && currTool && nextTool) {
        const key = `${prevTool}->${currTool}`
        if (!toolTransitions[key]) {
          toolTransitions[key] = {}
        }
        toolTransitions[key][nextTool] = (toolTransitions[key][nextTool] || 0) + 0.5 // Weight historical data less
      }
    }

    // Get current tool pattern and suggest next tools
    const currentToolPattern = getCurrentToolPattern()
    const suggestions = []

    if (currentToolPattern.length >= 2) {
      const key = `${currentToolPattern[currentToolPattern.length - 2]}->${currentToolPattern[currentToolPattern.length - 1]}`

      if (toolTransitions[key]) {
        const sortedSuggestions = Object.entries(toolTransitions[key])
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([toolId]) => toolId)

        suggestions.push(...sortedSuggestions)
      }
    }

    // Add workflow-based suggestions
    suggestions.push(...getWorkflowSuggestions())

    // Remove already used tools and duplicates
    const uniqueSuggestions = [...new Set(suggestions)]
    suggestedTools.value = uniqueSuggestions
      .filter(toolId => !currentToolPattern.includes(toolId))
      .slice(0, 4)
  }

  // Get context-aware suggestions based on current work
  const updateContextAwareTools = () => {
    const context = currentSession.value.context
    const suggestions = []

    // Analyze session context
    if (sessionHasShapeTools()) {
      suggestions.push('move', 'text')
    }

    if (sessionHasDrawingTools()) {
      suggestions.push('eraser', 'move')
    }

    if (sessionHasTextTools()) {
      suggestions.push('move', 'brush')
    }

    // Time-based suggestions
    const sessionDuration = Date.now() - currentSession.value.startTime
    if (sessionDuration > 10 * 60 * 1000) { // 10 minutes
      suggestions.push('move') // Suggest move tool for longer sessions
    }

    contextAwareTools.value = [...new Set(suggestions)].slice(0, 3)
  }

  // Get current tool pattern (last few tools)
  const getCurrentToolPattern = () => {
    return currentSession.value.tools
      .slice(-5)
      .map(usage => usage.toolId)
  }

  // Check if session has shape tools
  const sessionHasShapeTools = () => {
    const shapeTools = ['square', 'circle', 'triangle']
    return currentSession.value.tools.some(usage =>
      shapeTools.includes(usage.toolId)
    )
  }

  // Check if session has drawing tools
  const sessionHasDrawingTools = () => {
    const drawingTools = ['brush', 'eraser']
    return currentSession.value.tools.some(usage =>
      drawingTools.includes(usage.toolId)
    )
  }

  // Check if session has text tools
  const sessionHasTextTools = () => {
    return currentSession.value.tools.some(usage => usage.toolId === 'text')
  }

  // Get workflow-based suggestions
  const getWorkflowSuggestions = () => {
    const pattern = getCurrentToolPattern()
    const suggestions = []

    // Garden layout workflow
    if (pattern.includes('square') && pattern.includes('circle')) {
      suggestions.push('text', 'brush')
    }

    // Technical drawing workflow
    if (pattern.includes('brush') && pattern.includes('square')) {
      suggestions.push('triangle', 'circle')
    }

    // Annotation workflow
    if (pattern.includes('text')) {
      suggestions.push('brush', 'move')
    }

    // Editing workflow
    if (pattern.includes('eraser')) {
      suggestions.push('brush', 'move')
    }

    return suggestions
  }

  // Get tool usage statistics
  const getToolStats = (toolId) => {
    const toolUsage = usageHistory.value.filter(usage => usage.toolId === toolId)

    if (toolUsage.length === 0) {
      return {
        totalUsage: 0,
        averageSessionTime: 0,
        lastUsed: null,
        favoriteContext: null
      }
    }

    // Calculate statistics
    const now = Date.now()
    const lastUsed = Math.max(...toolUsage.map(u => u.timestamp))
    const daysSinceLastUsed = (now - lastUsed) / (24 * 60 * 60 * 1000)

    // Analyze context patterns
    const contexts = {}
    toolUsage.forEach(usage => {
      if (usage.context?.workflow) {
        contexts[usage.context.workflow] = (contexts[usage.context.workflow] || 0) + 1
      }
    })

    const favoriteContext = Object.entries(contexts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null

    return {
      totalUsage: toolUsage.length,
      lastUsed,
      daysSinceLastUsed,
      favoriteContext,
      usageFrequency: toolUsage.length / Math.max(usageHistory.value.length / 50, 1)
    }
  }

  // Get most used tools
  const getMostUsedTools = (limit = 10) => {
    const toolCounts = {}

    usageHistory.value.forEach(usage => {
      toolCounts[usage.toolId] = (toolCounts[usage.toolId] || 0) + 1
    })

    return Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([toolId, count]) => ({ toolId, count }))
  }

  // Get workflow efficiency metrics
  const getWorkflowMetrics = () => {
    const sessionDuration = Date.now() - currentSession.value.startTime
    const toolsUsed = currentSession.value.tools.length
    const uniqueTools = new Set(currentSession.value.tools.map(u => u.toolId)).size

    return {
      sessionDuration,
      toolsUsed,
      uniqueTools,
      averageTimePerTool: toolsUsed > 0 ? sessionDuration / toolsUsed : 0,
      toolEfficiency: uniqueTools > 0 ? toolsUsed / uniqueTools : 1
    }
  }

  // Reset current session
  const resetSession = () => {
    currentSession.value = {
      startTime: Date.now(),
      tools: [],
      context: {}
    }
    updateAnalytics()
  }

  // Update context information
  const updateContext = (context) => {
    currentSession.value.context = {
      ...currentSession.value.context,
      ...context
    }
  }

  // Export analytics data
  const exportAnalytics = () => {
    return {
      usageHistory: usageHistory.value,
      currentSession: currentSession.value,
      mostUsedTools: getMostUsedTools(),
      workflowMetrics: getWorkflowMetrics()
    }
  }

  // Initialize
  loadAnalyticsData()
  updateAnalytics()

  // Computed properties
  const hasAnalyticsData = computed(() => usageHistory.value.length > 0)

  const isProductiveSession = computed(() => {
    const metrics = getWorkflowMetrics()
    return metrics.sessionDuration > 5 * 60 * 1000 && metrics.uniqueTools >= 3
  })

  return {
    // State
    usageHistory,
    currentSession,
    suggestedTools,
    recentTools,
    contextAwareTools,

    // Computed
    hasAnalyticsData,
    isProductiveSession,

    // Methods
    recordToolUsage,
    getToolStats,
    getMostUsedTools,
    getWorkflowMetrics,
    updateContext,
    resetSession,
    exportAnalytics,
    saveAnalyticsData
  }
}