import { useEffect, useState } from 'react';
import { Copy, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/common/States';
import { Segmented } from '@/components/common/Segmented';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogout, useMe, usePatchProfile, useProfile } from '@/hooks/queries';
import { TONE_LABELS } from '@/lib/labels';
import { setPref, usePrefs, type Prefs } from '@/lib/prefs';
import type { Language, Tone } from '@/lib/types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold">{label}</p>
      {children}
    </div>
  );
}

/** relAI-UX Postavke: look and task view (this device), the assistant's voice and the account (server). */
export default function Settings() {
  const { data, isLoading, isError, error, refetch } = useProfile();
  const { data: me } = useMe();
  const patch = usePatchProfile();
  const logout = useLogout();
  const prefs = usePrefs();
  const [displayName, setDisplayName] = useState('');
  const [avatarName, setAvatarName] = useState('');

  const currentDisplayName = data?.game.displayName;
  const currentAvatarName = data?.game.avatar.name;
  useEffect(() => {
    if (currentDisplayName !== undefined) setDisplayName(currentDisplayName);
  }, [currentDisplayName]);
  useEffect(() => {
    if (currentAvatarName !== undefined) setAvatarName(currentAvatarName);
  }, [currentAvatarName]);

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (isError || !data) return <ErrorState message={error?.message} onRetry={() => void refetch()} />;
  const { game } = data;

  const saveNames = (): void => {
    const d = displayName.trim();
    const a = avatarName.trim();
    const body: Parameters<typeof patch.mutate>[0] = {};
    if (d && d !== game.displayName) body.displayName = d;
    if (a && a !== game.avatar.name) body.avatar = { name: a };
    if (Object.keys(body).length) patch.mutate(body, { onSuccess: () => toast.success('Spremljeno.') });
  };

  return (
    <>
      <PageHeader title="Postavke" backTo="/vise" />
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
        <div className="space-y-4">
          <Card className="gap-5 rounded-2xl p-4">
            <h2 className="text-base">Izgled</h2>
            <Row label="Tema">
              <Segmented<Prefs['theme']>
                label="Tema"
                value={prefs.theme}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
                onChange={(v) => setPref('theme', v)}
              />
            </Row>
            <Row label="Budući ja">
              <Segmented<Prefs['figure']>
                label="Lik"
                value={prefs.figure}
                options={[
                  { value: 'female', label: 'Ona' },
                  { value: 'male', label: 'On' },
                ]}
                onChange={(v) => setPref('figure', v)}
              />
            </Row>
            <Row label="Pregled zadataka">
              <Segmented<Prefs['taskView']>
                label="Pregled zadataka"
                value={prefs.taskView}
                options={[
                  { value: 'day', label: 'Dnevni' },
                  { value: 'week', label: 'Tjedni' },
                  { value: 'month', label: 'Mjesečni' },
                ]}
                onChange={(v) => setPref('taskView', v)}
              />
            </Row>
            <p className="text-xs text-muted-foreground">Ovo se pamti na ovom uređaju.</p>
          </Card>

          <Card className="gap-4 rounded-2xl p-4">
            <h2 className="text-base">Glas budućeg sebe</h2>
            <Segmented<Tone>
              label="Ton"
              value={game.tone}
              options={(Object.keys(TONE_LABELS) as Tone[]).map((t) => ({ value: t, label: TONE_LABELS[t].label }))}
              onChange={(tone) => patch.mutate({ tone })}
            />
            <p className="text-sm text-muted-foreground">„{TONE_LABELS[game.tone].sample}”</p>
            <Row label="Jezik">
              <Segmented<Language>
                label="Jezik"
                value={game.language}
                options={[
                  { value: 'hr', label: '🇭🇷 HR' },
                  { value: 'en', label: '🇬🇧 EN' },
                ]}
                onChange={(language) => patch.mutate({ language })}
              />
            </Row>
          </Card>
        </div>

        <Card className="gap-4 rounded-2xl p-4">
          <h2 className="text-base">Račun</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveNames();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="display-name" className="text-sm font-bold">
                Tvoje ime
              </label>
              <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="avatar-name" className="text-sm font-bold">
                Ime budućeg sebe
              </label>
              <Input id="avatar-name" value={avatarName} onChange={(e) => setAvatarName(e.target.value)} maxLength={30} />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={
                patch.isPending ||
                (displayName.trim() === game.displayName && avatarName.trim() === game.avatar.name) ||
                !displayName.trim() ||
                !avatarName.trim()
              }
            >
              Spremi
            </Button>
          </form>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Kod za prijatelje</span>
            <button
              type="button"
              className="flex items-center gap-1.5 font-mono tracking-widest"
              onClick={() => {
                void navigator.clipboard?.writeText(game.friendCode).then(() => toast('Kod kopiran.'));
              }}
            >
              {game.friendCode} <Copy className="size-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <span className="truncate text-sm text-muted-foreground">{me?.email}</span>
            <Button variant="ghost" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
              <LogOut /> Odjava
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
