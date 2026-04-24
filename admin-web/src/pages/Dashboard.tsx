import { useTranslation } from 'react-i18next';
import {
  Users,
  Activity,
  CalendarClock,
  Globe,
  BellRing,
  AlertTriangle,
} from 'lucide-react';
import { useApiGet } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import StatsCard from '../components/StatsCard';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { getFonts } from '../theme/fonts';
import type { Stats, Language } from '../types';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const isMobile = useIsMobile();
  const { data: stats, loading } = useApiGet<Stats>('/admin/stats', [], { pollInterval: 15000 });
  const lang = i18n.language as Language;

  if (loading) {
    return (
      <p style={{ padding: 'var(--space-xl)', color: 'var(--color-ink-muted)' }}>
        {t('loading')}
      </p>
    );
  }

  if (!stats) {
    return (
      <EmptyState icon={Activity} title={t('no_data')} />
    );
  }

  return (
    <div>
      {/* Page title with signature gold hairline */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1
          style={{
            fontFamily: fonts.heading,
            color: 'var(--color-ink)',
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {t('nav_dashboard')}
        </h1>
        <div
          style={{
            width: '56px',
            height: '2px',
            background: 'var(--color-gold)',
            borderRadius: '1px',
            marginTop: '8px',
          }}
        />
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? 'repeat(2, 1fr)'
            : 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: isMobile ? 'var(--space-sm)' : 'var(--space-lg)',
          marginBottom: 'var(--space-2xl)',
        }}
      >
        <StatsCard
          title={t('dashboard_total_devices')}
          value={stats.total_devices}
          icon={Users}
          accent="primary"
        />
        <StatsCard
          title={t('dashboard_active_7d')}
          value={stats.active_7d}
          icon={Activity}
          accent="success"
        />
        <StatsCard
          title={t('dashboard_active_30d')}
          value={stats.active_30d}
          icon={CalendarClock}
          accent="gold"
        />
        {stats.by_language.map((item) => (
          <StatsCard
            key={item.language}
            title={item.language.toUpperCase()}
            value={item.count}
            subtitle={t('dashboard_by_language')}
            icon={Globe}
            accent="gold"
          />
        ))}
      </div>

      {/* Recent announcements */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-md)',
        }}
      >
        <BellRing size={18} strokeWidth={1.75} color="var(--color-primary)" />
        <h2
          style={{
            fontFamily: fonts.heading,
            color: 'var(--color-ink)',
            fontSize: '18px',
            fontWeight: 700,
            margin: 0,
          }}
        >
          {t('dashboard_recent')}
        </h2>
      </div>

      {stats.last_announcements.length === 0 ? (
        <Card elevation="none" padding="lg">
          <EmptyState icon={BellRing} title={t('no_data')} />
        </Card>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {stats.last_announcements.map((a) => {
            const title =
              lang === 'ru'
                ? a.title_ru || a.title_ar
                : lang === 'en'
                ? a.title_en || a.title_ar
                : a.title_ar;
            const isCritical = a.priority === 'critical';
            return (
              <Card key={a.id} elevation="sm" padding="md" goldAccent={a.priority === 'high' || isCritical}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: 'var(--color-ink)',
                      fontSize: '15px',
                      lineHeight: 1.3,
                      flex: 1,
                    }}
                  >
                    {title}
                  </div>
                  {isCritical && (
                    <span
                      title={t('priority_critical')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'var(--color-error-soft)',
                        color: 'var(--color-error)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      <AlertTriangle size={11} strokeWidth={2} />
                      {t('priority_critical')}
                    </span>
                  )}
                </div>
                <MetaRow label={t('ann_category')} value={t(`category_${a.category}`)} />
                <MetaRow label={t('ann_priority')} value={t(`priority_${a.priority}`)} />
                <MetaRow
                  label={t('ann_sent')}
                  value={a.sent_at ? new Date(a.sent_at).toLocaleDateString() : '—'}
                />
                {a.sent_count !== undefined && (
                  <MetaRow
                    label="Sent / failed"
                    value={`${a.sent_count} / ${a.failed_count ?? 0}`}
                  />
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card elevation="sm" padding="sm" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)' }}>
                  <Th>{t('ann_title_ar')}</Th>
                  <Th>{t('ann_category')}</Th>
                  <Th>{t('ann_priority')}</Th>
                  <Th>{t('ann_sent')}</Th>
                  <Th>Sent / failed</Th>
                </tr>
              </thead>
              <tbody>
                {stats.last_announcements.map((a) => {
                  const title =
                    lang === 'ru'
                      ? a.title_ru || a.title_ar
                      : lang === 'en'
                      ? a.title_en || a.title_ar
                      : a.title_ar;
                  return (
                    <tr
                      key={a.id}
                      style={{
                        borderTop: '1px solid var(--color-border)',
                      }}
                    >
                      <Td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {a.priority === 'critical' && (
                            <AlertTriangle
                              size={14}
                              strokeWidth={2}
                              color="var(--color-error)"
                            />
                          )}
                          <span
                            style={{
                              fontWeight: a.priority !== 'normal' ? 600 : 500,
                              color: 'var(--color-ink)',
                            }}
                          >
                            {title}
                          </span>
                        </div>
                      </Td>
                      <Td>{t(`category_${a.category}`)}</Td>
                      <Td>
                        <PriorityPill priority={a.priority} label={t(`priority_${a.priority}`)} />
                      </Td>
                      <Td>{a.sent_at ? new Date(a.sent_at).toLocaleDateString() : '—'}</Td>
                      <Td>
                        {a.sent_count ?? '—'} / {a.failed_count ?? 0}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: '12px 16px',
        textAlign: 'start',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--color-ink-muted)',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: '14px 16px',
        color: 'var(--color-ink)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </td>
  );
}

function MetaRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        padding: '4px 0',
        fontSize: '13px',
      }}
    >
      <span style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function PriorityPill({
  priority,
  label,
}: {
  priority: 'normal' | 'high' | 'critical';
  label: string;
}) {
  const palette =
    priority === 'critical'
      ? { bg: 'var(--color-error-soft)', fg: 'var(--color-error)' }
      : priority === 'high'
      ? { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' }
      : { bg: 'var(--color-surface-hover)', fg: 'var(--color-ink-muted)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: palette.bg,
        color: palette.fg,
        padding: '2px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {label}
    </span>
  );
}
