import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckSquare, ShoppingCart, Wallet, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useCollectiveRealtime, useUser } from '../context/UserContext';
import { formatCurrency, formatDate, formatTime, translateKey } from '../i18n/helpers';
import type { DashboardResponse } from '../lib/types';
import {
  NidoAvatar,
  NidoButton,
  NidoCard,
  NidoChip,
  NidoDots,
  NidoEmpty,
  NidoPage,
  NidoProgress,
  NidoSection,
} from '../components/nido';

function DashboardSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      {[80, 180, 116, 116].map((height, index) => (
        <div key={index} className="nido-card animate-pulse bg-card" style={{ height }} />
      ))}
    </div>
  );
}

function RowCard({
  icon,
  title,
  meta,
  right,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  right?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="nido-card-flat w-full bg-card p-3 text-left shadow-[2px_2px_0_var(--ink)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary bg-muted">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{meta}</p>
        </div>
        {right}
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useUser();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    if (!currentUser) return;
    api.get<DashboardResponse>(`/dashboard?memberName=${encodeURIComponent(currentUser.name)}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentUser]);

  useCollectiveRealtime((event) => {
    if (event.type === 'TASK_UPDATED' || event.type === 'EXPENSE_CREATED' || event.type === 'EVENT_CREATED') {
      fetchDashboard();
    }
    if (event.type === 'MEMBER_ONLINE' || event.type === 'MEMBER_OFFLINE') {
      const count = (event.payload as { count?: number })?.count;
      if (count !== undefined) setOnlineCount(count);
    }
  }, !!currentUser);

  if (loading || !data) return <DashboardSkeleton />;

  const xpPerLevel = 200;
  const currentXpInLevel = data.currentUserXp % xpPerLevel;
  const nextTask = data.upcomingTasks[0];

  return (
    <NidoPage>
      <section>
        <div className="nido-section-label mb-1">{t('dashboard.welcomeBack')}</div>
        <h1 className="nido-title text-[2.75rem]">
          {t('dashboard.householdTitle')}{' '}
          <em className="text-secondary">{currentUser?.name}</em>
        </h1>
      </section>

      <NidoCard className="overflow-hidden p-0">
        <div className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground">
          House · {currentUser?.collectiveName ?? t('app.name')} · live
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <NidoAvatar name={currentUser?.name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-3xl leading-none">
                  {t('dashboard.level', { level: data.currentUserLevel })}
                </span>
                <NidoChip tone="coral">{t('dashboard.rank', { rank: data.currentUserRank })}</NidoChip>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                {currentXpInLevel} / {xpPerLevel} XP
              </p>
              <NidoProgress className="mt-3" value={currentXpInLevel} max={xpPerLevel} />
            </div>
          </div>

          <NidoDots className="my-4" />

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('dashboard.stats.tasksDone'), value: data.completedTasksCount.toString(), icon: CheckSquare },
              { label: t('dashboard.stats.balance'), value: formatCurrency(data.currentUserBalance), icon: Wallet },
              { label: t('dashboard.stats.xpEarned'), value: data.currentUserXp.toString(), icon: Zap },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-primary bg-muted p-3">
                <stat.icon className="mb-2 h-4 w-4 text-ink-3" aria-hidden="true" />
                <p className="font-display text-2xl leading-none">{stat.value}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </NidoCard>

      <div className="flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full bg-[hsl(137_48%_52%)] shadow-[0_0_0_5px_rgba(86,194,113,0.18)]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2">
          {t('common.live')} · {onlineCount > 0 ? t('dashboard.onlineRoommates', { count: onlineCount }) : t('common.connecting')}
        </p>
      </div>

      {nextTask && (
        <section>
          <NidoSection label={t('dashboard.upcomingTasks')} right={<button onClick={() => navigate('/tasks')}>{t('common.seeAll')}</button>} />
          <NidoCard tone="soft" className="relative overflow-hidden p-4">
            <CheckSquare className="absolute -right-4 -top-6 h-28 w-28 rotate-12 text-primary/10" aria-hidden="true" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary bg-card">
                <CheckSquare className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-3xl leading-tight">{nextTask.title}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <NidoChip>{nextTask.assignee}</NidoChip>
                  <NidoChip>{formatDate(nextTask.dueDate)}</NidoChip>
                  <NidoChip tone="ink">{t('dashboard.xpValue', { xp: nextTask.xp })}</NidoChip>
                </div>
              </div>
            </div>
          </NidoCard>
        </section>
      )}

      <section>
        <NidoSection label={t('dashboard.shoppingList')} right={<button onClick={() => navigate('/tasks?tab=shopping')}>{t('common.seeAll')}</button>} />
        <div className="space-y-2">
          {data.pendingShoppingItems.length === 0 && <NidoEmpty>{t('dashboard.noShoppingItems')}</NidoEmpty>}
          {data.pendingShoppingItems.slice(0, 3).map((item) => (
            <RowCard
              key={item.id}
              icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />}
              title={item.item}
              meta={t('dashboard.addedBy', { name: item.addedBy })}
              onClick={() => navigate('/tasks?tab=shopping')}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2">
        <section>
          <NidoSection label={t('dashboard.upcomingEvents')} />
          <div className="space-y-2">
            {data.upcomingEvents.length === 0 && <NidoEmpty>{t('dashboard.noUpcomingEvents')}</NidoEmpty>}
            {data.upcomingEvents.slice(0, 3).map((event) => (
              <RowCard
                key={event.id}
                icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
                title={event.title}
                meta={`${formatDate(event.date)} ${formatTime(event.time)}`}
                right={<NidoChip>{translateKey('common.eventTypes', event.type)}</NidoChip>}
                onClick={() => navigate('/calendar')}
              />
            ))}
          </div>
        </section>

        <section>
          <NidoSection label={t('dashboard.recentExpenses')} />
          <div className="space-y-2">
            {data.recentExpenses.length === 0 && <NidoEmpty>{t('dashboard.noRecentExpenses')}</NidoEmpty>}
            {data.recentExpenses.slice(0, 3).map((expense) => (
              <RowCard
                key={expense.id}
                icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
                title={expense.description}
                meta={`${t('dashboard.paidBy', { name: expense.paidBy })} · ${formatDate(expense.date)}`}
                right={<span className="font-display text-2xl">{formatCurrency(expense.amount)}</span>}
                onClick={() => navigate('/economy')}
              />
            ))}
          </div>
        </section>
      </div>

      <NidoButton className="w-full" variant="paper" onClick={() => navigate('/tasks')}>
        {t('common.seeAll')}
      </NidoButton>
    </NidoPage>
  );
}
