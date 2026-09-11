import React, { useState, useEffect } from 'react';
import type { SessionState } from '../types/telemetry';
import type { SignalRConnectionStatus } from '../services/f1SignalRClient';
import { scheduleSyncService, getGrandPrixTimeline } from '../services/scheduleSyncService';
import type { ScheduleSyncState } from '../services/scheduleSyncService';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
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
  onRefreshLive,
}) => {
  const { t } = useLanguage();
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

  // Real-time second clock
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const upcomingGp = scheduleState.schedule.find(g => !g.completed) || scheduleState.schedule[15];
  const timeline = getGrandPrixTimeline(upcomingGp);

  const activeTimelineSession = timeline.activeSession;
  const lastFinishedSession = timeline.lastCompletedSession;
  const nextTargetSession = timeline.nextSession || upcomingGp.sessions[0];

  const targetStartTime = nextTargetSession 
    ? (typeof nextTargetSession === 'object' && 'startTime' in nextTargetSession ? (nextTargetSession as any).startTime : new Date((nextTargetSession as any).startTimeUtc).getTime())
    : new Date(`${upcomingGp.startDate}T11:30:00Z`).getTime();

  // Helper to format next session day and time
  const formatNextSessionInfo = (item: any): string => {
    if (!item) return '';
    const dateObj = item.startTimeUtc 
      ? new Date(item.startTimeUtc) 
      : item.startTime 
      ? new Date(item.startTime) 
      : item.session?.startTimeUtc 
      ? new Date(item.session.startTimeUtc) 
      : null;
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const day = dayNames[dateObj.getDay()];
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${day} ${hours}:${minutes}h`;
  };

  // Determine Chequered vs Live vs Standby states
  const isChequered = 
    session.trackStatus === 'CHEQUERED' ||
    (!activeTimelineSession && lastFinishedSession && (nowMs - lastFinishedSession.endTime) < 3.5 * 3600 * 1000) ||
    (!activeTimelineSession && !isOfficialLive && lastFinishedSession != null);

  const isLiveActive = !isChequered && (
    activeTimelineSession != null ||
    (isOfficialLive && isStreaming && session.trackStatus !== 'CHEQUERED' && (session.timeRemainingSec > 0 || session.type === 'RACE'))
  );

  const remainingSec = (() => {
    if (session.timeRemainingSec > 0) return session.timeRemainingSec;
    if (activeTimelineSession) {
      return Math.max(0, Math.floor((activeTimelineSession.endTime - nowMs) / 1000));
    }
    return 0;
  })();

  // Live countdown to the next session
  const [sessionCountdown, setSessionCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    formattedText: '',
  });

  useEffect(() => {
    const targetTime = isNaN(targetStartTime) ? Date.now() : targetStartTime;

    const updateCountdown = () => {
      const diff = Math.max(0, targetTime - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      let formattedText = '';
      if (days > 0) {
        formattedText = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
      } else {
        formattedText = `${hours}h ${String(minutes).padStart(2, '0')}m`;
      }

      setSessionCountdown({ days, hours, minutes, seconds, formattedText });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetStartTime]);

  return (
    <header className="f1-header">
      <div className="header-top">
        {/* Brand */}
        <div className="brand-section">
          <div className="f1-logo-badge" style={{ letterSpacing: '0.02em', padding: '4px 8px', fontSize: '1rem', fontWeight: 900 }}>
            UC
          </div>
          <div className="app-title-group">
            <span className="app-name" style={{ letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              UNDERCUT <span style={{ color: 'var(--f1-red)', fontSize: '0.82em', fontWeight: 900 }}>F1</span>
            </span>
            <span className="app-subtitle">{t('app_subtitle')}</span>
          </div>
        </div>

        {/* Center Session Pill: Displays Chequered Flag + Next Session Countdown, OR Active Live Session, OR Standby */}
        <div className="session-pill" style={{ padding: '6px 14px' }}>
          {isChequered ? (
            // 🏁 1. Chequered Flag & Post-Session Cooldown: Shows GP + 🏁 BANDERA A CUADROS + Dynamic Countdown to Next Session
            <>
              <div className="session-track-info">
                <span className="country-flag">{upcomingGp.flag}</span>
                <div>
                  <div className="circuit-title">{upcomingGp.name} 2026</div>
                  <div className="circuit-session-type" style={{ color: '#a0aec0', fontWeight: 700, fontSize: '0.72rem' }}>
                    {lastFinishedSession?.session.name || session.name || 'SESIÓN'} FINALIZADA
                  </div>
                </div>
              </div>

              <div className="session-divider" />

              {/* High-contrast animated Chequered Flag Badge */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="badge-chequered">
                  🏁 BANDERA A CUADROS
                </span>
              </div>

              <div className="session-divider" />

              {/* Dynamic Next Session Countdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color="#00D7B6" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    {nextTargetSession ? `Próxima: ${(nextTargetSession as any).session?.name || (nextTargetSession as any).name} (${formatNextSessionInfo(nextTargetSession)})` : 'Próxima sesión:'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.86rem', color: '#fff', letterSpacing: '0.04em' }}>
                    {sessionCountdown.days > 0 && `${sessionCountdown.days}d `}
                    {(sessionCountdown.days > 0 || sessionCountdown.hours > 0) && (
                      <>{sessionCountdown.days > 0 ? String(sessionCountdown.hours).padStart(2, '0') : sessionCountdown.hours}h </>
                    )}
                    {(sessionCountdown.days > 0 || sessionCountdown.hours > 0 || sessionCountdown.minutes > 0) && (
                      <>{(sessionCountdown.days > 0 || sessionCountdown.hours > 0) ? String(sessionCountdown.minutes).padStart(2, '0') : sessionCountdown.minutes}m </>
                    )}
                    <strong style={{ color: 'var(--f1-red)' }}>{String(sessionCountdown.seconds).padStart(2, '0')}s</strong>
                  </span>
                </div>
              </div>

              <div className="session-divider" />

              <span className="f1-badge" style={{ fontSize: '0.66rem', color: '#ffd700', border: '1px solid rgba(255, 215, 0, 0.4)', background: 'rgba(255, 215, 0, 0.1)' }}>
                FINALIZADA 🏁
              </span>
            </>
          ) : isLiveActive ? (
            // 🔴 2. Active Live Session Running on Track
            <>
              <div className="session-track-info">
                <span className="country-flag">{upcomingGp.flag}</span>
                <div>
                  <div className="circuit-title">{upcomingGp.name}</div>
                  <div className="circuit-session-type" style={{ color: '#ff4d4d', fontWeight: 800 }}>
                    {activeTimelineSession ? `${activeTimelineSession.session.name} ${t('session_live')}` : `${session.name || session.type || 'F1'} ${t('session_live')}`}
                  </div>
                </div>
              </div>

              <div className="session-divider" />

              {session.type === 'RACE' || session.type === 'SPRINT' ? (
                <div className="session-lap-counter">
                  <span className="lap-label">{t('lap_upper')}</span>
                  <span className="lap-value">{session.currentLap}</span>
                  <span className="lap-label">/ {session.totalLaps}</span>
                </div>
              ) : (
                <div className="session-lap-counter">
                  <span className="lap-label">{t('remaining_upper')}</span>
                  <span className="lap-value" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#00D7B6', letterSpacing: '0.04em' }}>
                    {(() => {
                      const mins = Math.floor(remainingSec / 60);
                      const secs = Math.floor(remainingSec % 60);
                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                    })()}
                  </span>
                </div>
              )}

              <div className="session-divider" />

              {session.safetyCarDeployed ? (
                <span className="f1-badge badge-sc">SAFETY CAR</span>
              ) : session.vscDeployed ? (
                <span className="f1-badge badge-vsc">VSC ACTIVE</span>
              ) : (
                <span className="f1-badge badge-green">{t('track_clear_green')}</span>
              )}

              <span className="f1-badge badge-live">🔴 {t('live')}</span>
            </>
          ) : (
            // ⏱️ 3. Standby / Pre-Event: Shows current GP + Next Session + Time Remaining
            <>
              <div className="session-track-info">
                <span className="country-flag" style={{ fontSize: '1.4rem' }}>{upcomingGp.flag}</span>
                <div>
                  <div className="circuit-title" style={{ fontSize: '0.85rem' }}>{upcomingGp.name} 2026</div>
                  <div className="circuit-session-type" style={{ color: '#00D7B6', fontWeight: 700, fontSize: '0.72rem' }}>
                    {(nextTargetSession as any)?.session?.name || (nextTargetSession as any)?.name || t('waiting')}
                  </div>
                </div>
              </div>

              <div className="session-divider" />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color="#00D7B6" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    {t('next_event_in')}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.86rem', color: '#fff', letterSpacing: '0.04em' }}>
                    {sessionCountdown.days > 0 && `${sessionCountdown.days}d `}
                    {(sessionCountdown.days > 0 || sessionCountdown.hours > 0) && (
                      <>{sessionCountdown.days > 0 ? String(sessionCountdown.hours).padStart(2, '0') : sessionCountdown.hours}h </>
                    )}
                    {(sessionCountdown.days > 0 || sessionCountdown.hours > 0 || sessionCountdown.minutes > 0) && (
                      <>{(sessionCountdown.days > 0 || sessionCountdown.hours > 0) ? String(sessionCountdown.minutes).padStart(2, '0') : sessionCountdown.minutes}m </>
                    )}
                    <strong style={{ color: 'var(--f1-red)' }}>{String(sessionCountdown.seconds).padStart(2, '0')}s</strong>
                  </span>
                </div>
              </div>

              <div className="session-divider" />

              <span className="f1-badge" style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                {t('waiting')}
              </span>
            </>
          )}
        </div>

        {/* Live Status Indicator & Language Selector */}
        <div className="header-actions">
          <div 
            className="header-status-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: isLiveActive 
                ? 'rgba(225, 6, 0, 0.16)' 
                : isChequered
                ? 'rgba(255, 255, 255, 0.08)'
                : isConnected 
                ? 'rgba(0, 215, 182, 0.12)' 
                : 'rgba(255, 255, 255, 0.05)',
              border: isLiveActive 
                ? '1px solid rgba(225, 6, 0, 0.4)' 
                : isChequered
                ? '1px solid rgba(255, 255, 255, 0.25)'
                : isConnected 
                ? '1px solid rgba(0, 215, 182, 0.3)' 
                : '1px solid rgba(255, 255, 255, 0.1)',
            }}
            title={t('connection_status_title')}
          >
            {isLiveActive ? (
              <Radio 
                size={14} 
                color="var(--f1-red)" 
                style={{ animation: 'pulse 1.2s infinite', flexShrink: 0 }}
              />
            ) : isChequered ? (
              <span style={{ fontSize: '0.85rem' }}>🏁</span>
            ) : (
              <Wifi 
                size={14} 
                color={isConnected ? '#00D7B6' : '#ffd700'} 
                style={{ flexShrink: 0 }}
              />
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="status-pill-text-main" style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.72rem', 
                fontWeight: 800, 
                color: isLiveActive ? '#ff4d4d' : isChequered ? '#ffffff' : isConnected ? '#00D7B6' : '#ffd700',
                letterSpacing: '0.04em'
              }}>
                {isLiveActive 
                  ? t('live')
                  : isChequered
                  ? 'FINALIZADA'
                  : isConnected 
                  ? t('connected')
                  : t('updating')}
              </span>
              <span className="status-pill-text-sub" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                {isChequered ? 'Bandera a cuadros' : t('official_f1_data')}
              </span>
            </div>

            {onRefreshLive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshLive();
                }}
                className="f1-btn"
                style={{ padding: '3px', marginLeft: '2px', background: 'transparent', border: 'none' }}
                title={t('update_data')}
              >
                <RotateCw size={12} color="var(--text-secondary)" />
              </button>
            )}
          </div>

          {/* Multilingual Selector */}
          <LanguageSelector />
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <LayoutDashboard size={14} />
          <span className="tab-label-desktop">{t('tab_dashboard')}</span>
          <span className="tab-label-mobile">{t('tab_home_mobile')}</span>
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'timing' ? 'active' : ''}`}
          onClick={() => setActiveTab('timing')}
        >
          <Gauge size={14} />
          <span className="tab-label-desktop">{t('tab_telemetry')}</span>
          <span className="tab-label-mobile">{t('tab_telemetry_mobile')}</span>
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Trophy size={14} />
          <span className="tab-label-desktop">{t('tab_leaderboard')}</span>
          <span className="tab-label-mobile">{t('tab_leaderboard_mobile')}</span>
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={14} />
          <span className="tab-label-desktop">{t('tab_schedule')}</span>
          <span className="tab-label-mobile">{t('tab_schedule_mobile')}</span>
        </button>
      </nav>
    </header>
  );
};
