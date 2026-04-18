import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: ConfirmModalProps) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: colors.white,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 440,
          marginBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: colors.primary, margin: '0 0 12px', fontSize: 17 }}>{title}</h3>
        <p style={{ color: colors.ink, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14, marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onConfirm} disabled={loading} className="btn btn-primary btn-block">
            {loading ? t('loading') : t('confirm')}
          </button>
          <button onClick={onCancel} className="btn btn-secondary btn-block">
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
