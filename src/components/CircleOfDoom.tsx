import React from 'react';
import type { LeaderboardEntry, PitPrediction } from '../types/telemetry';
import { useLanguage } from '../context/LanguageContext';

interface CircleOfDoomProps {
  entries: LeaderboardEntry[];
  selectedDriverId: string;
  onSelectDriver: (driverId: string) => void;
  pitPrediction: PitPrediction | null;
  pitLossSeconds: number;
}

export const CircleOfDoom: React.FC<CircleOfDoomProps> = ({
  entries,
  selectedDriverId,
  onSelectDriver,
  pitPrediction,
  pitLossSeconds,
}) => {
  const { t } = useLanguage();
  const selectedCar = entries.find(e => e.driver.id === selectedDriverId);
  const driverProgress = selectedCar ? selectedCar.trackProgress : 0;

  // Track is represented as a 360-degree circle (radius = 95, center = 135, 135)
  const cx = 135;
  const cy = 135;
  const radius = 95;
  const circumference = 2 * Math.PI * radius;

  // Approximate pit loss as a fraction of lap time (e.g. 23.4s / 82s lap = ~0.285 of lap)
  const pitLossLapFraction = pitLossSeconds / 82;
  const pitArcLength = circumference * pitLossLapFraction;

  const rejoinProgress = ((driverProgress - pitLossLapFraction) % 1.0 + 1.0) % 1.0;

  const getCirclePoint = (progress: number) => {
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  };

  const rejoinPoint = getCirclePoint(rejoinProgress);

  return (
    <div className="f1-card circle-of-doom-container">
      <div className="card-header">
        <div className="card-title">
          <span style={{ color: '#ff007f', fontWeight: 900 }}>{t('radar')}</span>
          <span>{t('pit_window_title')}</span>
        </div>
        <div className="f1-badge" style={{ background: 'rgba(255, 0, 127, 0.15)', color: '#ff007f', border: '1px solid rgba(255, 0, 127, 0.4)' }}>
          {t('undercut')}
        </div>
      </div>

      <div className="doom-header-desc">
        {t('pit_prediction_desc', { loss: pitLossSeconds })}
      </div>

      <div className="doom-radar-wrapper">
        <svg className="doom-svg" viewBox="0 0 270 270">
          {/* Main Track Ring */}
          <circle 
            className="doom-ring-bg" 
            cx={cx} 
            cy={cy} 
            r={radius} 
          />

          {/* Pit Stop Delta Arc (Thick Pink Arc) */}
          <circle
            className="doom-pit-arc"
            cx={cx}
            cy={cy}
            r={radius}
            strokeDasharray={`${pitArcLength} ${circumference}`}
            strokeDashoffset={-((rejoinProgress * circumference))}
            transform={`rotate(-90 ${cx} ${cy})`}
          />

          {/* Rejoin Marker Dot */}
          <circle
            cx={rejoinPoint.x}
            cy={rejoinPoint.y}
            r={8}
            fill="#ff007f"
            stroke="#ffffff"
            strokeWidth={2}
          >
            <animate
              attributeName="r"
              values="7;10;7"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Driver Dots around circle */}
          {entries.map((entry) => {
            const pt = getCirclePoint(entry.trackProgress);
            const isSelected = entry.driver.id === selectedDriverId;
            const r = isSelected ? 8 : 5;

            return (
              <g
                key={entry.driver.id}
                className="doom-driver-dot"
                transform={`translate(${pt.x}, ${pt.y})`}
                onClick={() => onSelectDriver(entry.driver.id)}
              >
                <circle
                  r={r}
                  fill={entry.driver.teamColor}
                  stroke={isSelected ? '#ffffff' : '#000000'}
                  strokeWidth={isSelected ? 2 : 0.8}
                />
                <text y={0.5}>
                  {entry.driver.code}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center Projection Card */}
        {pitPrediction && (
          <div className="doom-center-info">
            <span className="doom-rejoin-label">{t('rejoin')}</span>
            <span className="doom-rejoin-pos">
              P{pitPrediction.rejoiningPosition}
            </span>
            <span className="doom-rejoin-target">
              {pitPrediction.rejoiningBehindDriver ? (
                t('behind_driver', { driver: pitPrediction.rejoiningBehindDriver.code })
              ) : (
                t('leading_after_stop')
              )}
            </span>

            <div className={`doom-traffic-status ${pitPrediction.isInTraffic ? 'doom-traffic-dense' : 'doom-traffic-clear'}`}>
              {pitPrediction.isInTraffic ? t('traffic_dense') : t('traffic_clear')}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="doom-footer">
        <span>{t('avg_pitlane_loss')} <strong className="pit-loss-value">+{pitLossSeconds}s</strong></span>
        <span>{t('current_pos')} <strong>P{selectedCar?.position || 1}</strong></span>
      </div>
    </div>
  );
};
