import React from 'react';
import type { LeaderboardEntry } from '../types/telemetry';
import { useLanguage } from '../context/LanguageContext';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  selectedDriverId: string;
  onSelectDriver: (driverId: string) => void;
  isQualifying?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  selectedDriverId,
  onSelectDriver,
  isQualifying = false,
}) => {
  const { t } = useLanguage();

  return (
    <div className="f1-card leaderboard-container">
      <div className="card-header">
        <div className="card-title">
          <span style={{ color: 'var(--f1-red)', fontWeight: 900 }}>{t('timing')}</span>
          <span>{t('live_timing_title')}</span>
        </div>
        <div className="f1-badge badge-green">{t('official_fia')}</div>
      </div>

      {/* Table Header */}
      <div className="leaderboard-header-row">
        <span>{t('pos')}</span>
        <span>#</span>
        <span style={{ paddingLeft: '2px' }}>{t('driver')}</span>
        <span>{t('gap_leader')}</span>
        <span className="col-int">{t('interval')}</span>
        <span>{t('lap_time')}</span>
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

          // Tyre class
          const tyreClass = 
            entry.tyre.compound === 'SOFT' ? 'tyre-soft' :
            entry.tyre.compound === 'MEDIUM' ? 'tyre-medium' :
            entry.tyre.compound === 'HARD' ? 'tyre-hard' :
            entry.tyre.compound === 'INTERMEDIATE' ? 'tyre-inter' : 'tyre-wet';

          const tyreLetter = entry.tyre.compound[0];

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
                {/* Position */}
                <div className="cell-pos">
                  {entry.position}
                </div>

                {/* Driver Number & Team Bar */}
                <div className="cell-driver">
                  <div 
                    className="driver-team-bar" 
                    style={{ backgroundColor: entry.driver.teamColor }} 
                  />
                  <span className="driver-number">{entry.driver.number}</span>
                </div>

                {/* Code & Flag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span className="driver-code">{entry.driver.code}</span>
                  <span style={{ fontSize: '0.82rem' }}>{entry.driver.flag}</span>
                </div>

                {/* Gap to Leader */}
                <div className={`cell-gap ${index === 0 ? 'leader' : ''}`}>
                  {index === 0 && entry.gapToLeader === 'GANADOR' ? t('winner_upper') : entry.gapToLeader}
                </div>

                {/* Interval to car ahead */}
                <div className="cell-interval col-int">
                  {entry.gapToAhead}
                </div>

                {/* Lap Time */}
                <div className="cell-laptime">
                  {entry.currentLapTime}
                </div>

                {/* Sector 1 */}
                <div className={`cell-sector col-sector ${entry.s1Status}`}>
                  {entry.s1Time}
                </div>

                {/* Sector 2 */}
                <div className={`cell-sector col-sector ${entry.s2Status}`}>
                  {entry.s2Time}
                </div>

                {/* Sector 3 */}
                <div className={`cell-sector col-sector ${entry.s3Status}`}>
                  {entry.s3Time}
                </div>

                {/* Tyre & Pit stops with spacious badges */}
                <div className="cell-tyre">
                  <div className={`tyre-pill ${tyreClass}`} title={`Compuesto: ${entry.tyre.compound}`}>
                    {tyreLetter}
                  </div>
                  <span className="tyre-age-badge" title="Vueltas con este neumático">
                    {entry.tyre.age}v
                  </span>
                  {entry.inPit ? (
                    <span className="pit-in-badge">PIT</span>
                  ) : (
                    <span className="pit-stops-badge" title="Paradas en boxes">
                      {entry.pitStops} {entry.pitStops === 1 ? t('stop') : t('stops')}
                    </span>
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
