import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';
import { useIsMobile } from '../hooks/useMediaQuery';
import LanguageSwitcher from './LanguageSwitcher';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const fonts = getFonts(i18n.language);
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const adminStr = localStorage.getItem('admin_user');
  const admin = adminStr ? JSON.parse(adminStr) : null;
  const isSuperAdmin = admin?.role === 'super_admin';

  const navItems = [
    { path: '/admin', label: t('nav_dashboard'), exact: true },
    { path: '/admin/new-announcement', label: t('nav_new_announcement') },
    { path: '/admin/announcements', label: t('nav_announcements') },
    { path: '/admin/calendar', label: t('nav_calendar') },
    { path: '/admin/templates', label: t('nav_templates') },
    { path: '/admin/snippets', label: t('nav_snippets') },
    ...(isSuperAdmin ? [{ path: '/admin/team', label: t('nav_team') }] : []),
    { path: '/admin/my-account', label: t('nav_my_account') },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const sidebar = (
    <aside
      style={{
        width: isMobile ? 280 : 240,
        background: colors.primary,
        color: colors.white,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        ...(isMobile ? {
          position: 'fixed',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          zIndex: 999,
          animation: 'slideIn 0.25s ease',
        } : {}),
      }}
    >
      {/* Header */}
      <div style={{ padding: '18px 16px', borderBottom: `1px solid ${colors.primaryLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: colors.gold }}>
            {t('app_title')}
          </div>
          <div style={{ fontSize: 11, color: colors.goldLight, marginTop: 2 }}>
            {t('admin_panel')}
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(false)}
            style={{ background: 'none', border: 'none', color: colors.gold, fontSize: 24, padding: 4, lineHeight: 1 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavClick(item.path)}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 20px',
              color: isActive(item.path, (item as { exact?: boolean }).exact) ? colors.gold : 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              fontSize: 14,
              background: isActive(item.path, (item as { exact?: boolean }).exact) ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderInlineStart: isActive(item.path, (item as { exact?: boolean }).exact) ? `3px solid ${colors.gold}` : '3px solid transparent',
              border: 'none',
              textAlign: 'start',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.primaryLight}` }}>
        {admin && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {admin.display_name}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{
            width: '100%', padding: '8px 0',
            borderColor: colors.gold, color: colors.gold,
            fontSize: 13, minHeight: 40,
          }}
        >
          {t('logout')}
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: fonts.body, background: colors.parchment }}>
      {/* Desktop sidebar */}
      {!isMobile && sidebar}

      {/* Mobile drawer overlay */}
      {isMobile && drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          {sidebar}
        </>
      )}

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: isMobile ? '10px 16px' : '10px 24px',
            background: colors.white,
            borderBottom: `1px solid ${colors.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {isMobile ? (
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                background: 'none', border: 'none', fontSize: 22, padding: 4,
                color: colors.primary, lineHeight: 1, minWidth: 44, minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ☰
            </button>
          ) : <div />}
          <LanguageSwitcher />
        </header>

        {/* Page content */}
        <div style={{ flex: 1, padding: isMobile ? 14 : 24, overflow: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
