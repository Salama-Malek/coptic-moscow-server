import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandHeart, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useApiGet, notifyDataChanged } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast, type ToastKind } from '../components/ui/Toast';
import { getFonts } from '../theme/fonts';
import { formatMoscowDate } from '../lib/datetime';
import type { Language } from '../types';

interface Commemoration {
  id: number;
  name_ar: string;
  name_ru: string | null;
  name_en: string | null;
  date_of_repose: string;
  notes: string | null;
  announcement_40d_id: number | null;
  announcement_1y_id: number | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
}

export default function Commemorations() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const isMobile = useIsMobile();
  const lang = i18n.language as Language;
  const { data, loading, refetch } = useApiGet<Commemoration[]>('/admin/commemorations');
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [nameAr, setNameAr] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [dateOfRepose, setDateOfRepose] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = (): void => {
    setNameAr('');
    setNameRu('');
    setNameEn('');
    setDateOfRepose('');
    setNotes('');
  };

  const handleAdd = async (): Promise<void> => {
    setSaving(true);
    try {
      await api.post('/admin/commemorations', {
        name_ar: nameAr,
        name_ru: nameRu.trim() || undefined,
        name_en: nameEn.trim() || undefined,
        date_of_repose: dateOfRepose,
        notes: notes.trim() || undefined,
      });
      setToast({ kind: 'success', message: t('commem_created') });
      resetForm();
      notifyDataChanged();
      refetch();
    } catch {
      setToast({ kind: 'error', message: t('error') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (!window.confirm(t('commem_delete_confirm'))) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/commemorations/${id}`);
      setToast({ kind: 'success', message: t('commem_deleted') });
      notifyDataChanged();
      refetch();
    } catch {
      setToast({ kind: 'error', message: t('error') });
    } finally {
      setDeletingId(null);
    }
  };

  const localizedName = (c: Commemoration): string =>
    lang === 'ru' ? c.name_ru || c.name_ar : lang === 'en' ? c.name_en || c.name_ar : c.name_ar;

  const canSubmit = nameAr.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dateOfRepose);

  return (
    <div>
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
          {t('nav_commemorations')}
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
        <p style={{ color: 'var(--color-ink-muted)', fontSize: '13px', marginTop: '12px' }}>
          {t('commem_description')}
        </p>
      </div>

      {/* Add form */}
      <Card elevation="sm" padding="lg" style={{ marginBottom: 'var(--space-xl)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <Input
            label={t('commem_name_ar')}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            dir="rtl"
            required
          />
          <Input
            label={t('commem_name_ru')}
            value={nameRu}
            onChange={(e) => setNameRu(e.target.value)}
            dir="ltr"
          />
          <Input
            label={t('commem_name_en')}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            dir="ltr"
          />
          <Input
            type="date"
            label={t('commem_date_of_repose')}
            value={dateOfRepose}
            onChange={(e) => setDateOfRepose(e.target.value)}
            required
          />
        </div>
        <Textarea
          label={t('commem_notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          containerStyle={{ marginBottom: 'var(--space-md)' }}
        />
        <Button
          leadingIcon={Plus}
          onClick={handleAdd}
          disabled={!canSubmit || saving}
          loading={saving}
          variant="primary"
        >
          {t('commem_add')}
        </Button>
        <p style={{ color: 'var(--color-ink-muted)', fontSize: '12px', marginTop: 'var(--space-sm)' }}>
          {t('commem_auto_hint')}
        </p>
      </Card>

      {/* List */}
      {loading && !data ? (
        <p style={{ color: 'var(--color-ink-muted)' }}>{t('loading')}</p>
      ) : !data || data.length === 0 ? (
        <Card elevation="none" padding="lg">
          <EmptyState icon={HandHeart} title={t('commem_empty')} />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {data.map((c) => (
            <Card key={c.id} elevation="sm" padding="md">
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: 'var(--space-sm)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '15px' }}>
                    {localizedName(c)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: 'var(--color-ink-muted)',
                      fontSize: '12px',
                      marginTop: 4,
                    }}
                  >
                    <CalendarIcon size={12} strokeWidth={1.75} />
                    {formatMoscowDate(c.date_of_repose, lang)}
                  </div>
                  {c.notes && (
                    <div style={{ color: 'var(--color-ink-muted)', fontSize: '12px', marginTop: 6 }}>
                      {c.notes}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  leadingIcon={Trash2}
                  loading={deletingId === c.id}
                  disabled={deletingId !== null}
                  onClick={() => handleDelete(c.id)}
                >
                  {t('delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Toast
        kind={toast?.kind}
        message={toast?.message ?? ''}
        open={toast !== null}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
