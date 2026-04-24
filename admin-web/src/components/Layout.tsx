import { useState, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Send,
  BellRing,
  CalendarDays,
  FileText,
  SquareStack,
  Users,
  HeartPulse,
  HandHeart,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { getFonts } from '../theme/fonts';
import { useIsMobile } from '../hooks/useMediaQuery';
import LanguageSwitcher from './LanguageSwitcher';
import QuickMessageModal from './QuickMessageModal';
import { Toast, type ToastKind } from './ui/Toast';

interface LayoutProps {
  children: ReactNode;
}

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const fonts = getFonts(i18n.language);
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const adminStr = localStorage.getItem('admin_user');
  const admin = adminStr ? JSON.parse(adminStr) : null;
  const isSuperAdmin = admin?.role === 'super_admin';

  const navItems: NavItem[] = [
    { path: '/admin', label: t('nav_dashboard'), icon: LayoutDashboard, exact: true },
    { path: '/admin/new-announcement', label: t('nav_new_announcement'), icon: Send },
    { path: '/admin/announcements', label: t('nav_announcements'), icon: BellRing },
    { path: '/admin/calendar', label: t('nav_calendar'), icon: CalendarDays },
    { path: '/admin/templates', label: t('nav_templates'), icon: FileText },
    { path: '/admin/snippets', label: t('nav_snippets'), icon: SquareStack },
    ...(isSuperAdmin ? [{ path: '/admin/team', label: t('nav_team'), icon: Users }] : []),
    ...(isSuperAdmin ? [{ path: '/admin/commemorations', label: t('nav_commemorations'), icon: HandHeart }] : []),
    ...(isSuperAdmin ? [{ path: '/admin/system', label: t('nav_system_health'), icon: HeartPulse }] : []),
    { path: '/admin/my-account', label: t('nav_my_account'), icon: UserCog },
  ];

  const currentNav = navItems.find((n) => isActive(n.path, n.exact, location.pathname));

  const isActiveCurrent = (path: string, exact?: boolean) =>
    isActive(path, exact, location.pathname);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  // Close drawer when the route changes (mobile)
  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const sidebar = (
    <aside
      style={{
        width: isMobile ? 280 : 248,
        background: 'linear-gradient(180deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
        color: 'var(--color-white)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: isMobile ? '100vh' : 'auto',
        minHeight: '100vh',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        insetInlineStart: 0,
        zIndex: isMobile ? 1001 : 10,
        boxShadow: isMobile ? 'var(--shadow-xl)' : 'none',
        animation: isMobile ? 'sidebarIn 220ms var(--easing-standard)' : 'none',
      }}
    >
      {/* Brand header */}
      <div
        style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid rgba(201, 162, 74, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-gold)',
              color: 'var(--color-primary-dark)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: fonts.heading,
              fontSize: 18,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ☦
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--color-gold-light)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t('app_title')}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(232, 210, 154, 0.7)',
                marginTop: 3,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {t('admin_panel')}
            </div>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label={t('common.close', 'Close menu')}
            style={{
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-gold-light)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: '14px 10px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveCurrent(item.path, item.exact);
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                color: active ? 'var(--color-gold-light)' : 'rgba(255,255,255,0.78)',
                background: active ? 'rgba(201, 162, 74, 0.16)' : 'transparent',
                border: 'none',
                textAlign: 'start',
                cursor: 'pointer',
                minHeight: 42,
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                transition: 'background var(--duration-micro) var(--easing-standard), color var(--duration-micro) var(--easing-standard)',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.75} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && (
                <span
                  aria-hidden
                  style={{
                    width: 4,
                    height: 18,
                    borderRadius: 2,
                    background: 'var(--color-gold)',
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer — user card */}
      <div
        style={{
          padding: '14px 12px',
          borderTop: '1px solid rgba(201, 162, 74, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {admin && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              aria-hidden
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-gold)',
                color: 'var(--color-primary-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {initialsOf(admin.display_name)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-white)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {admin.display_name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {isSuperAdmin ? t('role_super_admin', 'Super admin') : t('role_admin', 'Admin')}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 14px',
            background: 'transparent',
            border: '1px solid var(--color-gold)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-gold-light)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            minHeight: 40,
            transition: 'background var(--duration-micro) var(--easing-standard)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,162,74,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={15} strokeWidth={1.75} />
          {t('logout')}
        </button>
      </div>
    </aside>
  );

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: fonts.body,
        background: 'var(--color-parchment)',
        color: 'var(--color-ink)',
      }}
    >
      {/* Desktop sidebar */}
      {!isMobile && sidebar}

      {/* Mobile drawer + overlay */}
      {isMobile && drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--color-overlay)',
              zIndex: 1000,
              animation: 'fadeIn 180ms var(--easing-standard)',
            }}
          />
          {sidebar}
        </>
      )}

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Top bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: isMobile ? '10px 14px' : '14px 28px',
            background: 'rgba(250, 245, 233, 0.85)',
            backdropFilter: 'saturate(160%) blur(10px)',
            WebkitBackdropFilter: 'saturate(160%) blur(10px)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          {/* Left: hamburger + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label={t('common.open_menu', 'Open menu')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-ink)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Menu size={18} strokeWidth={1.75} />
              </button>
            )}

            {/* Breadcrumb */}
            {currentNav && !isMobile && (
              <nav
                aria-label="breadcrumb"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--color-ink-muted)',
                }}
              >
                <span>{t('admin_panel')}</span>
                <ChevronRight size={14} strokeWidth={1.75} style={{ opacity: 0.5 }} />
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                  {currentNav.label}
                </span>
              </nav>
            )}

            {/* On mobile, show current page name instead of breadcrumb */}
            {currentNav && isMobile && (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  fontFamily: fonts.heading,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentNav.label}
              </span>
            )}
          </div>

          {/* Right: language switcher + user menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <LanguageSwitcher />
            {admin && !isMobile && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label={admin.display_name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-primary)',
                    color: 'var(--color-white)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--color-gold-light)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {initialsOf(admin.display_name)}
                </button>
                {userMenuOpen && (
                  <>
                    <div
                      onClick={() => setUserMenuOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                    />
                    <div
                      role="menu"
                      style={{
                        position: 'absolute',
                        insetInlineEnd: 0,
                        top: 'calc(100% + 8px)',
                        minWidth: 220,
                        background: 'var(--color-parchment)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                        zIndex: 70,
                        animation: 'fadeIn 120ms var(--easing-standard)',
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                          {admin.display_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginTop: 2 }}>
                          {admin.email}
                        </div>
                      </div>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/admin/my-account');
                        }}
                        style={menuItemStyle}
                      >
                        <UserCog size={15} strokeWidth={1.75} />
                        {t('nav_my_account')}
                      </button>
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        style={{ ...menuItemStyle, color: 'var(--color-error)' }}
                      >
                        <LogOut size={15} strokeWidth={1.75} />
                        {t('logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div
          style={{
            flex: 1,
            padding: isMobile ? '18px 14px 28px' : '28px 32px 40px',
            overflow: 'auto',
            width: '100%',
            maxWidth: 1440,
            margin: '0 auto',
          }}
        >
          {children}
        </div>
      </main>

      {/* Quick message FAB — always accessible */}
      <button
        onClick={() => setQuickOpen(true)}
        aria-label={t('quick_message', 'Quick message')}
        title={t('quick_message', 'Quick message')}
        style={{
          position: 'fixed',
          insetInlineEnd: isMobile ? 18 : 28,
          bottom: isMobile ? 18 : 28,
          width: isMobile ? 56 : 60,
          height: isMobile ? 56 : 60,
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-primary)',
          color: 'var(--color-white)',
          border: '2px solid var(--color-gold)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 90,
          transition: 'transform var(--duration-micro) var(--easing-standard), box-shadow var(--duration-short) var(--easing-standard)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)';
          e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }}
      >
        <Zap size={isMobile ? 22 : 24} strokeWidth={2} fill="var(--color-gold)" color="var(--color-gold)" />
      </button>

      <QuickMessageModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSent={() => setToast({ kind: 'success', message: t('ann_sent', 'Sent') })}
      />

      {toast && (
        <Toast
          kind={toast.kind}
          message={toast.message}
          open={true}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function isActive(path: string, exact: boolean | undefined, pathname: string) {
  if (exact) return pathname === path;
  return pathname === path || pathname.startsWith(path + '/');
}

function initialsOf(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 14px',
  background: 'transparent',
  border: 'none',
  color: 'var(--color-ink)',
  fontSize: 13,
  cursor: 'pointer',
  textAlign: 'start',
  transition: 'background var(--duration-micro) var(--easing-standard)',
};
