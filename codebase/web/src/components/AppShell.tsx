import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NotificationBell } from './NotificationBell';
import { useI18n } from '../i18n/I18nContext';
import { LocaleSwitcher } from '../i18n/LocaleSwitcher';
import {
  ROLE_INITIALS,
  globalNavForRole,
  modulesForRole,
  navItemsForRole,
  resolveActiveModule,
  resolveActiveNav,
  roleLabelKey,
  type NavItem,
} from '../navigation/modules';
import { productLogoUrl, PRODUCT_NAME } from '../branding/productBranding';
import { TenantLogo } from './TenantLogo';

const STORAGE_KEY = 'rm.sidebar.expandedModules';
const GROUP_STORAGE_KEY = 'rm.sidebar.expandedGroups';

const MODULE_ICONS: Record<string, ReactNode> = {
  workflow: (
    <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  clients: (
    <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  cases: (
    <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  documents: (
    <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M13 2v7h7" />
    </svg>
  ),
  services: (
    <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  analytics: (
    <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  platform: (
    <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  administration: (
    <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  ),
};

const Chevron = () => (
  <svg className="sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

function parentGroupForNav(items: NavItem[], activeNav: string): string | null {
  for (const item of items) {
    if (item.children?.some((child) => child.id === activeNav)) return item.id;
  }
  return null;
}

function SidebarNavItem({
  item,
  activeNav,
  expandedGroups,
  onToggleGroup,
}: {
  item: NavItem;
  activeNav: string;
  expandedGroups: string[];
  onToggleGroup: (groupId: string) => void;
}) {
  const { t } = useI18n();

  if (item.children?.length) {
    const childActive = item.children.some((child) => child.id === activeNav);
    const isExpanded = expandedGroups.includes(item.id) || childActive;
    return (
      <li className={`sidebar-nav-group${childActive ? ' is-active-group' : ''}${isExpanded ? ' is-expanded' : ''}`}>
        <button type="button" className="sidebar-nav-group-trigger" aria-expanded={isExpanded} onClick={() => onToggleGroup(item.id)}>
          <span className="sidebar-nav-group-label">{t(item.labelKey)}</span>
          <Chevron />
        </button>
        <ul className="sidebar-nav-sublist">
          {item.children.map((child) => (
            <li key={child.id} className={activeNav === child.id ? 'active' : ''}>
              <Link to={child.path}>{t(child.labelKey)}</Link>
            </li>
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li className={activeNav === item.id ? 'active' : ''}>
      <Link to={item.path}>{t(item.labelKey)}</Link>
    </li>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const activeNav = resolveActiveNav(location.pathname, location.search);
  const role = user?.role ?? 'case_manager';
  const modules = useMemo(() => modulesForRole(role), [role]);
  const globalNav = useMemo(() => globalNavForRole(role), [role]);
  const activeModuleId = useMemo(() => resolveActiveModule(activeNav, modules), [activeNav, modules]);

  const [expandedModules, setExpandedModules] = useState<string[]>(() => [activeModuleId]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(GROUP_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (activeNav === 'dashboard') {
      setExpandedModules([]);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return;
    }
    const expanded = role === 'platform_admin' ? ['administration'] : [activeModuleId];
    setExpandedModules(expanded);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));

    const activeModule = modules.find((m) => m.id === activeModuleId);
    if (activeModule) {
      const groupId = parentGroupForNav(activeModule.items, activeNav);
      if (groupId) {
        setExpandedGroups([groupId]);
        sessionStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify([groupId]));
      }
    }
  }, [activeModuleId, activeNav, modules]);

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const willExpand = !prev.includes(moduleId);
      const next = willExpand ? [moduleId] : [];
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const willExpand = !prev.includes(groupId);
      const next = willExpand ? [groupId] : [];
      sessionStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const displayName = user?.name ?? t(roleLabelKey(role));
  const initials = ROLE_INITIALS[role] ?? 'U';
  const isPlatformAdmin = role === 'platform_admin';
  const branding = user?.tenant?.branding;
  const orgDisplayName = branding?.displayName ?? user?.tenant?.displayName ?? user?.tenant?.legalName;
  const tenantLabel = user?.tenant?.shortCode
    ? `${orgDisplayName} (${user.tenant.shortCode})`
    : isPlatformAdmin
      ? t('shell.platformScope')
      : null;
  const footerCopy = isPlatformAdmin
    ? t('shell.platformFooterCopy', { product: PRODUCT_NAME })
    : branding?.footerText ?? (orgDisplayName ? `© ${orgDisplayName}` : t('shell.navFooterCopy'));

  return (
    <>
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="rm-logo-wrap">
            {isPlatformAdmin ? (
              <>
                <img src={productLogoUrl()} alt={PRODUCT_NAME} className="rm-logo rm-logo-product" />
                <span className="platform-brand-title">{PRODUCT_NAME}</span>
              </>
            ) : (
              <TenantLogo
                branding={branding}
                alt={orgDisplayName ?? t('shell.organization')}
                className="rm-logo"
                fallbackClassName="rm-logo-fallback"
              />
            )}
          </div>
          {!isPlatformAdmin && orgDisplayName ? (
            <div className="org-brand-name">{orgDisplayName}</div>
          ) : null}
        </div>
        <div className="top-bar-right">
          <LocaleSwitcher />
          {!isPlatformAdmin && user ? <NotificationBell /> : null}
          {user ? (
            <div className="user-badge">
              <span className="user-avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{tenantLabel ?? t(roleLabelKey(role))}</span>
              </span>
            </div>
          ) : null}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => logout()}>
            {t('shell.signOut')}
          </button>
        </div>
      </header>

      <div className="app-body">
        <nav className="left-nav module-sidebar" aria-label={t('shell.moduleNavAria')}>
          {globalNav.length ? (
            <div className="sidebar-global-nav" aria-label={t('shell.homeAria')}>
              <ul className="sidebar-global-list">
                {globalNav.map((item) => (
                  <li key={item.id} className={activeNav === item.id ? 'active' : ''}>
                    <Link to={item.path}>{t(item.labelKey)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="sidebar-nav">
            <div className="sidebar-nav-heading">{t('shell.modulesHeading')}</div>
            {modules.map((mod) => {
              const items = navItemsForRole(mod, role);
              if (!items.length) return null;
              const isExpanded = expandedModules.includes(mod.id);
              const isCurrent = mod.id === activeModuleId;
              return (
                <div
                  key={mod.id}
                  className={`sidebar-section${isExpanded ? ' is-expanded' : ''}${isCurrent ? ' is-current-module' : ''}`}
                  data-module={mod.id}
                >
                  <button
                    type="button"
                    className="sidebar-section-trigger"
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-panel-${mod.id}`}
                    onClick={() => toggleModule(mod.id)}
                  >
                    {MODULE_ICONS[mod.id]}
                    <span className="sidebar-section-title">{t(mod.labelKey)}</span>
                    <Chevron />
                  </button>
                  <ul className="sidebar-section-panel" id={`sidebar-panel-${mod.id}`}>
                    {items.map((item) => (
                      <SidebarNavItem
                        key={item.id}
                        item={item}
                        activeNav={activeNav}
                        expandedGroups={expandedGroups}
                        onToggleGroup={toggleGroup}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="nav-footer">{footerCopy}</div>
        </nav>

        <div className="main-wrapper">
          <main id="page-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
