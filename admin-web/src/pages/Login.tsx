import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';
import { getFonts } from '../theme/fonts';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const fonts = getFonts(i18n.language);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const admin = await login(email, password);
      if (admin.must_change_password) {
        navigate('/admin/change-password');
      } else {
        navigate('/admin');
      }
    } catch {
      // error is set by useAuth
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.parchment, fontFamily: fonts.body, padding: 16,
      }}
    >
      <div style={{ position: 'absolute', top: 16, insetInlineEnd: 16 }}>
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%', maxWidth: 380, padding: '28px 24px', background: colors.white,
          border: `1px solid ${colors.gold}`, borderRadius: 12,
        }}
      >
        <h1 style={{ fontFamily: fonts.heading, color: colors.primary, textAlign: 'center', fontSize: 20, margin: '0 0 4px' }}>
          {t('app_title')}
        </h1>
        <p style={{ textAlign: 'center', color: colors.muted, fontSize: 13, margin: '0 0 24px' }}>
          {t('admin_panel')}
        </p>

        {error && (
          <div style={{ background: colors.errorSoft, color: colors.error, padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t('email')}</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required dir="ltr" className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('password')}</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required dir="ltr" className="form-input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ marginTop: 6 }}>
          {loading ? t('loading') : t('login')}
        </button>
      </form>
    </div>
  );
}
