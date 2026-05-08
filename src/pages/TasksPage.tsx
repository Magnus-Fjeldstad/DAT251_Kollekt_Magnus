import {
  useEffect,
  useState,
  useRef,
  Fragment,
  type ChangeEvent,
  type SetStateAction,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Circle,
  Plus,
  Package,
  X,
  ShoppingCart,
  Edit3,
  Trash2,
  MessageSquare,
  Clock,
  RotateCcw,
  Zap,
  Image,
  EyeOff,
} from 'lucide-react';
import { api } from '../lib/api';
import { useCollectiveRealtime, useUser } from '../context/UserContext';
import { formatDate, formatDateTime, translateKey } from '../i18n/helpers';
import type { Task, ShoppingItem, TaskCategory } from '../lib/types';
import { NidoButton, NidoCard, NidoChip, NidoSection } from '../components/nido';
import { cn } from '../components/ui/utils';

const CATEGORIES: TaskCategory[] = ['CLEANING', 'VACUUMING', 'MOPPING', 'BATHROOM', 'KITCHEN', 'LAUNDRY', 'DISHES', 'TRASH', 'DUSTING', 'WINDOWS', 'OTHER'];
const RECURRENCE_OPTIONS = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
const TASK_FILTERS = ['ALL', 'MINE', 'OPEN', 'DONE'] as const;

type TaskFilter = (typeof TASK_FILTERS)[number];

const categoryGlyph: Record<TaskCategory, string> = {
  CLEANING: '🧽',
  VACUUMING: '🧹',
  MOPPING: '🪣',
  BATHROOM: '🛁',
  KITCHEN: '🍳',
  LAUNDRY: '🧺',
  DISHES: '🍽️',
  TRASH: '🗑️',
  DUSTING: '🪶',
  WINDOWS: '🪟',
  SHOPPING: '🛒',
  OTHER: '✨',
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compactDueLabel(dueDate: string, todayLabel: string, tomorrowLabel: string) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (dueDate === dateInputValue(today)) return todayLabel;
  if (dueDate === dateInputValue(tomorrow)) return tomorrowLabel;

  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
  });
}

