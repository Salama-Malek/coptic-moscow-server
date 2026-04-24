import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { notifyDataChanged } from '../hooks/useApi';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import type { Announcement } from '../types';

type Props = {
  open: boolean;
  announcement: Announcement | null;
  onClose: () => void;
  onSaved?: () => void;
};

type Priority = 'normal' | 'high' | 'critical';
type Category = 'service' | 'announcement';

export default function EditAnnouncementModal({ open, announcement, onClose, onSaved }: Props) {
  const { t } = useTranslation();

  const [titleAr, setTitleAr] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [bodyRu, setBodyRu] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [category, setCategory] = useState<Category>('announcement');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load fields when announcement changes
  useEffect(() => {
    if (announcement) {
      setTitleAr(announcement.title_ar);
      setTitleRu(announcement.title_ru ?? '');
      setTitleEn(announcement.title_en ?? '');
      setBodyAr(announcement.body_ar);
      setBodyRu(announcement.body_ru ?? '');
      setBodyEn(announcement.body_en ?? '');
      setPriority(announcement.priority);
      setCategory(announcement.category);
      setError(null);
    }
  }, [announcement]);

  if (!announcement) return null;

  const isSent = !!announcement.sent_at;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/announcements/admin/${announcement.id}`, {
        title_ar: titleAr,
        title_ru: titleRu.trim() || null,
        title_en: titleEn.trim() || null,
        body_ar: bodyAr,
        body_ru: bodyRu.trim() || null,
        body_en: bodyEn.trim() || null,
        priority,
        category,
      });
      notifyDataChanged();
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || t('error', 'Something went wrong');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t('edit', 'Edit')} — #${announcement.id}`}
      size="lg"
    >
      {/* Sent warning */}
      {isSent && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '10px 12px',
            background: 'var(--color-warning-soft)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-warning)',
            fontSize: 13,
            lineHeight: 1.5,
            marginBottom: 'var(--space-md)',
          }}
        >
          <AlertTriangle size={18} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {t(
              'edit_sent_warning',
              'This announcement was already sent. Changes will appear in the app inbox but cannot change the push notification already delivered.',
            )}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
        <Input
          label={t('ann_title_ar')}
          value={titleAr}
          onChange={(e) => setTitleAr(e.target.value)}
          dir="rtl"
          required
        />
        <Input
          label={t('ann_title_ru')}
          value={titleRu}
          onChange={(e) => setTitleRu(e.target.value)}
          dir="ltr"
        />
        <Input
          label={t('ann_title_en')}
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          dir="ltr"
        />

        <Textarea
          label={t('ann_body_ar')}
          value={bodyAr}
          onChange={(e) => setBodyAr(e.target.value)}
          dir="rtl"
          rows={5}
          required
        />
        <Textarea
          label={t('ann_body_ru')}
          value={bodyRu}
          onChange={(e) => setBodyRu(e.target.value)}
          dir="ltr"
          rows={3}
        />
        <Textarea
          label={t('ann_body_en')}
          value={bodyEn}
          onChange={(e) => setBodyEn(e.target.value)}
          dir="ltr"
          rows={3}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-md)',
          }}
        >
          <div>
            <label style={labelStyle}>{t('ann_priority')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              style={selectStyle}
            >
              <option value="normal">{t('priority_normal')}</option>
              <option value="high">{t('priority_high')}</option>
              <option value="critical">{t('priority_critical')}</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('ann_category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              style={selectStyle}
            >
              <option value="service">{t('category_service')}</option>
              <option value="announcement">{t('category_announcement')}</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 'var(--space-md)',
            padding: '10px 12px',
            background: 'var(--color-error-soft)',
            color: 'var(--color-error)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-lg)',
        }}
      >
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          leadingIcon={Save}
          onClick={handleSave}
          disabled={saving || !titleAr.trim() || !bodyAr.trim()}
          loading={saving}
        >
          {t('save', 'Save changes')}
        </Button>
      </div>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--color-ink)',
  letterSpacing: '0.2px',
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  padding: '8px 12px',
  background: 'var(--color-white)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-ink)',
  fontSize: 15,
  fontFamily: 'inherit',
  cursor: 'pointer',
};
