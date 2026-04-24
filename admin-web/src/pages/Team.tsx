import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiGet } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../api/client';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';

interface AdminRow {
  id: number;
  display_name: string;
  email: string;
  role: string;
  active: number;
  must_change_password: number;
  created_at: string;
}

export default function Team() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const isMobile = useIsMobile();
  const { data: admins, loading, refetch } = useApiGet<AdminRow[]>('/admin/team');

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'super_admin'>('admin');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await api.post('/admin/team', { display_name: newName, email: newEmail, role: newRole });
      setTempPassword(res.data.temp_password);
      setNewName(''); setNewEmail('');
      refetch();
    } catch { alert(t('error')); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (id: number, currentActive: number) => {
    try { await api.put(`/admin/team/${id}`, { active: currentActive ? 0 : 1 }); refetch(); }
    catch { alert(t('error')); }
  };

  const handleResetPassword = async (id: number) => {
    if (!confirm(t('confirm') + '?')) return;
    try { const res = await api.post(`/admin/team/${id}/reset-password`); setTempPassword(res.data.temp_password); }
    catch { alert(t('error')); }
  };

  if (loading) return <p style={{ padding: 20, color: colors.muted }}>{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ fontFamily: fonts.heading, margin: 0 }}>{t('nav_team')}</h1>
        <button onClick={() => { setShowAdd(true); setTempPassword(null); }} className="btn btn-primary">
          {t('team_add')}
        </button>
      </div>

      {/* Temp password banner */}
      {tempPassword && (
        <div style={{ background: colors.warningSoft, border: `1px solid ${colors.warning}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <strong>{t('team_temp_password')}:</strong>
          <code style={{ display: 'block', fontSize: 18, margin: '8px 0', padding: 10, background: colors.white, borderRadius: 6, direction: 'ltr', wordBreak: 'break-all' }}>
            {tempPassword}
          </code>
          <small style={{ color: colors.muted }}>{t('team_temp_password_note')}</small>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div style={{ background: colors.white, border: `1px solid ${colors.gold}`, borderRadius: 8, padding: isMobile ? 14 : 20, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{t('team_display_name')}</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('email')}</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} dir="ltr" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('team_role')}</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value as typeof newRole)} className="form-input">
              <option value="admin">{t('team_admin')}</option>
              <option value="super_admin">{t('team_super_admin')}</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            <button onClick={handleAdd} disabled={saving || !newName || !newEmail}
              className={`btn btn-primary ${isMobile ? 'btn-block' : ''}`}>
              {saving ? t('loading') : t('save')}
            </button>
            <button onClick={() => setShowAdd(false)}
              className={`btn btn-secondary ${isMobile ? 'btn-block' : ''}`}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Admin list */}
      <div className="mobile-card-list">
        {admins?.map((a) => (
          <div key={a.id} className="mobile-card" style={{ opacity: a.active ? 1 : 0.5 }}>
            <div style={{ fontWeight: 600, color: colors.primary, marginBottom: 4, fontSize: 15 }}>
              {a.display_name}
            </div>
            <div style={{ fontSize: 13, color: colors.muted, direction: 'ltr', marginBottom: 8 }}>{a.email}</div>
            <div className="mobile-card-row">
              <span className="mobile-card-label">{t('team_role')}</span>
              <span className="mobile-card-value">
                {a.role === 'super_admin' ? t('team_super_admin') : t('team_admin')}
              </span>
            </div>
            <div className="mobile-card-row">
              <span className="mobile-card-label">{t('team_active')}</span>
              <span className="mobile-card-value" style={{ color: a.active ? colors.success : colors.error }}>
                {a.active ? t('team_active') : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => handleToggleActive(a.id, a.active)} className="btn btn-secondary" style={{ flex: 1 }}>
                {a.active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handleResetPassword(a.id)} className="btn btn-secondary" style={{ flex: 1, borderColor: colors.warning, color: colors.warning }}>
                {t('team_reset_password')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
