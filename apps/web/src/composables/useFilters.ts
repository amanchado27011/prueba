import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export const FILTER_KEYS = [
  'sprintId',
  'from',
  'to',
  'personId',
  'subareaId',
  'serviceFamilyId',
  'initiativeId',
  'objectiveId',
  'epicId',
  'maintenanceType',
  'activityTypeId',
  'q',
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterState = Partial<Record<FilterKey, string>>;

export function useFilters() {
  const route = useRoute();
  const router = useRouter();
  const filters = computed<FilterState>(() => {
    const next: FilterState = {};
    for (const key of FILTER_KEYS) {
      const value = route.query[key];
      if (typeof value === 'string' && value) next[key] = value;
    }
    return next;
  });
  const queryString = computed(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters.value)) {
      if (value) params.set(key, value);
    }
    const text = params.toString();
    return text ? `?${text}` : '';
  });
  async function apply(next: FilterState) {
    const query: Record<string, string> = {};
    for (const key of FILTER_KEYS) {
      if (next[key]) query[key] = next[key] as string;
    }
    await router.replace({ query });
  }
  return { filters, queryString, apply };
}
