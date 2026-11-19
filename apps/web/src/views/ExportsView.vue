<template>
  <header class="top">
    <div>
      <h1>Exportaciones</h1>
      <p class="muted">El Excel y los CSV usan los filtros de esta pantalla, los mismos del tablero.</p>
    </div>
  </header>
  <ErrorBanner :message="error" />
  <FilterBar />
  <div class="panel">
    <p>Hojas: resumen ejecutivo, trabajo en curso, iniciativas, épicas, historias y tareas, worklogs por persona, productividad, trabajo sin épica, demanda impulsiva, catálogos y criterios.</p>
    <div class="actions">
      <button class="btn" type="button" @click="excel">Descargar Excel</button>
      <button class="btn secondary" type="button" @click="issues">CSV de historias</button>
      <button class="btn secondary" type="button" @click="demand">CSV de demanda</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { downloadFile } from '@/api/http';
import ErrorBanner from '@/components/ErrorBanner.vue';
import FilterBar from '@/components/FilterBar.vue';
import { useFilters } from '@/composables/useFilters';
import { ref } from 'vue';

const { queryString } = useFilters();
const error = ref<string | null>(null);

async function run(path: string, filename: string) {
  error.value = null;
  try {
    await downloadFile(`${path}${queryString.value}`, filename);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo exportar';
  }
}

function excel() { void run('/v1/exports/excel', 'gestion-demanda.xlsx'); }
function issues() { void run('/v1/exports/issues.csv', 'historias.csv'); }
function demand() { void run('/v1/exports/demand.csv', 'demanda.csv'); }
</script>
