import React, { useRef, useState, useEffect } from 'react';
import type { CircuitInfo, LeaderboardEntry } from '../types/telemetry';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface CircuitMapProps {
  circuit: CircuitInfo;
  entries: LeaderboardEntry[];
  selectedDriverId: string;
  onSelectDriver: (driverId: string) => void;
  trackStatus: string;
}

export const CircuitMap: React.FC<CircuitMapProps> = ({
  circuit,
  entries,
  selectedDriverId,
  onSelectDriver,
  trackStatus,
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

  // Calculate coordinates (x, y) along path
  const getCoordinates = (progress: number): { x: number; y: number } => {
    if (pathRef.current && pathLength > 0) {
      try {
        const dist = ((progress % 1.0) + 1.0) % 1.0 * pathLength;
        const pt = pathRef.current.getPointAtLength(dist);
        return { x: pt.x, y: pt.y };
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
  const selectedCoords = selectedCar ? getCoordinates(selectedCar.trackProgress) : { x: 400, y: 280 };

  return (
    <div className="f1-card map-container">
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

          {/* Driver Markers */}
          {entries.map((entry) => {
            const { x, y } = getCoordinates(entry.trackProgress);
            const isSelected = entry.driver.id === selectedDriverId;
            const radius = isSelected ? 9 : 6.5;

            return (
              <g 
                key={entry.driver.id} 
                className={`car-marker ${isSelected ? 'selected' : ''}`}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectDriver(entry.driver.id)}
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
                  stroke={isSelected ? '#ffffff' : '#000000'}
                  strokeWidth={isSelected ? 2 : 1}
                />

                {/* Driver Number / Code */}
                <text className="car-marker-text">
                  {entry.driver.number}
                </text>
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
