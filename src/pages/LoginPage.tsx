import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { api, getUserMessage, setAccessToken, setRefreshToken } from '../lib/api';
import { useUser } from '../context/UserContext';
import type { AuthResponse, AppUser, Invitation } from '../lib/types';
import { NidoButton, NidoCard, NidoChip } from '../components/nido';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setCurrentUser } = useUser();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tryJoinFromInvitation = async (user: AppUser) => {
    if (user.collectiveCode) return user;

    const invites = await api.get<Invitation[]>(`/invitations?email=${encodeURIComponent(user.email)}`);
    const pending = invites.find((invite) => !invite.accepted);
    if (!pending) return user;

    const joined = await api.post<AppUser>('/onboarding/collectives/join', {
      userId: user.id,
      joinCode: pending.collectiveCode,
    });
    return joined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.post<AuthResponse>('/onboarding/login', { name: loginName, password });
        setAccessToken(res.accessToken);
        setRefreshToken(res.refreshToken);
        const userWithInvite = await tryJoinFromInvitation(res.user);
        setCurrentUser(userWithInvite);
        navigate(userWithInvite.collectiveCode ? '/' : '/create-household', { replace: true });

      } else if (mode === 'register') {
        const res = await api.post<AuthResponse>('/onboarding/users', { name, email, password });
        setAccessToken(res.accessToken);
        setRefreshToken(res.refreshToken);
        const userWithInvite = await tryJoinFromInvitation(res.user);
        setCurrentUser(userWithInvite);
        navigate(userWithInvite.collectiveCode ? '/' : '/create-household', { replace: true });

      }
    } catch (err: unknown) {
      setError(getUserMessage(err, t('errors.generic')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-lg flex-col">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-primary bg-[var(--sky)] shadow-[2px_2px_0_var(--ink)]">
              <img src="/favicon.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
            </span>
            <span className="font-display text-3xl italic leading-none">Kollekt</span>
          </div>
          <LanguageSwitcher />
        </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col justify-between gap-8"
      >
          <section>
            <NidoChip className="mb-4">01 / welcome</NidoChip>
            <h1 className="nido-title text-[3.7rem] leading-[0.95]">
              Coliving, made <em className="text-secondary">warm</em>.
            </h1>
            <p className="mt-4 text-base leading-6 text-ink-2">
              {t('app.tagline')}. Tasks, money, chat and house rhythm in one shared pocket.
            </p>
          </section>

          <div className="flex justify-center py-2">
            <div className="rotate-[-6deg] text-[9rem] leading-none drop-shadow-[4px_4px_0_var(--ink)]">
              🪺
            </div>
        </div>

          <section className="space-y-5">
            <div className="flex gap-1 rounded-full border-[1.5px] border-primary bg-card p-1 shadow-[3px_3px_0_var(--ink)]">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
                    className={`flex-1 rounded-full px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                mode === m ? 'bg-primary text-primary-foreground' : 'text-ink-3'
              }`}
            >
              {m === 'login' ? t('auth.loginTab') : t('auth.signUpTab')}
            </button>
          ))}
        </div>

            <NidoCard className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
            >
              {mode === 'register' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 shrink-0 text-ink-3" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('auth.fullName')}
                            className="w-full px-4 py-3 text-sm placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                </motion.div>
              )}

              {mode === 'login' ? (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 shrink-0 text-ink-3" />
                  <input
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder={t('auth.username')}
                        className="w-full px-4 py-3 text-sm placeholder:text-muted-foreground"
                    required
                  />
                </div>
              ) : (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 shrink-0 text-ink-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailAddress')}
                        className="w-full px-4 py-3 text-sm placeholder:text-muted-foreground"
                    required
                  />
                </div>
              )}

                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 shrink-0 text-ink-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password')}
                      className="w-full px-4 py-3 text-sm placeholder:text-muted-foreground"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary bg-muted"
                >
                  {showPassword
                        ? <EyeOff className="h-4 w-4 text-ink-3" />
                        : <Eye className="h-4 w-4 text-ink-3" />}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {error && (
                  <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-xs text-destructive">{error}</p>
          )}

                <NidoButton
            type="submit"
            disabled={loading}
                  className="w-full"
          >
            {loading ? t('auth.pleaseWait') : (
              <>
                {mode === 'login' ? t('auth.logIn') : t('auth.createAccount')}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
                </NidoButton>
              </form>
            </NidoCard>

            <p className="px-4 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {t('auth.inviteHint')}
        </p>
          </section>
      </motion.div>
      </div>
    </div>
  );
}
