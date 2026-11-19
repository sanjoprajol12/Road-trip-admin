import { BadgeCheck, CalendarDays, House, Megaphone, Menu, Images, KeyRound, LayoutDashboard, MapPin, MessageSquareWarning, Route, ScrollText, Settings, ShieldHalf, UserCog, Users } from 'lucide-vue-next'

import { settingsGroups } from '@/features/settings/settingsGroups'

export const settingsPermissions = settingsGroups.map((g) => g.permission)

/** Staff navigation. Each item names the permission its API needs, so the menu and the route guard agree. */
export const navItems = [
  { to: '/', name: 'dashboard', label: 'Overview', icon: LayoutDashboard, permission: 'overview.view' },
  { to: '/verification', name: 'verification', label: 'Verification', icon: BadgeCheck, permission: 'verification.view' },
  { to: '/moderation', name: 'moderation', label: 'Moderation', icon: MessageSquareWarning, permission: 'contributions.moderate' },
  { to: '/destinations', name: 'destinations', label: 'Destinations', icon: MapPin, permission: 'content.destinations.manage' },
  { to: '/routes', name: 'routes', label: 'Routes', icon: Route, permission: 'content.routes.manage' },
  { to: '/events', name: 'events', label: 'Events', icon: CalendarDays, permission: 'events.view' },
  { to: '/guides', name: 'guides', label: 'Guides', icon: ShieldHalf, permission: 'guides.manage' },
  { to: '/cms/home', name: 'cms-home', label: 'Homepage', icon: House, permission: 'cms.home.edit' },
  { to: '/cms/menus', name: 'cms-menus', label: 'Menus', icon: Menu, permission: 'cms.menus.manage' },
  { to: '/cms/notices', name: 'cms-notices', label: 'Notices', icon: Megaphone, permission: 'cms.notices.manage' },
  { to: '/media', name: 'media', label: 'Media', icon: Images, permission: 'media.manage' },
  { to: '/riders', name: 'riders', label: 'Riders', icon: Users, permission: 'users.view' },
  { to: '/staff', name: 'staff', label: 'Staff', icon: UserCog, permission: 'users.view' },
  { to: '/roles', name: 'roles', label: 'Roles', icon: KeyRound, permission: 'roles.manage' },
  { to: '/audit', name: 'audit', label: 'Audit log', icon: ScrollText, permission: 'audit.view' },
  { to: '/settings', name: 'settings', label: 'Settings', icon: Settings, permission: settingsPermissions },
] as const
