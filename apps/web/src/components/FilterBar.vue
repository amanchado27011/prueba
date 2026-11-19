<template>
  <form class="panel filters" @submit.prevent="submit">
    <label>Sprint
      <select v-model="local.sprintId">
        <option value="">Todos</option>
        <option v-for="item in options?.sprints ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Desde <input v-model="local.from" type="date" /></label>
    <label>Hasta <input v-model="local.to" type="date" /></label>
    <label>Persona
      <select v-model="local.personId">
        <option value="">Todas</option>
        <option v-for="item in options?.people ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Subárea
      <select v-model="local.subareaId">
        <option value="">Todas</option>
        <option v-for="item in options?.subareas ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Familia
      <select v-model="local.serviceFamilyId">
        <option value="">Todas</option>
        <option v-for="item in options?.families ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Iniciativa
      <select v-model="local.initiativeId">
        <option value="">Todas</option>
        <option v-for="item in options?.initiatives ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Objetivo
      <select v-model="local.objectiveId">
        <option value="">Todos</option>
        <option v-for="item in options?.objectives ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Épica
      <select v-model="local.epicId">
        <option value="">Todas</option>
        <option v-for="item in options?.epics ?? []" :key="item.id" :value="item.id">{{ item.key }}</option>
      </select>
    </label>
    <label>Mantenimiento
      <select v-model="local.maintenanceType">
        <option value="">Todos</option>
        <option v-for="item in options?.maintenanceTypes ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Actividad
      <select v-model="local.activityTypeId">
        <option value="">Todas</option>
        <option v-for="item in options?.activities ?? []" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </label>
    <label>Texto <input v-model="local.q" type="search" placeholder="Clave o resumen" /></label>
    <div class="actions">
      <button class="btn" type="submit">Aplicar</button>
      <button class="btn secondary" type="button" @click="clear">Limpiar</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { apiFetch } from '@/api/http';
import { useFilters, type FilterState } from '@/composables/useFilters';
import { onMounted, reactive, ref, watch } from 'vue';

interface Option { id: string; name?: string; key?: string }
interface Options {
  sprints: Option[];
  people: Option[];
  subareas: Option[];
  families: Option[];
  initiatives: Option[];
  objectives: Option[];
  epics: Array<Option & { key: string }>;
  activities: Option[];
  maintenanceTypes: Option[];
}

const { filters, apply } = useFilters();
const options = ref<Options | null>(null);
const local = reactive<Record<string, string>>({});

function copy(source: FilterState) {
  for (const key of Object.keys(local)) delete local[key];
  Object.assign(local, {
    sprintId: '', from: '', to: '', personId: '', subareaId: '', serviceFamilyId: '',
    initiativeId: '', objectiveId: '', epicId: '', maintenanceType: '', activityTypeId: '', q: '',
    ...source,
  });
}

watch(filters, (value) => copy(value), { immediate: true });

onMounted(async () => {
  options.value = await apiFetch<Options>('/v1/filters/options');
});

function submit() {
  const next: FilterState = {};
  for (const [key, value] of Object.entries(local)) {
    if (value) next[key as keyof FilterState] = value;
  }
  void apply(next);
}

function clear() {
  void apply({});
}
</script>
