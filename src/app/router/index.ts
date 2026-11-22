import { createRouter, createWebHistory } from 'vue-router'
import { initStaff, useStaff } from '@/features/authentication/staffAccess'
import { cmsPermissions, navItems, settingsPermissions } from '@/app/navigation'
import { settingsGroups } from '@/features/settings/settingsGroups'

const settingsPages = {
  general: () => import('@/features/settings/pages/GeneralSettingsPage.vue'),
  maintenance: () => import('@/features/settings/pages/MaintenanceSettingsPage.vue'),
  registration: () => import('@/features/settings/pages/RegistrationSettingsPage.vue'),
  storage: () => import('@/features/settings/pages/StorageSettingsPage.vue'),
  branding: () => import('@/features/settings/pages/BrandingSettingsPage.vue'),
  social: () => import('@/features/settings/pages/SocialSettingsPage.vue'),
  seo: () => import('@/features/settings/pages/SeoSettingsPage.vue'),
  footer: () => import('@/features/settings/pages/FooterSettingsPage.vue'),
  system: () => import('@/features/settings/pages/SystemSettingsPage.vue'),
  mail: () => import('@/features/settings/pages/MailSettingsPage.vue'),
  maps: () => import('@/features/settings/pages/MapSettingsPage.vue'),
  security: () => import('@/features/settings/pages/SecuritySettingsPage.vue'),
  trust: () => import('@/features/settings/pages/TrustSettingsPage.vue'),
} satisfies Record<(typeof settingsGroups)[number]['path'], () => Promise<unknown>>

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
    /** Permission the page's API needs (cosmetic guard; the server decides). */
    permission?: string | readonly string[]
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
      path: '/accept-invitation',
      name: 'accept-invitation',
      component: () => import('@/features/authentication/pages/AcceptInvitationPage.vue'),
      meta: { title: 'Accept invitation', public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/features/authentication/pages/ForgotPasswordPage.vue'),
      meta: { title: 'Staff password', public: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/features/authentication/pages/ResetPasswordPage.vue'),
      meta: { title: 'New staff password', public: true },
    },
    {
      path: '/',
      component: () => import('@/app/layouts/AdminLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/features/dashboard/pages/DashboardPage.vue'), meta: { title: 'Overview', permission: 'overview.view' } },
        { path: 'verification', name: 'verification', component: () => import('@/features/verification/pages/VerificationQueuePage.vue'), meta: { title: 'Verification', permission: 'verification.view' } },
        { path: 'verification/:id', name: 'verification-detail', component: () => import('@/features/verification/pages/VerificationDetailPage.vue'), props: true, meta: { title: 'Verification claim', permission: 'verification.view' } },
        { path: 'moderation', name: 'moderation', component: () => import('@/features/moderation/pages/ModerationPage.vue'), meta: { title: 'Moderation', permission: 'contributions.moderate' } },
        { path: 'destinations', name: 'destinations', component: () => import('@/features/content/pages/DestinationsPage.vue'), meta: { title: 'Destinations', permission: 'content.destinations.manage' } },
        { path: 'routes', name: 'routes', component: () => import('@/features/content/pages/RoutesPage.vue'), meta: { title: 'Routes', permission: 'content.routes.manage' } },
        { path: 'routes/:id', name: 'route-editor', component: () => import('@/features/content/pages/RouteEditorPage.vue'), props: true, meta: { title: 'Edit route', permission: 'content.routes.manage' } },
        { path: 'events', name: 'events', component: () => import('@/features/events/pages/EventsPage.vue'), meta: { title: 'Events', permission: 'events.view' } },
        { path: 'guides', name: 'guides', component: () => import('@/features/guides/pages/GuidesPage.vue'), meta: { title: 'Guides', permission: 'guides.manage' } },
        { path: 'riders', name: 'riders', component: () => import('@/features/riders/pages/RidersPage.vue'), meta: { title: 'Riders', permission: 'users.view' } },
        { path: 'staff', name: 'staff', component: () => import('@/features/staff/pages/StaffPage.vue'), meta: { title: 'Staff', permission: 'users.view' } },
        { path: 'people', redirect: '/riders' },
        { path: 'account', name: 'account', component: () => import('@/features/profile/pages/StaffProfilePage.vue'), meta: { title: 'Your staff account' } },
        { path: 'privacy', name: 'privacy', component: () => import('@/features/privacy/pages/PrivacyPage.vue'), meta: { title: 'Deletions and evidence', permission: ['users.deletions.view', 'moderation.evidence.view'] } },
        { path: 'audit', name: 'audit', component: () => import('@/features/audit/pages/AuditLogPage.vue'), meta: { title: 'Audit log', permission: 'audit.view' } },
        { path: 'cms/home', name: 'cms-home', component: () => import('@/features/cms/home/pages/HomeContentPage.vue'), meta: { title: 'Homepage', permission: 'cms.home.edit' } },
        { path: 'cms/menus', name: 'cms-menus', component: () => import('@/features/cms/menus/pages/MenusPage.vue'), meta: { title: 'Menus', permission: 'cms.menus.manage' } },
        { path: 'cms/content/:type?', name: 'cms-content', component: () => import('@/features/cms/content/pages/ContentPage.vue'), meta: { title: 'Content', permission: cmsPermissions } },
        { path: 'places', name: 'places', component: () => import('@/features/places/pages/PlacesPage.vue'), meta: { title: 'Places', permission: ['places.manage', 'places.review'] } },
        { path: 'contact', name: 'contact', component: () => import('@/features/contact/pages/InboxPage.vue'), meta: { title: 'Contact messages', permission: 'contact.view' } },
        { path: 'cms/notices', name: 'cms-notices', component: () => import('@/features/cms/notices/pages/NoticesPage.vue'), meta: { title: 'Notices', permission: 'cms.notices.manage' } },
        { path: 'media', name: 'media', component: () => import('@/features/media/pages/MediaPage.vue'), meta: { title: 'Media', permission: 'media.manage' } },
        {
          path: 'settings',
          component: () => import('@/features/settings/components/SettingsLayout.vue'),
          meta: { title: 'Settings', permission: settingsPermissions },
          children: [
            // /settings opens the first section this person may manage.
            { path: '', name: 'settings', redirect: () => `/settings/${settingsGroups.find((g) => useStaff().can(g.permission))?.path ?? 'general'}` },
            ...settingsGroups.map((g) => ({
              path: g.path,
              name: `settings-${g.path}`,
              component: settingsPages[g.path],
              meta: { title: `${g.label} settings`, permission: g.permission },
            })),
          ],
        },
        { path: 'roles', name: 'roles', component: () => import('@/features/roles/pages/RolesPage.vue'), meta: { title: 'Roles', permission: 'roles.manage' } },
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
  const { can } = useStaff()
  if (to.meta.permission && !can(to.meta.permission)) {
    // Send staff to the first area their roles allow (a custom role may not include the overview).
    const first = navItems.find((i) => can(i.permission))
    return first && first.name !== to.name ? { name: first.name } : { name: 'no-access' }
  }
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? 'Admin'} | My Ride Nepal Admin`
})

export default router
