<script setup>
defineProps({
  lines: { type: Array, default: () => [] }
})
</script>

<template>
  <v-line
    v-for="line in lines"
    :key="`line-${line.id}`"
    :config="line"
  />
</template>
