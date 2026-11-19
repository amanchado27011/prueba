<template>
  <div class="panel" style="overflow: auto">
    <table>
      <tbody>
        <template v-for="initiative in tree.initiatives" :key="initiative.id">
          <tr>
            <td>
              <button class="tree-btn" type="button" @click="toggle(initiative.id)">{{ open.has(initiative.id) ? '▾' : '▸' }}</button>
              <RouterLink :to="`/iniciativas/${initiative.id}`">{{ initiative.name }}</RouterLink>
            </td>
            <td>{{ initiative.metrics.issueCount }} historias</td>
            <td>{{ initiative.metrics.loggedHours }} h</td>
            <td>{{ initiative.metrics.executedPct ?? '—' }}%</td>
          </tr>
          <template v-if="open.has(initiative.id)">
            <template v-for="epic in initiative.epics" :key="epic.id">
              <tr>
                <td class="indent-1">
                  <button class="tree-btn" type="button" @click="toggle(epic.id)">{{ open.has(epic.id) ? '▾' : '▸' }}</button>
                  <RouterLink :to="`/epicas/${epic.id}`">{{ epic.key }}</RouterLink>
                  {{ epic.summary }}
                </td>
                <td>{{ epic.metrics.done }}/{{ epic.metrics.issueCount }} terminadas</td>
                <td>{{ epic.metrics.loggedHours }} h</td>
                <td><span class="badge">{{ epic.maintenanceType || 'sin tipo' }}</span></td>
              </tr>
              <tr v-for="issue in open.has(epic.id) ? epic.issues : []" :key="issue.id">
                <td class="indent-2"><a :href="issue.jiraUrl" target="_blank" rel="noreferrer">{{ issue.key }}</a> {{ issue.summary }}</td>
                <td>{{ issue.statusName }}</td>
                <td>{{ issue.metrics.loggedHours }} / {{ issue.metrics.originalHours }} h</td>
                <td>{{ issue.assigneeName || 'Sin responsable' }}</td>
              </tr>
            </template>
          </template>
        </template>
        <tr v-for="issue in tree.withoutEpic" :key="issue.id">
          <td><a :href="issue.jiraUrl" target="_blank" rel="noreferrer">{{ issue.key }}</a> {{ issue.summary }}</td>
          <td colspan="3">Sin épica · {{ issue.metrics.loggedHours }} h</td>
        </tr>
      </tbody>
    </table>
    <p v-if="tree.initiatives.length === 0 && tree.withoutEpic.length === 0" class="muted">No hay trabajo para este filtro.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

export interface IssueNode {
  id: string;
  key: string;
  summary: string;
  statusName: string;
  assigneeName: string | null;
  jiraUrl: string;
  metrics: { loggedHours: number; originalHours: number };
}
export interface EpicNode {
  id: string;
  key: string;
  summary: string;
  maintenanceType: string | null;
  metrics: { done: number; issueCount: number; loggedHours: number };
  issues: IssueNode[];
}
export interface TreeResponse {
  totals: { issueCount: number; loggedHours: number; originalHours: number; remainingHours: number; executedPct: number | null; done: number; inProgress: number };
  initiatives: Array<{ id: string; name: string; metrics: { issueCount: number; loggedHours: number; executedPct: number | null }; epics: EpicNode[] }>;
  withoutEpic: IssueNode[];
}

const props = defineProps<{ tree: TreeResponse; expanded?: boolean }>();
const open = ref(new Set<string>());

watch(() => [props.tree, props.expanded] as const, () => {
  const next = new Set<string>();
  if (props.expanded) {
    for (const initiative of props.tree.initiatives) {
      next.add(initiative.id);
      for (const epic of initiative.epics) next.add(epic.id);
    }
  }
  open.value = next;
}, { immediate: true });

function toggle(id: string) {
  const next = new Set(open.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  open.value = next;
}
</script>
