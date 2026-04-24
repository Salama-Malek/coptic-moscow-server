import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Save,
  Eye,
  FileText,
  CalendarClock,
  AlertTriangle,
  Bell,
  Pencil,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import api from '../api/client';
import { useApiGet, notifyDataChanged } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import TemplateForm from '../components/TemplateForm';
import LivePreview from '../components/LivePreview';
import ConfirmModal from '../components/ConfirmModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Toast, type ToastKind } from '../components/ui/Toast';
import { getFonts } from '../theme/fonts';
import type { Template, Stats } from '../types';

type Priority = 'normal' | 'high' | 'critical';
type Category = 'service' | 'announcement';
type ScheduleMode = 'now' | 'schedule';

export default function NewAnnouncement() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const isMobile = useIsMobile();
  const { data: templates } = useApiGet<Template[]>('/admin/templates');
  const { data: stats } = useApiGet<Stats>('/admin/stats');

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});

  const [bodyAr, setBodyAr] = useState('');
  const [bodyRu, setBodyRu] = useState<string | null>(null);
  const [bodyEn, setBodyEn] = useState<string | null>(null);

  const [editedBodyAr, setEditedBodyAr] = useState('');
  const [editedBodyRu, setEditedBodyRu] = useState('');
  const [editedBodyEn, setEditedBodyEn] = useState('');
  const [manualEdit, setManualEdit] = useState(false);

  const [titleAr, setTitleAr] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [category, setCategory] = useState<Category>('announcement');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [scheduledFor, setScheduledFor] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (selectedTemplateId && templates) {
      const tmpl = templates.find((tt) => tt.id === selectedTemplateId);
      if (tmpl) {
        setSelectedTemplate(tmpl);
        const placeholders =
          typeof tmpl.placeholders === 'string'
            ? JSON.parse(tmpl.placeholders)
            : tmpl.placeholders;
        const defaults: Record<string, string | number | boolean> = {};
        for (const p of placeholders) {
          if (p.default !== undefined) defaults[p.key] = p.default;
        }
        setValues(defaults);
        setTitleAr(tmpl.name_ar);
        setTitleRu(tmpl.name_ru || '');
        setTitleEn(tmpl.name_en || '');
        setManualEdit(false);
      }
    } else {
      setSelectedTemplate(null);
      setValues({});
      setBodyAr('');
      setBodyRu(null);
      setBodyEn(null);
      setManualEdit(false);
    }
  }, [selectedTemplateId, templates]);

  const renderPreview = useCallback(async () => {
    if (!selectedTemplate || manualEdit) return;
    try {
      const res = await api.post(`/admin/templates/${selectedTemplate.id}/render`, { values });
      setBodyAr(res.data.body_ar || '');
      setBodyRu(res.data.body_ru);
      setBodyEn(res.data.body_en);
      setEditedBodyAr(res.data.body_ar || '');
      setEditedBodyRu(res.data.body_ru || '');
      setEditedBodyEn(res.data.body_en || '');
    } catch {
      /* silent */
    }
  }, [selectedTemplate, values, manualEdit]);

  useEffect(() => {
    const timer = setTimeout(renderPreview, 300);
    return () => clearTimeout(timer);
  }, [renderPreview]);

  const handleValueChange = (key: string, value: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSend = async (asDraft: boolean) => {
    setSending(true);
    setToast(null);
    try {
      const finalBodyAr = manualEdit ? editedBodyAr : bodyAr;
      const finalBodyRu = manualEdit ? editedBodyRu : bodyRu || '';
      const finalBodyEn = manualEdit ? editedBodyEn : bodyEn || '';

      await api.post('/announcements/admin', {
        title_ar: titleAr,
        title_ru: titleRu || undefined,
        title_en: titleEn || undefined,
        body_ar: finalBodyAr,
        body_ru: finalBodyRu || undefined,
        body_en: finalBodyEn || undefined,
        priority,
        category,
        status: asDraft ? 'draft' : undefined,
        scheduled_for:
          scheduleMode === 'schedule' && !asDraft ? scheduledFor : undefined,
        template_id: selectedTemplateId || undefined,
      });
      setToast({
        kind: 'success',
        message: asDraft ? t('ann_draft') : t('ann_sent'),
      });
      setShowConfirm(false);
      notifyDataChanged();
      if (!asDraft) {
        setSelectedTemplateId(null);
        setTitleAr('');
        setTitleRu('');
        setTitleEn('');
        setBodyAr('');
        setBodyRu(null);
        setBodyEn(null);
        setEditedBodyAr('');
        setEditedBodyRu('');
        setEditedBodyEn('');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Failed to send';
      setToast({ kind: 'error', message: msg });
    } finally {
      setSending(false);
    }
  };

  const placeholders = selectedTemplate
    ? typeof selectedTemplate.placeholders === 'string'
      ? JSON.parse(selectedTemplate.placeholders)
      : selectedTemplate.placeholders
    : [];

  const canSend = !!titleAr && (!!bodyAr || !!editedBodyAr);

  return (
    <div>
      {/* Page header */}
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
          {t('nav_new_announcement')}
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
      </div>

      {/* Single-column compose form (preview in modal) */}
      <div style={{ maxWidth: 840, marginInline: 'auto' }}>
        <Card padding="lg" elevation="sm">
          {/* Template picker */}
          <Section icon={FileText} label={t('choose_template')}>
            <NativeSelect
              value={selectedTemplateId || ''}
              onChange={(v) => setSelectedTemplateId(v ? Number(v) : null)}
            >
              <option value="">{t('no_template')}</option>
              {templates?.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {i18n.language === 'ru'
                    ? tmpl.name_ru || tmpl.name_ar
                    : i18n.language === 'en'
                    ? tmpl.name_en || tmpl.name_ar
                    : tmpl.name_ar}
                </option>
              ))}
            </NativeSelect>
          </Section>

          {/* Title fields */}
          <Section icon={Bell} label={t('ann_title_ar')} compact>
            <Input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              dir="rtl"
              required
            />
          </Section>

          <div
            style={{
              display: 'grid',
              gap: 'var(--space-md)',
              marginTop: 'var(--space-md)',
            }}
          >
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
          </div>

          {/* Template placeholders */}
          {selectedTemplate && placeholders.length > 0 && (
            <div
              style={{
                marginTop: 'var(--space-lg)',
                padding: 'var(--space-md)',
                background: 'var(--color-surface-hover)',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <TemplateForm
                placeholders={placeholders}
                values={values}
                onChange={handleValueChange}
              />
            </div>
          )}

          {/* Manual body */}
          {(!selectedTemplate || manualEdit) && (
            <div style={{ marginTop: 'var(--space-lg)', display: 'grid', gap: 'var(--space-md)' }}>
              <Textarea
                label={t('ann_body_ar')}
                value={editedBodyAr}
                onChange={(e) => setEditedBodyAr(e.target.value)}
                dir="rtl"
                rows={6}
                required
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 'var(--space-md)',
                }}
              >
                <Textarea
                  label={t('ann_body_ru')}
                  value={editedBodyRu}
                  onChange={(e) => setEditedBodyRu(e.target.value)}
                  dir="ltr"
                  rows={4}
                />
                <Textarea
                  label={t('ann_body_en')}
                  value={editedBodyEn}
                  onChange={(e) => setEditedBodyEn(e.target.value)}
                  dir="ltr"
                  rows={4}
                />
              </div>
            </div>
          )}

          {selectedTemplate && !manualEdit && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={Pencil}
                onClick={() => setManualEdit(true)}
              >
                {t('edit_rendered_manually', 'Edit rendered text manually')}
              </Button>
            </div>
          )}

          {/* Priority / category / schedule */}
          <div
            style={{
              marginTop: 'var(--space-xl)',
              paddingTop: 'var(--space-lg)',
              borderTop: '1px solid var(--color-border)',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
              gap: 'var(--space-md)',
            }}
          >
            <LabeledSelect
              label={t('ann_priority')}
              value={priority}
              onChange={(v) => setPriority(v as Priority)}
            >
              <option value="normal">{t('priority_normal')}</option>
              <option value="high">{t('priority_high')}</option>
              <option value="critical">{t('priority_critical')}</option>
            </LabeledSelect>

            <LabeledSelect
              label={t('ann_category')}
              value={category}
              onChange={(v) => setCategory(v as Category)}
            >
              <option value="service">{t('category_service')}</option>
              <option value="announcement">{t('category_announcement')}</option>
            </LabeledSelect>

            <LabeledSelect
              label={t('ann_schedule')}
              value={scheduleMode}
              onChange={(v) => setScheduleMode(v as ScheduleMode)}
              style={isMobile ? { gridColumn: '1 / -1' } : undefined}
            >
              <option value="now">{t('ann_send_now')}</option>
              <option value="schedule">{t('ann_schedule_for')}</option>
            </LabeledSelect>
          </div>

          {scheduleMode === 'schedule' && (
            <div
              style={{
                marginTop: 'var(--space-md)',
                padding: 'var(--space-md)',
                background: 'var(--color-warning-soft)',
                border: '1px solid var(--color-warning)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
              }}
            >
              <Clock size={18} strokeWidth={1.75} color="var(--color-warning)" />
              <div style={{ flex: 1 }}>
                <Input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  containerStyle={{ gap: 0 }}
                />
              </div>
            </div>
          )}

          {/* Critical priority warning */}
          {priority === 'critical' && (
            <div
              style={{
                marginTop: 'var(--space-md)',
                padding: 'var(--space-md)',
                background: 'var(--color-error-soft)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-sm)',
                color: 'var(--color-error)',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle size={18} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                {t(
                  'critical_warning',
                  'Critical announcements bypass Do Not Disturb and ring at full volume. Use sparingly.',
                )}
              </span>
            </div>
          )}

          {/* Actions — Preview separated on the left, Save/Send on the right */}
          <div
            style={{
              marginTop: 'var(--space-xl)',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 'var(--space-sm)',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
            }}
          >
            <Button
              variant="ghost"
              leadingIcon={Eye}
              onClick={() => setPreviewOpen(true)}
              fullWidth={isMobile}
            >
              {t('live_preview')}
            </Button>
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 'var(--space-sm)',
              }}
            >
              <Button
                variant="secondary"
                leadingIcon={Save}
                onClick={() => handleSend(true)}
                disabled={sending || !titleAr}
                loading={sending}
                fullWidth={isMobile}
              >
                {t('ann_save_draft')}
              </Button>
              <Button
                variant="primary"
                leadingIcon={scheduleMode === 'schedule' ? CalendarClock : Send}
                onClick={() => setShowConfirm(true)}
                disabled={sending || !canSend}
                fullWidth={isMobile}
              >
                {t('ann_preview_send')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Live preview modal */}
        <Modal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={t('live_preview')}
          size="md"
        >
          <LivePreview
            bodyAr={manualEdit ? editedBodyAr : bodyAr}
            bodyRu={manualEdit ? editedBodyRu : bodyRu}
            bodyEn={manualEdit ? editedBodyEn : bodyEn}
          />
        </Modal>
      </div>

      <ConfirmModal
        open={showConfirm}
        title={t('ann_confirm_send')}
        message={t('ann_confirm_message', { count: stats?.total_devices ?? 0 })}
        onConfirm={() => handleSend(false)}
        onCancel={() => setShowConfirm(false)}
        loading={sending}
      />

      {toast && (
        <Toast
          kind={toast.kind}
          message={toast.message}
          open={true}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

/* ============ Local helpers ============ */

function Section({
  icon: Icon,
  label,
  children,
  compact,
}: {
  icon?: LucideIcon;
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div style={{ marginBottom: compact ? 0 : 'var(--space-md)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
        }}
      >
        {Icon && <Icon size={14} strokeWidth={1.75} color="var(--color-ink-muted)" />}
        <label
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '0.2px',
          }}
        >
          {label}
        </label>
      </div>
      {children}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  children,
  style,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        minHeight: '40px',
        padding: '8px 12px',
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-ink)',
        fontSize: '15px',
        fontFamily: 'inherit',
        cursor: 'pointer',
        outline: 'none',
        transition: 'border-color var(--duration-micro) var(--easing-standard), box-shadow var(--duration-micro) var(--easing-standard)',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-gold)';
        e.currentTarget.style.boxShadow = 'var(--shadow-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </select>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  children,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <label
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-ink)',
          letterSpacing: '0.2px',
        }}
      >
        {label}
      </label>
      <NativeSelect value={value} onChange={onChange}>
        {children}
      </NativeSelect>
    </div>
  );
}
