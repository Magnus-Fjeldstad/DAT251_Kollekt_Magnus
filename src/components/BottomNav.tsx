import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, MessageCircle, Wallet, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from './ui/utils';

const tabs = [
  { labelKey: 'bottomNav.home', icon: Home, path: '/', glyph: '🏠' },
  { labelKey: 'bottomNav.tasks', icon: CheckSquare, path: '/tasks' },
  { labelKey: 'bottomNav.economy', icon: Wallet, path: '/economy' },
  { labelKey: 'bottomNav.chat', icon: MessageCircle, path: '/chat' },
  { labelKey: 'bottomNav.more', icon: MoreHorizontal, path: '/more' },
];

const morePaths = ['/more', '/calendar', '/leaderboard', '/games', '/profile'];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-background via-background to-transparent px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-5">
      <div className="nido-card mx-auto flex h-16 max-w-lg items-center justify-between rounded-full bg-card p-1">
        {tabs.map((tab) => {
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : tab.path === '/more'
                ? morePaths.some((path) => location.pathname.startsWith(path))
                : location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3',
                isActive && 'bg-primary text-primary-foreground',
              )}
              aria-label={t(tab.labelKey)}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute -top-1 h-2 w-2 rounded-full border-[1.5px] border-primary bg-secondary"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              {tab.glyph ? (
                <span className="text-base leading-none" aria-hidden="true">{tab.glyph}</span>
              ) : (
                <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span className="max-w-full truncate">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
