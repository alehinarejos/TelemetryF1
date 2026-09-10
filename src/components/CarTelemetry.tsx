import React from 'react';
import type { CarTelemetry as CarTelemetryType, DriverInfo } from '../types/telemetry';
import { useLanguage } from '../context/LanguageContext';

interface CarTelemetryProps {
  telemetry: CarTelemetryType | null;
  driver: DriverInfo | undefined;
}

export const CarTelemetry: React.FC<CarTelemetryProps> = ({
  telemetry,
  driver,
}) => {
  const { t } = useLanguage();

  if (!telemetry || !driver) {
    return (
      <div className="f1-card telemetry-widget" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>{t('loading_telemetry')}</span>
      </div>
    );
  }

  // Calculate Shift Lights based on RPM (from 9,000 to 14,000 RPM)
  const rpmRatio = Math.max(0, Math.min(1, (telemetry.rpm - 8500) / 5500));
  const activeLightsCount = Math.floor(rpmRatio * 15);

  // Speedometer arc: 0 to 360 km/h mapped to 240 deg arc
  const speedRatio = Math.max(0, Math.min(1, telemetry.speed / 360));
  const arcCircumference = 2 * Math.PI * 65; // radius = 65
  const strokeDashoffset = arcCircumference * (1 - speedRatio * 0.75);

  // DRS status string (simplified to 'DRS' as requested)
  const drsStatusClass = 
    telemetry.drs === 2 ? 'drs-active' :
    telemetry.drs === 1 ? 'drs-available' : 'drs-off';

  return (
    <div className="f1-card telemetry-widget">
      {/* Header with Driver Identity & DRS badge */}
      <div className="telemetry-driver-banner">
        <div className="driver-identity">
          <div 
            className="driver-color-pill" 
            style={{ backgroundColor: driver.teamColor }} 
          />
          <div className="driver-names-block">
            <span className="driver-full-name">
              #{driver.number} {driver.firstName} {driver.lastName} {driver.flag}
            </span>
            <span className="driver-team-name">{driver.team}</span>
          </div>
        </div>

        <div className={`drs-badge-large ${drsStatusClass}`}>
          DRS
        </div>
      </div>

      {/* F1 Steering Wheel LED Shift Lights */}
      <div className="shift-lights-bar">
        {Array.from({ length: 15 }).map((_, i) => {
          const isActive = i < activeLightsCount;
          let colorType = 'green';
          if (i >= 5 && i < 10) colorType = 'red';
          if (i >= 10) colorType = 'purple';

          return (
            <div 
              key={i} 
              className={`shift-light ${colorType} ${isActive ? 'active' : ''}`}
            />
          );
        })}
      </div>

      {/* Center Row: Speedometer Dial & Pedals */}
      <div className="telemetry-main-row">
        {/* Speedometer Gauge Dial */}
        <div className="speedometer-gauge">
          <svg className="gauge-svg" viewBox="0 0 160 160">
            {/* Background Arc */}
            <circle
              className="gauge-bg-arc"
              cx="80"
              cy="80"
              r="65"
              strokeDasharray={arcCircumference}
              strokeDashoffset={arcCircumference * 0.25}
            />

            {/* Progress Arc */}
            <circle
              className="gauge-progress-arc"
              cx="80"
              cy="80"
              r="65"
              stroke={speedRatio > 0.8 ? '#00ffaa' : driver.teamColor}
              strokeDasharray={arcCircumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>

          {/* Center Digital Readout */}
          <div className="gauge-center-content">
            <span className="speed-number">{telemetry.speed}</span>
            <span className="speed-unit">KM / H</span>
            <div className="gear-display">
              <span className="gear-label">{t('gear')}</span>
              <span className="gear-value">
                {telemetry.gear === 0 ? 'N' : telemetry.gear}
              </span>
            </div>
          </div>
        </div>

        {/* Throttle & Brake Pedals */}
        <div className="pedals-column">
          {/* Throttle */}
          <div className="pedal-bar-wrapper pedal-throttle">
            <span className="pedal-value">{telemetry.throttle}%</span>
            <div className="pedal-bar-track">
              <div 
                className="pedal-bar-fill" 
                style={{ height: `${telemetry.throttle}%` }} 
              />
            </div>
            <span className="pedal-label">{t('throttle')}</span>
          </div>

          {/* Brake */}
          <div className="pedal-bar-wrapper pedal-brake">
            <span className="pedal-value">{telemetry.brake}%</span>
            <div className="pedal-bar-track">
              <div 
                className="pedal-bar-fill" 
                style={{ height: `${telemetry.brake}%` }} 
              />
            </div>
            <span className="pedal-label">{t('brake')}</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid: RPM, ERS, G-Force */}
      <div className="telemetry-stats-grid">
        <div className="stat-box">
          <span className="stat-label">{t('rpm')}</span>
          <span className="stat-value">{telemetry.rpm.toLocaleString()}</span>
        </div>

        <div className="stat-box">
          <span className="stat-label">{t('battery_ers')}</span>
          <span className="stat-value" style={{ color: '#00d2be' }}>
            {telemetry.ersBattery}%
          </span>
        </div>

        <div className="stat-box">
          <span className="stat-label">{t('g_lateral')}</span>
          <span className="stat-value">
            {telemetry.gForceLat > 0 ? `+${telemetry.gForceLat}G` : `${telemetry.gForceLat}G`}
          </span>
        </div>

        <div className="stat-box">
          <span className="stat-label">{t('g_longitudinal')}</span>
          <span className="stat-value" style={{ color: telemetry.gForceLong < 0 ? '#ff3333' : '#00ff88' }}>
            {telemetry.gForceLong > 0 ? `+${telemetry.gForceLong}G` : `${telemetry.gForceLong}G`}
          </span>
        </div>
      </div>
    </div>
  );
};
