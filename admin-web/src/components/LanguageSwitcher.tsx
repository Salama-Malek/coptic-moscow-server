import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { colors } from '../theme/colors';

const languages = [
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          style={{
            padding: '4px 10px',
            border: `1px solid ${colors.gold}`,
            borderRadius: 4,
            background: i18n.language === lang.code ? colors.gold : 'transparent',
            color: i18n.language === lang.code ? colors.white : colors.gold,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
