import { useState } from 'react';
import { colors } from '../theme/colors';
import type { Language } from '../types';

interface LivePreviewProps {
  bodyAr: string;
  bodyRu: string | null;
  bodyEn: string | null;
}

const tabs: Array<{ lang: Language; label: string }> = [
  { lang: 'ar', label: 'العربية' },
  { lang: 'ru', label: 'Русский' },
  { lang: 'en', label: 'English' },
];

export default function LivePreview({ bodyAr, bodyRu, bodyEn }: LivePreviewProps) {
  const [activeLang, setActiveLang] = useState<Language>('ar');

  const body = activeLang === 'ru' ? (bodyRu || bodyAr)
    : activeLang === 'en' ? (bodyEn || bodyAr)
    : bodyAr;

  return (
    <div style={{ border: `1px solid ${colors.gold}`, borderRadius: 8, background: colors.white, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
        {tabs.map((tab) => (
          <button
            key={tab.lang}
            onClick={() => setActiveLang(tab.lang)}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 13,
              background: activeLang === tab.lang ? colors.parchment : colors.white,
              color: activeLang === tab.lang ? colors.primary : colors.muted,
              fontWeight: activeLang === tab.lang ? 600 : 400,
              borderBottom: activeLang === tab.lang ? `2px solid ${colors.gold}` : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
        style={{
          padding: 16, whiteSpace: 'pre-wrap', lineHeight: 1.8,
          fontFamily: activeLang === 'ar' ? "'Noto Naskh Arabic', serif" : "'Inter', sans-serif",
          fontSize: 14, color: colors.ink, minHeight: 120,
        }}
      >
        {body || '—'}
      </div>
    </div>
  );
}
