import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';

export default function ChangePassword() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fonts = getFonts(i18n.language);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/admin/me/password', { current_password: currentPassword, new_password: newPassword });
      const stored = localStorage.getItem('admin_user');
      if (stored) {
        const admin = JSON.parse(stored);
        admin.must_change_password = false;
        localStorage.setItem('admin_user', JSON.stringify(admin));
      }
      navigate('/admin');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Failed to change password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: colors.parchment, fontFamily: fonts.body, padding: 16,
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 380, padding: '28px 24px', background: colors.white,
        border: `1px solid ${colors.gold}`, borderRadius: 12,
      }}>
        <h2 style={{ fontFamily: fonts.heading, color: colors.primary, textAlign: 'center', margin: '0 0 8px', fontSize: 18 }}>
          {t('change_password')}
        </h2>
        <p style={{ textAlign: 'center', color: colors.muted, fontSize: 13, margin: '0 0 24px' }}>
          {t('must_change_password')}
        </p>

        {error && (
          <div style={{ background: '#FFEBEE', color: colors.error, padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t('current_password')}</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            required dir="ltr" className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">{t('new_password')}</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            required minLength={8} dir="ltr" className="form-input" />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ marginTop: 6 }}>
          {loading ? t('loading') : t('save')}
        </button>
      </form>
    </div>
  );
}
