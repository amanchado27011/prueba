<template>
  <header class="top">
    <div>
      <h1>Jerarquía</h1>
      <p class="muted">El mismo trabajo, con iniciativa, épica e historia abiertas.</p>
    </div>
  </header>
  <ErrorBanner :message="error" />
  <FilterBar />
  <WorkTree v-if="tree" :tree="tree" expanded />
</template>

<script setup lang="ts">
import { apiFetch } from '@/api/http';
import ErrorBanner from '@/components/ErrorBanner.vue';
import FilterBar from '@/components/FilterBar.vue';
import WorkTree, { type TreeResponse } from '@/components/WorkTree.vue';
import { useFilters } from '@/composables/useFilters';
import { ref, watch } from 'vue';

const { queryString } = useFilters();
const tree = ref<TreeResponse | null>(null);
const error = ref<string | null>(null);

watch(queryString, async () => {
  error.value = null;
  try {
    tree.value = await apiFetch<TreeResponse>(`/v1/work/tree${queryString.value}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar la jerarquía';
  }
}, { immediate: true });
</script>
