import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useApiGet } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../api/client';
import { getFonts } from '../theme/fonts';
import EditAnnouncementModal from '../components/EditAnnouncementModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Toast, type ToastKind } from '../components/ui/Toast';
import type { Announcement, Language } from '../types';

export default function AnnouncementHistory() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const lang = i18n.language as Language;
  const isMobile = useIsMobile();
  const { data: announcements, loading, refetch } = useApiGet<Announcement[]>(
    '/announcements/admin?limit=100',
  );

  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const handleDelete = async (a: Announcement) => {
    const wasSent = !!a.sent_at;
    const confirmMsg = wasSent
      ? t(
          'delete_sent_confirm',
          'This announcement was already sent. Deleting it removes it from the admin panel and the app inbox, but cannot remove it from phones that already received the notification.\n\nContinue?',
        )
      : t('delete_confirm', 'Delete this announcement?');

    if (!confirm(confirmMsg)) return;

    setDeleting(a.id);
    try {
      await api.delete(`/announcements/admin/${a.id}`);
      setToast({ kind: 'success', message: t('deleted', 'Deleted') });
      refetch();
    } catch {
      setToast({ kind: 'error', message: t('error', 'Something went wrong') });
    } finally {
      setDeleting(null);
    }
  };

  if (loading)
    return (
      <p style={{ padding: 20, color: 'var(--color-ink-muted)' }}>{t('loading')}</p>
    );

  const getTitle = (a: Announcement) =>
    lang === 'ru'
      ? a.title_ru || a.title_ar
      : lang === 'en'
      ? a.title_en || a.title_ar
      : a.title_ar;

  return (
    <div>
      <h1 className="page-title" style={{ fontFamily: fonts.heading }}>
        {t('nav_announcements')}
      </h1>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {(!announcements || announcements.length === 0) && (
            <p style={{ textAlign: 'center', color: 'var(--color-ink-muted)', padding: 20 }}>
              {t('no_data')}
            </p>
          )}
          {announcements?.map((a) => (
            <Card
              key={a.id}
              elevation="sm"
              padding="md"
              goldAccent={a.priority === 'high' || a.priority === 'critical'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                {a.priority === 'critical' && (
                  <AlertTriangle size={14} strokeWidth={2} color="var(--color-error)" style={{ marginTop: 3 }} />
                )}
                <div style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: 15, flex: 1 }}>
                  {getTitle(a)}
                </div>
                <span className={`badge badge-${a.status}`}>{t(`ann_${a.status}`)}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('ann_category')}</span>
                <span className="mobile-card-value">{t(`category_${a.category}`)}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('ann_priority')}</span>
                <span className="mobile-card-value">{t(`priority_${a.priority}`)}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('ann_sent')}</span>
                <span className="mobile-card-value">
                  {a.sent_at ? new Date(a.sent_at).toLocaleString() : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={Pencil}
                  onClick={() => setEditTarget(a)}
                  fullWidth
                >
                  {t('edit', 'Edit')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  leadingIcon={Trash2}
                  onClick={() => handleDelete(a)}
                  disabled={deleting === a.id}
                  loading={deleting === a.id}
                  fullWidth
                >
                  {t('delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('ann_title_ar')}</th>
                <th>{t('ann_category')}</th>
                <th>{t('ann_priority')}</th>
                <th>Status</th>
                <th>{t('ann_sent')}</th>
                <th style={{ textAlign: 'end' }}></th>
              </tr>
            </thead>
            <tbody>
              {announcements?.map((a) => (
                <tr key={a.id}>
                  <td style={{ color: 'var(--color-ink-muted)', fontSize: 12 }}>#{a.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {a.priority === 'critical' && (
                        <AlertTriangle size={14} strokeWidth={2} color="var(--color-error)" />
                      )}
                      <span style={{ fontWeight: a.priority !== 'normal' ? 600 : 500 }}>
                        {getTitle(a)}
                      </span>
                    </div>
                  </td>
                  <td>{t(`category_${a.category}`)}</td>
                  <td>{t(`priority_${a.priority}`)}</td>
                  <td>
                    <span className={`badge badge-${a.status}`}>{t(`ann_${a.status}`)}</span>
                  </td>
                  <td>{a.sent_at ? new Date(a.sent_at).toLocaleString() : '—'}</td>
                  <td style={{ textAlign: 'end' }}>
                    <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leadingIcon={Pencil}
                        onClick={() => setEditTarget(a)}
                      >
                        {t('edit', 'Edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leadingIcon={Trash2}
                        onClick={() => handleDelete(a)}
                        disabled={deleting === a.id}
                        loading={deleting === a.id}
                        style={{ color: 'var(--color-error)' }}
                      >
                        {t('delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!announcements || announcements.length === 0) && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', color: 'var(--color-ink-muted)', padding: 'var(--space-xl)' }}
                  >
                    {t('no_data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <EditAnnouncementModal
        open={!!editTarget}
        announcement={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setToast({ kind: 'success', message: t('saved', 'Saved') });
          refetch();
        }}
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
