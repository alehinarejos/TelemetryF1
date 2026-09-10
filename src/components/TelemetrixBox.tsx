import React, { useState } from 'react';
import type { 
  CircuitInfo, 
  LeaderboardEntry, 
  CarTelemetry as CarTelemetryType, 
  DriverInfo, 
  PitPrediction 
} from '../types/telemetry';
import { useLanguage } from '../context/LanguageContext';
import { CircuitMap } from './CircuitMap';
import { CarTelemetry } from './CarTelemetry';
import { CircleOfDoom } from './CircleOfDoom';
import { Leaderboard } from './Leaderboard';
import { Gauge, MapPin, Eye, Timer } from 'lucide-react';

interface TelemetrixBoxProps {
  circuit: CircuitInfo;
  entries: LeaderboardEntry[];
  selectedDriverId: string;
  onSelectDriver: (driverId: string) => void;
  telemetry: CarTelemetryType | null;
  selectedDriver: DriverInfo | undefined;
  pitPrediction: PitPrediction | null;
  trackStatus: string;
  isOfficialLive: boolean;
  statusMessage?: string;
  nextSessionName?: string;
}

export const TelemetrixBox: React.FC<TelemetrixBoxProps> = ({
  circuit,
  entries,
  selectedDriverId,
  onSelectDriver,
  telemetry,
  selectedDriver,
  pitPrediction,
  trackStatus,
  isOfficialLive,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'map' | 'gauges' | 'times' | 'doom'>('map');

  return (
    <div className="telemetrix-card">
      {/* Header */}
      <div className="telemetrix-header">
        <div className="telemetrix-title">
          <Gauge color="var(--f1-red)" size={20} />
          <span>{t('telemetrix_title')}</span>
          {isOfficialLive ? (
            <span className="f1-badge badge-live">{t('official_live')}</span>
          ) : (
            <span className="f1-badge" style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#ffd700', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
              {circuit.name} (R15)
            </span>
          )}
        </div>

        {/* Desktop View Switcher: Mapa, Velocidad, Tiempos, Circle of Doom */}
        <div className="telemetrix-desktop-views">
          <button
            className={`f1-btn ${viewMode === 'map' ? 'f1-btn-active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => setViewMode('map')}
          >
            <MapPin size={13} />
            <span>{t('map')}</span>
          </button>

          <button
            className={`f1-btn ${viewMode === 'gauges' ? 'f1-btn-active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => setViewMode('gauges')}
          >
            <Gauge size={13} />
            <span>{t('gauges')}</span>
          </button>

          <button
            className={`f1-btn ${viewMode === 'times' ? 'f1-btn-active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => setViewMode('times')}
          >
            <Timer size={13} />
            <span>{t('times')}</span>
          </button>

          <button
            className={`f1-btn ${viewMode === 'doom' ? 'f1-btn-active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => setViewMode('doom')}
          >
            <Eye size={13} />
            <span>{t('circle_of_doom')}</span>
          </button>
        </div>

        {/* Mobile Dropdown View Selector */}
        <div className="telemetrix-mobile-dropdown">
          <select
            className="telemetrix-select-view"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'map' | 'gauges' | 'times' | 'doom')}
          >
            <option value="map">📍 {t('map')}</option>
            <option value="gauges">🏎️ {t('gauges')}</option>
            <option value="times">⏱️ {t('times')}</option>
            <option value="doom">👁️ {t('circle_of_doom')}</option>
          </select>
        </div>
      </div>

      {/* When offline, show brief top context banner */}
      {!isOfficialLive && (
        <div style={{
          padding: '6px 12px',
          background: 'rgba(0, 0, 0, 0.35)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '4px',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)'
        }}>
          <span>🏁 <strong>{circuit.name}</strong> • {t('session_finished', { session: 'Sesión' })}</span>
          <span style={{ color: '#00D7B6', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00D7B6' }} />
            {t('auto_sync_ready')}
          </span>
        </div>
      )}

      {/* Main Content: Map, Gauges, Times or Circle of Doom */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {viewMode === 'map' && (
          <CircuitMap
            circuit={circuit}
            entries={entries}
            selectedDriverId={selectedDriverId}
            onSelectDriver={onSelectDriver}
            trackStatus={trackStatus}
          />
        )}

        {viewMode === 'gauges' && (
          <CarTelemetry
            telemetry={telemetry}
            driver={selectedDriver}
          />
        )}

        {viewMode === 'times' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Leaderboard
              entries={entries}
              selectedDriverId={selectedDriverId}
              onSelectDriver={onSelectDriver}
            />
          </div>
        )}

        {viewMode === 'doom' && (
          <CircleOfDoom
            entries={entries}
            selectedDriverId={selectedDriverId}
            onSelectDriver={onSelectDriver}
            pitPrediction={pitPrediction}
            pitLossSeconds={circuit.pitLossSeconds}
          />
        )}
      </div>
    </div>
  );
};
