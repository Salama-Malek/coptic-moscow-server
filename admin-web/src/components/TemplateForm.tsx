import { useTranslation } from 'react-i18next';
import type { PlaceholderDef, Language } from '../types';
import { colors } from '../theme/colors';

interface TemplateFormProps {
  placeholders: PlaceholderDef[];
  values: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
}

export default function TemplateForm({ placeholders, values, onChange }: TemplateFormProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language as Language;

  const getLabel = (p: PlaceholderDef) => {
    if (lang === 'ru' && p.label_ru) return p.label_ru;
    if (lang === 'en' && p.label_en) return p.label_en;
    return p.label_ar;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {placeholders.map((p) => {
        const val = values[p.key] ?? p.default ?? '';

        if (p.type === 'boolean') {
          return (
            <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={!!val}
                onChange={(e) => onChange(p.key, e.target.checked)}
                style={{ width: 22, height: 22, accentColor: colors.primary }}
              />
              <span>{getLabel(p)}</span>
              {p.optional && <span style={{ color: colors.muted, fontSize: 11 }}>(optional)</span>}
            </label>
          );
        }

        const inputType = p.type === 'number' ? 'number'
          : p.type === 'date' ? 'date'
          : p.type === 'time' ? 'time'
          : p.type === 'datetime' ? 'datetime-local'
          : 'text';

        return (
          <div key={p.key} className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              {getLabel(p)}
              {p.optional && <span style={{ marginInlineStart: 4, fontSize: 11 }}>(optional)</span>}
            </label>
            <input
              type={inputType}
              value={String(val)}
              onChange={(e) => onChange(p.key, p.type === 'number' ? Number(e.target.value) : e.target.value)}
              className="form-input"
            />
          </div>
        );
      })}
    </div>
  );
}
