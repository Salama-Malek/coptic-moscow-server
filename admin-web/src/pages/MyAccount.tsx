import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';

export default function MyAccount() {
  const { t, i18n } = useTranslation();
  const fonts = getFonts(i18n.language);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const adminStr = localStorage.getItem('admin_user');
  const admin = adminStr ? JSON.parse(adminStr) : null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.post('/admin/me/password', { current_password: currentPassword, new_password: newPassword });
      setMessage(t('success'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || t('error');
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title" style={{ fontFamily: fonts.heading }}>{t('nav_my_account')}</h1>

      {admin && (
        <div className="mobile-card" style={{ marginBottom: 16 }}>
          <div className="mobile-card-row">
            <span className="mobile-card-label">{t('team_display_name')}</span>
            <span className="mobile-card-value">{admin.display_name}</span>
          </div>
          <div className="mobile-card-row">
            <span className="mobile-card-label">{t('email')}</span>
            <span className="mobile-card-value" style={{ direction: 'ltr' }}>{admin.email}</span>
          </div>
          <div className="mobile-card-row">
            <span className="mobile-card-label">{t('team_role')}</span>
            <span className="mobile-card-value">{admin.role}</span>
          </div>
        </div>
      )}

      <div className="mobile-card" style={{ maxWidth: 420 }}>
        <h3 style={{ color: colors.primary, margin: '0 0 16px', fontSize: 16 }}>{t('change_password')}</h3>

        {message && (
          <div style={{
            padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13,
            background: message === t('success') ? '#E8F5E9' : '#FFEBEE',
            color: message === t('success') ? colors.success : colors.error,
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">{t('current_password')}</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              required dir="ltr" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('new_password')}</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              required minLength={8} dir="ltr" className="form-input" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? t('loading') : t('save')}
          </button>
        </form>
      </div>
    </div>
  );
}
