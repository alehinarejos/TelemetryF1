import React, { useState } from 'react';
import type { LeaderboardEntry } from '../types/telemetry';
import { useLanguage } from '../context/LanguageContext';
import { ArrowUpDown } from 'lucide-react';

// Mini sector bars (3 bars per sector) — like f1telemetry.com
function MiniSectors({ status, segments }: { status: string; segments?: Array<string>; driverIdx?: number; sectorIdx?: number }) {
  const colors: Record<string, string> = {
    purple: '#b034d1', green: '#00D46A', yellow: '#ffd60a', pit: '#0095ff', none: '#333333',
  };
  const base = colors[status] || colors.none;
  let fills: string[] = [];
  if (segments && segments.length > 0) {
    fills = segments.slice(0, 3).map(s => colors[s] || base);
    while (fills.length < 3) fills.push(base);
  } else {
    fills = [base, base, base];
  }
  return (
    <div style={{ display: 'flex', gap: '1.5px', marginTop: '2px' }}>
      {fills.map((c, i) => (
        <div key={i} style={{ width: '6px', height: '2.5px', borderRadius: '1px', backgroundColor: c, opacity: status === 'none' ? 0.3 : 0.95 }} />
      ))}
    </div>
  );
}

// Sector cell with mini sector bars (fixed height, zero layout shift)
function SectorCell({ time, status, segments, driverIdx, sectorIdx }: { time: string; status: string; segments?: Array<string>; driverIdx: number; sectorIdx: number }) {
  const displayTime = time && time.trim() !== '' ? time : '--.---';
  const bg = status === 'purple' ? 'rgba(176,34,210,0.22)' : status === 'green' ? 'rgba(0,212,106,0.16)' : status === 'yellow' ? 'rgba(255,214,10,0.14)' : status === 'pit' ? 'rgba(0,149,255,0.16)' : 'transparent';
  const fg = status === 'purple' ? '#d134f0' : status === 'green' ? '#00D46A' : status === 'yellow' ? '#ffd60a' : status === 'pit' ? '#0095ff' : '#666';
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: bg,
      borderRadius: '3px',
      padding: '1px 2px',
      height: '24px',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', fontWeight: 700, color: fg, whiteSpace: 'nowrap', lineHeight: 1 }}>{displayTime}</span>
      <MiniSectors status={status} segments={segments} driverIdx={driverIdx} sectorIdx={sectorIdx} />
    </div>
  );
}

