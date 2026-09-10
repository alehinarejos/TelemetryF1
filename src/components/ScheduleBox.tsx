import React, { useState, useEffect } from 'react';
import { scheduleSyncService, getGrandPrixTimeline } from '../services/scheduleSyncService';
import type { ScheduleSyncState } from '../services/scheduleSyncService';
import { useLanguage } from '../context/LanguageContext';
import { RaceResultsModal } from './RaceResultsModal';
import { Calendar, Clock, ChevronRight, Trophy, Sparkles, Flag, CheckCircle } from 'lucide-react';

interface ScheduleBoxProps {
  onOpenFullSchedule: () => void;
}

export const ScheduleBox: React.FC<ScheduleBoxProps> = ({ onOpenFullSchedule }) => {
  const { t } = useLanguage();
  const [syncState, setSyncState] = useState<ScheduleSyncState>(scheduleSyncService.getState());
  const [modalRound, setModalRound] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = scheduleSyncService.subscribe((state) => {
      setSyncState({ ...state });
    });
    return () => unsubscribe();
  }, []);

  const schedule = syncState.schedule;
  const nextGp = schedule.find(gp => !gp.completed) || schedule[15];
  const lastCompletedGp = schedule[14]; // Round 15 Monza

  const timeline = getGrandPrixTimeline(nextGp);
  const nextTargetSession = timeline.nextSession;
  const lastFinished = timeline.lastCompletedSession;
  const activeSession = timeline.activeSession;

  const targetDateMs = nextTargetSession 
    ? nextTargetSession.startTime 
    : new Date(`${nextGp.startDate}T11:30:00Z`).getTime();

  // Live countdown to next race/session
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = isNaN(targetDateMs) ? Date.now() : targetDateMs;

    const updateCountdown = () => {
      const now = Date.now();
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
  }, [targetDateMs]);

  return (
    <div className="schedule-card">
      {/* Top Header */}
      <div className="schedule-header">
        <div className="schedule-title">
          <Calendar color="var(--f1-red)" size={18} />
          <span>{t('schedule_title')}</span>
          <span style={{ 
            fontSize: '0.65rem', 
            color: '#00D7B6', 
            background: 'rgba(0, 215, 182, 0.12)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            <Sparkles size={10} />
            <span>{t('official_hours')}</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {lastCompletedGp && (
            <button
              onClick={() => setModalRound(lastCompletedGp.round)}
              className="f1-btn"
              style={{ padding: '4px 10px', fontSize: '0.72rem', gap: '5px', borderColor: 'rgba(255,215,0,0.3)', color: '#ffd700' }}
              title="Ver resultados oficiales de la última carrera"
            >
              <Trophy size={12} color="#ffd700" />
              <span>{t('results_r15')}</span>
            </button>
          )}

          <button 
            onClick={onOpenFullSchedule}
            className="f1-btn f1-btn-active" 
            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
          >
            <span>{t('view_full_schedule')}</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Next GP Info + Countdown to the right of GP name */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '2.4rem', lineHeight: 1 }}>{nextGp.flag}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--f1-red)', fontWeight: 800 }}>
                  {t('round').toUpperCase()} {nextGp.round} • {t('next_gp')}
                </span>
                <span style={{ 
                  fontSize: '0.64rem', 
                  color: '#00D7B6', 
                  background: 'rgba(0, 215, 182, 0.12)', 
                  padding: '1px 6px', 
                  borderRadius: '4px', 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 600 
                }}>
                  {t('official_f1_data').toUpperCase()}
                </span>
              </div>

              {/* GP Name with Countdown directly to the right */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.22rem', color: '#fff' }}>
                  {nextGp.name} 2026
                </span>

                {/* Countdown directly to the right of the Grand Prix name */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: activeSession 
                    ? '1px solid rgba(225, 6, 0, 0.5)' 
                    : nextTargetSession 
                    ? '1px solid rgba(0, 215, 182, 0.35)' 
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '4px 10px'
                }}>
                  <Clock size={12} color={activeSession ? 'var(--f1-red)' : '#00D7B6'} />
                  <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    {activeSession 
                      ? `${t('live')}:` 
                      : lastFinished && nextTargetSession 
                      ? `${t('session_next')} (${nextTargetSession.session.name.toUpperCase()}):` 
                      : `${t('next_event_in').toUpperCase()}`}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem', color: '#fff', letterSpacing: '0.04em' }}>
                    {timeLeft.days > 0 && `${timeLeft.days}d `}
                    {(timeLeft.days > 0 || timeLeft.hours > 0) && (
                      <>{timeLeft.days > 0 ? String(timeLeft.hours).padStart(2, '0') : timeLeft.hours}h </>
                    )}
                    {(timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0) && (
                      <>{(timeLeft.days > 0 || timeLeft.hours > 0) ? String(timeLeft.minutes).padStart(2, '0') : timeLeft.minutes}m </>
                    )}
                    <strong style={{ color: 'var(--f1-red)' }}>{String(timeLeft.seconds).padStart(2, '0')}s</strong>
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {nextGp.circuitName} • {nextGp.startDate} al {nextGp.endDate}
              </span>
            </div>
          </div>
        </div>

        {/* Sessions list in a single horizontal row underneath with live status */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${timeline.sessions.length}, minmax(0, 1fr))`, 
          gap: '8px', 
          width: '100%',
          marginTop: '2px'
        }}>
          {timeline.sessions.map((sessInfo, idx) => {
            const isRace = sessInfo.session.type === 'Race';
            const isCompleted = sessInfo.status === 'completed';
            const isLive = sessInfo.status === 'live';
            const isNext = sessInfo.status === 'next';
            const isNoTime = sessInfo.formattedTime === 'n/d';

            return (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px',
                  background: isLive
                    ? 'linear-gradient(180deg, rgba(225, 6, 0, 0.25) 0%, rgba(0, 0, 0, 0.6) 100%)'
                    : isNext
                    ? 'linear-gradient(180deg, rgba(0, 215, 182, 0.12) 0%, rgba(0, 0, 0, 0.45) 100%)'
                    : isRace 
                    ? 'linear-gradient(180deg, rgba(225, 6, 0, 0.14) 0%, rgba(0, 0, 0, 0.45) 100%)' 
                    : isCompleted
                    ? 'rgba(0, 0, 0, 0.2)'
                    : 'rgba(0, 0, 0, 0.35)', 
                  padding: '8px 10px', 
                  borderRadius: '6px', 
                  border: isLive
                    ? '1px solid #ff4d4d'
                    : isNext
                    ? '1px solid rgba(0, 215, 182, 0.45)'
                    : isRace 
                    ? '1px solid rgba(225, 6, 0, 0.35)' 
                    : isCompleted
                    ? '1px solid rgba(255, 255, 255, 0.04)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  opacity: isCompleted ? 0.75 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: isCompleted ? 'var(--text-secondary)' : '#fff', fontWeight: isRace || isNext || isLive ? 800 : 600 }}>
                    {isLive ? (
                      <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#ff4d4d', animation: 'pulse 1s infinite' }} />
                    ) : isCompleted ? (
                      <CheckCircle size={12} color="#00D7B6" />
                    ) : isRace ? (
                      <Flag size={12} color="var(--f1-red)" />
                    ) : (
                      <Clock size={11} color="var(--text-muted)" />
                    )}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sessInfo.session.name}</span>
                  </div>

                  {isLive && (
                    <span style={{ fontSize: '0.58rem', color: '#fff', background: '#ff4d4d', padding: '1px 4px', borderRadius: '3px', fontWeight: 800, textTransform: 'uppercase' }}>
                      {t('session_live')}
                    </span>
                  )}
                  {isCompleted && (
                    <span style={{ fontSize: '0.58rem', color: '#00D7B6', background: 'rgba(0, 215, 182, 0.12)', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                      {t('session_fin')}
                    </span>
                  )}
                  {isNext && (
                    <span style={{ fontSize: '0.58rem', color: '#00D7B6', background: 'rgba(0, 215, 182, 0.18)', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>
                      {t('session_next')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {sessInfo.formattedDate}
                  </span>
                  <span style={{
                    color: isCompleted ? 'var(--text-muted)' : isNoTime ? 'var(--text-muted)' : isRace ? '#ff4d4d' : '#00D7B6',
                    fontWeight: 700,
                    background: isCompleted ? 'rgba(255, 255, 255, 0.03)' : isNoTime ? 'rgba(255, 255, 255, 0.05)' : isRace ? 'rgba(225, 6, 0, 0.2)' : 'rgba(0, 215, 182, 0.12)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    border: isCompleted ? '1px solid rgba(255, 255, 255, 0.05)' : isNoTime ? '1px solid rgba(255, 255, 255, 0.08)' : isRace ? '1px solid rgba(225, 6, 0, 0.3)' : '1px solid rgba(0, 215, 182, 0.25)',
                    whiteSpace: 'nowrap'
                  }}>
                    {sessInfo.formattedTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalRound !== null && (
        <RaceResultsModal
          round={modalRound}
          onClose={() => setModalRound(null)}
          onSelectRound={(r) => setModalRound(r)}
        />
      )}
    </div>
  );
};
