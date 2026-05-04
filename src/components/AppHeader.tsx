import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Bell,
  Key,
  LogOut,
  Mail,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { api } from '../lib/api';
import { formatNotificationMessage, formatTime } from '../i18n/helpers';
import type { MemberStatus } from '../lib/types';
import LanguageSwitcher from './LanguageSwitcher';
import { NidoAvatar, NidoChip } from './nido';
import { cn } from './ui/utils';

function HeaderMenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium',
        danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

export default function AppHeader() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    currentUser,
    setCurrentUser,
    handleLogout,
    notifications,
    dismissNotification,
    clearAllNotifications,
    markAllNotificationsRead,
  } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStatusChange = async (status: MemberStatus) => {
    if (!currentUser) return;
    try {
      await api.patch('/members/status', {
        memberName: currentUser.name,
        status,
      });
      setCurrentUser({ ...currentUser, status });
    } catch {
      // Keep menu responsive even if the request fails.
    }
  };

  const doLogout = async () => {
    setShowMenu(false);
    await handleLogout();
    navigate('/login');
  };

  const handleLeaveCollective = async () => {
    if (!currentUser) return;
    setShowMenu(false);
    try {
      await api.patch(`/members/leave-collective?memberName=${encodeURIComponent(currentUser.name)}`);
      setCurrentUser({ ...currentUser, collectiveCode: '' });
      navigate('/create-household');
    } catch {
      // Existing behavior was silent on failure.
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+12px)] backdrop-blur-sm sm:px-5">
      <div className="mx-auto max-w-lg" ref={menuRef}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex min-w-0 items-center gap-2 text-left"
            aria-label={t('app.name')}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary bg-secondary shadow-[2px_2px_0_var(--ink)]">
              <img src="/favicon.png" alt="" className="h-6 w-6 rounded-full object-cover" />
            </span>
            <span className="font-display text-2xl italic leading-none">Kollekt</span>
            {currentUser?.collectiveName && (
              <span className="hidden max-w-40 truncate font-mono text-[10px] tracking-[0.08em] text-ink-3 min-[380px]:inline">
                {currentUser.collectiveName}
              </span>
            )}
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />

            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifs((v) => !v);
                    setShowMenu(false);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-primary bg-card shadow-[2px_2px_0_var(--ink)]"
                  aria-label={t('header.openNotifications')}
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-primary bg-secondary px-1 font-mono text-[9px] font-bold text-secondary-foreground">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifs && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -4 }}
                      className="nido-card absolute right-0 top-12 z-50 w-[19rem] p-3 shadow-xl"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="nido-section-label">{t('header.notifications')}</p>
                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em]">
                          {unreadCount > 0 && (
                            <button onClick={markAllNotificationsRead} className="text-secondary">
                              {t('header.markAllRead')}
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button onClick={clearAllNotifications} className="text-ink-3">
                              {t('header.clearAll')}
                            </button>
                          )}
                        </div>
                      </div>
                      {notifications.length === 0 && (
                        <p className="rounded-xl bg-muted p-4 text-center text-xs text-ink-3">
                          {t('header.allCaughtUp')}
                        </p>
                      )}
                      <div className="max-h-80 space-y-2 overflow-auto">
                        {notifications.slice(0, 6).map((n) => (
                          <div
                            key={n.id}
                            className={cn('group relative rounded-xl border border-primary/35 p-3 text-xs', n.read ? 'bg-muted' : 'bg-coral-soft')}
                          >
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-card opacity-0 group-hover:opacity-100"
                              aria-label={t('header.clearAll')}
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <p className="pr-7 leading-snug">
                              {formatNotificationMessage(n)}
                            </p>
                            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                              {formatTime(n.timestamp)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => {
                  setShowMenu((v) => !v);
                  setShowNotifs(false);
                }}
                className="rounded-full"
                aria-label={t('header.openAccountMenu')}
              >
                {currentUser ? <NidoAvatar name={currentUser.name} /> : <User className="h-5 w-5" />}
              </button>

              <AnimatePresence>
                {showMenu && currentUser && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    className="nido-card absolute right-0 top-12 z-50 w-64 p-2"
                  >
                    <div className="border-b border-primary/30 px-3 py-3">
                      <p className="font-semibold">{currentUser.name}</p>
                      <p className="truncate text-xs text-ink-3">{currentUser.email}</p>
                      <div className="mt-2 flex gap-1.5">
                        {(['ACTIVE', 'AWAY'] as MemberStatus[]).map((status) => (
                          <button key={status} onClick={() => handleStatusChange(status)}>
                            <NidoChip tone={currentUser.status === status ? 'ink' : 'paper'}>
                              {t(`common.memberStatus.${status}`)}
                            </NidoChip>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="py-1">
                      <HeaderMenuItem icon={User} label={t('header.profile')} onClick={() => { navigate('/profile'); setShowMenu(false); }} />
                      <HeaderMenuItem icon={Mail} label={t('header.inviteFriends')} onClick={() => { navigate('/profile'); setShowMenu(false); }} />
                      <HeaderMenuItem icon={Key} label={t('header.resetPassword')} onClick={() => { navigate('/profile'); setShowMenu(false); }} />
                      <HeaderMenuItem icon={ArrowRightLeft} label={t('header.switchCollective')} onClick={handleLeaveCollective} />
                    </div>
                    <div className="border-t border-primary/30 pt-1">
                      <HeaderMenuItem icon={LogOut} label={t('header.logOut')} onClick={doLogout} danger />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
