/** Settings tabs in menu order. Each tab is its own page and needs its own permission (checked again by the API). */
export const settingsGroups = [
  { path: 'general', label: 'General', permission: 'settings.general.manage' },
  { path: 'maintenance', label: 'Maintenance', permission: 'settings.maintenance.manage' },
  { path: 'registration', label: 'Registration', permission: 'settings.registration.manage' },
  { path: 'branding', label: 'Branding', permission: 'settings.branding.manage' },
  { path: 'social', label: 'Social media', permission: 'settings.social.manage' },
  { path: 'seo', label: 'SEO', permission: 'settings.seo.manage' },
  { path: 'footer', label: 'Footer', permission: 'settings.footer.manage' },
  { path: 'storage', label: 'Storage and uploads', permission: 'settings.storage.manage' },
  { path: 'mail', label: 'Mail', permission: 'settings.mail.manage' },
  { path: 'maps', label: 'Maps', permission: 'settings.maps.manage' },
  { path: 'security', label: 'Security', permission: 'settings.security.manage' },
  { path: 'trust', label: 'Trust', permission: 'settings.trust.manage' },
  { path: 'system', label: 'System', permission: 'system.cache.manage' },
] as const
