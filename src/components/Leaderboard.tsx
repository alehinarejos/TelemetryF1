import React from 'react';
import type { LeaderboardEntry } from '../types/telemetry';

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
  return (
    <div className="f1-card leaderboard-container">
      <div className="card-header">
        <div className="card-title">
          <span style={{ color: 'var(--f1-red)', fontWeight: 900 }}>TIMING</span>
          <span>TABLA DE TIEMPOS EN VIVO</span>
        </div>
        <div className="f1-badge badge-green">OFICIAL FIA</div>
      </div>

      {/* Table Header */}
      <div className="leaderboard-header-row">
        <span>POS</span>
        <span>PILOTO</span>
        <span style={{ paddingLeft: '8px' }}>NOMBRE</span>
        <span>LÍDER</span>
        <span>INT</span>
        <span>TIEMPO</span>
        <span style={{ textAlign: 'center' }}>S1</span>
        <span style={{ textAlign: 'center' }}>S2</span>
        <span style={{ textAlign: 'center' }}>S3</span>
        <span style={{ textAlign: 'center' }}>BOX</span>
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
                  <span>ZONA DE CORTE Q2 (TOP 10 AVANZA A Q3)</span>
                  <span>ELIMINACIÓN</span>
                </div>
              )}

              {/* Qualy Q1 Cutoff */}
              {showQ1Divider && (
                <div className="cutoff-divider">
                  <span>ZONA DE CORTE Q1 (TOP 15 AVANZA A Q2)</span>
                  <span>ELIMINACIÓN</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="driver-code">{entry.driver.code}</span>
                  <span style={{ fontSize: '0.8rem' }}>{entry.driver.flag}</span>
                </div>

                {/* Gap to Leader */}
                <div className={`cell-gap ${index === 0 ? 'leader' : ''}`}>
                  {entry.gapToLeader}
                </div>

                {/* Interval to car ahead */}
                <div className="cell-interval">
                  {entry.gapToAhead}
                </div>

                {/* Lap Time */}
                <div className="cell-laptime">
                  {entry.currentLapTime}
                </div>

                {/* Sector 1 */}
                <div className={`cell-sector ${entry.s1Status}`}>
                  {entry.s1Time}
                </div>

                {/* Sector 2 */}
                <div className={`cell-sector ${entry.s2Status}`}>
                  {entry.s2Time}
                </div>

                {/* Sector 3 */}
                <div className={`cell-sector ${entry.s3Status}`}>
                  {entry.s3Time}
                </div>

                {/* Tyre & Pit stops */}
                <div className="cell-tyre">
                  <div className={`tyre-pill ${tyreClass}`}>
                    {tyreLetter}
                  </div>
                  <span className="tyre-age-text">{entry.tyre.age}L</span>
                  {entry.inPit ? (
                    <span className="pit-in-badge">PIT</span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '2px' }}>
                      {entry.pitStops}p
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
