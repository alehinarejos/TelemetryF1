import React, { useState, useEffect } from 'react';
import type { SessionState } from '../types/telemetry';
import type { SignalRConnectionStatus } from '../services/f1SignalRClient';
import { scheduleSyncService } from '../services/scheduleSyncService';
import type { ScheduleSyncState } from '../services/scheduleSyncService';
import { 
  Calendar, 
  Gauge, 
  LayoutDashboard,
  Trophy,
  RotateCw,
  Radio,
  Wifi,
  Clock
} from 'lucide-react';

interface HeaderProps {
  session: SessionState;
  activeTab: 'home' | 'timing' | 'leaderboard' | 'schedule';
  setActiveTab: (tab: 'home' | 'timing' | 'leaderboard' | 'schedule') => void;
  isOfficialLive: boolean;
  signalRStatus?: SignalRConnectionStatus;
  signalRDetails?: string;
  onRefreshLive?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  activeTab,
  setActiveTab,
  isOfficialLive,
  signalRStatus = 'connected',
  signalRDetails,
  onRefreshLive,
}) => {
  const isStreaming = signalRStatus === 'live_streaming' || isOfficialLive;
  const isConnected = signalRStatus === 'connected' || signalRStatus === 'live_streaming';

  // Schedule subscription to get current / next GP and sessions
  const [scheduleState, setScheduleState] = useState<ScheduleSyncState>(scheduleSyncService.getState());

  useEffect(() => {
    const unsubscribe = scheduleSyncService.subscribe((state) => {
      setScheduleState({ ...state });
    });
    return () => unsubscribe();
  }, []);

  const upcomingGp = scheduleState.schedule.find(g => !g.completed) || scheduleState.schedule[15];

  // Find next upcoming session
  const nowMs = Date.now();
  const nextSession = upcomingGp.sessions.find(s => {
    const t = new Date(s.startTimeUtc).getTime();
    return !isNaN(t) && t > nowMs;
  }) || upcomingGp.sessions[0];

  // Live countdown to the next session
  const [sessionCountdown, setSessionCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetIso = nextSession?.startTimeUtc || `${upcomingGp.startDate}T11:30:00Z`;
    const targetTime = new Date(targetIso).getTime();

    const updateCountdown = () => {
      const diff = Math.max(0, targetTime - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setSessionCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextSession, upcomingGp]);

  return (
    <header className="f1-header">
      <div className="header-top">
        {/* Brand */}
        <div className="brand-section">
          <div className="f1-logo-badge">F1</div>
          <div className="app-title-group">
            <span className="app-name">Telemetry Live</span>
            <span className="app-subtitle">Official F1 SignalR & Live Timing Stream</span>
          </div>
        </div>

        {/* Center Session Pill: Displays current GP and active session, or time remaining until next session */}
        <div className="session-pill" style={{ padding: '6px 14px', minWidth: '380px' }}>
          {isStreaming ? (
            // Active Live Session Running
            <>
              <div className="session-track-info">
                <span className="country-flag">{upcomingGp.flag}</span>
                <div>
                  <div className="circuit-title">{upcomingGp.name}</div>
                  <div className="circuit-session-type">{session.type || 'RACE'} SESSION</div>
                </div>
              </div>

              <div className="session-divider" />

              {session.totalLaps > 0 ? (
                <div className="session-lap-counter">
                  <span className="lap-label">VUELTA</span>
                  <span className="lap-value">{session.currentLap}</span>
                  <span className="lap-label">/ {session.totalLaps}</span>
                </div>
              ) : (
                <div className="session-lap-counter">
                  <span className="lap-label">RESTANTE</span>
                  <span className="lap-value">
                    {Math.floor(session.timeRemainingSec / 60)}:
                    {(session.timeRemainingSec % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              <div className="session-divider" />

              {session.safetyCarDeployed ? (
                <span className="f1-badge badge-sc">SAFETY CAR</span>
              ) : session.vscDeployed ? (
                <span className="f1-badge badge-vsc">VSC ACTIVE</span>
              ) : (
                <span className="f1-badge badge-green">PISTA VERDE</span>
              )}

              <span className="f1-badge badge-live">🔴 EN DIRECTO</span>
            </>
          ) : (
            // Standby: Shows current GP + Next Session + Time Remaining
            <>
              <div className="session-track-info">
                <span className="country-flag" style={{ fontSize: '1.4rem' }}>{upcomingGp.flag}</span>
                <div>
                  <div className="circuit-title" style={{ fontSize: '0.85rem' }}>{upcomingGp.name} 2026</div>
                  <div className="circuit-session-type" style={{ color: '#00D7B6', fontWeight: 700, fontSize: '0.72rem' }}>
                    {nextSession.name}
                  </div>
                </div>
              </div>

              <div className="session-divider" />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color="#00D7B6" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    Próxima sesión en:
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.86rem', color: '#fff', letterSpacing: '0.04em' }}>
                    {sessionCountdown.days}d {String(sessionCountdown.hours).padStart(2, '0')}h {String(sessionCountdown.minutes).padStart(2, '0')}m <strong style={{ color: 'var(--f1-red)' }}>{String(sessionCountdown.seconds).padStart(2, '0')}s</strong>
                  </span>
                </div>
              </div>

              <div className="session-divider" />

              <span className="f1-badge" style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                EN ESPERA
              </span>
            </>
          )}
        </div>

        {/* Official F1 SignalR Live Stream Status Indicator */}
        <div className="header-actions">
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: `1px solid ${isStreaming ? 'rgba(225, 6, 0, 0.4)' : isConnected ? 'rgba(0, 215, 182, 0.3)' : 'var(--f1-border)'}`,
              borderRadius: '6px',
              padding: '5px 12px',
              cursor: 'pointer'
            }}
            title={signalRDetails || 'Conexión WebSocket directa a livetiming.formula1.com/signalrcore'}
          >
            {isStreaming ? (
              <Radio 
                size={14} 
                color="var(--f1-red)" 
                style={{ animation: 'pulse 1.2s infinite' }}
              />
            ) : (
              <Wifi 
                size={14} 
                color={isConnected ? '#00D7B6' : '#ffd700'} 
              />
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.68rem', 
                fontWeight: 800, 
                color: isStreaming ? '#ff4d4d' : isConnected ? '#00D7B6' : '#ffd700',
                letterSpacing: '0.05em'
              }}>
                {isStreaming 
                  ? 'F1 SIGNALR LIVE STREAM' 
                  : isConnected 
                  ? 'F1 SIGNALR CONECTADO' 
                  : 'F1 SIGNALR NEGOCIANDO'}
              </span>
              <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                livetiming.formula1.com • Sin intermediarios
              </span>
            </div>

            {onRefreshLive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshLive();
                }}
                className="f1-btn"
                style={{ padding: '4px', marginLeft: '4px', background: 'transparent', border: 'none' }}
                title="Reconectar con F1 SignalR"
              >
                <RotateCw size={13} color="var(--text-secondary)" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="header-nav">
        <button 
          className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard Principal</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'timing' ? 'active' : ''}`}
          onClick={() => setActiveTab('timing')}
        >
          <Gauge size={15} />
          <span>Telemetría Completa</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Trophy size={15} />
          <span>Leaderboard Oficial</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={15} />
          <span>Calendario Oficial</span>
        </button>
      </nav>
    </header>
  );
};