function weekStrip() {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay() || 7;
  monday.setDate(today.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: dateInputValue(date),
      isoDate: dateInputValue(date),
      day: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1),
      date: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

function TaskEditor({
  title,
  newTitle,
  setNewTitle,
  newAssignee,
  setNewAssignee,
  members,
  name,
  newDue,
  setNewDue,
  newCategory,
  setNewCategory,
  newRecurrence,
  setNewRecurrence,
  newXp,
  setNewXp,
  onClose,
  onSave,
  saveLabel,
}: {
  title: string;
  newTitle: string;
  setNewTitle: (value: string) => void;
  newAssignee: string;
  setNewAssignee: (value: string) => void;
  members: string[];
  name: string;
  newDue: string;
  setNewDue: (value: string) => void;
  newCategory: TaskCategory;
  setNewCategory: (value: TaskCategory) => void;
  newRecurrence: string;
  setNewRecurrence: (value: string) => void;
  newXp: string;
  setNewXp: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <button onClick={onClose} aria-label={t('common.back')}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <input
        value={newTitle}
        onChange={(event) => setNewTitle(event.target.value)}
        placeholder={t('tasks.taskTitlePlaceholder')}
        className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        onKeyDown={(event) => event.key === 'Enter' && onSave()}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={newAssignee}
          onChange={(event) => setNewAssignee(event.target.value)}
          className="bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
        >
          {(members.length > 0 ? members : [name]).map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={newDue}
          onChange={(event) => setNewDue(event.target.value)}
          className="bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value as TaskCategory)}
          className="bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {translateKey('common.taskCategories', category)}
            </option>
          ))}
        </select>
        <select
          value={newRecurrence}
          onChange={(event) => setNewRecurrence(event.target.value)}
          className="bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
        >
          {RECURRENCE_OPTIONS.map((recurrence) => (
            <option key={recurrence} value={recurrence}>
              {translateKey('common.recurrence', recurrence)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <input
          type="number"
          value={newXp}
          onChange={(event) => setNewXp(event.target.value)}
          className="w-20 bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
        />
        <span className="text-xs text-muted-foreground">{t('tasks.xpReward')}</span>
      </div>
      <button
        onClick={onSave}
        className="w-full gradient-primary rounded-lg py-2 text-sm font-semibold text-primary-foreground"
      >
        {saveLabel}
      </button>
    </div>
  );
}

function TasksMain() {
  const { t } = useTranslation();
  const { currentUser } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('ALL');
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'tasks' | 'shopping'>(
    searchParams.get('tab') === 'shopping' ? 'shopping' : 'tasks',
  );
  const [showAdd, setShowAdd] = useState(false);
  const [showShoppingAdd, setShowShoppingAdd] = useState(false);
  const [newShoppingName, setNewShoppingName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('CLEANING');
  const [newXp, setNewXp] = useState('10');
  const [newRecurrence, setNewRecurrence] = useState('NONE');
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);
  const [feedbackImage, setFeedbackImage] = useState<{
    data: string;
    mimeType: string;
  } | null>(null);
  const feedbackImageRef = useRef<HTMLInputElement>(null);
  const [editingShopId, setEditingShopId] = useState<number | null>(null);
  const [editShopText, setEditShopText] = useState('');
  const [buyingShopId, setBuyingShopId] = useState<number | null>(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [buyPaidBy, setBuyPaidBy] = useState('');
  const [buyParticipants, setBuyParticipants] = useState<string[]>([]);
  const [buyDate, setBuyDate] = useState('');
  const [buyDeadline, setBuyDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(new Set());
  const pendingTaskIdsRef = useRef<Set<number>>(new Set());
  const tasksRef = useRef<Task[]>([]);
  const fetchRequestIdRef = useRef(0);
  const taskOverridesRef = useRef<Map<number, Task>>(new Map());

  const name = currentUser?.name ?? '';
  const memberOptions = members.length > 0 ? members : [name];

  const setTasksState = (updater: SetStateAction<Task[]>) => {
    setTasks((prev) => {
      const next =
        typeof updater === 'function'
          ? (updater as (previous: Task[]) => Task[])(prev)
          : updater;
      tasksRef.current = next;
      return next;
    });
  };

  const taskMatchesOverride = (serverTask: Task, localTask: Task) =>
    serverTask.completed === localTask.completed &&
    serverTask.penaltyXp === localTask.penaltyXp &&
    serverTask.xp === localTask.xp &&
    serverTask.title === localTask.title &&
    serverTask.assignee === localTask.assignee &&
    serverTask.dueDate === localTask.dueDate &&
    serverTask.category === localTask.category &&
    serverTask.recurrenceRule === localTask.recurrenceRule;

  const setTaskOverride = (task: Task) => {
    taskOverridesRef.current.set(task.id, task);
  };

  const clearTaskOverride = (taskId: number) => {
    taskOverridesRef.current.delete(taskId);
  };

  const mergeFetchedTasks = (nextTasks: Task[]) => {
    const localTasksById = new Map(tasksRef.current.map((task) => [task.id, task]));

    return nextTasks.map((task) => {
      if (pendingTaskIdsRef.current.has(task.id)) {
        return localTasksById.get(task.id) ?? task;
      }

      const overriddenTask = taskOverridesRef.current.get(task.id);
      if (!overriddenTask) return task;

      if (taskMatchesOverride(task, overriddenTask)) {
        clearTaskOverride(task.id);
        return task;
      }

      return overriddenTask;
    });
  };

  const sortTasks = (nextTasks: Task[]) =>
    [...nextTasks].sort((firstTask, secondTask) => {
      const dueDateOrder = firstTask.dueDate.localeCompare(secondTask.dueDate);
      if (dueDateOrder !== 0) return dueDateOrder;
      return firstTask.id - secondTask.id;
    });

  const upsertTask = (nextTask: Task) => {
    setTasksState((prev) => {
      const existingIndex = prev.findIndex((task) => task.id === nextTask.id);
      if (existingIndex === -1) return sortTasks([...prev, nextTask]);

      const next = [...prev];
      next[existingIndex] = nextTask;
      return sortTasks(next);
    });
  };

  const extractTaskFromRealtimeEvent = (event: { type: string; payload?: unknown }): Task | null => {
    if (event.type === 'TASK_UPDATED') {
      const payload = event.payload as
        | { task?: Task; updatedBy?: string }
        | Task
        | undefined;

      if (payload && typeof payload === 'object' && 'task' in payload && payload.task) {
        return payload.task;
      }

      return (payload as Task | undefined) ?? null;
    }

    return (event.payload as Task | undefined) ?? null;
  };

  const fetchAll = async () => {
    if (!name) return;
    const requestId = ++fetchRequestIdRef.current;
    const [taskRes, shopRes] = await Promise.all([
      api.get<Task[]>(`/tasks?memberName=${encodeURIComponent(name)}`),
      api.get<ShoppingItem[]>(`/tasks/shopping?memberName=${encodeURIComponent(name)}`),
    ]);
    if (requestId !== fetchRequestIdRef.current) return;
    setTasksState(mergeFetchedTasks(taskRes));
    setShopping(shopRes);
    setLoading(false);
  };

  useEffect(() => {
    if (!name) return;
    void fetchAll();
    api.get<{ name: string }[]>(`/members/collective?memberName=${encodeURIComponent(name)}`)
      .then((response) => setMembers(response.map((member) => member.name)))
      .catch(() => {});
  }, [name]);

  useCollectiveRealtime((event) => {
    if (event.type === 'TASK_UPDATED') {
      const payload = event.payload as
        | { updatedBy?: string; task?: Task }
        | undefined;
      if (payload?.updatedBy === name) return;
    }

    if (event.type === 'TASK_UPDATED' || event.type === 'TASK_CREATED') {
      const nextTask = extractTaskFromRealtimeEvent(event);
      if (nextTask) upsertTask(nextTask);
      return;
    }

    if (event.type === 'TASK_DELETED') {
      const payload = event.payload as { id?: number } | undefined;
      if (payload?.id !== undefined) {
        setTasksState((prev) => prev.filter((task) => task.id !== payload.id));
      }
      return;
    }

    if (
      [
        'SHOPPING_UPDATED',
        'SHOPPING_ITEM_CREATED',
        'SHOPPING_ITEM_TOGGLED',
        'SHOPPING_ITEM_DELETED',
        'SHOPPING_ITEM_UPDATED',
        'SHOPPING_ITEM_BOUGHT',
      ].includes(event.type)
    ) {
      void fetchAll();
    }
  }, !!name);

  const handleShoppingAdd = async () => {
    if (!newShoppingName.trim()) return;
    const created = await api.post<ShoppingItem>('/tasks/shopping', {
      item: newShoppingName,
      addedBy: name,
    });
    setShopping((prev) => [...prev, created]);
    setNewShoppingName('');
    setShowShoppingAdd(false);
  };

  const updateTaskInPlace = (taskId: number, nextTask: Task) => {
    setTasksState((prev) => prev.map((task) => (task.id === taskId ? nextTask : task)));
  };

  const patchTaskInPlace = (taskId: number, patch: Partial<Task>) => {
    setTasksState((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    );
  };

  const runTaskMutation = async (
    task: Task,
    optimisticPatch: Partial<Task>,
    request: () => Promise<Task>,
  ) => {
    if (pendingTaskIdsRef.current.has(task.id)) return;

    pendingTaskIdsRef.current.add(task.id);
    setPendingTaskIds((prev) => new Set(prev).add(task.id));
    patchTaskInPlace(task.id, optimisticPatch);

    try {
      const updatedTask = await request();
      setTaskOverride(updatedTask);
      updateTaskInPlace(task.id, updatedTask);
    } catch (error) {
      clearTaskOverride(task.id);
      updateTaskInPlace(task.id, task);
      console.error(error);
    } finally {
      pendingTaskIdsRef.current.delete(task.id);
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const toggleTask = async (task: Task) => {
    await runTaskMutation(
      task,
      { completed: !task.completed },
      () => api.patch<Task>(`/tasks/${task.id}/toggle?memberName=${encodeURIComponent(name)}`),
    );
  };

  const isOverdueTask = (task: Task) => {
    const today = new Date().toISOString().split('T')[0];
    return !task.completed && task.dueDate < today;
  };

  const handlePrimaryToggle = async (task: Task) => {
    if (task.completed) {
      await toggleTask(task);
      return;
    }

    if (isOverdueTask(task)) {
      if ((task.penaltyXp ?? 0) < 0) {
        await completeMissedTask(task);
      } else {
        await markLate(task);
      }
      return;
    }

    await toggleTask(task);
  };

  const markLate = async (task: Task) => {
    await runTaskMutation(
      task,
      { completed: true },
      () => api.post<Task>(`/tasks/${task.id}/regret?memberName=${encodeURIComponent(name)}`, {}),
    );
  };

  const completeMissedTask = async (task: Task) => {
    await runTaskMutation(
      task,
      { completed: true },
      () =>
        api.post<Task>(
          `/tasks/${task.id}/regret-missed?memberName=${encodeURIComponent(name)}`,
          {},
        ),
    );
  };

  const deleteTask = async (taskId: number) => {
    await api.delete(`/tasks/${taskId}?memberName=${encodeURIComponent(name)}`);
    setTasksState((prev) => prev.filter((task) => task.id !== taskId));
  };

  const startEdit = (task: Task) => {
    setShowAdd(false);
    setEditingId(task.id);
    setNewTitle(task.title);
    setNewAssignee(task.assignee);
    setNewDue(task.dueDate);
    setNewCategory(task.category);
    setNewXp(task.xp.toString());
    setNewRecurrence(task.recurrenceRule ?? 'NONE');
  };

  const resetForm = () => {
    setNewTitle('');
    setNewAssignee(name);
    setNewDue('');
    setNewCategory('CLEANING');
    setNewXp('10');
    setNewRecurrence('NONE');
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!newTitle.trim()) return;
    const body = {
      title: newTitle,
      assignee: newAssignee || name,
      dueDate: newDue || new Date().toISOString().split('T')[0],
      category: newCategory,
      xp: parseInt(newXp, 10) || 10,
      recurrenceRule: newRecurrence === 'NONE' ? null : newRecurrence,
    };

    if (editingId) {
      await api.patch(`/tasks/${editingId}?memberName=${encodeURIComponent(name)}`, body);
      setTasksState((prev) =>
        prev.map((task) => (task.id === editingId ? { ...task, ...body } : task)),
      );
    } else {
      const created = await api.post<Task>('/tasks', body);
      setTasksState((prev) => [...prev, created]);
    }

    resetForm();
  };

  const handleFeedbackImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFeedbackImage({
        data: (reader.result as string).split(',')[1],
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const resetFeedbackComposer = () => {
    setCommentText('');
    setFeedbackAnonymous(false);
    setFeedbackImage(null);
    if (feedbackImageRef.current) feedbackImageRef.current.value = '';
  };

  const removeFeedbackImage = () => {
    setFeedbackImage(null);
    if (feedbackImageRef.current) feedbackImageRef.current.value = '';
  };

  const addFeedback = async (taskId: number) => {
    if (!commentText.trim()) return;
    await api.patch(`/tasks/${taskId}/feedback?memberName=${encodeURIComponent(name)}`, {
      message: commentText,
      anonymous: feedbackAnonymous,
      imageData: feedbackImage?.data ?? null,
      imageMimeType: feedbackImage?.mimeType ?? null,
    });
    resetFeedbackComposer();
    setCommentingId(null);
    await fetchAll();
  };

  const deleteShopItem = async (itemId: number) => {
    await api.delete(`/tasks/shopping/${itemId}?memberName=${encodeURIComponent(name)}`);
    setShopping((prev) => prev.filter((item) => item.id !== itemId));
  };

  const toggleShopItem = async (itemId: number) => {
    await api.patch(`/tasks/shopping/${itemId}/toggle?memberName=${encodeURIComponent(name)}`);
    setShopping((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const openBuyForm = (item: ShoppingItem) => {
    setEditingShopId(null);
    setBuyingShopId(item.id);
    setBuyAmount('');
    setBuyPaidBy(name);
    setBuyParticipants(memberOptions);
    setBuyDate(new Date().toISOString().split('T')[0]);
    setBuyDeadline('');
  };

  const toggleBuyParticipant = (member: string) => {
    setBuyParticipants((prev) =>
      prev.includes(member)
        ? prev.filter((value) => value !== member)
        : [...prev, member],
    );
  };

  const submitBought = async (itemId: number) => {
    const amount = parseInt(buyAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0 || buyParticipants.length === 0) return;
    await api.post(
      `/tasks/shopping/${itemId}/bought?memberName=${encodeURIComponent(name)}`,
      {
        amount,
        paidBy: buyPaidBy || name,
        participantNames: buyParticipants,
        date: buyDate,
        ...(buyDeadline ? { deadlineDate: buyDeadline } : {}),
      },
    );
    setBuyDeadline('');
    setBuyingShopId(null);
    await fetchAll();
  };

  const startEditShop = (item: ShoppingItem) => {
    setBuyingShopId(null);
    setEditingShopId(item.id);
    setEditShopText(item.item);
  };

  const saveEditShop = async (itemId: number) => {
    if (!editShopText.trim()) return;
    const updated = await api.patch<ShoppingItem>(
      `/tasks/shopping/${itemId}?memberName=${encodeURIComponent(name)}`,
      { item: editShopText },
    );
    setShopping((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
    setEditingShopId(null);
    setEditShopText('');
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === 'DONE') return task.completed;
      if (filter === 'MINE') return task.assignee === name && !task.completed;
      if (filter === 'OPEN') return !task.completed;
      return !task.completed;
    })
    .sort((firstTask, secondTask) => {
      const dueDateOrder = firstTask.dueDate.localeCompare(secondTask.dueDate);
      if (dueDateOrder !== 0) return dueDateOrder;
      return firstTask.id - secondTask.id;
    });

  const filterCounts: Record<TaskFilter, number> = {
    ALL: tasks.filter((task) => !task.completed).length,
    MINE: tasks.filter((task) => task.assignee === name && !task.completed).length,
    OPEN: tasks.filter((task) => !task.completed).length,
    DONE: tasks.filter((task) => task.completed).length,
  };
  const weekDays = weekStrip();
  const weekDates = new Set(weekDays.map((day) => day.isoDate));
  const weekTasks = tasks.filter((task) => weekDates.has(task.dueDate));
  const weekCompletedTasks = weekTasks.filter((task) => task.completed);
  const completedDueDates = new Set(weekCompletedTasks.map((task) => task.dueDate));

  if (loading) {
    return (
      <div className="space-y-3 pt-4 animate-pulse">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="glass rounded-xl h-14" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="nido-section-label mb-1">What needs doing</div>
          <h1 className="nido-title text-[3.25rem] leading-none">
            The <em className="text-[var(--sky)]">chore</em> board
          </h1>
        </div>
        <button
          onClick={() => {
            if (tab === 'tasks') { resetForm(); setShowAdd(true); }
            else { setShowShoppingAdd(true); }
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary bg-[var(--sky)] shadow-[3px_3px_0_var(--ink)]"
          aria-label={tab === 'tasks' ? t('tasks.addTask') : t('tasks.addSupply')}
        >
          <Plus className="h-6 w-6 text-primary-foreground" />
        </button>
      </div>

      <div className="flex gap-1 rounded-full border-[1.5px] border-primary bg-card p-1">
        {(['tasks', 'shopping'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-full px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
              tab === value
                ? 'bg-primary text-primary-foreground'
                : 'text-ink-3'
            }`}
          >
            {t(`tasks.tabs.${value}`)}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showShoppingAdd && tab === 'shopping' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t('tasks.addSupply')}</p>
                <button onClick={() => setShowShoppingAdd(false)} aria-label={t('common.back')}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <input
                value={newShoppingName}
                onChange={(e) => setNewShoppingName(e.target.value)}
                placeholder={t('tasks.supplyNamePlaceholder')}
                className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && void handleShoppingAdd()}
                autoFocus
              />
              <button
                onClick={() => void handleShoppingAdd()}
                className="w-full gradient-primary rounded-lg py-2 text-sm font-semibold text-primary-foreground"
              >
                {t('tasks.addSupply')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tab === 'tasks' ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TASK_FILTERS.map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-full border-[1.5px] border-primary px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                  value === filter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-primary'
                }`}
              >
                {t(`tasks.filters.${value}`, { defaultValue: value.toLowerCase() })}
                <span className="ml-2 opacity-60">{filterCounts[value]}</span>
              </button>
            ))}
          </div>

          <section>
            <NidoSection label="This week" right={`${weekCompletedTasks.length} of ${weekTasks.length} done`} />
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((day) => {
                const isDone = completedDueDates.has(day.isoDate);
                return (
                  <div
                    key={day.key}
                    className={cn(
                      'relative flex aspect-square flex-col items-center justify-center rounded-xl border-[1.5px] border-primary bg-transparent',
                      isDone && 'bg-coral-soft',
                      day.isToday && 'border-[var(--sky)]',
                    )}
                  >
                    {day.isToday && <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-[1.5px] border-primary bg-[var(--sky)]" />}
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">{day.day}</span>
                    <span className="font-display text-2xl leading-none">{day.date}</span>
                    {isDone && <span className="absolute bottom-1 text-[10px]">✓</span>}
                  </div>
                );
              })}
            </div>
          </section>

          <AnimatePresence>
            {showAdd && !editingId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <TaskEditor
                  title={t('tasks.newTask')}
                  newTitle={newTitle}
                  setNewTitle={setNewTitle}
                  newAssignee={newAssignee}
                  setNewAssignee={setNewAssignee}
                  members={members}
                  name={name}
                  newDue={newDue}
                  setNewDue={setNewDue}
                  newCategory={newCategory}
                  setNewCategory={setNewCategory}
                  newRecurrence={newRecurrence}
                  setNewRecurrence={setNewRecurrence}
                  newXp={newXp}
                  setNewXp={setNewXp}
                  onClose={resetForm}
                  onSave={handleSave}
                  saveLabel={t('tasks.addTask')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <section>
            <NidoSection label={`${filteredTasks.length} tasks`} />
            <div className="space-y-3">
            {filteredTasks.map((task, index) => {
              const isOverdue = isOverdueTask(task);
              const isPenalized = (task.penaltyXp ?? 0) < 0;
              const taskIsPending = pendingTaskIds.has(task.id);
              const dueLabel = compactDueLabel(
                task.dueDate,
                t('tasks.due.today'),
                t('tasks.due.tomorrow'),
              );
              const formattedDueDate = formatDate(task.dueDate, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <Fragment key={task.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={cn(
                      'rounded-[1.65rem] border-[1.5px] border-primary bg-card p-4 shadow-[3px_4px_0_var(--ink)]',
                      task.completed && 'bg-muted opacity-70 shadow-none',
                    )}
                  >
                    <div
                      className="flex cursor-pointer items-center gap-4"
                      onClick={() => {
                        if (taskIsPending) return;
                        void handlePrimaryToggle(task);
                      }}
                    >
                      {task.completed ? (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary bg-[var(--sky)] text-xl text-primary-foreground">
                          ✓
                        </span>
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-full border-[1.5px] border-primary bg-transparent" />
                      )}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary bg-muted text-xl">
                        {categoryGlyph[task.category]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-lg font-semibold leading-tight ${task.completed ? 'line-through text-ink-3' : ''}`}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] text-secondary-foreground">
                            {(task.assignee[0] ?? '?').toUpperCase()}
                          </span>
                          <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                            {task.assignee} · {translateKey('common.taskCategories', task.category)}
                          </span>
                        </div>
                      </div>
                      <NidoChip className="border-[var(--sky)] text-[var(--sky)]">+{task.xp}XP</NidoChip>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1 pl-16">
                      <NidoChip className={cn(isOverdue && 'border-destructive text-destructive')}>
                        <Clock className="h-3 w-3" />
                        {t('tasks.due.label')}: {dueLabel} · {formattedDueDate}
                      </NidoChip>
                      {task.recurrenceRule && task.recurrenceRule !== 'NONE' && (
                        <NidoChip>
                          <RotateCcw className="h-3 w-3" />
                          {translateKey('common.recurrence', task.recurrenceRule)}
                        </NidoChip>
                      )}
                      {isOverdue && <NidoChip className="border-destructive text-destructive">{t('tasks.overdue')}</NidoChip>}
                      {isPenalized && <NidoChip tone="coral">{t('tasks.penaltyApplied')}</NidoChip>}
                      {!task.completed && isOverdue && !isPenalized && (
                        <button
                          onClick={() => {
                            void markLate(task);
                          }}
                          disabled={taskIsPending}
                          className="nido-chip disabled:opacity-60"
                        >
                          <Clock className="h-3 w-3" />
                          {t('tasks.completeLate')}
                        </button>
                      )}
                      {!task.completed && isOverdue && isPenalized && (
                        <button
                          onClick={() => {
                            void completeMissedTask(task);
                          }}
                          disabled={taskIsPending}
                          className="nido-chip disabled:opacity-60"
                        >
                          <Clock className="h-3 w-3" />
                          {t('tasks.regretMissed')}
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(task)}
                        className="nido-chip"
                        aria-label={t('tasks.editTaskAria')}
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          void deleteTask(task.id);
                        }}
                        className="nido-chip border-destructive text-destructive"
                        aria-label={t('tasks.deleteTaskAria')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          setCommentingId(commentingId === task.id ? null : task.id)
                        }
                        className="nido-chip"
                        aria-label={t('tasks.toggleComments')}
                      >
                        <MessageSquare className="h-3 w-3" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {commentingId === task.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 space-y-2 overflow-hidden pl-16"
                        >
                          {task.feedbacks.length > 0 && (
                            <div className="space-y-1.5">
                              {task.feedbacks.map((feedback) => (
                                <div
                                  key={feedback.id}
                                  className="rounded-xl border border-primary/30 bg-muted px-3 py-2"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-primary">
                                      {feedback.anonymous
                                        ? t('tasks.feedbackAnonymousAuthor')
                                        : (feedback.author ??
                                          t('tasks.feedbackAnonymousAuthor'))}
                                    </span>
                                    {feedback.anonymous && (
                                      <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />
                                    )}
                                    <span className="text-[9px] text-muted-foreground ml-auto">
                                      {formatDateTime(feedback.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-foreground">
                                    {feedback.message}
                                  </p>
                                  {feedback.imageData && feedback.imageMimeType && (
                                    <img
                                      src={`data:${feedback.imageMimeType};base64,${feedback.imageData}`}
                                      alt={t('tasks.feedbackImageAlt')}
                                      decoding="async"
                                      loading="lazy"
                                      className="mt-1 rounded-lg max-h-40 object-contain"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input
                              value={commentText}
                              onChange={(event) => setCommentText(event.target.value)}
                              placeholder={t('tasks.feedbackPlaceholder')}
                              className="flex-1 px-3 py-2 text-xs placeholder:text-muted-foreground"
                              onKeyDown={(event) =>
                                event.key === 'Enter' && void addFeedback(task.id)
                              }
                            />
                            <button
                              onClick={() => {
                                void addFeedback(task.id);
                              }}
                              className="nido-button px-4 py-2 text-xs"
                            >
                              {t('common.send')}
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setFeedbackAnonymous((value) => !value)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                                feedbackAnonymous
                                  ? 'bg-primary text-primary-foreground'
                                  : 'nido-card-flat text-ink-3'
                              }`}
                            >
                              <EyeOff className="h-3 w-3" />
                              {feedbackAnonymous
                                ? t('tasks.feedbackAnonymous')
                                : t('tasks.feedbackPublic')}
                            </button>
                            <button
                              onClick={() => feedbackImageRef.current?.click()}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                                feedbackImage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'nido-card-flat text-ink-3'
                              }`}
                            >
                              <Image className="h-3 w-3" />
                              {feedbackImage
                                ? t('tasks.feedbackImageAttached')
                                : t('tasks.feedbackAddImage')}
                            </button>
                            {feedbackImage && (
                              <button
                                onClick={removeFeedbackImage}
                                className="text-[10px] text-destructive"
                              >
                                {t('tasks.feedbackRemoveImage')}
                              </button>
                            )}
                            <input
                              ref={feedbackImageRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFeedbackImage}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <AnimatePresence>
                    {editingId === task.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-2"
                      >
                        <TaskEditor
                          title={t('tasks.editTask')}
                          newTitle={newTitle}
                          setNewTitle={setNewTitle}
                          newAssignee={newAssignee}
                          setNewAssignee={setNewAssignee}
                          members={members}
                          name={name}
                          newDue={newDue}
                          setNewDue={setNewDue}
                          newCategory={newCategory}
                          setNewCategory={setNewCategory}
                          newRecurrence={newRecurrence}
                          setNewRecurrence={setNewRecurrence}
                          newXp={newXp}
                          setNewXp={setNewXp}
                          onClose={resetForm}
                          onSave={handleSave}
                          saveLabel={t('tasks.saveChanges')}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
            </div>
          </section>
        </>
      ) : (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center shrink-0">
              <Package className="h-6 w-6 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t('tasks.restockTitle')}</p>
              <p className="text-[10px] text-muted-foreground">{t('tasks.restockSubtitle')}</p>
            </div>
            {shopping.filter((i) => !i.completed).length > 0 && (
              <span className="shrink-0 px-2.5 py-1 rounded-full gradient-primary text-[11px] font-bold text-primary-foreground">
                {shopping.filter((i) => !i.completed).length}
              </span>
            )}
          </div>

          {shopping.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t('tasks.noItemsYet')}
            </p>
          )}

          <div className="space-y-2">
            {shopping.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={`glass rounded-xl p-3.5 ${item.completed ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.completed ? 'line-through' : ''}`}>
                      {item.item}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('tasks.addedBy', { name: item.addedBy })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.completed ? (
                      <button
                        onClick={() => {
                          void toggleShopItem(item.id);
                        }}
                        className="h-8 px-3 rounded-lg glass text-xs font-medium flex items-center gap-1 text-primary"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        {t('common.undo')}
                      </button>
                    ) : (
                      <button
                        onClick={() => openBuyForm(item)}
                        className="h-8 px-3 rounded-lg glass text-xs font-medium flex items-center gap-1 text-muted-foreground"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        {t('common.bought')}
                      </button>
                    )}
                    <button
                      onClick={() => startEditShop(item)}
                      className="h-8 w-8 rounded-lg glass flex items-center justify-center shrink-0"
                      aria-label={t('tasks.editShoppingItemAria')}
                    >
                      <Edit3 className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => {
                        void deleteShopItem(item.id);
                      }}
                      className="h-8 w-8 rounded-lg glass flex items-center justify-center shrink-0"
                      aria-label={t('tasks.deleteShoppingItemAria')}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {buyingShopId === item.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3 space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={buyAmount}
                          onChange={(event) => setBuyAmount(event.target.value)}
                          placeholder={t('tasks.shopping.amountPlaceholder')}
                          className="bg-muted/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
                        />
                        <select
                          value={buyPaidBy}
                          onChange={(event) => setBuyPaidBy(event.target.value)}
                          className="bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
                        >
                          {memberOptions.map((member) => (
                            <option key={member} value={member}>
                              {member}
                            </option>
                          ))}
                        </select>
                      </div>

                      <p className="text-[10px] text-muted-foreground">
                        {t('tasks.shopping.splitWith')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {memberOptions.map((member) => (
                          <button
                            key={member}
                            onClick={() => toggleBuyParticipant(member)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                              buyParticipants.includes(member)
                                ? 'gradient-primary text-primary-foreground'
                                : 'glass text-muted-foreground'
                            }`}
                          >
                            {member}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={buyDate}
                          onChange={(event) => setBuyDate(event.target.value)}
                          className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
                          aria-label={t('tasks.shopping.purchaseDate')}
                        />
                        <input
                          type="date"
                          value={buyDeadline}
                          onChange={(event) => setBuyDeadline(event.target.value)}
                          className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
                          aria-label={t('economy.deadlineDateLabel')}
                        />
                        <button
                          onClick={() => {
                            void submitBought(item.id);
                          }}
                          className="px-4 rounded-lg gradient-primary text-xs font-semibold text-primary-foreground"
                        >
                          {t('tasks.shopping.logPurchase')}
                        </button>
                        <button
                          onClick={() => setBuyingShopId(null)}
                          className="h-9 w-9 rounded-lg glass flex items-center justify-center"
                          aria-label={t('tasks.shopping.closePurchaseForm')}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {editingShopId === item.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-2"
                    >
                      <div className="flex gap-2">
                        <input
                          value={editShopText}
                          onChange={(event) => setEditShopText(event.target.value)}
                          className="flex-1 bg-muted/50 rounded-lg px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void saveEditShop(item.id);
                            if (event.key === 'Escape') setEditingShopId(null);
                          }}
                        />
                        <button
                          onClick={() => {
                            void saveEditShop(item.id);
                          }}
                          className="px-3 rounded-lg gradient-primary text-xs font-medium text-primary-foreground"
                        >
                          {t('tasks.saveChanges')}
                        </button>
                        <button
                          onClick={() => setEditingShopId(null)}
                          className="h-8 w-8 rounded-lg glass flex items-center justify-center"
                          aria-label={t('common.back')}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function TasksPage() {
  return <TasksMain />;
}
