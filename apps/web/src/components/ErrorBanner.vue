<template>
  <p v-if="message" class="error">{{ message }}</p>
</template>

<script setup lang="ts">
defineProps<{ message: string | null }>();
</script>
