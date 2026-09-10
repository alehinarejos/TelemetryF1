import React, { useState, useEffect } from 'react';
import { Trophy, Users, Search, CheckCircle2, RotateCw, Sparkles } from 'lucide-react';
import { standingsSyncService } from '../services/standingsSyncService';
import type { StandingsSyncState } from '../services/standingsSyncService';
import { useLanguage } from '../context/LanguageContext';

interface LeaderboardBoxProps {
  selectedDriverId: string;
  onSelectDriver: (driverId: string) => void;
  isSessionActive: boolean;
}

export const LeaderboardBox: React.FC<LeaderboardBoxProps> = ({
  selectedDriverId,
  onSelectDriver,
  isSessionActive,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors'>('drivers');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConstructors = constructors.filter(c =>
    c.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManualSync = () => {
    standingsSyncService.syncStandings(true);
  };

  return (
    <div className="leaderboard-tall-card">
      {/* Header */}
      <div style={{ 
        padding: '14px 16px', 
        borderBottom: '1px solid var(--f1-border)', 
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} color="#ffd700" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.05rem', color: '#fff', letterSpacing: '0.04em' }}>
            {t('world_standings')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSessionActive ? (
            <span className="f1-badge badge-live">🔴 {t('live')}</span>
          ) : (
            <span className="f1-badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={11} />
              <span>{t('updated')}</span>
            </span>
          )}

          <button
            onClick={handleManualSync}
            title={t('sync_now')}
            disabled={syncState.isSyncing}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              color: syncState.isSyncing ? '#00D7B6' : '#bbb',
              cursor: syncState.isSyncing ? 'default' : 'pointer',
              padding: '4px 7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <RotateCw 
              size={13} 
              className={syncState.isSyncing ? 'animate-spin' : ''}
              style={{
                animation: syncState.isSyncing ? 'spin 1s linear infinite' : 'none'
              }}
            />
          </button>
        </div>
      </div>

      {/* Real-time Auto-Update Notice Bar */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(0, 215, 182, 0.12) 0%, rgba(225, 6, 0, 0.08) 100%)',
        borderBottom: '1px solid rgba(0, 215, 182, 0.2)',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.68rem',
        color: '#d0d8e0',
        fontFamily: 'var(--font-mono)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            backgroundColor: '#00D7B6',
            boxShadow: '0 0 8px #00D7B6',
            display: 'inline-block' 
          }} />
          <span style={{ fontWeight: 600, color: '#00D7B6' }}>{t('realtime_auto_sync').split(':')[0]}:</span>
          <span>{t('realtime_auto_sync').split(':')[1]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
          <Sparkles size={10} color="#ffd700" />
          <span>{syncState.lastUpdated ? syncState.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '2026'}</span>
        </div>
      </div>

      {/* Tabs (Drivers and Constructors) */}
      <div className="leaderboard-tabs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <button
          className={`led-tab-btn ${activeTab === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('drivers')}
          style={{ justifyContent: 'center' }}
        >
          <Trophy size={14} style={{ display: 'inline', marginRight: '6px' }} />
          <span>{t('drivers_tab')} ({drivers.length})</span>
        </button>

        <button
          className={`led-tab-btn ${activeTab === 'constructors' ? 'active' : ''}`}
          onClick={() => setActiveTab('constructors')}
          style={{ justifyContent: 'center' }}
        >
          <Users size={14} style={{ display: 'inline', marginRight: '6px' }} />
          <span>{t('constructors_tab')} ({constructors.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid var(--f1-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0, 0, 0, 0.25)'
      }}>
        <Search size={14} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder={t('search_driver_or_team')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-body)',
            outline: 'none',
            width: '100%'
          }}
        />
      </div>

      {/* Tab Content */}
      <div className="standings-list">
        {/* TAB 1: World Drivers' Championship */}
        {activeTab === 'drivers' && (
          filteredDrivers.map((driver) => {
            const isSelected = driver.driverId === selectedDriverId;
            const isP1 = driver.position === 1;
            const isP2 = driver.position === 2;
            const isP3 = driver.position === 3;

            return (
              <div 
                key={driver.driverId}
                className="standing-row"
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(225, 6, 0, 0.14)' : undefined,
                  borderLeft: isSelected ? '3px solid var(--f1-red)' : undefined
                }}
                onClick={() => onSelectDriver(driver.driverId)}
              >
                <div className="standing-left">
                  <span 
                    className={`standing-pos ${driver.position <= 3 ? 'top-3' : ''}`}
                    style={{
                      color: isP1 ? '#ffd700' : isP2 ? '#e0e0e0' : isP3 ? '#cd7f32' : undefined
                    }}
                  >
                    {driver.position}
                  </span>
                  <div 
                    style={{ 
                      width: '4px', 
                      height: '24px', 
                      borderRadius: '2px', 
                      backgroundColor: driver.teamColor || '#888' 
                    }} 
                  />
                  <div className="standing-driver-info">
                    <span className="standing-driver-name">
                      {driver.flag} {driver.name} <strong style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>#{driver.number}</strong>
                    </span>
                    <span className="standing-team-name">
                      {driver.team} • {driver.wins} {t('wins').toLowerCase()} • {driver.podiums} {t('podiums').toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="standing-points">
                  <span className="points-num">{driver.points}</span>
                  <span className="points-label">{t('points')}</span>
                </div>
              </div>
            );
          })
        )}

        {/* TAB 2: World Constructors' Championship */}
        {activeTab === 'constructors' && (
          filteredConstructors.map((c) => {
            const isP1 = c.position === 1;
            const isP2 = c.position === 2;
            const isP3 = c.position === 3;

            return (
              <div key={c.team} className="standing-row">
                <div className="standing-left">
                  <span 
                    className={`standing-pos ${c.position <= 3 ? 'top-3' : ''}`}
                    style={{
                      color: isP1 ? '#ffd700' : isP2 ? '#e0e0e0' : isP3 ? '#cd7f32' : undefined
                    }}
                  >
                    {c.position}
                  </span>
                  <div 
                    style={{ 
                      width: '4px', 
                      height: '24px', 
                      borderRadius: '2px', 
                      backgroundColor: c.teamColor 
                    }} 
                  />
                  <div className="standing-driver-info">
                    <span className="standing-driver-name">{c.team}</span>
                    <span className="standing-team-name">{c.wins} {t('wins').toLowerCase()} • {c.podiums} {t('podiums').toLowerCase()}</span>
                  </div>
                </div>

                <div className="standing-points">
                  <span className="points-num">{c.points}</span>
                  <span className="points-label">{t('points')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div style={{ 
        padding: '10px 14px', 
        borderTop: '1px solid var(--f1-border)', 
        background: 'rgba(0, 0, 0, 0.35)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)'
      }}>
        <span>{t('standings_footer')}</span>
        <span style={{ color: '#00D7B6', fontWeight: 700 }}>{t('official_fia_data')}</span>
      </div>
    </div>
  );
};
