import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

interface RRuleBuilderProps {
  value: string;
  onChange: (rrule: string) => void;
}

const presets = [
  { key: '', i18nKey: 'rrule_none' },
  { key: 'FREQ=DAILY', i18nKey: 'rrule_daily' },
  { key: 'FREQ=WEEKLY;BYDAY=SU', i18nKey: 'rrule_weekly' },
  { key: 'FREQ=MONTHLY', i18nKey: 'rrule_monthly' },
  { key: 'FREQ=YEARLY', i18nKey: 'rrule_yearly' },
];

const weekdays = [
  { code: 'SU', ar: 'الأحد', ru: 'Вс', en: 'Sun' },
  { code: 'MO', ar: 'الإثنين', ru: 'Пн', en: 'Mon' },
  { code: 'TU', ar: 'الثلاثاء', ru: 'Вт', en: 'Tue' },
  { code: 'WE', ar: 'الأربعاء', ru: 'Ср', en: 'Wed' },
  { code: 'TH', ar: 'الخميس', ru: 'Чт', en: 'Thu' },
  { code: 'FR', ar: 'الجمعة', ru: 'Пт', en: 'Fri' },
  { code: 'SA', ar: 'السبت', ru: 'Сб', en: 'Sat' },
];

export default function RRuleBuilder({ value, onChange }: RRuleBuilderProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'ar' | 'ru' | 'en';

  // Parse current selection
  const isWeekly = value.includes('FREQ=WEEKLY');
  const currentDay = isWeekly ? (value.match(/BYDAY=(\w+)/)?.[1] || 'SU') : '';

  // Determine which preset matches
  const matchedPreset = presets.find(p => value.startsWith(p.key.split(';')[0]) && p.key !== '') || presets[0];

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={matchedPreset.key.split(';')[0] || ''}
        onChange={(e) => {
          const freq = e.target.value;
          if (!freq) { onChange(''); return; }
          if (freq === 'FREQ=WEEKLY') {
            onChange(`FREQ=WEEKLY;BYDAY=SU`);
          } else {
            onChange(freq);
          }
        }}
        style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6 }}
      >
        {presets.map((p) => (
          <option key={p.key} value={p.key.split(';')[0]}>{t(p.i18nKey)}</option>
        ))}
      </select>

      {isWeekly && (
        <select
          value={currentDay}
          onChange={(e) => onChange(`FREQ=WEEKLY;BYDAY=${e.target.value}`)}
          style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6 }}
        >
          {weekdays.map((d) => (
            <option key={d.code} value={d.code}>{d[lang]}</option>
          ))}
        </select>
      )}
    </div>
  );
}
