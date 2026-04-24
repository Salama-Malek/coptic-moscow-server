import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiGet, notifyDataChanged } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../api/client';
import RRuleBuilder from '../components/RRuleBuilder';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';
import type { CalendarEvent, Language } from '../types';

const emptyEvent = {
  title_ar: '', title_ru: '', title_en: '',
  description_ar: '', description_ru: '', description_en: '',
  rrule: '', starts_at: '', duration_minutes: 60, reminder_minutes_before: 30, active: 1,
};

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const lang = i18n.language as Language;
  const isMobile = useIsMobile();
  const { data: events, loading, refetch } = useApiGet<CalendarEvent[]>('/calendar/admin', [], { pollInterval: 15000 });

  const [editing, setEditing] = useState<Partial<CalendarEvent> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await api.put(`/calendar/admin/${editing.id}`, editing);
      } else {
        await api.post('/calendar/admin', editing);
      }
      setEditing(null);
      notifyDataChanged();
    } catch { alert(t('error')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirm') + '?')) return;
    try { await api.delete(`/calendar/admin/${id}`); notifyDataChanged(); }
    catch { alert(t('error')); }
  };

  const getTitle = (ev: CalendarEvent) =>
    lang === 'ru' ? (ev.title_ru || ev.title_ar) : lang === 'en' ? (ev.title_en || ev.title_ar) : ev.title_ar;

  if (loading) return <p style={{ padding: 20, color: colors.muted }}>{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ fontFamily: fonts.heading, margin: 0 }}>{t('nav_calendar')}</h1>
        <button onClick={() => setEditing({ ...emptyEvent })} className="btn btn-primary">
          {t('cal_add_event')}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ background: colors.white, border: `1px solid ${colors.gold}`, borderRadius: 8, padding: isMobile ? 14 : 20, marginBottom: 16 }}>
          <div className={isMobile ? '' : 'grid-3'}>
            <div className="form-group">
              <label className="form-label">{t('ann_title_ar')}</label>
              <input value={editing.title_ar || ''} onChange={e => setEditing({ ...editing, title_ar: e.target.value })} dir="rtl" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('ann_title_ru')}</label>
              <input value={editing.title_ru || ''} onChange={e => setEditing({ ...editing, title_ru: e.target.value })} dir="ltr" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('ann_title_en')}</label>
              <input value={editing.title_en || ''} onChange={e => setEditing({ ...editing, title_en: e.target.value })} dir="ltr" className="form-input" />
            </div>
          </div>
          <div className={isMobile ? '' : 'grid-3'}>
            <div className="form-group">
              <label className="form-label">{t('cal_starts_at')}</label>
              <input type="datetime-local" value={editing.starts_at || ''} onChange={e => setEditing({ ...editing, starts_at: e.target.value })} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('cal_duration')}</label>
              <input type="number" value={editing.duration_minutes ?? 60} onChange={e => setEditing({ ...editing, duration_minutes: Number(e.target.value) })} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('cal_reminder')}</label>
              <input type="number" value={editing.reminder_minutes_before ?? 30} onChange={e => setEditing({ ...editing, reminder_minutes_before: Number(e.target.value) })} className="form-input" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">{t('cal_rrule')}</label>
              <RRuleBuilder value={editing.rrule || ''} onChange={(v) => setEditing({ ...editing, rrule: v || null })} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16, minHeight: 44 }}>
              <input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked ? 1 : 0 })}
                style={{ width: 20, height: 20, accentColor: colors.primary }} />
              <span>{t('cal_active')}</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            <button onClick={handleSave} disabled={saving} className={`btn btn-primary ${isMobile ? 'btn-block' : ''}`}>
              {saving ? t('loading') : t('save')}
            </button>
            <button onClick={() => setEditing(null)} className={`btn btn-secondary ${isMobile ? 'btn-block' : ''}`}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      {isMobile ? (
        <div className="mobile-card-list">
          {events?.map((ev) => (
            <div key={ev.id} className="mobile-card" style={{ opacity: ev.active ? 1 : 0.5 }}>
              <div style={{ fontWeight: 600, color: colors.primary, marginBottom: 6 }}>{getTitle(ev)}</div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('cal_starts_at')}</span>
                <span className="mobile-card-value">{ev.starts_at ? new Date(ev.starts_at).toLocaleString() : '—'}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('cal_rrule')}</span>
                <span className="mobile-card-value" style={{ fontSize: 12 }}>{ev.rrule || '—'}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('cal_active')}</span>
                <span className="mobile-card-value">{ev.active ? '✓' : '✗'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => setEditing({ ...ev })} className="btn btn-secondary" style={{ flex: 1, padding: '8px 0' }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(ev.id)} className="btn btn-danger" style={{ flex: 1, padding: '8px 0' }}>
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('cal_title')}</th>
                <th>{t('cal_starts_at')}</th>
                <th>{t('cal_rrule')}</th>
                <th>{t('cal_active')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events?.map((ev) => (
                <tr key={ev.id} style={{ opacity: ev.active ? 1 : 0.5 }}>
                  <td>{getTitle(ev)}</td>
                  <td>{ev.starts_at ? new Date(ev.starts_at).toLocaleString() : '—'}</td>
                  <td style={{ fontSize: 12 }}>{ev.rrule || '—'}</td>
                  <td>{ev.active ? '✓' : '✗'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditing({ ...ev })} className="btn btn-ghost">Edit</button>
                      <button onClick={() => handleDelete(ev.id)} className="btn btn-ghost" style={{ color: colors.error }}>{t('delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
