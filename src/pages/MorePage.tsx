import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { NidoCard, NidoSection } from '../components/nido';

const tiles = [
  { key: 'calendar', glyph: '📅', color: 'bg-nido-sky', path: '/calendar' },
  { key: 'houseBoard', glyph: '📌', color: 'bg-nido-butter', path: '/leaderboard' },
  { key: 'games', glyph: '🎲', color: 'bg-coral-soft', path: '/games' },
  { key: 'profile', glyph: '🦊', color: 'bg-[hsl(282_42%_86%)]', path: '/profile' },
  { key: 'notifications', glyph: '🔔', color: 'bg-card', path: '/profile' },
];

export default function MorePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, notifications, handleLogout } = useUser();
  const unread = notifications.filter((notification) => !notification.read).length;

  const houseRows = [
    {
      label: t('more.house.address'),
      sub: currentUser?.collectiveCode
        ? t('more.house.householdCode', { code: currentUser.collectiveCode })
        : t('more.house.household'),
      glyph: '🏡',
      action: () => navigate('/profile'),
    },
    {
      label: t('more.house.inviteRoommate'),
      sub: t('more.house.code', { code: currentUser?.collectiveCode ?? t('more.house.pending') }),
      glyph: '✉️',
      action: () => navigate('/profile'),
    },
    {
      label: t('more.house.houseRules'),
      sub: t('more.house.agreements', { count: 8 }),
      glyph: '📜',
      action: () => navigate('/leaderboard'),
    },
    {
      label: t('more.house.signOut'),
      sub: '',
      glyph: <LogOut className="h-5 w-5" />,
      action: async () => {
        await handleLogout();
        navigate('/login', { replace: true });
      },
      danger: true,
    },
  ];

  return (
    <div className="space-y-6">
      <section>
        <div className="nido-section-label mb-1">{t('more.eyebrow')}</div>
        <h1 className="nido-title text-[3.35rem] leading-none">
          {t('more.titlePrefix')} <em className="text-[var(--sky)]">{t('more.titleEmphasis')}</em> {t('more.titleSuffix')}
        </h1>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const sub =
            tile.key === 'notifications'
              ? t('more.tiles.notifications.sub', { count: unread })
              : tile.key === 'profile'
                ? t('more.tiles.profile.sub', { name: currentUser?.name ?? t('more.you') })
                : t(`more.tiles.${tile.key}.sub`);
          const label = t(`more.tiles.${tile.key}.label`);
          return (
            <button
              key={tile.key}
              onClick={() => navigate(tile.path)}
              className={`min-h-36 rounded-[1.65rem] border-[1.5px] border-primary p-5 text-left shadow-[4px_5px_0_var(--ink)] ${tile.color}`}
            >
              <div className="text-4xl leading-none">{tile.glyph}</div>
              <div className="mt-8 font-display text-3xl leading-none">{label}</div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">{sub}</div>
            </button>
          );
        })}
      </section>

      <section>
        <NidoSection label={t('more.house.title')} />
        <NidoCard className="p-0">
          {houseRows.map((row, index) => (
            <div key={row.label}>
              <button
                onClick={() => { void row.action(); }}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary bg-muted text-xl">
                  {row.glyph}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-lg font-semibold ${row.danger ? 'text-destructive' : ''}`}>
                    {row.label}
                  </span>
                  {row.sub && (
                    <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      {row.sub}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
              </button>
              {index < houseRows.length - 1 && <div className="nido-dots mx-5" />}
            </div>
          ))}
        </NidoCard>
      </section>
    </div>
  );
}
