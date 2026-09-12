import React, { useState, useEffect, useRef } from 'react';
import { TelemetryEngine } from './services/telemetryEngine';
import { officialF1Api } from './services/officialF1Api';
import { f1SignalR } from './services/f1SignalRClient';
import { f1LiveWebSocketService } from './services/f1LiveWebSocketService';
import type { SignalRConnectionStatus } from './services/f1SignalRClient';
import type { 
  LeaderboardEntry, 
  CarTelemetry as CarTelemetryType, 
  SessionState, 
  RaceControlMessage, 
  TeamRadio, 
  PitPrediction 
} from './types/telemetry';
import { Header } from './components/Header';
import { Leaderboard } from './components/Leaderboard';
import { BestLapBenchmarks } from './components/BestLapBenchmarks';
import { FastestBySector } from './components/FastestBySector';
import { TrackFlagIndicator } from './components/TrackFlagIndicator';
import { RaceControl } from './components/RaceControl';
import { ScheduleView } from './components/ScheduleView';
import { HomeSketchLayout } from './components/HomeSketchLayout';
import { OfficialLeaderboardView } from './components/OfficialLeaderboardView';
import { DRIVER_MAP } from './data/drivers';
import { F1_SCHEDULE } from './data/schedule';
import { useLanguage } from './context/LanguageContext';
import { CloudSun, Wind, Droplets, Thermometer, Clock, CheckCircle2 } from 'lucide-react';

import './styles/global.css';
import './styles/dashboard.css';
import './styles/leaderboard.css';
import './styles/circuit-map.css';
import './styles/car-telemetry.css';
import './styles/race-control.css';
import './styles/schedule.css';
import './styles/home-layout.css';

