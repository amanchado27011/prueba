<template>
  <header class="top">
    <div>
      <h1>Trabajo en curso</h1>
      <p class="muted">Iniciativa, épica e historia en la misma pantalla. Los filtros se comparten con el resto de vistas.</p>
    </div>
  </header>
  <ErrorBanner :message="error" />
  <FilterBar />
  <div v-if="tree" class="kpis">
    <div class="kpi"><b>{{ tree.totals.issueCount }}</b><span>Historias y tareas</span></div>
    <div class="kpi"><b>{{ tree.totals.loggedHours }}</b><span>Horas imputadas</span></div>
    <div class="kpi"><b>{{ tree.totals.originalHours }}</b><span>Estimación</span></div>
    <div class="kpi"><b>{{ tree.totals.remainingHours }}</b><span>Restantes</span></div>
    <div class="kpi"><b>{{ tree.totals.executedPct ?? '—' }}%</b><span>Ejecutado</span></div>
    <div class="kpi"><b>{{ tree.totals.done }}</b><span>Terminadas</span></div>
    <div class="kpi"><b>{{ tree.totals.inProgress }}</b><span>En curso</span></div>
  </div>
  <WorkTree v-if="tree" :tree="tree" />
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

async function load() {
  error.value = null;
  try {
    tree.value = await apiFetch<TreeResponse>(`/v1/work/tree${queryString.value}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el tablero';
  }
}

watch(queryString, () => void load(), { immediate: true });
</script>
