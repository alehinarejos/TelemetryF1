import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { F1_SCHEDULE } from '../data/schedule';
import { RACE_RESULTS_2026 } from '../data/raceResults2026';
import type { DriverRaceResult } from '../data/raceResults2026';
import { 
  X, 
  Trophy, 
  Timer, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import '../styles/race-results-modal.css';

interface RaceResultsModalProps {
  round: number;
  onClose: () => void;
  onSelectRound: (round: number) => void;
}

export const RaceResultsModal: React.FC<RaceResultsModalProps> = ({
  round,
  onClose,
  onSelectRound,
}) => {
  const [search, setSearch] = useState('');

  // Find the GP from schedule
  const gp = F1_SCHEDULE.find((g) => g.round === round) || F1_SCHEDULE[0];
  const results: DriverRaceResult[] = RACE_RESULTS_2026[round] || [];

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter results
  const filteredResults = results.filter((r) =>
    r.driverName.toLowerCase().includes(search.toLowerCase()) ||
    r.team.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  );

  const winner = results.find((r) => r.position === 1);
  const totalLaps = winner ? winner.laps : 0;

  return createPortal(
    <div className="race-modal-overlay" onClick={onClose}>
      <div 
        className="race-modal-container" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="race-modal-header">
          <div className="race-modal-title-group">
            <div className="race-modal-badges">
              <span className="f1-badge" style={{ background: 'rgba(225,6,0,0.2)', borderColor: 'var(--f1-red)', color: '#fff' }}>
                RONDA {gp.round} DE {F1_SCHEDULE.length}
              </span>
              <span className="f1-badge badge-green">TEMPORADA 2026</span>
              <span className="f1-badge">OFICIAL OPENF1</span>
            </div>

            <h2 className="race-modal-title">
              <span>{gp.flag}</span>
              <span>{gp.name} 2026</span>
            </h2>

            <div className="race-modal-subtitle">
              <span>{gp.circuitName}</span>
              <span>•</span>
              <span>{gp.startDate} al {gp.endDate}</span>
              <span>•</span>
              <span>{gp.country}</span>
            </div>
          </div>

          <button 
            className="race-modal-close-btn" 
            onClick={onClose} 
            title="Cerrar (Esc)"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation bar between rounds */}
        <div className="race-modal-nav-bar">
          <div className="race-modal-nav-controls">
            <button
              className="race-nav-btn"
              disabled={round <= 1}
              onClick={() => onSelectRound(round - 1)}
            >
              <ChevronLeft size={14} />
              <span>GP Anterior</span>
            </button>

            <select
              className="race-modal-round-select"
              value={round}
              onChange={(e) => onSelectRound(Number(e.target.value))}
            >
              {F1_SCHEDULE.filter((g) => g.completed).map((g) => (
                <option key={g.round} value={g.round}>
                  R{g.round}: {g.name} ({g.winner?.split(' ')[0] || 'Terminado'})
                </option>
              ))}
            </select>

            <button
              className="race-nav-btn"
              disabled={round >= 15}
              onClick={() => onSelectRound(round + 1)}
            >
              <span>GP Siguiente</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Search box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid var(--f1-border)',
            borderRadius: '6px',
            padding: '4px 10px',
          }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar en clasificación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.78rem',
                outline: 'none',
                width: '160px',
              }}
            />
          </div>
        </div>

        {/* Summary Stat Strip */}
        <div className="race-modal-summary-strip">
          <div className="summary-stat-card">
            <div className="summary-stat-icon gold">
              <Trophy size={18} />
            </div>
            <div className="summary-stat-info">
              <span className="summary-stat-label">Ganador de Carrera</span>
              <span className="summary-stat-val">
                {winner ? `${winner.driverName} (${winner.team})` : gp.winner || 'N/A'}
              </span>
            </div>
          </div>

          {gp.polePosition && (
            <div className="summary-stat-card">
              <div className="summary-stat-icon red">
                <Timer size={18} />
              </div>
              <div className="summary-stat-info">
                <span className="summary-stat-label">Pole Position</span>
                <span className="summary-stat-val">{gp.polePosition}</span>
              </div>
            </div>
          )}

          <div className="summary-stat-card">
            <div className="summary-stat-icon cyan">
              <Flag size={18} />
            </div>
            <div className="summary-stat-info">
              <span className="summary-stat-label">Distancia de Carrera</span>
              <span className="summary-stat-val">{totalLaps} Vueltas Completadas</span>
            </div>
          </div>
        </div>

        {/* Results Table Body */}
        <div className="race-modal-body">
          {filteredResults.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertCircle size={32} style={{ marginBottom: '8px', color: 'var(--f1-red)' }} />
              <p>No se encontraron resultados para esta carrera o búsqueda.</p>
            </div>
          ) : (
            <table className="race-results-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>Pos</th>
                  <th style={{ width: '45px', textAlign: 'center' }}>Nº</th>
                  <th>Piloto</th>
                  <th>Escudería</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Vueltas</th>
                  <th>Tiempo / Diferencia</th>
                  <th style={{ textAlign: 'right', width: '80px', paddingRight: '20px' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((driver) => {
                  const isP1 = driver.position === 1;
                  const isP2 = driver.position === 2;
                  const isP3 = driver.position === 3;
                  const isPoints = driver.position !== null && driver.position <= 10;
                  const isDnf = driver.position === null || driver.status === 'DNF' || driver.status === 'DNS';

                  return (
                    <tr key={`${driver.driverNumber}-${driver.code}`}>
                      {/* Pos Badge */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`pos-pill ${
                            isP1
                              ? 'p1'
                              : isP2
                              ? 'p2'
                              : isP3
                              ? 'p3'
                              : isPoints
                              ? 'points'
                              : isDnf
                              ? 'dnf'
                              : 'normal'
                          }`}
                        >
                          {driver.position ? `P${driver.position}` : driver.status}
                        </span>
                      </td>

                      {/* Number */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="driver-num-tag">#{driver.driverNumber}</span>
                      </td>

                      {/* Driver Name & Flag */}
                      <td>
                        <div className="driver-cell">
                          <span style={{ fontSize: '1.1rem' }}>{driver.flag}</span>
                          <div>
                            <div className="driver-name-text">{driver.driverName}</div>
                            <span className="driver-code-text">{driver.code}</span>
                          </div>
                        </div>
                      </td>

                      {/* Team */}
                      <td>
                        <div className="team-cell">
                          <div
                            className="team-color-indicator"
                            style={{ backgroundColor: driver.teamColor || '#888' }}
                          />
                          <span style={{ fontWeight: 600 }}>{driver.team}</span>
                        </div>
                      </td>

                      {/* Laps */}
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {driver.laps}
                      </td>

                      {/* Gap / Interval / Status */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {isP1 ? (
                          <span style={{ color: '#ffd700', fontWeight: 800 }}>GANADOR</span>
                        ) : isDnf ? (
                          <span style={{ color: '#ff4d4d', fontWeight: 600 }}>{driver.status}</span>
                        ) : (
                          <span>{driver.gapToLeader}</span>
                        )}
                      </td>

                      {/* Points */}
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <span className={`points-awarded ${driver.points > 0 ? 'has-points' : ''}`}>
                          {driver.points > 0 ? `+${driver.points}` : '0'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          padding: '10px 22px',
          background: 'rgba(0,0,0,0.5)',
          borderTop: '1px solid var(--f1-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} color="var(--f1-red)" />
            <span>Datos oficiales de carrera provistos por FIA Formula One & OpenF1 API</span>
          </div>

          <span>Total: {results.length} pilotos registrados</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