// Lap times cell displaying both Last Lap (top) and Best Lap (bottom) like official F1 Live Timing
function LapTimesCell({
  lastLapTime,
  bestLapTime,
  isOverallFastest,
  isLeaderRow,
}: {
  lastLapTime?: string;
  bestLapTime: string;
  isOverallFastest: boolean;
  isLeaderRow: boolean;
}) {
  const displayLast = lastLapTime && lastLapTime !== '--:--.---' ? lastLapTime : '--:--.---';
  const displayBest = bestLapTime && bestLapTime !== '--:--.---' ? bestLapTime : '--:--.---';

  return (
    <div className="cell-laptimes" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '30px',
      boxSizing: 'border-box',
      lineHeight: 1.15,
    }}>
      {/* Top: Last Lap Time (Última vuelta cerrada) */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          color: '#bbb',
          fontWeight: 600,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}
        title={`Última vuelta cerrada: ${displayLast}`}
      >
        {displayLast}
      </span>

      {/* Bottom: Best Lap Time (Mejor vuelta de sesión) */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.73rem',
          fontWeight: 800,
          color: isOverallFastest ? '#d134f0' : isLeaderRow ? '#00ffaa' : '#51cf66',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}
        title={`Mejor vuelta de sesión: ${displayBest}`}
      >
        {displayBest}
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
  sessionType = 'PRACTICE',
}) => {
  const isPracticeOrQualy = sessionType === 'PRACTICE' || sessionType === 'QUALIFYING';
  const { t } = useLanguage();
  const [gapMode, setGapMode] = useState<'leader' | 'interval'>('leader');

  const toggleGapMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setGapMode(prev => prev === 'leader' ? 'interval' : 'leader');
  };

  return (
    <div className="f1-card leaderboard-container">
      <div className="card-header">
        <div className="card-title">
          <span style={{ color: 'var(--f1-red)', fontWeight: 900 }}>{t('timing')}</span>
          <span>{t('live_timing_title')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPracticeOrQualy && (
            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: '#00D7B6', background: 'rgba(0,215,182,0.1)', border: '1px solid rgba(0,215,182,0.25)', borderRadius: '4px', padding: '2px 6px', fontWeight: 700 }}>
              MEJOR VUELTA
            </span>
          )}
          <div className="f1-badge badge-green">{t('official_fia')}</div>
        </div>
      </div>

      {/* Table Header */}
      <div className="leaderboard-header-row">
        <span>{t('pos')}</span>
        <span>#</span>
        <span style={{ paddingLeft: '2px' }}>{t('driver')}</span>
        
        {/* Combined interactive Gap / Interval column */}
        <button
          type="button"
          onClick={toggleGapMode}
          className="leaderboard-gap-toggle-header"
          title={gapMode === 'leader' ? `${t('gap_leader')} • Click para ver ${t('interval')}` : `${t('interval')} • Click para ver ${t('gap_leader')}`}
        >
          <span className="gap-mode-text">
            {gapMode === 'leader' ? t('gap_leader') : t('interval')}
          </span>
          <ArrowUpDown size={11} className="gap-toggle-icon" />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
          <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>ÚLTIMA</span>
          <span style={{ fontSize: '0.62rem', color: '#fff', fontWeight: 800, letterSpacing: '0.03em' }}>MEJOR</span>
        </div>
        <span className="col-sector" style={{ textAlign: 'center' }}>S1</span>
        <span className="col-sector" style={{ textAlign: 'center' }}>S2</span>
        <span className="col-sector" style={{ textAlign: 'center' }}>S3</span>
        <span style={{ textAlign: 'left', paddingLeft: '2px' }}>
          <span className="show-desktop">{t('tyres')}</span>
          <span className="show-mobile">{t('tyres_short')}</span>
        </span>
      </div>

      {/* Table Body */}
      <div className="leaderboard-body">
        {entries.map((entry, index) => {
          const isSelected = entry.driver.id === selectedDriverId;
          const showQ1Divider = isQualifying && index === 15;
          const showQ2Divider = isQualifying && index === 10;

          // Determine gap value to display based on mode
          const isLeader = index === 0;
          const displayedGap = isLeader
            ? (entry.gapToLeader === 'GANADOR' ? t('winner_upper') : entry.gapToLeader)
            : (gapMode === 'leader' ? entry.gapToLeader : entry.gapToAhead);

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
                {/* Position + delta arrow */}
                <div className="cell-pos" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.84rem', color: index === 0 ? 'var(--color-yellow)' : 'var(--text-highlight)' }}>{entry.position}</span>
                  {(entry.previousPosition - entry.position) > 0 && <span style={{ fontSize: '0.48rem', color: '#00D46A', lineHeight: 1 }}>▲</span>}
                  {(entry.previousPosition - entry.position) < 0 && <span style={{ fontSize: '0.48rem', color: '#ff4444', lineHeight: 1 }}>▼</span>}
                </div>

                {/* Driver Number & Team Bar */}
                <div className="cell-driver">
                  <div 
                    className="driver-team-bar" 
                    style={{ backgroundColor: entry.driver.teamColor }} 
                  />
                  <span className="driver-number">{entry.driver.number}</span>
                </div>

                {/* Code, Flag & PitOut badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <span className="driver-code">{entry.driver.code}</span>
                  <span style={{ fontSize: '0.78rem' }}>{entry.driver.flag}</span>
                  {entry.isPitOut && (
                    <span style={{ fontSize: '0.53rem', fontWeight: 900, background: 'rgba(0,149,255,0.2)', border: '1px solid rgba(0,149,255,0.45)', color: '#0af', padding: '0px 3px', borderRadius: '2px', letterSpacing: '0.03em' }}>OUT</span>
                  )}
                </div>

                {/* Combined Gap to Leader / Interval */}
                <div className={`cell-gap ${isLeader ? 'leader' : ''}`}>
                  {displayedGap}
                </div>

                {/* Lap Times (Last Lap / Best Lap) */}
                <LapTimesCell
                  lastLapTime={entry.lastLapTime || entry.currentLapTime}
                  bestLapTime={entry.bestLapTime || entry.currentLapTime}
                  isOverallFastest={entry.s1Status === 'purple' && entry.s2Status === 'purple' && entry.s3Status === 'purple'}
                  isLeaderRow={index === 0}
                />

                {/* Sector 1 — with mini sector bars */}
                <div className="col-sector">
                  <SectorCell time={entry.s1Time} status={entry.s1Status} segments={entry.s1Segments} driverIdx={index} sectorIdx={0} />
                </div>

                {/* Sector 2 */}
                <div className="col-sector">
                  <SectorCell time={entry.s2Time} status={entry.s2Status} segments={entry.s2Segments} driverIdx={index} sectorIdx={1} />
                </div>

                {/* Sector 3 */}
                <div className="col-sector">
                  <SectorCell time={entry.s3Time} status={entry.s3Status} segments={entry.s3Segments} driverIdx={index} sectorIdx={2} />
                </div>

                {/* Tyre compound circle + age + pit badge */}
                <div className="cell-tyre">
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: `2px solid ${entry.tyre.compound === 'SOFT' ? '#ff3b30' : entry.tyre.compound === 'MEDIUM' ? '#ffd60a' : entry.tyre.compound === 'HARD' ? '#ddd' : entry.tyre.compound === 'INTERMEDIATE' ? '#34c759' : '#007aff'}`,
                    backgroundColor: `${entry.tyre.compound === 'SOFT' ? '#ff3b30' : entry.tyre.compound === 'MEDIUM' ? '#ffd60a' : entry.tyre.compound === 'HARD' ? '#ddd' : entry.tyre.compound === 'INTERMEDIATE' ? '#34c759' : '#007aff'}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '0.64rem', fontWeight: 900, fontFamily: 'var(--font-display)',
                    color: entry.tyre.compound === 'SOFT' ? '#ff3b30' : entry.tyre.compound === 'MEDIUM' ? '#ffd60a' : entry.tyre.compound === 'HARD' ? '#ddd' : entry.tyre.compound === 'INTERMEDIATE' ? '#34c759' : '#007aff',
                  }} title={`${entry.tyre.compound}${entry.tyre.used ? ' (usado)' : ''}`}>
                    {entry.tyre.compound[0]}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.67rem', fontWeight: 700,
                    color: entry.tyre.age > 20 ? '#ff8c00' : entry.tyre.age > 10 ? '#ffd60a' : '#aaa',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '3px',
                  }} title={`${entry.tyre.age} vueltas`}>{entry.tyre.age}v</span>
                  {entry.inPit ? (
                    <span style={{ background: 'rgba(0,149,255,0.25)', border: '1px solid rgba(0,149,255,0.5)', color: '#0af', fontSize: '0.6rem', fontWeight: 900, padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em' }}>PIT</span>
                  ) : entry.pitStops > 0 ? (
                    <span className="pit-stops-badge">{entry.pitStops}p</span>
                  ) : null}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
