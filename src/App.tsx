import React, { useState, useEffect, useRef } from 'react';
import { TelemetryEngine } from './services/telemetryEngine';
import { officialF1Api } from './services/officialF1Api';
import { f1SignalR } from './services/f1SignalRClient';
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
import { CircuitMap } from './components/CircuitMap';
import { CarTelemetry } from './components/CarTelemetry';
import { CircleOfDoom } from './components/CircleOfDoom';
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
import './styles/circle-of-doom.css';
import './styles/race-control.css';
import './styles/schedule.css';
import './styles/home-layout.css';

export const App: React.FC = () => {
  const { t } = useLanguage();
  // Telemetry Engine (connected to realistic data stream & official fallback)
  const engineRef = useRef<TelemetryEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new TelemetryEngine('monza');
  }
  const engine = engineRef.current;

  // Active tab: 'home' is the sketch layout requested by the user
  const [activeTab, setActiveTab] = useState<'home' | 'timing' | 'leaderboard' | 'schedule'>('home');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => engine.getLeaderboard());
  const [session, setSession] = useState<SessionState>(() => engine.getSession());
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

  // Check official live session status periodically
  const checkStatus = async () => {
    f1SignalR.connect();
    const status = await officialF1Api.checkLiveStatus();
    setIsOfficialLive(status.isLive || signalRStatus === 'live_streaming');
    setOfficialStatusMessage(status.statusMessage);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [signalRStatus]);

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

              {/* Dashboard 3-Column Grid with 100% Real GPS Geometry and Real Telemetry */}
              <div className="dashboard-grid">
                {/* Column 1: Live Timing Leaderboard */}
                <div className="grid-col-leaderboard">
                  <Leaderboard
                    entries={leaderboard}
                    selectedDriverId={selectedDriverId}
                    onSelectDriver={handleSelectDriver}
                    isQualifying={session.type === 'QUALIFYING'}
                  />
                </div>

                {/* Column 2: Live Real GPS Circuit Map & Circle of Doom */}
                <div className="grid-col-center">
                  <CircuitMap
                    circuit={session.circuit}
                    entries={leaderboard}
                    selectedDriverId={selectedDriverId}
                    onSelectDriver={handleSelectDriver}
                    trackStatus={session.trackStatus}
                  />

                  <CircleOfDoom
                    entries={leaderboard}
                    selectedDriverId={selectedDriverId}
                    onSelectDriver={handleSelectDriver}
                    pitPrediction={pitPrediction}
                    pitLossSeconds={session.circuit.pitLossSeconds}
                  />
                </div>

                {/* Column 3: Car Telemetry Gauges & Race Control Feed */}
                <div className="grid-col-right">
                  <CarTelemetry
                    telemetry={telemetry}
                    driver={selectedDriver}
                  />

                  <RaceControl
                    messages={raceControlMessages}
                    radios={teamRadios}
                  />
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
