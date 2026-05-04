import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Users, MapPin, ArrowRight, ArrowLeft, Plus, X, DoorOpen, Copy, Check, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { api, getUserMessage } from '../lib/api';
import { useUser } from '../context/UserContext';
import type { AppUser } from '../lib/types';
import { NidoButton, NidoCard, NidoChip, NidoDots } from '../components/nido';

export default function CreateHouseholdPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, setCurrentUser, handleLogout } = useUser();

  const [setupMode, setSetupMode] = useState<'create' | 'join'>('create');
  const [step, setStep] = useState(1);
  const [houseName, setHouseName] = useState('');
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState([{ name: '', minutes: '30' }]);
  const [invites, setInvites] = useState<string[]>(['']);
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const addInvite = () => setInvites((p) => [...p, '']);
  const removeInvite = (i: number) => setInvites((p) => p.filter((_, idx) => idx !== i));
  const updateInvite = (i: number, val: string) =>
    setInvites((p) => p.map((v, idx) => (idx === i ? val : v)));
  const addRoom = () => setRooms((p) => [...p, { name: '', minutes: '30' }]);
  const removeRoom = (i: number) => setRooms((p) => p.length === 1 ? p : p.filter((_, idx) => idx !== i));
  const updateRoomName = (i: number, val: string) =>
    setRooms((p) => p.map((room, idx) => (idx === i ? { ...room, name: val } : room)));
  const updateRoomMinutes = (i: number, val: string) =>
    setRooms((p) => p.map((room, idx) => (idx === i ? { ...room, minutes: val } : room)));

  const handleCopy = () => {
    navigator.clipboard.writeText(createdCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCollective = async () => {
    if (!currentUser) return;
    setError('');
    setLoading(true);
    try {
      const roomConfigs = rooms
        .map((room) => ({
          name: room.name.trim(),
          minutes: Math.max(1, parseInt(room.minutes) || 30),
        }))
        .filter((room) => room.name);

      if (roomConfigs.length === 0) {
        setError(t('createHousehold.errors.addRoom'));
        setLoading(false);
        return;
      }

      const res = await api.post<{ name: string; joinCode: string }>('/onboarding/collectives', {
        name: houseName || address || t('createHousehold.defaultHouseholdName'),
        ownerUserId: currentUser.id,
        numRooms: roomConfigs.length,
        residents: [currentUser.name],
        rooms: roomConfigs,
      });
      setCreatedCode(res.joinCode);
      // Update user with new collective code
      const updated: AppUser = { ...currentUser, collectiveCode: res.joinCode, collectiveName: res.name };
      setCurrentUser(updated);
      setStep(3);
    } catch (err: unknown) {
      setError(getUserMessage(err, t('createHousehold.errors.createFailure')));
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvites = async () => {
    if (!currentUser) return;
    const validEmails = invites.filter((e) => e.trim());
    await Promise.allSettled(
      validEmails.map((email) =>
        api.post('/members/invite', { email, collectiveCode: createdCode })
      )
    );
    navigate('/', { replace: true });
  };

  const handleJoinCollective = async () => {
    if (!currentUser || !joinCode.trim()) return;
    setError('');
    setJoining(true);
    try {
      const joined = await api.post<AppUser>('/onboarding/collectives/join', {
        userId: currentUser.id,
        joinCode: joinCode.trim().toUpperCase(),
      });
      setCurrentUser(joined);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(getUserMessage(err, t('createHousehold.errors.joinFailure')));
    } finally {
      setJoining(false);
    }
  };

  const goBackToAuth = async () => {
    await handleLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto w-full max-w-lg">
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
          className="space-y-6"
      >
          <section>
            <NidoChip className="mb-4">
              {setupMode === 'create' ? t('createHousehold.stepOf', { step, total: 3 }) : 'join with code'}
            </NidoChip>
            <h1 className="nido-title text-[3.35rem] leading-[0.95]">
              {setupMode === 'create' ? (
                <>Make a <em className="text-secondary">nest</em>.</>
              ) : (
                <>Join the <em className="text-secondary">nest</em>.</>
              )}
          </h1>
            <p className="mt-4 text-base leading-6 text-ink-2">
              {setupMode === 'create'
                ? t('createHousehold.roomSetupDescription')
                : t('createHousehold.joinIntro')}
            </p>
          </section>

          <div className="flex gap-1 rounded-full border-[1.5px] border-primary bg-card p-1 shadow-[3px_3px_0_var(--ink)]">
          <button
            onClick={() => setSetupMode('create')}
              className={`flex-1 rounded-full px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em] transition-all ${
              setupMode === 'create' ? 'bg-primary text-primary-foreground' : 'text-ink-3'
            }`}
          >
            {t('createHousehold.createHome')}
          </button>
          <button
            onClick={() => setSetupMode('join')}
              className={`flex-1 rounded-full px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em] transition-all ${
              setupMode === 'join' ? 'bg-primary text-primary-foreground' : 'text-ink-3'
            }`}
          >
            {t('createHousehold.joinHome')}
          </button>
        </div>

        {setupMode === 'create' && (
            <div className="flex gap-2 px-1">
            {[1, 2, 3].map((s) => (
                <div key={s} className={`h-2 flex-1 rounded-full border border-primary ${step >= s ? 'bg-secondary' : 'bg-muted'}`} />
            ))}
          </div>
        )}

        {setupMode === 'join' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <NidoCard className="space-y-5 p-5">
                <div className="mx-auto flex h-20 w-20 rotate-[-4deg] items-center justify-center rounded-2xl border-[1.5px] border-primary bg-nido-butter text-4xl shadow-[3px_3px_0_var(--ink)]">
                  <KeyRound className="h-9 w-9" />
              </div>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('createHousehold.enterInviteCode')}
                  className="w-full px-4 py-4 text-center font-mono text-lg font-bold uppercase tracking-[0.22em] placeholder:text-muted-foreground"
              />
              </NidoCard>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
              <NidoButton
              onClick={handleJoinCollective}
              disabled={joining || !joinCode.trim()}
                className="w-full"
            >
              {joining ? t('createHousehold.joining') : <>{t('createHousehold.joinButton')} <ArrowRight className="h-4 w-4" /></>}
              </NidoButton>
          </motion.div>
        )}

        {/* Step 1: Name & Address */}
        {setupMode === 'create' && step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <NidoCard className="space-y-5 p-5">
                <div className="mx-auto flex h-20 w-20 rotate-[-4deg] items-center justify-center rounded-2xl border-[1.5px] border-primary bg-coral-soft text-4xl shadow-[3px_3px_0_var(--ink)]">
                  <Home className="h-9 w-9" />
              </div>
              <div>
                  <label className="nido-section-label mb-2 block">{t('createHousehold.householdName')}</label>
                <input
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder={t('createHousehold.householdNamePlaceholder')}
                    className="w-full px-4 py-3 text-sm placeholder:text-muted-foreground"
                />
              </div>
              <div>
                  <label className="nido-section-label mb-2 block">{t('createHousehold.address')}</label>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 shrink-0 text-ink-3" />
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('createHousehold.addressPlaceholder')}
                      className="w-full px-4 py-3 text-sm placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              </NidoCard>
              <NidoButton
              onClick={() => setStep(2)}
              disabled={!houseName.trim() && !address.trim()}
                className="w-full"
            >
              {t('common.next')} <ArrowRight className="h-4 w-4" />
              </NidoButton>
          </motion.div>
        )}

        {/* Step 2: Rooms & Residents */}
        {setupMode === 'create' && step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <NidoCard className="space-y-5 p-5">
                <div className="mx-auto flex h-20 w-20 rotate-[-4deg] items-center justify-center rounded-2xl border-[1.5px] border-primary bg-nido-sky text-4xl shadow-[3px_3px_0_var(--ink)]">
                  <DoorOpen className="h-9 w-9" />
              </div>
              <div className="space-y-3">
                {rooms.map((room, i) => (
                    <div key={i} className="rounded-2xl border-[1.5px] border-primary bg-muted p-3">
                    <div className="flex items-center justify-between gap-3">
                        <span className="nido-section-label">{t('createHousehold.room', { index: i + 1 })}</span>
                      {rooms.length > 1 && (
                          <button onClick={() => removeRoom(i)} className="flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-card">
                            <X className="h-4 w-4 text-ink-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t('createHousehold.roomName')}</label>
                        <input
                          value={room.name}
                          onChange={(e) => updateRoomName(i, e.target.value)}
                          placeholder={t('createHousehold.roomNamePlaceholder')}
                            className="w-full px-4 py-3 text-sm placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                          <label className="nido-section-label mb-2 block">{t('createHousehold.minutesToClean')}</label>
                        <input
                          type="number"
                          min="1"
                          max="240"
                          value={room.minutes}
                          onChange={(e) => updateRoomMinutes(i, e.target.value)}
                            className="w-full px-4 py-3 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addRoom}
                  className="nido-button-ghost flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" /> {t('createHousehold.addRoom')}
              </button>
              </NidoCard>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <div className="flex gap-3">
                <NidoButton variant="ghost" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="h-4 w-4" /> {t('common.back')}
                </NidoButton>
                <NidoButton
                onClick={handleCreateCollective}
                disabled={loading}
                  className="flex-1"
              >
                {loading ? t('createHousehold.creating') : <>{t('common.next')} <ArrowRight className="h-4 w-4" /></>}
                </NidoButton>
            </div>
          </motion.div>
        )}

        {/* Step 3: Invite */}
        {setupMode === 'create' && step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <NidoCard className="space-y-5 p-5">
                <div className="mx-auto flex h-20 w-20 rotate-[-4deg] items-center justify-center rounded-2xl border-[1.5px] border-primary bg-nido-butter text-4xl shadow-[3px_3px_0_var(--ink)]">
                  <Users className="h-9 w-9" />
              </div>

                <div className="rounded-2xl border-[1.5px] border-primary bg-muted p-4 text-center">
                  <p className="nido-section-label mb-2">{t('createHousehold.shareCode')}</p>
                <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-2xl font-bold tracking-[0.22em] text-secondary">{createdCode}</span>
                    <button onClick={handleCopy} className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-primary bg-card">
                    {copied
                        ? <Check className="h-4 w-4 text-secondary" />
                        : <Copy className="h-4 w-4 text-ink-3" />}
                  </button>
                </div>
              </div>

                <div className="flex items-center gap-3">
                  <NidoDots className="flex-1" />
                  <span className="nido-section-label">{t('createHousehold.inviteByEmail')}</span>
                  <NidoDots className="flex-1" />
              </div>

              {invites.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateInvite(i, e.target.value)}
                    placeholder={t('createHousehold.roommateEmail', { index: i + 1 })}
                      className="min-w-0 flex-1 px-4 py-3 text-sm placeholder:text-muted-foreground"
                  />
                  {invites.length > 1 && (
                      <button onClick={() => removeInvite(i)} className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-primary bg-card">
                        <X className="h-4 w-4 text-ink-3" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={addInvite}
                  className="nido-button-ghost flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"
              >
                  <Plus className="h-4 w-4" /> {t('createHousehold.addAnother')}
              </button>
              </NidoCard>

              <NidoButton
              onClick={handleSendInvites}
                className="w-full"
            >
              {t('common.create')} <ArrowRight className="h-4 w-4" />
              </NidoButton>

            <button
              onClick={() => navigate('/', { replace: true })}
                className="w-full text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3"
            >
              {t('createHousehold.skipForNow')}
            </button>
          </motion.div>
        )}

        <button
          onClick={goBackToAuth}
            className="w-full text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3"
        >
          {t('createHousehold.backToAuth')}
        </button>
      </motion.div>
      </div>
    </div>
  );
}
