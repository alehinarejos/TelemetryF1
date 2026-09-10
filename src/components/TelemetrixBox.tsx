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
import { Radio, Gauge, MapPin, Eye } from 'lucide-react';

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
  nextSessionName: string;
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
  nextSessionName,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'map' | 'gauges' | 'doom'>('map');

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
            <span className="f1-badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
              {t('official_fia')}
            </span>
          )}
        </div>

        {/* View Switcher if telemetry is active */}
        {isOfficialLive && (
          <div style={{ display: 'flex', gap: '6px' }}>
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
              className={`f1-btn ${viewMode === 'doom' ? 'f1-btn-active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setViewMode('doom')}
            >
              <Eye size={13} />
              <span>{t('circle_of_doom')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {!isOfficialLive ? (
        /* Standby State: No official race active right now */
        <div className="standby-container">
          <div className="standby-radar-icon">
            <Radio size={38} />
            <div className="standby-radar-pulse" />
          </div>

          <h3 className="standby-title">
            {t('waiting_next_session')}
          </h3>

          <p className="standby-desc">
            {t('waiting_desc')}
          </p>

          <div className="standby-status-pill">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00D7B6' }} />
            <span>{t('waiting_activity')}</span>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t('next_session')} <strong style={{ color: '#fff' }}>{nextSessionName}</strong>
          </div>
        </div>
      ) : (
        /* Active Telemetry: Map, Gauges or Circle of Doom */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
      )}
    </div>
  );
};
