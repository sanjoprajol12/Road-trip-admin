import { createRouter, createWebHistory } from 'vue-router'
import { initStaff, useStaff } from '@/features/authentication/staffAccess'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
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
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? 'Admin'} | My Ride Nepal Admin`
})

export default router
