import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { CircuitInfo, LeaderboardEntry } from '../types/telemetry';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface CircuitMapProps {
  circuit: CircuitInfo;
  entries: LeaderboardEntry[];
  selectedDriverId: string;
  onSelectDriver: (driverId: string) => void;
  trackStatus: string;
  telemetry?: any;
}

export const CircuitMap: React.FC<CircuitMapProps> = ({
  circuit,
  entries,
  selectedDriverId,
  onSelectDriver,
  trackStatus,
  telemetry,
}) => {
  const { t } = useLanguage();
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [followDriver, setFollowDriver] = useState<boolean>(false);

  // Measure path length on circuit change
  useEffect(() => {
    if (pathRef.current) {
      try {
        const len = pathRef.current.getTotalLength();
        setPathLength(len);
      } catch {
        setPathLength(0);
      }
    }
  }, [circuit]);

  // Generate pit lane path dynamically parallel to the start/finish straight
  const pitLaneSvgPath = useMemo(() => {
    const el = pathRef.current;
    if (!el) return '';
    try {
      const total = pathLength > 0 ? pathLength : el.getTotalLength();
      if (total <= 0) return '';
      const points: string[] = [];
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        // Pit lane runs along the start/finish straight (~0.960 to 0.035)
        const p = 0.960 + (i / steps) * 0.075;
        const normP = ((p % 1.0) + 1.0) % 1.0;
        const dist = normP * total;
        const pt = el.getPointAtLength(dist);
        const delta = 3;
        const p1 = el.getPointAtLength(Math.max(0, dist - delta));
        const p2 = el.getPointAtLength(Math.min(total, dist + delta));
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const px = pt.x + nx * 18;
        const py = pt.y + ny * 18;
        points.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)},${py.toFixed(1)}`);
      }
      return points.join(' ');
    } catch {
      return '';
    }
  }, [pathLength, circuit]);

  // Calculate coordinates (x, y) along path with pit lane support
  const getCoordinates = (
    progress: number,
    inPit: boolean = false,
    driverIndex: number = 0
  ): { x: number; y: number } => {
    const el = pathRef.current;
    if (el) {
      try {
        const total = pathLength > 0 ? pathLength : el.getTotalLength();
        if (total > 0) {
          if (inPit) {
            // Pit lane is situated along the start/finish straight (~0.968 to 0.028)
            // Each team/driver has a dedicated pit garage slot
            const totalDrivers = entries.length || 20;
            const pitProgress = 0.968 + (driverIndex / Math.max(1, totalDrivers)) * 0.058;
            const normP = ((pitProgress % 1.0) + 1.0) % 1.0;
            const dist = normP * total;
            const pt = el.getPointAtLength(dist);

            const delta = 3;
            const p1 = el.getPointAtLength(Math.max(0, dist - delta));
            const p2 = el.getPointAtLength(Math.min(total, dist + delta));
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;

            const pitOffset = 18;
            return {
              x: pt.x + nx * pitOffset,
              y: pt.y + ny * pitOffset,
            };
          }

          const normP = ((progress % 1.0) + 1.0) % 1.0;
          const dist = normP * total;
          const pt = el.getPointAtLength(dist);
          return { x: pt.x, y: pt.y };
        }
      } catch {
        // fallback below
      }
    }
    // Fallback ellipse
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    return {
      x: 400 + Math.cos(angle) * 220,
      y: 280 + Math.sin(angle) * 160,
    };
  };

  const selectedCar = entries.find(e => e.driver.id === selectedDriverId);
  const selectedIndex = entries.findIndex(e => e.driver.id === selectedDriverId);
  const selectedInPit = selectedCar ? (selectedCar.inPit || trackStatus === 'CHEQUERED') : false;
  const selectedCoords = selectedCar 
    ? getCoordinates(selectedCar.trackProgress, selectedInPit, selectedIndex >= 0 ? selectedIndex : 0) 
    : { x: 400, y: 280 };

  // Determine current sector for selected car
  const selectedProgress = selectedCar ? (((selectedCar.trackProgress % 1.0) + 1.0) % 1.0) : 0;
  const currentSector = selectedInPit
    ? 'Pit Lane'
    : selectedProgress < (circuit.sectors?.s1EndProgress || 0.31)
      ? 'Sector 1'
      : selectedProgress < (circuit.sectors?.s2EndProgress || 0.68)
        ? 'Sector 2'
        : 'Sector 3';

  return (
    <div className="f1-card map-container" style={{ position: 'relative' }}>
      <div className="map-controls-bar">
        <div className="map-track-name">
          <span style={{ color: 'var(--f1-red)', fontWeight: 900 }}>{t('circuit')}</span>
          <span>{circuit.name}</span>
        </div>

        <div className="map-btn-group">
          <button 
            className={`map-icon-btn ${followDriver ? 'f1-btn-active' : ''}`}
            onClick={() => setFollowDriver(!followDriver)}
            title={t('follow_driver')}
          >
            <Crosshair size={14} />
          </button>
          <button 
            className="map-icon-btn" 
            onClick={() => setZoom(Math.min(zoom + 0.25, 2.5))}
            title={t('zoom_in')}
          >
            <ZoomIn size={14} />
          </button>
          <button 
            className="map-icon-btn" 
            onClick={() => setZoom(Math.max(zoom - 0.25, 0.75))}
            title={t('zoom_out')}
          >
            <ZoomOut size={14} />
          </button>
          <button 
            className="map-icon-btn" 
            onClick={() => { setZoom(1); setFollowDriver(false); }}
            title={t('reset_view')}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Real-time Driver Telemetry Floating HUD on Map */}
      {selectedCar && (
        <div style={{
          position: 'absolute',
          top: '48px',
          left: '12px',
          zIndex: 10,
          background: 'rgba(10, 14, 23, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderLeft: `4px solid ${selectedCar.driver.teamColor}`,
          borderRadius: '6px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{selectedCar.driver.flag}</span>
              <span>#{selectedCar.driver.number} {selectedCar.driver.code}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>{selectedCar.driver.team}</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: trackStatus === 'CHEQUERED' ? '#a0aec0' : 'var(--color-yellow)', marginTop: '2px' }}>
              {trackStatus === 'CHEQUERED' ? '🏁 FINALIZADA • EN GARAJE' : selectedCar.inPit ? 'EN BOXES' : `${currentSector} • Pos ${selectedCar.position}`}
            </div>
          </div>

          {telemetry && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.15)', paddingLeft: '12px' }}>
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: trackStatus === 'CHEQUERED' || telemetry.speed === 0 ? '#a0aec0' : '#00ffaa', lineHeight: 1 }}>
                  {trackStatus === 'CHEQUERED' ? 0 : telemetry.speed}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginLeft: '3px' }}>KM/H</span>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffd700' }}>
                {trackStatus === 'CHEQUERED' || telemetry.gear === 0 ? 'N' : `${telemetry.gear}ª`}
              </div>
              {telemetry.drs === 2 && trackStatus !== 'CHEQUERED' && (
                <span style={{ fontSize: '0.62rem', background: '#00D7B6', color: '#000', fontWeight: 900, padding: '1px 5px', borderRadius: '3px' }}>
                  DRS
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* SVG Canvas Area */}
      <div className="map-canvas-wrapper">
        <svg
          className="circuit-svg"
          viewBox={circuit.viewBox}
          style={{
            transform: followDriver 
              ? `scale(${zoom * 1.5}) translate(${400 - selectedCoords.x}px, ${280 - selectedCoords.y}px)`
              : `scale(${zoom})`,
            transition: followDriver ? 'transform 0.1s linear' : 'transform 0.25s ease',
          }}
        >
          {/* Background Glow Track */}
          <path d={circuit.svgPath} className="track-bg" />

          {/* Yellow sector if yellow flag active */}
          {trackStatus === 'YELLOW' && (
            <path d={circuit.svgPath} className="track-yellow-sector" />
          )}

          {/* Main Track Tarmac */}
          <path 
            ref={pathRef}
            d={circuit.svgPath} 
            className="track-main" 
          />

          {/* Center Dashed Line */}
          <path d={circuit.svgPath} className="track-centerline" />

          {/* Pit Lane Tarmac & Markings */}
          {pitLaneSvgPath && (
            <g className="pit-lane-layer">
              <path 
                d={pitLaneSvgPath} 
                stroke="rgba(255, 255, 255, 0.22)" 
                strokeWidth="6" 
                fill="none" 
                strokeLinecap="round"
              />
              <path 
                d={pitLaneSvgPath} 
                stroke="#00ffff" 
                strokeWidth="1.5" 
                fill="none" 
                strokeDasharray="4 4" 
                opacity="0.8"
              />
            </g>
          )}

          {/* Driver Markers */}
          {entries.map((entry, idx) => {
            const inPit = entry.inPit || trackStatus === 'CHEQUERED';
            const { x, y } = getCoordinates(entry.trackProgress, inPit, idx);
            const isSelected = entry.driver.id === selectedDriverId;
            const radius = isSelected ? 9 : 6.5;

            return (
              <g 
                key={entry.driver.id} 
                className={`car-marker ${isSelected ? 'selected' : ''}`}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectDriver(entry.driver.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Outer halo for selected car */}
                {isSelected && (
                  <circle
                    r={radius + 4}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    opacity={0.8}
                  >
                    <animate 
                      attributeName="r" 
                      values={`${radius + 2};${radius + 7};${radius + 2}`} 
                      dur="1.5s" 
                      repeatCount="indefinite" 
                    />
                  </circle>
                )}

                {/* Main Car Dot */}
                <circle
                  className="car-marker-circle"
                  r={radius}
                  fill={entry.driver.teamColor}
                  stroke={isSelected ? '#ffffff' : inPit ? '#00ffff' : '#000000'}
                  strokeWidth={isSelected ? 2 : inPit ? 1.5 : 1}
                  opacity={inPit ? 0.9 : 1}
                />

                {/* Driver Number */}
                <text className="car-marker-text">
                  {entry.driver.number}
                </text>

                {/* Small PIT Badge for cars in box */}
                {inPit && (
                  <g transform="translate(0, 10)">
                    <rect
                      x="-8"
                      y="-4"
                      width="16"
                      height="7"
                      rx="2"
                      fill="rgba(5, 8, 15, 0.92)"
                      stroke="#00ffff"
                      strokeWidth="0.6"
                    />
                    <text
                      x="0"
                      y="1.2"
                      textAnchor="middle"
                      fill="#00ffff"
                      fontSize="4.8"
                      fontWeight="900"
                    >
                      PIT
                    </text>
                  </g>
                )}

                {/* Speed indicator tooltip attached to selected car */}
                {isSelected && telemetry && (
                  <g transform="translate(0, -16)">
                    <rect
                      x="-26"
                      y="-13"
                      width="52"
                      height="14"
                      rx="3"
                      fill="rgba(6, 10, 18, 0.9)"
                      stroke={entry.driver.teamColor}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-3"
                      textAnchor="middle"
                      fill={trackStatus === 'CHEQUERED' || inPit ? '#ffd700' : '#00ffaa'}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="var(--font-mono)"
                    >
                      {trackStatus === 'CHEQUERED' || inPit ? 'EN BOXES' : `${telemetry.speed} km/h`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color-dot" style={{ background: 'var(--color-drs)' }} />
          <span>{t('drs_zone')}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color-dot" style={{ background: '#00ffff' }} />
          <span>Pit Lane / Boxes</span>
        </div>
        <div className="legend-item">
          <div className="legend-color-dot" style={{ background: '#ffffff' }} />
          <span>{t('finish_line')}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color-dot" style={{ background: 'var(--f1-red)' }} />
          <span>{t('selected_driver')}</span>
        </div>
      </div>
    </div>
  );
};
