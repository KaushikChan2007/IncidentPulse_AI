import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ConnectSection } from './components/ConnectSection';
import { IncidentSection } from './components/IncidentSection';
import { ChangeRadarSection } from './components/ChangeRadarSection';
import {
  fetchVerdict,
  fetchSignals,
  fetchChanges,
  fetchVendors,
  fetchSweepLogs,
  fetchTelemetryTimeline,
  runEngineSweep,
  triggerReplayRun,
} from './lib/data';
import {
  Vendor,
  Verdict,
  ChangeItem,
  AgentSweepLog,
  TelemetryPoint,
  DataMode,
} from './lib/types';
import {
  mockVendors,
  mockVerdictAuth0,
  mockChanges,
  mockSweepLogsAuth0,
  mockTelemetryTimeline,
} from './lib/mock';

export default function App() {
  const [vendors, setVendors] = useState<Vendor[]>(mockVendors);
  const [verdict, setVerdict] = useState<Verdict>(mockVerdictAuth0);
  const [sweepLogs, setSweepLogs] = useState<AgentSweepLog[]>(mockSweepLogsAuth0);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(mockTelemetryTimeline);
  const [changes, setChanges] = useState<ChangeItem[]>(mockChanges);

  const [activeSection, setActiveSection] = useState<'connect' | 'incident' | 'radar'>('incident');
  const [scenario, setScenario] = useState<'auth0' | 'own_code'>('auth0');
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [dataMode, setDataMode] = useState<DataMode>('LIVE');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load initial dataset from backend API routes
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [vList, vVerdict, vLogs, vTelem, vChanges] = await Promise.all([
          fetchVendors(),
          fetchVerdict('auth0'),
          fetchSweepLogs('auth0'),
          fetchTelemetryTimeline(),
          fetchChanges(),
          fetchSignals(),
        ]);

        if (isMounted) {
          if (vList && vList.length > 0) setVendors(vList);
          if (vVerdict) setVerdict(vVerdict);
          if (vLogs && vLogs.length > 0) setSweepLogs(vLogs);
          if (vTelem && vTelem.length > 0) setTelemetry(vTelem);
          if (vChanges && vChanges.length > 0) setChanges(vChanges);
        }
      } catch (err) {
        console.warn('API data fetch failed, using mock data:', err);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle switching scenarios (Auth0 outage vs Deploy bug) via real engine sweep
  const handleSwitchScenario = async (sc: 'auth0' | 'own_code') => {
    setScenario(sc);
    try {
      const res = await runEngineSweep(sc, isDemoActive);
      setVerdict(res.verdict);
      setSweepLogs(res.sweepLogs);
      setDataMode(res.mode);

      if (sc === 'own_code') {
        setTelemetry((prev) =>
          prev.map((pt) => ({
            ...pt,
            errorRate: pt.time >= '14:02' ? 0.2 : 0.1,
            vendorIncidentActive: false,
          }))
        );
        setToastMessage('Switched to scenario: Internal Code Regression (Commit #e382b9c)');
      } else {
        const liveTelem = await fetchTelemetryTimeline();
        setTelemetry(liveTelem);
        setToastMessage(`Switched to scenario: Upstream Third-Party Vendor Outage (${res.mode} mode)`);
      }
    } catch {
      const fallbackVerdict = await fetchVerdict(sc);
      setVerdict(fallbackVerdict);
    }

    setTimeout(() => setToastMessage(null), 3500);
  };

  // Run Demo / Replay Mode toggle triggering real error replay & fresh engine sweep
  const handleToggleDemo = async () => {
    if (!isDemoActive) {
      setIsDemoActive(true);
      setDataMode('REPLAY');
      setToastMessage('Running demo: Replaying incident errors & executing fresh agent sweep...');

      try {
        const replayRes = await triggerReplayRun();
        setVerdict(replayRes.verdict);
        setSweepLogs(replayRes.sweepLogs);
        setDataMode(replayRes.mode || 'REPLAY');
        const telem = await fetchTelemetryTimeline();
        setTelemetry(telem);
        setToastMessage('Replay completed: Real incident window telemetry ingested and analyzed');
      } catch {
        setToastMessage('Replay simulated with cached incident window');
      }
    } else {
      setIsDemoActive(false);
      setDataMode('LIVE');
      setToastMessage('Live Mode restored: Probing upstream dependencies in real time');
      handleSwitchScenario('auth0');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId as 'connect' | 'incident' | 'radar');
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRerunSweep = async () => {
    const refreshedLogs = await fetchSweepLogs(scenario);
    setSweepLogs([...refreshedLogs]);
  };

  const handleVendorsUpdated = (newVendors: Vendor[]) => {
    setVendors(newVendors);
    setToastMessage(`Repository scanned: ${newVendors.length} infrastructure dependencies mapped`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEventIngested = (cause: string) => {
    setToastMessage(`Test telemetry received: Processed via /api/ingest [Attributed: ${cause}]`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-[var(--accent)] selection:text-white">
      {/* Sticky Header */}
      <Header
        vendors={vendors}
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onRunDemo={handleToggleDemo}
        isDemoActive={isDemoActive}
        dataMode={dataMode}
      />

      {/* Floating System Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 max-w-md p-3.5 rounded-2xl bg-[var(--deep-card)] text-[var(--deep-card-text)] border border-[var(--border-subtle)] shadow-2xl font-mono text-xs flex items-center gap-3 animate-fade-in"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--ok)] shrink-0 animate-ping" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Main Single Page Content */}
      <main className="flex-1 pb-24">
        {/* Screen 2: Incident Attribution (Most Polish - Primary Focus) */}
        <IncidentSection
          verdict={verdict}
          sweepLogs={sweepLogs}
          telemetry={telemetry}
          dataMode={dataMode}
          onRerunSweep={handleRerunSweep}
          scenario={scenario}
          onSwitchScenario={handleSwitchScenario}
        />

        {/* Hairline Divider with Clay Dot */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6 flex items-center justify-center">
          <div className="w-full h-px bg-[var(--border-subtle)] relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-sm" />
          </div>
        </div>

        {/* Screen 1: Connect your app */}
        <ConnectSection
          vendors={vendors}
          onVendorsUpdated={handleVendorsUpdated}
          onEventIngested={handleEventIngested}
        />

        {/* Hairline Divider with Clay Dot */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6 flex items-center justify-center">
          <div className="w-full h-px bg-[var(--border-subtle)] relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-sm" />
          </div>
        </div>

        {/* Screen 3: Change Radar */}
        <ChangeRadarSection changes={changes} />
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface)] py-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-sm text-[var(--text-main)]">
              IncidentPulse AI
            </span>
            <span>· Deterministic Upstream vs Application Root-Cause Analysis</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#incident" className="hover:text-[var(--text-main)] transition-colors">
              Incident
            </a>
            <a href="#connect" className="hover:text-[var(--text-main)] transition-colors">
              Connect
            </a>
            <a href="#radar" className="hover:text-[var(--text-main)] transition-colors">
              Radar
            </a>
            <span className="opacity-60">© 2026 IncidentPulse</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
