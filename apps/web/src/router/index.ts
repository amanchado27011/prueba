import { useAuthStore } from '@/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'jerarquia', name: 'hierarchy', component: () => import('@/views/HierarchyView.vue') },
        { path: 'epicas/:id', name: 'epic', component: () => import('@/views/EpicDetailView.vue') },
        { path: 'iniciativas/:id', name: 'initiative', component: () => import('@/views/InitiativeDetailView.vue') },
        { path: 'productividad', name: 'productivity', component: () => import('@/views/ProductivityView.vue') },
        { path: 'demanda', name: 'demand', component: () => import('@/views/DemandView.vue') },
        { path: 'calidad', name: 'quality', component: () => import('@/views/QualityView.vue') },
        { path: 'catalogos', name: 'catalogs', component: () => import('@/views/CatalogsView.vue') },
        { path: 'jira', name: 'jira', component: () => import('@/views/JiraConfigView.vue') },
        { path: 'exportaciones', name: 'exports', component: () => import('@/views/ExportsView.vue') },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.name === 'login') return true;
  if (!auth.isAuthenticated) return { name: 'login' };
  if (!auth.user) {
    try {
      await auth.refresh();
    } catch {
      auth.logout();
      return { name: 'login' };
    }
  }
  return true;
});
