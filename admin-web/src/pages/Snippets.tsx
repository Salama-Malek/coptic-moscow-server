import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiGet } from '../hooks/useApi';
import api from '../api/client';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';
import type { Snippet } from '../types';

export default function Snippets() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const { data: snippets, loading, refetch } = useApiGet<Snippet[]>('/admin/snippets');

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ value_ar: '', value_ru: '', value_en: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = (s: Snippet) => {
    setEditingKey(s.key);
    setEditValues({ value_ar: s.value_ar, value_ru: s.value_ru || '', value_en: s.value_en || '' });
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setSaving(true);
    try { await api.put(`/admin/snippets/${editingKey}`, editValues); setEditingKey(null); refetch(); }
    catch { alert(t('error')); }
    finally { setSaving(false); }
  };

  if (loading) return <p style={{ padding: 20, color: colors.muted }}>{t('loading')}</p>;

  return (
    <div>
      <h1 className="page-title" style={{ fontFamily: fonts.heading }}>{t('nav_snippets')}</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {snippets?.map((s) => (
          <div key={s.key} className="mobile-card">
            <div style={{ fontWeight: 600, color: colors.primary, marginBottom: 8, fontFamily: 'monospace', fontSize: 13 }}>
              {s.key}
            </div>
            {editingKey === s.key ? (
              <>
                <div className="form-group">
                  <label className="form-label">{t('snippets_value_ar')}</label>
                  <textarea value={editValues.value_ar} onChange={e => setEditValues({ ...editValues, value_ar: e.target.value })}
                    dir="rtl" rows={3} className="form-input" style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('snippets_value_ru')}</label>
                  <textarea value={editValues.value_ru} onChange={e => setEditValues({ ...editValues, value_ru: e.target.value })}
                    dir="ltr" rows={3} className="form-input" style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('snippets_value_en')}</label>
                  <textarea value={editValues.value_en} onChange={e => setEditValues({ ...editValues, value_en: e.target.value })}
                    dir="ltr" rows={3} className="form-input" style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                    {saving ? t('loading') : t('save')}
                  </button>
                  <button onClick={() => setEditingKey(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                    {t('cancel')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 4, direction: 'rtl', fontSize: 14, lineHeight: 1.7 }}>
                  <span style={{ color: colors.muted, fontSize: 12 }}>AR: </span>{s.value_ar}
                </div>
                <div style={{ marginBottom: 4, fontSize: 14 }}>
                  <span style={{ color: colors.muted, fontSize: 12 }}>RU: </span>{s.value_ru || '—'}
                </div>
                <div style={{ marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: colors.muted, fontSize: 12 }}>EN: </span>{s.value_en || '—'}
                </div>
                <button onClick={() => startEdit(s)} className="btn btn-ghost" style={{ padding: '6px 0' }}>
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
