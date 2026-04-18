import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiGet } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../api/client';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';
import type { Template, Language } from '../types';

export default function Templates() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const lang = i18n.language as Language;
  const isMobile = useIsMobile();
  const { data: templates, loading, refetch } = useApiGet<Template[]>('/admin/templates');

  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        placeholders: typeof editing.placeholders === 'string'
          ? JSON.parse(editing.placeholders) : editing.placeholders,
      };
      if (editing.id) {
        await api.put(`/admin/templates/${editing.id}`, payload);
      } else {
        await api.post('/admin/templates', payload);
      }
      setEditing(null);
      refetch();
    } catch { alert(t('error')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirm') + '?')) return;
    try { await api.delete(`/admin/templates/${id}`); refetch(); }
    catch { alert(t('error')); }
  };

  if (loading) return <p style={{ padding: 20, color: colors.muted }}>{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ fontFamily: fonts.heading, margin: 0 }}>{t('nav_templates')}</h1>
        <button
          onClick={() => setEditing({
            name_ar: '', name_ru: '', name_en: '', category: 'custom',
            body_ar_template: '', body_ru_template: '', body_en_template: '',
            placeholders: [],
          })}
          className="btn btn-primary">+</button>
      </div>

      {editing && (
        <div style={{ background: colors.white, border: `1px solid ${colors.gold}`, borderRadius: 8, padding: isMobile ? 14 : 20, marginBottom: 16 }}>
          <div className={isMobile ? '' : 'grid-3'}>
            <div className="form-group">
              <label className="form-label">Name (AR)</label>
              <input value={editing.name_ar || ''} onChange={e => setEditing({ ...editing, name_ar: e.target.value })} dir="rtl" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Name (RU)</label>
              <input value={editing.name_ru || ''} onChange={e => setEditing({ ...editing, name_ru: e.target.value })} dir="ltr" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Name (EN)</label>
              <input value={editing.name_en || ''} onChange={e => setEditing({ ...editing, name_en: e.target.value })} dir="ltr" className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select value={editing.category || 'custom'} onChange={e => setEditing({ ...editing, category: e.target.value })} className="form-input">
              {['liturgy', 'vespers', 'feast', 'fast', 'meeting', 'custom'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Body Template (AR)</label>
            <textarea value={editing.body_ar_template || ''} onChange={e => setEditing({ ...editing, body_ar_template: e.target.value })}
              dir="rtl" rows={6} className="form-input" style={{ resize: 'vertical' }} />
          </div>
          <div className={isMobile ? '' : 'grid-2'}>
            <div className="form-group">
              <label className="form-label">Body Template (RU)</label>
              <textarea value={editing.body_ru_template || ''} onChange={e => setEditing({ ...editing, body_ru_template: e.target.value })}
                dir="ltr" rows={5} className="form-input" style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Body Template (EN)</label>
              <textarea value={editing.body_en_template || ''} onChange={e => setEditing({ ...editing, body_en_template: e.target.value })}
                dir="ltr" rows={5} className="form-input" style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Placeholders (JSON)</label>
            <textarea
              value={typeof editing.placeholders === 'string' ? editing.placeholders : JSON.stringify(editing.placeholders, null, 2)}
              onChange={e => setEditing({ ...editing, placeholders: e.target.value as unknown as Template['placeholders'] })}
              dir="ltr" rows={5} className="form-input" style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} />
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

      <div className="mobile-card-list">
        {templates?.map((tmpl) => {
          const name = lang === 'ru' ? (tmpl.name_ru || tmpl.name_ar) : lang === 'en' ? (tmpl.name_en || tmpl.name_ar) : tmpl.name_ar;
          const ph = typeof tmpl.placeholders === 'string' ? JSON.parse(tmpl.placeholders) : tmpl.placeholders;
          return (
            <div key={tmpl.id} className="mobile-card">
              <div style={{ fontWeight: 600, color: colors.primary, marginBottom: 4, fontSize: 15 }}>{name}</div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Category</span>
                <span className="mobile-card-value">{tmpl.category}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Fields</span>
                <span className="mobile-card-value">{ph.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => setEditing({ ...tmpl })} className="btn btn-secondary" style={{ flex: 1 }}>Edit</button>
                <button onClick={() => handleDelete(tmpl.id)} className="btn btn-danger" style={{ flex: 1 }}>{t('delete')}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
