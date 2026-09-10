import React, { useState, useEffect } from 'react';
import { scheduleSyncService, formatSessionFull } from '../services/scheduleSyncService';
import type { ScheduleSyncState } from '../services/scheduleSyncService';
import { RaceResultsModal } from './RaceResultsModal';
import { Calendar, Clock, ChevronRight, Trophy, Sparkles, Flag } from 'lucide-react';

interface ScheduleBoxProps {
  onOpenFullSchedule: () => void;
}

export const ScheduleBox: React.FC<ScheduleBoxProps> = ({ onOpenFullSchedule }) => {
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

  // Live countdown to next race/session
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const raceSession = nextGp.sessions.find(s => s.type === 'Race');
    const targetIso = raceSession?.startTimeUtc || `${nextGp.startDate}T13:00:00Z`;
    const targetDate = new Date(targetIso).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextGp]);

  return (
    <div className="schedule-card">
      {/* Top Header */}
      <div className="schedule-header">
        <div className="schedule-title">
          <Calendar color="var(--f1-red)" size={18} />
          <span>SCHEDULE • CALENDARIO F1 2026</span>
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
            <span>HORARIOS OFICIALES</span>
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
              <span>Resultados R15 (Monza)</span>
            </button>
          )}

          <button 
            onClick={onOpenFullSchedule}
            className="f1-btn f1-btn-active" 
            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
          >
            <span>Ver Calendario Completo</span>
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
                  RONDA {nextGp.round} • PRÓXIMO GP
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
                  EN DIRECTO PRÓXIMAMENTE
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
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '4px 10px'
                }}>
                  <Clock size={12} color="#00D7B6" />
                  <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    EMPIEZA EN:
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem', color: '#fff', letterSpacing: '0.04em' }}>
                    {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m <strong style={{ color: 'var(--f1-red)' }}>{String(timeLeft.seconds).padStart(2, '0')}s</strong>
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {nextGp.circuitName} • {nextGp.startDate} al {nextGp.endDate}
              </span>
            </div>
          </div>
        </div>

        {/* Sessions list in a single horizontal row underneath */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${nextGp.sessions.length}, minmax(0, 1fr))`, 
          gap: '8px', 
          width: '100%',
          marginTop: '2px'
        }}>
          {nextGp.sessions.map((sess, idx) => {
            const isRace = sess.type === 'Race';
            const { dateStr, timeStr } = formatSessionFull(sess);
            const isNoTime = timeStr === 'n/d';

            return (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px',
                  background: isRace 
                    ? 'linear-gradient(180deg, rgba(225, 6, 0, 0.14) 0%, rgba(0, 0, 0, 0.45) 100%)' 
                    : 'rgba(0, 0, 0, 0.35)', 
                  padding: '8px 10px', 
                  borderRadius: '6px', 
                  border: isRace ? '1px solid rgba(225, 6, 0, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#fff', fontWeight: isRace ? 800 : 600 }}>
                    {isRace ? <Flag size={12} color="var(--f1-red)" /> : <Clock size={11} color="var(--text-muted)" />}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sess.name}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {dateStr}
                  </span>
                  <span style={{
                    color: isNoTime ? 'var(--text-muted)' : isRace ? '#ff4d4d' : '#00D7B6',
                    fontWeight: 700,
                    background: isNoTime ? 'rgba(255, 255, 255, 0.05)' : isRace ? 'rgba(225, 6, 0, 0.2)' : 'rgba(0, 215, 182, 0.12)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    border: isNoTime ? '1px solid rgba(255, 255, 255, 0.08)' : isRace ? '1px solid rgba(225, 6, 0, 0.3)' : '1px solid rgba(0, 215, 182, 0.25)',
                    whiteSpace: 'nowrap'
                  }}>
                    {timeStr}
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
