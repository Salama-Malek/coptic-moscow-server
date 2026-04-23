import { useTranslation } from 'react-i18next';
import { useApiGet } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../api/client';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';
import type { Announcement, Language } from '../types';

export default function AnnouncementHistory() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const lang = i18n.language as Language;
  const isMobile = useIsMobile();
  const { data: announcements, loading, refetch } = useApiGet<Announcement[]>('/announcements/admin?limit=100');

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirm') + '?')) return;
    try {
      await api.delete(`/announcements/admin/${id}`);
      refetch();
    } catch { alert(t('error')); }
  };

  if (loading) return <p style={{ padding: 20, color: colors.muted }}>{t('loading')}</p>;

  const getTitle = (a: Announcement) =>
    lang === 'ru' ? (a.title_ru || a.title_ar) : lang === 'en' ? (a.title_en || a.title_ar) : a.title_ar;

  return (
    <div>
      <h1 className="page-title" style={{ fontFamily: fonts.heading }}>{t('nav_announcements')}</h1>

      {isMobile ? (
        <div className="mobile-card-list">
          {(!announcements || announcements.length === 0) && (
            <p style={{ textAlign: 'center', color: colors.muted, padding: 20 }}>{t('no_data')}</p>
          )}
          {announcements?.map((a) => (
            <div key={a.id} className="mobile-card">
              <div style={{ fontWeight: 600, color: colors.primary, marginBottom: 8, fontSize: 15 }}>
                {getTitle(a)}
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('ann_category')}</span>
                <span className="mobile-card-value">{t(`category_${a.category}`)}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Status</span>
                <span className={`badge badge-${a.status}`}>{t(`ann_${a.status}`)}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('ann_sent')}</span>
                <span className="mobile-card-value">
                  {a.sent_at ? new Date(a.sent_at).toLocaleString() : '—'}
                </span>
              </div>
              {!a.sent_at && (
                <button onClick={() => handleDelete(a.id)} className="btn btn-danger" style={{ marginTop: 10, width: '100%', padding: '8px 0' }}>
                  {t('delete')}
                </button>
              )}
            </div>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {announcements?.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{getTitle(a)}</td>
                  <td>{t(`category_${a.category}`)}</td>
                  <td>{t(`priority_${a.priority}`)}</td>
                  <td><span className={`badge badge-${a.status}`}>{t(`ann_${a.status}`)}</span></td>
                  <td>{a.sent_at ? new Date(a.sent_at).toLocaleString() : '—'}</td>
                  <td>
                    {!a.sent_at && (
                      <button onClick={() => handleDelete(a.id)} className="btn btn-ghost" style={{ color: colors.error }}>
                        {t('delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!announcements || announcements.length === 0) && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: colors.muted }}>{t('no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
