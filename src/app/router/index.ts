import { createRouter, createWebHistory } from 'vue-router'
import { initStaff, useStaff } from '@/features/authentication/staffAccess'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
    adminOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/sign-in',
      name: 'sign-in',
      component: () => import('@/features/authentication/pages/SignInPage.vue'),
      meta: { title: 'Sign in', public: true },
    },
    {
      path: '/no-access',
      name: 'no-access',
      component: () => import('@/features/authentication/pages/NoAccessPage.vue'),
      meta: { title: 'No staff access', public: true },
    },
    {
      path: '/',
      component: () => import('@/app/layouts/AdminLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/features/dashboard/pages/DashboardPage.vue'), meta: { title: 'Overview' } },
        { path: 'verification', name: 'verification', component: () => import('@/features/verification/pages/VerificationQueuePage.vue'), meta: { title: 'Verification' } },
        { path: 'verification/:id', name: 'verification-detail', component: () => import('@/features/verification/pages/VerificationDetailPage.vue'), props: true, meta: { title: 'Verification claim' } },
        { path: 'moderation', name: 'moderation', component: () => import('@/features/moderation/pages/ModerationPage.vue'), meta: { title: 'Moderation' } },
        { path: 'destinations', name: 'destinations', component: () => import('@/features/content/pages/DestinationsPage.vue'), meta: { title: 'Destinations' } },
        { path: 'routes', name: 'routes', component: () => import('@/features/content/pages/RoutesPage.vue'), meta: { title: 'Routes' } },
        { path: 'routes/:id', name: 'route-editor', component: () => import('@/features/content/pages/RouteEditorPage.vue'), props: true, meta: { title: 'Edit route' } },
        { path: 'events', name: 'events', component: () => import('@/features/events/pages/EventsPage.vue'), meta: { title: 'Events' } },
        { path: 'guides', name: 'guides', component: () => import('@/features/guides/pages/GuidesPage.vue'), meta: { title: 'Guides' } },
        { path: 'people', name: 'people', component: () => import('@/features/users/pages/PeoplePage.vue'), meta: { title: 'People' } },
        { path: 'audit', name: 'audit', component: () => import('@/features/audit/pages/AuditLogPage.vue'), meta: { title: 'Audit log', adminOnly: true } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  await initStaff()
  if (to.meta.public) return
  const access = useStaff().access.value
  if (access === 'sign-in') return { name: 'sign-in', query: { next: to.fullPath } }
  if (access === 'no-access') return { name: 'no-access' }
  if (to.meta.adminOnly && !useStaff().isAdmin.value) return { name: 'dashboard' }
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? 'Admin'} | My Ride Nepal Admin`
})

export default router
