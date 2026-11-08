/**
 * Aetherion Companion - router and top-level providers.
 * Phase 1: Title / Map / Setup / Battle / Results / Library / Settings.
 */
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { GameProvider } from '@/store/GameProvider';
import '@/App.css';

const TitlePage = lazy(() => import('@/pages/Title'));
const CampaignMapPage = lazy(() => import('@/pages/CampaignMap'));
const SetupPage = lazy(() => import('@/pages/Setup'));
const BattlePage = lazy(() => import('@/pages/Battle'));
const ResultsPage = lazy(() => import('@/pages/Results'));
const LibraryPage = lazy(() => import('@/pages/Library'));
const SettingsPage = lazy(() => import('@/pages/Settings'));

function RouteFallback() {
  return (
    <div className="aether-bg grain fixed inset-0 flex items-center justify-center" data-testid="route-fallback">
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--text-dim))]">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[hsl(var(--aether-cyan))]" />
        Memuat Aetherion...
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          theme="dark"
          richColors={false}
          closeButton
          toastOptions={{
            className: 'font-sans',
            style: {
              background: 'hsl(223 34% 12%)',
              border: '1px solid hsl(220 18% 26%)',
              color: 'hsl(210 40% 98%)',
            },
          }}
        />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<TitlePage />} />
            <Route path="/map" element={<CampaignMapPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/battle" element={<BattlePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </GameProvider>
  );
}
