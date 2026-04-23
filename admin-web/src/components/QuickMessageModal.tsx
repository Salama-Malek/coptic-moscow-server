import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Textarea } from './ui/Input';
import type { Language } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

const LANG_TABS: Array<{ code: Language; label: string; dir: 'ltr' | 'rtl' }> = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

export default function QuickMessageModal({ open, onClose, onSent }: Props) {
  const { t } = useTranslation();
  const [activeLang, setActiveLang] = useState<Language>('ar');
  const [bodies, setBodies] = useState<Record<Language, string>>({ ar: '', ru: '', en: '' });
  const [highPriority, setHighPriority] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setBodies({ ar: '', ru: '', en: '' });
      setActiveLang('ar');
      setHighPriority(false);
      setError(null);
      setSending(false);
    }
  }, [open]);

  const setBody = (lang: Language, value: string) => {
    setBodies((prev) => ({ ...prev, [lang]: value }));
  };

  // AR is required by the backend schema. Use whatever's filled in falling back to each language.
  const resolvedBodyAr = bodies.ar || bodies.ru || bodies.en;
  const canSend = !!resolvedBodyAr.trim() && !sending;

  const deriveTitle = (body: string): string => {
    const cleaned = body.trim().replace(/\s+/g, ' ');
    if (cleaned.length <= 60) return cleaned;
    return cleaned.slice(0, 57) + '…';
  };

  const handleSend = async () => {
    if (!resolvedBodyAr.trim()) return;
    setSending(true);
    setError(null);
    try {
      // Ensure AR always has a body (backend schema requires it)
      const bodyAr = bodies.ar.trim() || bodies.ru.trim() || bodies.en.trim();
      const bodyRu = bodies.ru.trim() || undefined;
      const bodyEn = bodies.en.trim() || undefined;

      await api.post('/announcements/admin', {
        title_ar: deriveTitle(bodyAr),
        title_ru: bodyRu ? deriveTitle(bodyRu) : undefined,
        title_en: bodyEn ? deriveTitle(bodyEn) : undefined,
        body_ar: bodyAr,
        body_ru: bodyRu,
        body_en: bodyEn,
        priority: highPriority ? 'high' : 'normal',
        category: 'announcement',
      });

      onSent?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || t('error', 'Something went wrong');
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const tab = LANG_TABS.find((l) => l.code === activeLang)!;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('quick_message', 'Quick message')}
      size="md"
    >
      {/* Language tabs */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 4,
          padding: 3,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-full)',
          marginBottom: 'var(--space-md)',
        }}
      >
        {LANG_TABS.map((l) => {
          const active = l.code === activeLang;
          const filled = bodies[l.code].trim().length > 0;
          return (
            <button
              key={l.code}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveLang(l.code)}
              style={{
                flex: 1,
                position: 'relative',
                padding: '8px 12px',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                background: active ? 'var(--color-primary)' : 'transparent',
                color: active ? 'var(--color-white)' : 'var(--color-ink-muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background var(--duration-micro) var(--easing-standard)',
              }}
            >
              {l.label}
              {filled && !active && (
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--color-gold)',
                    marginInlineStart: 6,
                    verticalAlign: 'middle',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Body for active language */}
      <Textarea
        key={activeLang}
        value={bodies[activeLang]}
        onChange={(e) => setBody(activeLang, e.target.value)}
        dir={tab.dir}
        rows={5}
        placeholder={t(
          'quick_message_placeholder',
          'Type your message here — it will go out as a push notification and appear in the Inbox.',
        )}
        helper={
          !bodies.ar.trim() && (bodies.ru.trim() || bodies.en.trim())
            ? t(
                'quick_message_ar_fallback',
                'Note: the Arabic body will be copied from this message (AR is required).',
              )
            : undefined
        }
      />

      {/* Priority toggle */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 'var(--space-md)',
          padding: '10px 12px',
          background: highPriority ? 'var(--color-warning-soft)' : 'var(--color-surface)',
          border: `1px solid ${highPriority ? 'var(--color-warning)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'background var(--duration-micro) var(--easing-standard), border-color var(--duration-micro) var(--easing-standard)',
        }}
      >
        <input
          type="checkbox"
          checked={highPriority}
          onChange={(e) => setHighPriority(e.target.checked)}
          style={{
            width: 18,
            height: 18,
            accentColor: 'var(--color-warning)',
            cursor: 'pointer',
          }}
        />
        <AlertTriangle size={16} strokeWidth={1.75} color={highPriority ? 'var(--color-warning)' : 'var(--color-ink-muted)'} />
        <span style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500 }}>
          {t('quick_message_high_priority', 'Mark as high priority')}
        </span>
      </label>

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

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-lg)',
        }}
      >
        <Button variant="secondary" onClick={onClose} disabled={sending}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          leadingIcon={Send}
          onClick={handleSend}
          disabled={!canSend}
          loading={sending}
        >
          {t('send_now', 'Send now')}
        </Button>
      </div>
    </Modal>
  );
}
