import React, { useState, useEffect } from 'react';
import { Trophy, Users, Search, RotateCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { standingsSyncService } from '../services/standingsSyncService';
import type { StandingsSyncState } from '../services/standingsSyncService';
import { useLanguage } from '../context/LanguageContext';

export const OfficialLeaderboardView: React.FC = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<'drivers' | 'constructors'>('drivers');
  const [search, setSearch] = useState<string>('');
  const [syncState, setSyncState] = useState<StandingsSyncState>(standingsSyncService.getState());

  useEffect(() => {
    const unsubscribe = standingsSyncService.subscribe((state) => {
      setSyncState({ ...state });
    });
    return () => unsubscribe();
  }, []);

  const drivers = syncState.drivers;
  const constructors = syncState.constructors;

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.team.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredConstructors = constructors.filter(c =>
    c.team.toLowerCase().includes(search.toLowerCase())
  );

  const handleManualSync = () => {
    standingsSyncService.syncStandings(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Controls Banner */}
      <div className="comparison-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(225, 6, 0, 0.1) 100%)',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <Trophy size={26} color="#ffd700" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>
                {t('official_f1_standings_title')}
              </h2>
              <span className="f1-badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={11} />
                <span>{t('official_fia_data')}</span>
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {t('standings_subtitle')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Sync Button */}
          <button
            className="f1-btn"
            onClick={handleManualSync}
            disabled={syncState.isSyncing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
          >
            <RotateCw 
              size={14} 
              style={{
                animation: syncState.isSyncing ? 'spin 1s linear infinite' : 'none'
              }}
            />
            <span>{syncState.isSyncing ? t('syncing') : t('sync_now')}</span>
          </button>

          {/* Search bar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--f1-surface)', 
            border: '1px solid var(--f1-border)', 
            borderRadius: '6px', 
            padding: '6px 12px' 
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder={t('search_driver_or_team')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                outline: 'none',
                fontSize: '0.82rem',
                width: '180px'
              }}
            />
          </div>

          {/* View Toggles */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className={`f1-btn ${view === 'drivers' ? 'f1-btn-active' : ''}`}
              onClick={() => setView('drivers')}
            >
              <Trophy size={14} />
              <span>Mundial Pilotos ({drivers.length})</span>
            </button>
            <button 
              className={`f1-btn ${view === 'constructors' ? 'f1-btn-active' : ''}`}
              onClick={() => setView('constructors')}
            >
              <Users size={14} />
              <span>Constructores ({constructors.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Sync Status Bar */}
      <div style={{
        background: 'rgba(0, 215, 182, 0.08)',
        border: '1px solid rgba(0, 215, 182, 0.25)',
        borderRadius: '6px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem',
        color: '#c4d7e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#00D7B6',
            boxShadow: '0 0 10px #00D7B6',
            display: 'inline-block'
          }} />
          <strong style={{ color: '#00D7B6' }}>Sincronización Automática Activa:</strong>
          <span>Los puntos y posiciones se actualizan de forma automática e inmediata al finalizar cada carrera y sesión oficial de F1.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <Sparkles size={12} color="#ffd700" />
          <span>Última comprobación: {syncState.lastUpdated ? syncState.lastUpdated.toLocaleTimeString() : 'En directo'}</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="f1-card" style={{ padding: '0', overflow: 'hidden' }}>
        {view === 'drivers' ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.4)', borderBottom: '1px solid var(--f1-border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}>Pos</th>
                  <th style={{ padding: '12px 16px', width: '32%' }}>Piloto</th>
                  <th style={{ padding: '12px 16px', width: '24%' }}>Escudería</th>
                  <th style={{ padding: '12px 16px', width: '12%', textAlign: 'center' }}>Victorias</th>
                  <th style={{ padding: '12px 16px', width: '12%', textAlign: 'center' }}>Podios</th>
                  <th style={{ padding: '12px 20px', width: '20%', textAlign: 'right' }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => {
                  const isP1 = driver.position === 1;
                  const isP2 = driver.position === 2;
                  const isP3 = driver.position === 3;
                  return (
                    <tr 
                      key={driver.driverId} 
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s' }}
                      className="official-table-row"
                    >
                      <td style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        fontFamily: 'var(--font-display)', 
                        fontWeight: 900, 
                        fontSize: '1.05rem', 
                        color: isP1 ? '#ffd700' : isP2 ? '#e0e0e0' : isP3 ? '#cd7f32' : 'var(--text-secondary)' 
                      }}>
                        {driver.position}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '4px', height: '26px', borderRadius: '2px', backgroundColor: driver.teamColor }} />
                          <span style={{ fontSize: '1.1rem' }}>{driver.flag}</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{driver.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#{driver.number} • {driver.code}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {driver.team}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {driver.wins > 0 ? <span style={{ color: '#ffd700', fontWeight: 800 }}>{driver.wins}</span> : '0'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {driver.podiums}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>
                        {driver.points} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PTS</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.4)', borderBottom: '1px solid var(--f1-border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}>Pos</th>
                  <th style={{ padding: '12px 16px', width: '42%' }}>Constructor</th>
                  <th style={{ padding: '12px 16px', width: '15%', textAlign: 'center' }}>Victorias</th>
                  <th style={{ padding: '12px 16px', width: '15%', textAlign: 'center' }}>Podios</th>
                  <th style={{ padding: '12px 20px', width: '28%', textAlign: 'right' }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filteredConstructors.map((c) => {
                  const isP1 = c.position === 1;
                  const isP2 = c.position === 2;
                  const isP3 = c.position === 3;
                  return (
                    <tr 
                      key={c.team} 
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                      className="official-table-row"
                    >
                      <td style={{ 
                        padding: '14px 16px', 
                        textAlign: 'center', 
                        fontFamily: 'var(--font-display)', 
                        fontWeight: 900, 
                        fontSize: '1.1rem', 
                        color: isP1 ? '#ffd700' : isP2 ? '#e0e0e0' : isP3 ? '#cd7f32' : 'var(--text-secondary)' 
                      }}>
                        {c.position}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '4px', height: '26px', borderRadius: '2px', backgroundColor: c.teamColor }} />
                          <strong style={{ color: '#fff', fontSize: '1rem' }}>{c.team}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: c.wins > 0 ? '#ffd700' : 'inherit' }}>
                        {c.wins}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {c.podiums}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.25rem', color: '#fff' }}>
                        {c.points} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PTS</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
