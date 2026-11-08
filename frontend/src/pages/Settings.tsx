/**
 * Settings screen - Phase 1 subset:
 *  - Sound effects toggle
 *  - Low Graphics toggle (disables 3D + animations)
 *  - Detection mode (manual enabled; camera forced to manual in Phase 1)
 *  - Debug overlay (store only - used once Phase 2 lands)
 *  - Reset Progress (confirms, wipes localStorage + manual mat)
 *  - Language note (Bahasa Indonesia default; i18n coming later)
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Camera, HandMetal, Languages, Trash2, Volume2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Screen, GameButton } from '@/components/game/Screen';
import { Switch } from '@/components/ui/typed';
import { useGame } from '@/store/GameProvider';
import { t } from '@/i18n/id';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, resetProgress } = useGame();

  const onResetProgress = () => {
    if (window.confirm(t.settings.resetConfirm)) {
      resetProgress();
      toast.success(t.settings.resetDone);
      navigate('/');
    }
  };

  return (
    <Screen title={t.settings.title} back="/" testId="settings-screen">
      <div className="space-y-4">
        <Section title={t.settings.audio}>
          <RowToggle
            icon={<Volume2 className="h-4 w-4" />}
            label={t.settings.sound}
            checked={settings.sound}
            onCheckedChange={(v) => updateSettings({ sound: v })}
            testId="settings-sound-toggle"
          />
        </Section>

        <Section title={t.settings.graphics}>
          <RowToggle
            icon={<Zap className="h-4 w-4" />}
            label={t.settings.lowGraphics}
            hint={t.settings.lowGraphicsHint}
            checked={settings.lowGraphics}
            onCheckedChange={(v) => updateSettings({ lowGraphics: v })}
            testId="settings-low-graphics-toggle"
          />
        </Section>

        <Section title={t.settings.detection}>
          <div className="flex gap-2" data-testid="settings-detection-mode-group">
            <ModeButton
              active={settings.detectionMode === 'manual'}
              onClick={() => updateSettings({ detectionMode: 'manual' })}
              icon={<HandMetal className="h-4 w-4" />}
              label={t.common.manual}
              testId="settings-detection-mode-manual"
            />
            <ModeButton
              active={settings.detectionMode === 'camera'}
              onClick={() => updateSettings({ detectionMode: 'camera' })}
              icon={<Camera className="h-4 w-4" />}
              label={t.common.camera}
              testId="settings-detection-mode-camera"
            />
          </div>
          <p className="mt-2 text-xs text-[hsl(var(--text-dim))]">{t.common.phase2Ready}</p>
          <div className="mt-3">
            <RowToggle
              icon={<AlertTriangle className="h-4 w-4" />}
              label={t.settings.debugOverlay}
              hint={t.settings.debugHint}
              checked={settings.debugOverlay}
              onCheckedChange={(v) => updateSettings({ debugOverlay: v })}
              testId="settings-debug-overlay-toggle"
            />
          </div>
        </Section>

        <Section title={t.settings.language}>
          <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-3 py-3 text-sm" data-testid="settings-language-note">
            <Languages className="h-4 w-4 text-[hsl(var(--aether-cyan))]" />
            {t.settings.languageNote}
          </div>
        </Section>

        <Section title={t.settings.data}>
          <GameButton testId="settings-reset-progress-button" variant="danger" onClick={onResetProgress}>
            <Trash2 className="h-5 w-5" />
            {t.settings.resetProgress}
          </GameButton>
        </Section>
      </div>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--aether-cyan))]">{title}</div>
      {children}
    </section>
  );
}

function RowToggle({ icon, label, hint, checked, onCheckedChange, testId }: {
  icon: React.ReactNode; label: string; hint?: string; checked: boolean; onCheckedChange: (v: boolean) => void; testId: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-bold">
          {icon}
          {label}
        </div>
        {hint ? <p className="mt-0.5 text-xs text-[hsl(var(--text-dim))]">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
    </div>
  );
}

function ModeButton({ active, disabled, onClick, icon, label, testId }: {
  active?: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string; testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={[
        'flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold',
        active ? 'border-[hsl(var(--aether-cyan))] bg-[hsl(var(--aether-cyan)/0.1)] text-[hsl(188_90%_85%)]' : 'border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] text-[hsl(var(--text-dim))]',
        disabled ? 'opacity-55 cursor-not-allowed' : 'hover:brightness-110',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}
