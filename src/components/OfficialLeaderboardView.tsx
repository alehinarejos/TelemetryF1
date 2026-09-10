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
      <div className="comparison-controls official-leaderboard-banner">
        <div className="official-banner-left">
          <div className="official-trophy-icon">
            <Trophy size={26} color="#ffd700" />
          </div>
          <div className="official-banner-title-group">
            <div className="official-banner-heading-row">
              <h2 className="official-banner-h2">
                {t('official_f1_standings_title')}
              </h2>
              <span className="f1-badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <CheckCircle2 size={11} />
                <span>{t('official_fia_data')}</span>
              </span>
            </div>
            <span className="official-banner-subtitle">
              {t('standings_subtitle')}
            </span>
          </div>
        </div>

        <div className="official-banner-actions">
          {/* Sync Button */}
          <button
            className="f1-btn official-sync-btn"
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
          <div className="official-search-box" style={{ 
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
                width: '100%'
              }}
            />
          </div>

          {/* View Toggles */}
          <div className="official-view-toggles">
            <button 
              className={`f1-btn ${view === 'drivers' ? 'f1-btn-active' : ''}`}
              onClick={() => setView('drivers')}
            >
              <Trophy size={14} />
              <span>{t('championship_drivers')} ({drivers.length})</span>
            </button>
            <button 
              className={`f1-btn ${view === 'constructors' ? 'f1-btn-active' : ''}`}
              onClick={() => setView('constructors')}
            >
              <Users size={14} />
              <span>{t('championship_constructors')} ({constructors.length})</span>
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
          <strong style={{ color: '#00D7B6' }}>{t('auto_sync_active_title')}</strong>
          <span>{t('auto_sync_active_desc')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <Sparkles size={12} color="#ffd700" />
          <span>{t('last_check_label')} {syncState.lastUpdated ? syncState.lastUpdated.toLocaleTimeString() : '2026'}</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="f1-card" style={{ padding: '0', overflow: 'hidden' }}>
        {view === 'drivers' ? (
          <div className="official-table-wrapper" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="official-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.4)', borderBottom: '1px solid var(--f1-border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px', width: '48px', textAlign: 'center' }}>{t('pos')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('driver')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('team')}</th>
                  <th className="col-hide-mobile" style={{ padding: '12px 14px', width: '10%', textAlign: 'center' }}>{t('wins')}</th>
                  <th className="col-hide-mobile" style={{ padding: '12px 14px', width: '10%', textAlign: 'center' }}>{t('podiums')}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('points_label')}</th>
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
                        padding: '12px 14px', 
                        textAlign: 'center', 
                        fontFamily: 'var(--font-display)', 
                        fontWeight: 900, 
                        fontSize: '1.05rem', 
                        color: isP1 ? '#ffd700' : isP2 ? '#e0e0e0' : isP3 ? '#cd7f32' : 'var(--text-secondary)' 
                      }}>
                        {driver.position}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '4px', height: '24px', borderRadius: '2px', backgroundColor: driver.teamColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '1rem' }}>{driver.flag}</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{driver.name}</strong>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#{driver.number} • {driver.code}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.82rem' }}>
                        {driver.team}
                      </td>
                      <td className="col-hide-mobile" style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {driver.wins > 0 ? <span style={{ color: '#ffd700', fontWeight: 800 }}>{driver.wins}</span> : '0'}
                      </td>
                      <td className="col-hide-mobile" style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {driver.podiums}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.1rem', color: '#fff', lineHeight: 1 }}>{driver.points}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('points')}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="official-table-wrapper" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="official-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.4)', borderBottom: '1px solid var(--f1-border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px', width: '48px', textAlign: 'center' }}>{t('pos')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('constructor')}</th>
                  <th className="col-hide-mobile" style={{ padding: '12px 14px', width: '15%', textAlign: 'center' }}>{t('wins')}</th>
                  <th className="col-hide-mobile" style={{ padding: '12px 14px', width: '15%', textAlign: 'center' }}>{t('podiums')}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('points_label')}</th>
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
                        padding: '12px 14px', 
                        textAlign: 'center', 
                        fontFamily: 'var(--font-display)', 
                        fontWeight: 900, 
                        fontSize: '1.05rem', 
                        color: isP1 ? '#ffd700' : isP2 ? '#e0e0e0' : isP3 ? '#cd7f32' : 'var(--text-secondary)' 
                      }}>
                        {c.position}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '4px', height: '24px', borderRadius: '2px', backgroundColor: c.teamColor, flexShrink: 0 }} />
                          <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{c.team}</strong>
                        </div>
                      </td>
                      <td className="col-hide-mobile" style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: c.wins > 0 ? '#ffd700' : 'inherit' }}>
                        {c.wins}
                      </td>
                      <td className="col-hide-mobile" style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {c.podiums}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.15rem', color: '#fff', lineHeight: 1 }}>{c.points}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>PTS</span>
                        </div>
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
