import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Database,
  Flame,
  Users,
  Globe,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  History,
  type LucideIcon,
} from 'lucide-react';
import { useApiGet, notifyDataChanged } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../api/client';
import StatsCard from '../components/StatsCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast, type ToastKind } from '../components/ui/Toast';
import { getFonts } from '../theme/fonts';
import { formatMoscowDate } from '../lib/datetime';
import type { Language } from '../types';

interface CronRun {
  id: number;
  job: 'send-due' | 'cleanup-tokens';
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: 'running' | 'ok' | 'error';
  error_message: string | null;
}

interface FailedAnnouncement {
  id: number;
  title_ar: string;
  title_ru: string | null;
  title_en: string | null;
  priority: 'normal' | 'high' | 'critical';
  created_at: string;
  created_by_name: string | null;
}

interface AuditEntry {
  id: number;
  admin_id: number | null;
  admin_name: string | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  created_at: string;
}

interface Overview {
  checked_at: string;
  db: { ok: boolean; ms: number };
  firebase: { ok: boolean };
  cron_runs: CronRun[];
  device_stats: {
    total: number;
    active_7d: number;
    active_1d: number;
    lang_ar: number;
    lang_ru: number;
    lang_en: number;
  };
  delivery: {
    delivered_1d: number;
    failed_1d: number;
    delivered_7d: number;
    failed_7d: number;
  };
  recent_failures: FailedAnnouncement[];
  recent_audit: AuditEntry[];
}

