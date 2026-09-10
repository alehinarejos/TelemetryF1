import React, { useState } from 'react';
import type { 
  CircuitInfo, 
  LeaderboardEntry, 
  CarTelemetry as CarTelemetryType, 
  DriverInfo, 
  PitPrediction 
} from '../types/telemetry';
import { CircuitMap } from './CircuitMap';
import { CarTelemetry } from './CarTelemetry';
import { CircleOfDoom } from './CircleOfDoom';
import { Radio, Gauge, MapPin, Eye, PlayCircle } from 'lucide-react';

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
  statusMessage: string;
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
  statusMessage,
  nextSessionName,
}) => {
  // If no official race is live, allow the user to see the standby view or test the telemetry
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'map' | 'gauges' | 'doom'>('map');

  const isShowingTelemetry = isOfficialLive || simulationActive;

  return (
    <div className="telemetrix-card">
      {/* Header */}
      <div className="telemetrix-header">
        <div className="telemetrix-title">
          <Gauge color="var(--f1-red)" size={20} />
          <span>TELEMETRIX</span>
          {isOfficialLive ? (
            <span className="f1-badge badge-live">OFICIAL EN DIRECTO</span>
          ) : (
            <span className="f1-badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
              OFICIAL FIA
            </span>
          )}
        </div>

        {/* View Switcher if telemetry is active */}
        {isShowingTelemetry && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`f1-btn ${viewMode === 'map' ? 'f1-btn-active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setViewMode('map')}
            >
              <MapPin size={13} />
              <span>Mapa</span>
            </button>

            <button
              className={`f1-btn ${viewMode === 'gauges' ? 'f1-btn-active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setViewMode('gauges')}
            >
              <Gauge size={13} />
              <span>Gauges</span>
            </button>

            <button
              className={`f1-btn ${viewMode === 'doom' ? 'f1-btn-active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setViewMode('doom')}
            >
              <Eye size={13} />
              <span>Circle of Doom</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {!isShowingTelemetry ? (
        /* Standby State: No official race active right now */
        <div className="standby-container">
          <div className="standby-radar-icon">
            <Radio size={38} />
            <div className="standby-radar-pulse" />
          </div>

          <h3 className="standby-title">
            ESPERANDO SESIÓN OFICIAL EN VIVO
          </h3>

          <p className="standby-desc">
            No hay ninguna sesión de Fórmula 1 en pista en este momento. La plataforma está conectada a la API oficial de telemetría (OpenF1 / FIA Live Timing) y se activará en directo automáticamente al arrancar la sesión.
          </p>

          <div className="standby-status-pill">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} />
            <span>{statusMessage}</span>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Próxima cita oficial: <strong style={{ color: '#fff' }}>{nextSessionName}</strong>
          </div>

          {/* User toggle to preview/test telemetry engine */}
          <div className="standby-demo-toggle">
            <PlayCircle size={18} color="var(--color-yellow)" />
            <span>¿Deseas probar la interfaz y los gauges mientras esperas?</span>
            <button
              className="f1-btn f1-btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              onClick={() => setSimulationActive(true)}
            >
              Activar Simulación
            </button>
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

          {!isOfficialLive && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '8px 16px', 
              background: 'rgba(255, 215, 0, 0.08)',
              borderTop: '1px solid rgba(255, 215, 0, 0.2)',
              fontSize: '0.72rem',
              color: 'var(--color-yellow)',
              fontFamily: 'var(--font-mono)'
            }}>
              <span>MODO DE PRUEBA ACTIVO (SIN SESIÓN OFICIAL EN PISTA)</span>
              <button 
                onClick={() => setSimulationActive(false)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  textDecoration: 'underline', 
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Volver al Modo Oficial En Espera
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
