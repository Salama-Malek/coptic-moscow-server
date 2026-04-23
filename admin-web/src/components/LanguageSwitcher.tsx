import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

const languages = [
  { code: 'ar', label: 'ع', full: 'العربية' },
  { code: 'ru', label: 'Ru', full: 'Русский' },
  { code: 'en', label: 'En', full: 'English' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: 'inline-flex',
        padding: 3,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-full)',
        gap: 2,
      }}
    >
      {languages.map((lang) => {
        const active = i18n.language === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            aria-pressed={active}
            title={lang.full}
            style={{
              minWidth: 36,
              padding: '6px 12px',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              background: active ? 'var(--color-primary)' : 'transparent',
              color: active ? 'var(--color-white)' : 'var(--color-ink-muted)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.02em',
              transition:
                'background var(--duration-micro) var(--easing-standard), color var(--duration-micro) var(--easing-standard)',
            }}
          >
            {lang.full}
          </button>
        );
      })}
    </div>
  );
}
