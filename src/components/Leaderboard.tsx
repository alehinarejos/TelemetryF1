import React, { useState } from 'react';
import type { LeaderboardEntry } from '../types/telemetry';
import { useLanguage } from '../context/LanguageContext';
import { TeamLogo } from './TeamLogo';

// Helper to parse lap time to seconds for finding fastest lap
const parseLapTimeToSec = (t?: string): number => {
  if (!t || t.includes('-') || t.includes('DNF') || t.trim() === '') return Infinity;
  const clean = t.replace('+', '').trim();
  const parts = clean.split(':');
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(clean) || Infinity;
};

// Mini Sector Group (8 mini-bars for S1, 8 for S2, 9 for S3 = 25 total)
function MiniSectorGroup({
  time,
  status,
  segments,
  count,
}: {
  time?: string;
  status: string;
  segments?: Array<string>;
  count: number;
}) {
  const colorMap: Record<string, string> = {
    purple: '#d354ff',
    green: '#00e676',
    yellow: '#ffd60a',
    pit: '#0095ff',
    none: 'rgba(255, 255, 255, 0.12)',
  };

  const ticks: string[] = [];
  for (let i = 0; i < count; i++) {
    if (segments && segments[i] && colorMap[segments[i]]) {
      ticks.push(colorMap[segments[i]]);
    } else if (status && status !== 'none') {
      ticks.push(colorMap[status] || colorMap.none);
    } else {
      ticks.push(colorMap.none);
    }
  }

  const timeColor =
    status === 'purple'
      ? '#d354ff'
      : status === 'green'
      ? '#00e676'
      : status === 'yellow'
      ? '#ffd60a'
      : status === 'pit'
      ? '#0095ff'
      : '#64748b';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      flex: 1,
      minWidth: 0,
    }}>
      {/* Row of micro-bars (larger, vivid, clearly visible) */}
      <div style={{ display: 'flex', gap: '2.5px', width: '100%', justifyContent: 'center' }}>
        {ticks.map((c, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              maxWidth: '12px',
              minWidth: '4px',
              height: '8px',
              borderRadius: '2px',
              backgroundColor: c,
              boxShadow: c === '#d354ff' 
                ? '0 0 6px rgba(211, 84, 255, 0.85)' 
                : c === '#00e676'
                ? '0 0 5px rgba(0, 230, 118, 0.65)'
                : 'none',
              transition: 'background-color 0.2s ease',
            }}
          />
        ))}
      </div>
      {/* Sector time */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.72rem',
        fontWeight: status === 'purple' || status === 'green' ? 800 : 600,
        color: timeColor,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        marginTop: '1px',
      }}>
        {time && time.trim() !== '' ? time : '—'}
      </span>
    </div>
  );
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  selectedDriverId: string;
  onSelectDriver: (driverId: string) => void;
  isQualifying?: boolean;
  sessionType?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  selectedDriverId,
  onSelectDriver,
  isQualifying = false,
  sessionType: _sessionType = 'PRACTICE',
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'timing' | 'stints'>('timing');

  // Find the overall session best lap time
  let minSessionBestSec = Infinity;
  for (const e of entries) {
    const s = parseLapTimeToSec(e.bestLapTime);
    if (s < minSessionBestSec) {
      minSessionBestSec = s;
    }
  }

  return (
    <div className="f1-card leaderboard-container">
      {/* Top Header Card Controls: Timing / Stints toggle */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>
            Leaderboard
          </span>
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '6px',
            padding: '2px',
            marginLeft: '12px',
          }}>
            <button
              style={{
                background: viewMode === 'timing' ? '#2563eb' : 'transparent',
                color: viewMode === 'timing' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 10px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
              onClick={() => setViewMode('timing')}
            >
              Timing
            </button>
            <button
              style={{
                background: viewMode === 'stints' ? '#2563eb' : 'transparent',
                color: viewMode === 'stints' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 10px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
              onClick={() => setViewMode('stints')}
            >
              Stints
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="f1-badge badge-green" style={{ fontSize: '0.62rem', padding: '2px 8px' }}>
            {t('official_fia')}
          </div>
        </div>
      </div>

      {/* Table Header: POS | DRIVER | GAP | INT | LAST | BEST | MINI-SECTORS | LAPS | PIT | TYRE */}
      <div className="leaderboard-header-row">
        <span className="col-header-center">POS</span>
        <span style={{ paddingLeft: '4px' }}>DRIVER</span>
        <span className="col-header-center">GAP</span>
        <span className="col-header-center">INT</span>
        <span className="col-header-center">LAST</span>
        <span className="col-header-center">BEST</span>
        <span className="col-header-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
          MINI-SECTORS <span style={{ fontSize: '0.55rem', opacity: 0.6 }}>ⓘ</span>
        </span>
        <span className="col-header-center">LAPS</span>
        <span className="col-header-center">PIT</span>
        <span className="col-header-center">TYRE</span>
      </div>

      {/* Table Body */}
      <div className="leaderboard-body">
        {entries.map((entry, index) => {
          const isSelected = entry.driver.id === selectedDriverId;
          const showQ1Divider = isQualifying && index === 15;
          const showQ2Divider = isQualifying && index === 10;

          const isLeader = index === 0;
          const displayedGap = isLeader ? '—' : (entry.gapToLeader ? entry.gapToLeader.replace('LÍDER', '—') : '—');
          const displayedInt = isLeader ? '—' : (entry.gapToAhead ? entry.gapToAhead.replace('LEADER', '—') : '—');
          const displayLast = entry.lastLapTime && entry.lastLapTime !== '--:--.---' ? entry.lastLapTime : (entry.currentLapTime || '—');
          const displayBest = entry.bestLapTime && entry.bestLapTime !== '--:--.---' ? entry.bestLapTime : '—';
          
          const bestSec = parseLapTimeToSec(entry.bestLapTime);
          const isOverallBestLap = bestSec === minSessionBestSec && minSessionBestSec !== Infinity;
          const lapsCount = entry.lapsCompleted !== undefined ? entry.lapsCompleted : (entry.tyre?.age || 0);

          // Compound color definitions
          const compoundLetter = entry.tyre?.compound ? entry.tyre.compound[0] : 'S';
          const isCompoundSoft = entry.tyre?.compound === 'SOFT';
          const isCompoundMedium = entry.tyre?.compound === 'MEDIUM';
          const isCompoundHard = entry.tyre?.compound === 'HARD';
          const isCompoundInter = entry.tyre?.compound === 'INTERMEDIATE';
          const isCompoundWet = entry.tyre?.compound === 'WET';

          const compColor = isCompoundSoft
            ? '#ff3b30'
            : isCompoundMedium
            ? '#ffd60a'
            : isCompoundHard
            ? '#ffffff'
            : isCompoundInter
            ? '#34c759'
            : isCompoundWet
            ? '#007aff'
            : '#64748b';

          const hasTyre = Boolean(entry.tyre && entry.tyre.compound);

          return (
            <React.Fragment key={entry.driver.id}>
              {/* Qualy Q2 Cutoff */}
              {showQ2Divider && (
                <div className="cutoff-divider">
                  <span>{t('q2_cutoff_banner')}</span>
                  <span>{t('elimination')}</span>
                </div>
              )}

              {/* Qualy Q1 Cutoff */}
              {showQ1Divider && (
                <div className="cutoff-divider">
                  <span>{t('q1_cutoff_banner')}</span>
                  <span>{t('elimination')}</span>
                </div>
              )}

              <div
                className={`leaderboard-row ${isSelected ? 'selected' : ''} ${entry.inPit ? 'in-pit' : ''} ${entry.isEliminationRisk ? 'elimination-danger' : ''}`}
                onClick={() => onSelectDriver(entry.driver.id)}
              >
                {/* 1. POS */}
                <div className="cell-pos" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    color: index === 0 ? '#ffd700' : '#f1f5f9'
                  }}>
                    {entry.position}
                  </span>
                  {(entry.previousPosition - entry.position) > 0 && <span style={{ fontSize: '0.48rem', color: '#00e676', lineHeight: 1 }}>▲</span>}
                  {(entry.previousPosition - entry.position) < 0 && <span style={{ fontSize: '0.48rem', color: '#ff4444', lineHeight: 1 }}>▼</span>}
                </div>

                {/* 2. DRIVER (Logo + Driver Code) */}
                <div className="cell-driver-with-logo">
                  <TeamLogo team={entry.driver.team} color={entry.driver.teamColor} size={20} />
                  <span className="driver-code" style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '0.80rem',
                    color: '#f8fafc',
                    letterSpacing: '0.02em',
                  }}>
                    {entry.driver.code}
                  </span>
                </div>

                {/* 3. GAP */}
                <div className="cell-gap" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: isLeader ? '#64748b' : '#cbd5e1' }}>
                  {displayedGap}
                </div>

                {/* 4. INT */}
                <div className="cell-interval" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: isLeader ? '#64748b' : '#cbd5e1' }}>
                  {displayedInt}
                </div>

                {/* 5. LAST */}
                <div className="cell-lap-single" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.70rem', color: entry.lastLapTime && !entry.inPit ? '#00e676' : '#94a3b8' }}>
                  {displayLast}
                </div>

                {/* 6. BEST (Fastest lap of whole session in PURPLE!) */}
                <div className="cell-lap-single" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                  {isOverallBestLap ? (
                    <span style={{
                      color: '#d354ff',
                      fontWeight: 900,
                      textShadow: '0 0 10px rgba(211, 84, 255, 0.5)',
                      letterSpacing: '0.01em',
                    }}>
                      {displayBest}
                    </span>
                  ) : displayBest !== '—' ? (
                    <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                      {displayBest}
                    </span>
                  ) : (
                    <span style={{ color: '#64748b' }}>—</span>
                  )}
                </div>

                {/* 7. MINI-SECTORS (S1, S2, S3 with 25 mini-ticks) */}
                <div className="cell-mini-sectors" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 4px',
                  minWidth: 0,
                  flex: 1,
                }}>
                  <MiniSectorGroup time={entry.s1Time} status={entry.s1Status} segments={entry.s1Segments} count={8} />
                  <MiniSectorGroup time={entry.s2Time} status={entry.s2Status} segments={entry.s2Segments} count={8} />
                  <MiniSectorGroup time={entry.s3Time} status={entry.s3Status} segments={entry.s3Segments} count={9} />
                </div>

                {/* 8. LAPS */}
                <div className="cell-laps-completed" style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8'
                }}>
                  {lapsCount}
                </div>

                {/* 9. PIT */}
                <div className="cell-pit-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {entry.inPit ? (
                    <span style={{
                      background: 'rgba(37, 99, 235, 0.25)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      color: '#60a5fa',
                      fontSize: '0.60rem',
                      fontWeight: 800,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      letterSpacing: '0.03em',
                    }}>
                      IN PIT
                    </span>
                  ) : entry.isPitOut ? (
                    <span style={{
                      background: 'rgba(0, 230, 118, 0.2)',
                      border: '1px solid rgba(0, 230, 118, 0.45)',
                      color: '#00e676',
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}>
                      OUT LAP
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.70rem', fontFamily: 'var(--font-mono)' }}>
                      —
                    </span>
                  )}
                </div>

                {/* 10. TYRE (Compound circle + Lap count) */}
                <div className="cell-tyre-clean" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}>
                  {hasTyre ? (
                    <>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `2px solid ${compColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          fontFamily: 'var(--font-display)',
                          color: compColor,
                          background: 'rgba(0,0,0,0.5)',
                        }}
                        title={`${entry.tyre.compound} (${entry.tyre.age} laps)`}
                      >
                        {compoundLetter}
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: compColor,
                      }}>
                        {entry.tyre.age}
                      </span>
                    </>
                  ) : (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '1.5px solid #475569',
                      background: 'rgba(255,255,255,0.03)',
                    }} />
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