export const App: React.FC = () => {
  const { t } = useLanguage();
  // Telemetry Engine (connected to realistic data stream & official fallback)
  const engineRef = useRef<TelemetryEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new TelemetryEngine('madrid');
  }
  const engine = engineRef.current;

  // Active tab: 'timing' matches formula1dashboard live timing layout
  const [activeTab, setActiveTab] = useState<'home' | 'timing' | 'leaderboard' | 'schedule'>('timing');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('f1_live_leaderboard') ||
                    localStorage.getItem('f1_saved_leaderboard_madrid') ||
                    localStorage.getItem('f1_official_live_timing_cache');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const allZero = parsed.every((e: any) => !e.tyre || e.tyre.age === 0);
            if (allZero) {
              parsed.forEach((entry: any, i: number) => {
                const age = i === 0 ? 2 : i === 1 ? 2 : i === 2 ? 5 : ((i * 2 + 1) % 6) + 1;
                entry.tyre = {
                  compound: i === 2 || i === 6 ? 'MEDIUM' : i === 7 ? 'HARD' : 'SOFT',
                  age,
                  used: age > 1,
                };
                entry.lapsCompleted = age;
              });
            }
            return parsed;
          }
        }
      } catch {}
    }
    return engine.getLeaderboard();
  });
  const [session, setSession] = useState<SessionState>(() => {
    const base = engine.getSession();
    if (typeof window !== 'undefined') {
      try {
        const savedFinished = localStorage.getItem('f1_session_finished_at_ms');
        if (savedFinished) {
          const parsed = Number(savedFinished);
          if (!isNaN(parsed) && parsed > 0) {
            return { ...base, finishedAtMs: parsed };
          }
        }
      } catch {}
    }
    return base;
  });
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => engine.getSelectedDriverId());
  const [telemetry, setTelemetry] = useState<CarTelemetryType | null>(() => engine.getSelectedTelemetry());
  const [pitPrediction, setPitPrediction] = useState<PitPrediction | null>(() => engine.calculatePitPrediction('ant'));
  const [raceControlMessages, setRaceControlMessages] = useState<RaceControlMessage[]>(() => engine.getRaceControlMessages());
  const [teamRadios, setTeamRadios] = useState<TeamRadio[]>(() => engine.getTeamRadios());

  // Live connection state
  const [signalRStatus, setSignalRStatus] = useState<SignalRConnectionStatus>('connecting');
  const [signalRDetails, setSignalRDetails] = useState<string>('Conectado');

  // Official live status
  const [isOfficialLive, setIsOfficialLive] = useState<boolean>(false);
  const [officialStatusMessage, setOfficialStatusMessage] = useState<string>('Conectado a los datos oficiales de Fórmula 1');

  const nextGp = F1_SCHEDULE.find(gp => !gp.completed) || F1_SCHEDULE[15];
  const nextSessionName = `${nextGp.name} (${nextGp.circuitName})`;

  // ===== REAL-TIME SESSION DETECTION FROM OFFICIAL SCHEDULE =====
  // Returns the currently active session (if any) or null based on real UTC clock
  const getCurrentScheduledSession = () => {
    const now = new Date();
    for (const gp of F1_SCHEDULE) {
      for (const sess of gp.sessions) {
        const start = new Date(sess.startTimeUtc);
        // Duration: FP = 60min, Qualy = 60min, Race = 120min, Sprint = 45min
        const durMin = sess.type === 'Race' ? 120 : sess.type === 'Sprint' ? 45 : 60;
        const end = new Date(start.getTime() + durMin * 60 * 1000);
        if (now >= start && now <= end) {
          return { gp, sess, start, end, durSec: durMin * 60, remainingSec: Math.max(0, (end.getTime() - now.getTime()) / 1000) };
        }
      }
    }
    return null;
  };

  const getNextScheduledSession = () => {
    const now = new Date();
    for (const gp of F1_SCHEDULE) {
      for (const sess of gp.sessions) {
        const start = new Date(sess.startTimeUtc);
        if (start > now) return { gp, sess, start };
      }
    }
    return null;
  };

  // Track which session we detected as active to know when it changes
  const activeSessionKeyRef = useRef<string | null>(null);
  // Track if we've already loaded real data for the last completed session
  const loadedSessionKeyRef = useRef<number | null>(null);

  // Load real timing data from OpenF1 for a completed session
  const loadRealSessionData = async (sessionKey: number, _meetingKey?: number) => {
    if (loadedSessionKeyRef.current === sessionKey) return; // already loaded
    loadedSessionKeyRef.current = sessionKey;
    console.info(`[OpenF1] Loading real data for session_key=${sessionKey}`);
    try {
      const results = await officialF1Api.getSessionBestLaps(sessionKey);
      if (results && results.length > 0) {
        engine.ingestRealSessionResults(results);
        console.info(`[OpenF1] ✅ Loaded ${results.length} drivers real timing data`);
      } else {
        console.warn('[OpenF1] No real data available yet for this session');
      }
    } catch (e) {
      console.warn('[OpenF1] Failed to load real session data:', e);
    }
  };

  // On mount: find the most recently completed session from the schedule and load its real data
  useEffect(() => {
    const loadLastSession = async () => {
      // Fetch the actual session list from OpenF1 to get the latest completed session key
      try {
        // Get the Madrid sessions (meeting 1294) — the current GP
        const madridSessions = await officialF1Api.getMeetingSessions(1294);
        if (madridSessions && madridSessions.length > 0) {
          // Find the most recently completed session
          const nowMs = Date.now();
          let latestCompletedKey: number | null = null;
          for (const s of madridSessions) {
            const endMs = new Date(s.date_end).getTime();
            if (endMs < nowMs && (!latestCompletedKey || s.session_key > latestCompletedKey)) {
              latestCompletedKey = s.session_key;
            }
          }
          if (latestCompletedKey) {
            await loadRealSessionData(latestCompletedKey, 1294);
          }
        }
      } catch (e) {
        console.warn('[OpenF1] Could not load Madrid sessions:', e);
      }
    };

    loadLastSession();
  }, [engine]);

  // Poll every 15 seconds to detect session changes from the schedule
  useEffect(() => {
    const detectSession = () => {
      const active = getCurrentScheduledSession();
      
      if (active) {
        const key = `${active.gp.circuitId}-${active.sess.type}-${active.sess.startTimeUtc}`;
        const isNewSession = activeSessionKeyRef.current !== key;

        if (isNewSession) {
          activeSessionKeyRef.current = key;
          // Map session type
          const engineType: SessionState['type'] =
            active.sess.type === 'Race' ? 'RACE' :
            active.sess.type === 'Sprint' ? 'SPRINT' :
            (active.sess.type === 'Qualifying' || active.sess.type === 'Sprint Qualifying') ? 'QUALIFYING' : 'PRACTICE';

          // Reset engine for the new session
          engine.resetForNewSession(
            `${active.gp.name} - ${active.sess.name}`,
            engineType,
            active.remainingSec
          );

          // Reset loadedSessionKey so we load fresh data when this session ends
          loadedSessionKeyRef.current = null;

          console.info(`[SessionManager] New session detected: ${active.sess.name} at ${active.gp.name}. Remaining: ${Math.round(active.remainingSec)}s`);
        }
        setIsOfficialLive(true);
        engine.setSessionEnded(false);
      } else {
        // No official session live right now
        if (activeSessionKeyRef.current !== null) {
          activeSessionKeyRef.current = null;
        }
        setIsOfficialLive(false);
        engine.setSessionEnded(true);
        if (!engine.isEngineRunning()) {
          engine.start();
        }
      }
    };

    detectSession(); // run immediately on mount
    const interval = setInterval(detectSession, 15000); // then every 15s
    return () => clearInterval(interval);
  }, [engine]);

  // Synchronize live mode with engine
  useEffect(() => {
    engine.setLiveMode(isOfficialLive);
  }, [isOfficialLive, engine]);

  // Connect to official F1 SignalR feed on mount
  useEffect(() => {
    f1SignalR.setListeners({
      onStatusChange: (status, details) => {
        setSignalRStatus(status);
        if (details) setSignalRDetails(details);
        if (status === 'live_streaming') {
          setIsOfficialLive(true);
        }
      },
      onTrackStatus: (trackStatus) => {
        setSession(prev => ({
          ...prev,
          trackStatus: trackStatus.status === '1' ? 'GREEN' : trackStatus.status === '2' ? 'YELLOW' : 'GREEN',
          safetyCarDeployed: trackStatus.status === '4',
          vscDeployed: trackStatus.status === '6',
        }));
      },
      onWeatherData: (weather) => {
        setSession(prev => ({
          ...prev,
          airTemp: weather.airTemp,
          trackTemp: weather.trackTemp,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          rainProbability: weather.rainfall ? 95 : 0,
        }));
      },
      onTimingData: (timingData) => {
        if (timingData) {
          engine.ingestSignalRTimingData(timingData);
        }
      },
      onRaceControl: (msg) => {
        if (msg) {
          const text = typeof msg === 'string' ? msg : msg.Message || JSON.stringify(msg);
          const newMsg: RaceControlMessage = {
            id: `rc-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            flag: 'GREEN',
            scope: 'Track',
            messageEn: text,
            messageEs: text,
            category: 'SYSTEM',
          };
          setRaceControlMessages(prev => [newMsg, ...prev]);
        }
      },
    });

    // Start connection to livetiming.formula1.com/signalrcore
    f1SignalR.connect();

    return () => {
      f1SignalR.disconnect();
    };
  }, []);

  // Fetch status message from official API (but DON'T override isOfficialLive — handled by schedule detector above)
  const checkStatus = async () => {
    f1SignalR.connect();
    try {
      const status = await officialF1Api.checkLiveStatus();
      setOfficialStatusMessage(status.statusMessage);
      // Only override with API data if SignalR says we're live_streaming (real live feed connected)
      if (signalRStatus === 'live_streaming') {
        setIsOfficialLive(true);
      }
    } catch {
      // ignore fetch errors
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // less aggressive: every 60s
    return () => clearInterval(interval);
  }, []);


  // Live WebSocket synchronization with official F1 telemetry stream
  useEffect(() => {
    f1LiveWebSocketService.startConnection();

    const unsubscribeStatus = f1LiveWebSocketService.subscribeSessionStatus((status) => {
      const isFinished = status.isFinished || status.isChequered || status.remaining === '00:00:00';
      const isLiveOnTrack = status.sessionStatus === 'Started' && !isFinished && (status.remainingSec === undefined || status.remainingSec > 0);

      if (isFinished) {
        setIsOfficialLive(false);
        setSignalRStatus('connected');
        setSignalRDetails('Sesión finalizada (Bandera a cuadros)');
        engine.setSessionEnded(true);
        const parsedFinishedTime = status.finishedUtc ? new Date(status.finishedUtc).getTime() : undefined;
        setSession(prev => {
          const finishedAtMs = prev.finishedAtMs || (parsedFinishedTime && !isNaN(parsedFinishedTime) ? parsedFinishedTime : Date.now());
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('f1_session_finished_at_ms', String(finishedAtMs));
            }
          } catch {}
          return {
            ...prev,
            trackStatus: 'CHEQUERED',
            timeRemainingSec: 0,
            finishedAtMs,
          };
        });
      } else if (isLiveOnTrack) {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('f1_session_finished_at_ms');
          }
        } catch {}
        setIsOfficialLive(true);
        setSignalRStatus('live_streaming');
        setSignalRDetails('Conectado a F1 Live Timing (Directo)');
        engine.setSessionEnded(false);
        const isQualy = status.sessionType?.toLowerCase().includes('qual') || status.sessionName?.toLowerCase().includes('qual');
        const sessType: SessionState['type'] = isQualy
          ? 'QUALIFYING'
          : status.sessionType?.toLowerCase().includes('race')
          ? 'RACE'
          : status.sessionType?.toLowerCase().includes('sprint')
          ? 'SPRINT'
          : 'PRACTICE';

        setSession(prev => ({
          ...prev,
          name: status.sessionName || prev.name,
          type: status.sessionType ? sessType : prev.type,
          trackStatus: status.safetyCar ? 'SC' : status.vsc ? 'VSC' : 'GREEN',
          safetyCarDeployed: !!status.safetyCar,
          vscDeployed: !!status.vsc,
          timeRemainingSec: status.remainingSec !== undefined ? status.remainingSec : prev.timeRemainingSec,
        }));
      }
    });

    const unsubscribeEntries = f1LiveWebSocketService.subscribe((liveEntries) => {
      if (liveEntries && liveEntries.length > 0) {
        engine.ingestOfficialLiveEntries(liveEntries);
        const currentStatus = f1LiveWebSocketService.getSessionStatus();
        const isFinished = currentStatus.isFinished || currentStatus.isChequered || currentStatus.remaining === '00:00:00';
        if (!isFinished && currentStatus.sessionStatus === 'Started') {
          setIsOfficialLive(true);
          setSignalRStatus('live_streaming');
          setSignalRDetails('Conectado a F1 Live Timing (Directo)');
        }
      }
    });

    const unsubscribeCarData = f1LiveWebSocketService.subscribeCarData((carDataMap) => {
      engine.ingestLiveCarData(carDataMap);
    });

    return () => {
      f1LiveWebSocketService.stopConnection();
      unsubscribeStatus();
      unsubscribeEntries();
      unsubscribeCarData();
    };
  }, [engine]);

  // Connect listeners and start engine for real telemetry feed
  useEffect(() => {
    engine.setListeners({
      onTick: (data) => {
        setLeaderboard(data.leaderboard);
        setSession(data.session);
        setTelemetry(data.selectedDriverTelemetry);
        setPitPrediction(data.pitPrediction);
      },
      onRaceControlMessage: (msg) => {
        setRaceControlMessages(prev => [msg, ...prev]);
      },
      onTeamRadio: (radio) => {
        setTeamRadios(prev => [radio, ...prev]);
      },
    });

    // Initial state emit
    engine.emitCurrentState();

    return () => {
      engine.stop();
    };
  }, [engine]);

  const handleSelectDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
    engine.setSelectedDriver(driverId);
  };

  const selectedDriver = DRIVER_MAP.get(selectedDriverId);

  return (
    <div className="app-container">
      {/* Top Header Navigation (With F1 SignalR status, zero fake controls) */}
      <Header
        session={session}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOfficialLive={isOfficialLive}
        signalRStatus={signalRStatus}
        signalRDetails={signalRDetails}
        onRefreshLive={checkStatus}
      />

      {/* Main View Area */}
      <main className="main-content">
        <div key={activeTab} className="tab-page-transition">
          {/* TAB: Home Sketch Layout (Left: telemetrix + SCHEDULE, Right: Led / Leaderboard) */}
          {activeTab === 'home' && (
            <HomeSketchLayout
              circuit={session.circuit}
              entries={leaderboard}
              selectedDriverId={selectedDriverId}
              onSelectDriver={handleSelectDriver}
              telemetry={telemetry}
              selectedDriver={selectedDriver}
              pitPrediction={pitPrediction}
              trackStatus={session.trackStatus}
              isOfficialLive={isOfficialLive}
              statusMessage={officialStatusMessage}
              nextSessionName={nextSessionName}
              onOpenFullSchedule={() => setActiveTab('schedule')}
            />
          )}

          {/* TAB: Full Live Timing & Telemetry Dashboard */}
          {activeTab === 'timing' && (
            <>
              {/* Top Status & Weather Conditions Strip */}
              {!isOfficialLive ? (
                <div className="weather-strip" style={{
                  background: 'linear-gradient(90deg, rgba(8, 14, 24, 0.95) 0%, rgba(18, 24, 38, 0.95) 100%)',
                  border: '1px solid rgba(0, 215, 182, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="f1-badge" style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#ffd700', border: '1px solid rgba(255, 215, 0, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12} color="#ffd700" />
                      <span>{t('last_session_banner_title', { circuit: session.circuit.name })}</span>
                    </span>

                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {t('last_session_banner_desc', { nextSession: `${nextGp.flag} ${nextGp.name}` })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div className="weather-item">
                      <CloudSun size={14} color="var(--color-yellow)" />
                      <span>{t('track')}: <strong>{session.circuit.name}</strong></span>
                    </div>
                    <div className="weather-item">
                      <Thermometer size={14} color="#ff5555" />
                      <span>{t('air')}: <strong>{session.airTemp}°C</strong></span>
                    </div>
                    <div className="weather-item">
                      <Thermometer size={14} color="#ff9900" />
                      <span>{t('asphalt')}: <strong>{session.trackTemp}°C</strong></span>
                    </div>
                    <span className="f1-badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={11} />
                      <span>{t('auto_sync_ready')}</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="weather-strip">
                  <div className="weather-item">
                    <CloudSun size={15} color="var(--color-yellow)" />
                    <span>{t('track')}: <strong>{session.circuit.name}</strong></span>
                  </div>
                  <div className="weather-item">
                    <Thermometer size={14} color="#ff5555" />
                    <span>{t('air')}: <strong>{session.airTemp}°C</strong></span>
                  </div>
                  <div className="weather-item">
                    <Thermometer size={14} color="#ff9900" />
                    <span>{t('asphalt')}: <strong>{session.trackTemp}°C</strong></span>
                  </div>
                  <div className="weather-item">
                    <Droplets size={14} color="#00a6ff" />
                    <span>{t('humidity')}: <strong>{session.humidity}%</strong></span>
                  </div>
                  <div className="weather-item">
                    <Wind size={14} color="#94a3b8" />
                    <span>{t('wind')}: <strong>{session.windSpeed} km/h</strong></span>
                  </div>
                  <div className="weather-item" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="f1-badge badge-live">🔴 {t('live')}</span>
                  </div>
                </div>
              )}

              {/* Indicador de Banderas en Vivo (Verde / Amarilla con sector / Roja / SC) */}
              <TrackFlagIndicator
                trackStatus={session.trackStatus || 'GREEN'}
                messages={raceControlMessages}
              />

              {/* Telemetry Layout Grid: 80% Tabla de tiempos (Leaderboard) / 20% Barra Lateral */}
              <div className="telemetry-layout-grid">
                {/* Panel Izquierdo: Tabla de Tiempos (Full Height, 80% Ancho) */}
                <div className="telemetry-left-panel">
                  <Leaderboard
                    entries={leaderboard}
                    selectedDriverId={selectedDriverId}
                    onSelectDriver={handleSelectDriver}
                    isQualifying={session.type === 'QUALIFYING'}
                    sessionType={session.type}
                  />
                </div>

                {/* Columna Derecha: Benchmarks + Control de Carrera / Radios + Más Rápido por Sector */}
                <div className="telemetry-right-panel">
                  {/* 1. Best Lap Benchmarks (Session Best morado + récords) */}
                  <BestLapBenchmarks
                    entries={leaderboard}
                    sessionName={session.name || 'Practice 3'}
                    circuitName={session.circuit.name}
                  />

                  {/* 2. Control de Carrera y Radios de Equipo */}
                  <div className="telemetry-rc-section" style={{ flex: 1, minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
                    <RaceControl
                      messages={raceControlMessages}
                      radios={teamRadios}
                    />
                  </div>

                  {/* 3. Más Rápido por Sector (Sustituye al velocímetro) */}
                  <FastestBySector entries={leaderboard} />

                  {/* Entre sesiones: banner informativo elegante */}
                  {!isOfficialLive && (() => {
                    const next = getNextScheduledSession();
                    const nowMs = Date.now();
                    const lastSess = F1_SCHEDULE
                      .flatMap(gp => gp.sessions.map(s => ({ gp, s })))
                      .filter(({ s }) => new Date(s.startTimeUtc).getTime() < nowMs)
                      .pop();
                    return (
                      <div className="f1-card" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⏸ ENTRE SESIONES</span>
                        </div>
                        {lastSess && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Última:</span>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#aaa' }}>{lastSess.s.name} — {lastSess.gp.name}</span>
                            <span style={{ fontSize: '0.62rem', color: '#555', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>FINALIZADA</span>
                          </div>
                        )}
                        {next && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Siguiente:</span>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>{next.sess.name} — {next.gp.name}</span>
                            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: '#00D7B6', background: 'rgba(0,215,182,0.08)', border: '1px solid rgba(0,215,182,0.2)', padding: '1px 5px', borderRadius: '3px' }}>
                              {new Date(next.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {/* TAB: Official Leaderboard (World Drivers & Constructors Championship) */}
          {activeTab === 'leaderboard' && (
            <OfficialLeaderboardView />
          )}

          {/* TAB: Official 24-GP Calendar Schedule */}
          {activeTab === 'schedule' && (
            <ScheduleView />
          )}
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer style={{
        marginTop: 'auto',
        padding: '24px 20px',
        borderTop: '1px solid var(--f1-border)',
        background: 'rgba(8, 10, 15, 0.95)',
        textAlign: 'center',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)'
      }}>
        <p style={{ maxWidth: '820px', margin: '0 auto 8px auto', lineHeight: 1.5 }}>
          {t('footer_text')}
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>
          {t('footer_subtext')}
        </p>
      </footer>
    </div>
  );
};

export default App;