export default function SystemHealth() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const isMobile = useIsMobile();
  const lang = i18n.language as Language;
  const { data, loading, refetch } = useApiGet<Overview>('/admin/system/overview', [], {
    pollInterval: 30000,
  });
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const handleRetry = async (id: number): Promise<void> => {
    setRetryingId(id);
    try {
      const res = await api.post<{ id: number; status: string }>(
        `/announcements/admin/${id}/retry`
      );
      const status = res.data.status;
      setToast({
        kind: status === 'sent' ? 'success' : 'error',
        message: status === 'sent' ? t('sys_retry_success') : t('sys_retry_failed'),
      });
      notifyDataChanged();
      refetch();
    } catch {
      setToast({ kind: 'error', message: t('sys_retry_failed') });
    } finally {
      setRetryingId(null);
    }
  };

  if (loading && !data) {
    return (
      <p style={{ padding: 'var(--space-xl)', color: 'var(--color-ink-muted)' }}>
        {t('loading')}
      </p>
    );
  }

  if (!data) {
    return <EmptyState icon={HeartPulse} title={t('no_data')} />;
  }

  const localizedTitle = (a: FailedAnnouncement): string =>
    lang === 'ru' ? a.title_ru || a.title_ar : lang === 'en' ? a.title_en || a.title_ar : a.title_ar;

  return (
    <div>
      {/* Header */}
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
          {t('nav_system_health')}
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
        <p
          style={{
            color: 'var(--color-ink-muted)',
            fontSize: '13px',
            marginTop: '12px',
          }}
        >
          {t('sys_last_checked')}: {formatMoscowDate(data.checked_at, lang)}
        </p>
      </div>

      {/* System status strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <StatusPill
          icon={Database}
          label={t('sys_db')}
          ok={data.db.ok}
          detail={`${data.db.ms} ms`}
        />
        <StatusPill
          icon={Flame}
          label={t('sys_firebase')}
          ok={data.firebase.ok}
          detail={data.firebase.ok ? t('sys_ok') : t('sys_not_initialized')}
        />
      </div>

      {/* Device stats */}
      <SectionHeading icon={Users} title={t('sys_devices')} fonts={fonts} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: isMobile ? 'var(--space-sm)' : 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <StatsCard title={t('sys_total_devices')} value={data.device_stats.total ?? 0} icon={Users} accent="primary" />
        <StatsCard title={t('sys_active_1d')} value={data.device_stats.active_1d ?? 0} icon={HeartPulse} accent="success" />
        <StatsCard title={t('sys_active_7d')} value={data.device_stats.active_7d ?? 0} icon={Clock} accent="gold" />
        <StatsCard title="AR" value={data.device_stats.lang_ar ?? 0} icon={Globe} accent="gold" />
        <StatsCard title="RU" value={data.device_stats.lang_ru ?? 0} icon={Globe} accent="gold" />
        <StatsCard title="EN" value={data.device_stats.lang_en ?? 0} icon={Globe} accent="gold" />
      </div>

      {/* Delivery stats */}
      <SectionHeading icon={Send} title={t('sys_delivery')} fonts={fonts} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: isMobile ? 'var(--space-sm)' : 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <StatsCard title={t('sys_delivered_1d')} value={data.delivery.delivered_1d ?? 0} icon={CheckCircle2} accent="success" />
        <StatsCard title={t('sys_failed_1d')} value={data.delivery.failed_1d ?? 0} icon={XCircle} accent="primary" />
        <StatsCard title={t('sys_delivered_7d')} value={data.delivery.delivered_7d ?? 0} icon={CheckCircle2} accent="success" />
        <StatsCard title={t('sys_failed_7d')} value={data.delivery.failed_7d ?? 0} icon={XCircle} accent="primary" />
      </div>

      {/* Send-failed announcements */}
      <SectionHeading icon={AlertTriangle} title={t('sys_send_failures')} fonts={fonts} />
      {data.recent_failures.length === 0 ? (
        <Card elevation="none" padding="lg" style={{ marginBottom: 'var(--space-xl)' }}>
          <EmptyState icon={CheckCircle2} title={t('sys_no_failures')} />
        </Card>
      ) : (
        <Card elevation="sm" padding="sm" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-xl)' }}>
          {data.recent_failures.map((a, idx) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-md)',
                borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '14px' }}>
                  {localizedTitle(a)}
                </div>
                <div style={{ color: 'var(--color-ink-muted)', fontSize: '12px', marginTop: '4px' }}>
                  {a.created_by_name ?? '—'} · {formatMoscowDate(a.created_at, lang)}
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                leadingIcon={RefreshCw}
                loading={retryingId === a.id}
                disabled={retryingId !== null}
                onClick={() => handleRetry(a.id)}
              >
                {t('sys_retry')}
              </Button>
            </div>
          ))}
        </Card>
      )}

      {/* Cron runs */}
      <SectionHeading icon={Clock} title={t('sys_cron_runs')} fonts={fonts} />
      <Card elevation="sm" padding="sm" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-xl)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-hover)' }}>
                <Th>{t('sys_job')}</Th>
                <Th>{t('sys_started')}</Th>
                <Th>{t('sys_duration')}</Th>
                <Th>{t('sys_status')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.cron_runs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 'var(--space-lg)', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
                    {t('sys_no_cron_runs')}
                  </td>
                </tr>
              ) : (
                data.cron_runs.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <Td>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{r.job}</span>
                    </Td>
                    <Td>{formatMoscowDate(r.started_at, lang)}</Td>
                    <Td>{r.duration_ms !== null ? `${r.duration_ms} ms` : '—'}</Td>
                    <Td>
                      <StatusBadge status={r.status} label={t(`sys_cron_${r.status}`)} title={r.error_message ?? undefined} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent audit log */}
      <SectionHeading icon={History} title={t('sys_recent_actions')} fonts={fonts} />
      <Card elevation="sm" padding="sm" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-hover)' }}>
                <Th>{t('sys_when')}</Th>
                <Th>{t('sys_who')}</Th>
                <Th>{t('sys_what')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.recent_audit.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 'var(--space-lg)', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
                    {t('sys_no_audit')}
                  </td>
                </tr>
              ) : (
                data.recent_audit.map((e) => (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <Td>{formatMoscowDate(e.created_at, lang)}</Td>
                    <Td>{e.admin_name ?? '—'}</Td>
                    <Td>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{e.action}</span>
                      {e.target_type && e.target_id !== null && (
                        <span style={{ color: 'var(--color-ink-muted)', marginInlineStart: 8 }}>
                          {e.target_type}#{e.target_id}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Toast
        kind={toast?.kind}
        message={toast?.message ?? ''}
        open={toast !== null}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  fonts,
}: {
  icon: LucideIcon;
  title: string;
  fonts: { heading: string };
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
      }}
    >
      <Icon size={18} strokeWidth={1.75} color="var(--color-primary)" />
      <h2
        style={{
          fontFamily: fonts.heading,
          color: 'var(--color-ink)',
          fontSize: '18px',
          fontWeight: 700,
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  ok,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  ok: boolean;
  detail: string;
}) {
  const color = ok ? 'var(--color-success)' : 'var(--color-error)';
  const soft = ok ? 'var(--color-success-soft)' : 'var(--color-error-soft)';
  return (
    <Card elevation="sm" padding="md">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: soft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} strokeWidth={1.75} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--color-ink-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
          </div>
          <div style={{ color: 'var(--color-ink)', fontWeight: 700, fontSize: '15px', marginTop: 2 }}>
            {detail}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({
  status,
  label,
  title,
}: {
  status: 'running' | 'ok' | 'error';
  label: string;
  title?: string;
}) {
  const palette =
    status === 'ok'
      ? { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' }
      : status === 'error'
      ? { bg: 'var(--color-error-soft)', fg: 'var(--color-error)' }
      : { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' };
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: palette.bg,
        color: palette.fg,
        padding: '2px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
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
        padding: '12px 16px',
        color: 'var(--color-ink)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </td>
  );
}
