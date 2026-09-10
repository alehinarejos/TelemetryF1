import React, { useState, useEffect } from 'react';
import { scheduleSyncService, formatSessionFull } from '../services/scheduleSyncService';
import type { ScheduleSyncState } from '../services/scheduleSyncService';
import { useLanguage } from '../context/LanguageContext';
import { RaceResultsModal } from './RaceResultsModal';
import { Trophy, Clock, Flag, Calendar, Timer, ChevronRight, RotateCw, CheckCircle2 } from 'lucide-react';

export const ScheduleView: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [syncState, setSyncState] = useState<ScheduleSyncState>(scheduleSyncService.getState());

  useEffect(() => {
    const unsubscribe = scheduleSyncService.subscribe((state) => {
      setSyncState({ ...state });
    });
    return () => unsubscribe();
  }, []);

  const schedule = syncState.schedule;
  
  // Find next upcoming race (e.g. Round 16 Madrid)
  const nextGp = schedule.find(gp => !gp.completed) || schedule[15];

  // Live countdown state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const nextSession = nextGp.sessions.find(s => {
      const t = new Date(s.startTimeUtc).getTime();
      return !isNaN(t) && t > Date.now();
    }) || nextGp.sessions[0];

    const targetIso = nextSession?.startTimeUtc || `${nextGp.startDate}T11:30:00Z`;
    const targetDate = new Date(targetIso).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextGp]);

  const filteredGps = schedule.filter(gp => {
    if (filter === 'upcoming') return !gp.completed;
    if (filter === 'completed') return gp.completed;
    return true;
  });

  const handleManualCheck = () => {
    scheduleSyncService.fetchOfficialSchedule(true);
  };

  return (
    <div className="schedule-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Countdown Hero Banner */}
      <div className="countdown-banner">
        <div className="countdown-info">
          <span className="countdown-eyebrow">{t('next_gp')}</span>
          <h2 className="countdown-gp-name">
            {nextGp.flag} {nextGp.name} 2026
          </h2>
          <span className="countdown-track">
            {nextGp.circuitName} • {nextGp.startDate} al {nextGp.endDate}
          </span>
        </div>

        <div className="countdown-timer-group">
          {timeLeft.days > 0 && (
            <div className="timer-unit-box">
              <span className="timer-number">{timeLeft.days}</span>
              <span className="timer-label">{t('days')}</span>
            </div>
          )}
          {(timeLeft.days > 0 || timeLeft.hours > 0) && (
            <div className="timer-unit-box">
              <span className="timer-number">
                {timeLeft.days > 0 ? String(timeLeft.hours).padStart(2, '0') : timeLeft.hours}
              </span>
              <span className="timer-label">{t('hours')}</span>
            </div>
          )}
          {(timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0) && (
            <div className="timer-unit-box">
              <span className="timer-number">
                {(timeLeft.days > 0 || timeLeft.hours > 0) ? String(timeLeft.minutes).padStart(2, '0') : timeLeft.minutes}
              </span>
              <span className="timer-label">{t('min')}</span>
            </div>
          )}
          <div className="timer-unit-box">
            <span className="timer-number" style={{ color: 'var(--f1-red)' }}>
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="timer-label">{t('sec')}</span>
          </div>
        </div>
      </div>

      {/* Auto-Sync Weekly Check Status Banner */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(0, 215, 182, 0.08) 0%, rgba(225, 6, 0, 0.05) 100%)',
        border: '1px solid rgba(0, 215, 182, 0.25)',
        borderRadius: '8px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.78rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#00D7B6',
            boxShadow: '0 0 10px #00D7B6',
            display: 'inline-block'
          }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ color: '#00D7B6' }}>{t('official_hours')}:</strong>
              <span className="f1-badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={10} />
                <span>{t('confirmed_by_fia')}</span>
              </span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              {t('schedule_auto_sync_desc')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>{t('last_check')} <strong style={{ color: '#fff' }}>{syncState.lastWeeklyCheck ? syncState.lastWeeklyCheck.toLocaleDateString() : 'Activa'}</strong></span>
            <span>{t('next_review')} <strong style={{ color: '#00D7B6' }}>{syncState.nextWeeklyCheck ? syncState.nextWeeklyCheck.toLocaleDateString() : 'En 7 días'}</strong></span>
          </div>

          <button
            onClick={handleManualCheck}
            disabled={syncState.isChecking}
            className="f1-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', padding: '6px 12px' }}
            title={t('check_hours')}
          >
            <RotateCw 
              size={13} 
              style={{
                animation: syncState.isChecking ? 'spin 1s linear infinite' : 'none'
              }}
            />
            <span>{syncState.isChecking ? t('checking') : t('check_hours')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Subheader Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Calendar size={22} color="var(--f1-red)" />
            <span>CALENDARIO OFICIAL F1 - TEMPORADA 2026</span>
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Haz click en cualquier carrera completada para ver los resultados oficiales de todos los pilotos
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`f1-btn ${filter === 'all' ? 'f1-btn-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('filter_all', { count: schedule.length })}
          </button>
          <button 
            className={`f1-btn ${filter === 'completed' ? 'f1-btn-active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            {t('filter_completed', { count: 15 })}
          </button>
          <button 
            className={`f1-btn ${filter === 'upcoming' ? 'f1-btn-active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            {t('filter_upcoming', { count: 9 })}
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {filteredGps.map((gp) => {
          const isCompleted = gp.completed;

          return (
            <div 
              key={gp.round} 
              className={`gp-card ${gp.round === nextGp.round ? 'next-up' : ''} ${isCompleted ? 'gp-card-interactive' : ''}`}
              onClick={() => {
                if (isCompleted) {
                  setSelectedRound(gp.round);
                }
              }}
              title={isCompleted ? `Ver resultados oficiales del ${gp.name}` : undefined}
            >
              <div className="gp-card-header">
                <span className="gp-round">{t('round').toUpperCase()} {gp.round}</span>
                {isCompleted ? (
                  <span className="f1-badge badge-green">COMPLETADO</span>
                ) : gp.round === nextGp.round ? (
                  <span className="f1-badge badge-live">{t('session_next')}</span>
                ) : (
                  <span className="f1-badge">PROGRAMADO</span>
                )}
              </div>

              <div className="gp-title-area">
                <span className="gp-flag">{gp.flag}</span>
                <div className="gp-names">
                  <span className="gp-main-title">{gp.name}</span>
                  <span className="gp-circuit-name">{gp.circuitName}</span>
                </div>
              </div>

              {/* Sessions timetable with official hour & n/d */}
              <div className="gp-sessions-list">
                {gp.sessions.map((sess, idx) => {
                  const isRace = sess.type === 'Race';
                  const { dateStr, timeStr } = formatSessionFull(sess);
                  const isNoTime = timeStr === 'n/d';

                  return (
                    <div 
                      key={idx} 
                      className={`session-schedule-row ${isRace ? 'race' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                      }}
                    >
                      <div className="session-name-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isRace ? <Flag size={13} color="var(--f1-red)" /> : <Clock size={12} />}
                        <span style={{ fontWeight: isRace ? 700 : 500 }}>{sess.name}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {dateStr}
                        </span>
                        <span style={{
                          background: isNoTime ? 'rgba(255, 255, 255, 0.05)' : isRace ? 'rgba(225, 6, 0, 0.15)' : 'rgba(0, 215, 182, 0.12)',
                          color: isNoTime ? 'var(--text-muted)' : isRace ? '#ff4d4d' : '#00D7B6',
                          border: isNoTime ? '1px solid rgba(255, 255, 255, 0.08)' : isRace ? '1px solid rgba(225, 6, 0, 0.3)' : '1px solid rgba(0, 215, 182, 0.25)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}>
                          {timeStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Winner & Pole info if completed */}
              {isCompleted && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {gp.winner && (
                    <div className="gp-winner-box">
                      <Trophy size={15} color="#ffd700" />
                      <span>Ganador: <strong>{gp.winner}</strong></span>
                    </div>
                  )}

                  {gp.polePosition && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 8px',
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      <Timer size={13} color="var(--f1-red)" />
                      <span>Pole: <strong style={{ color: '#fff' }}>{gp.polePosition}</strong></span>
                    </div>
                  )}

                  {/* Click to view all drivers result button */}
                  <div className="gp-card-view-results-btn">
                    <Trophy size={13} />
                    <span>Ver Resultados (22 Pilotos)</span>
                    <ChevronRight size={13} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Driver Results Modal */}
      {selectedRound !== null && (
        <RaceResultsModal
          round={selectedRound}
          onClose={() => setSelectedRound(null)}
          onSelectRound={(newRound) => setSelectedRound(newRound)}
        />
      )}
    </div>
  );
};
