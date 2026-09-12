import React from 'react';
import { AlertTriangle, Flag, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { RaceControlMessage } from '../types/telemetry';

interface TrackFlagIndicatorProps {
  trackStatus: string; // 'GREEN' | 'YELLOW' | 'RED' | 'SC' | 'VSC' | 'CHEQUERED'
  messages?: RaceControlMessage[];
}

export const TrackFlagIndicator: React.FC<TrackFlagIndicatorProps> = ({
  trackStatus,
  messages = [],
}) => {
  // Check latest flag message to detect sector details
  const latestFlagMsg = messages.find(m => 
    m.flag === 'YELLOW' || 
    m.flag === 'DOUBLE_YELLOW' || 
    m.flag === 'RED' || 
    m.category === 'FLAG' ||
    m.category === 'SAFETY_CAR'
  );

  // Determine active flag state
  let flagType: 'GREEN' | 'YELLOW' | 'DOUBLE_YELLOW' | 'RED' | 'SC' | 'VSC' | 'CHEQUERED' = 'GREEN';
  let sectorDetail = '';

  if (trackStatus === 'RED' || latestFlagMsg?.flag === 'RED') {
    flagType = 'RED';
    sectorDetail = 'SESIÓN DETENIDA';
  } else if (trackStatus === 'SC' || latestFlagMsg?.category === 'SAFETY_CAR') {
    flagType = 'SC';
    sectorDetail = 'COCHE DE SEGURIDAD DESPLEGADO';
  } else if (trackStatus === 'VSC') {
    flagType = 'VSC';
    sectorDetail = 'VIRTUAL SAFETY CAR ACTIVO';
  } else if (trackStatus === 'CHEQUERED') {
    flagType = 'CHEQUERED';
    sectorDetail = 'SESIÓN FINALIZADA';
  } else if (trackStatus === 'YELLOW' || latestFlagMsg?.flag === 'YELLOW' || latestFlagMsg?.flag === 'DOUBLE_YELLOW') {
    flagType = latestFlagMsg?.flag === 'DOUBLE_YELLOW' ? 'DOUBLE_YELLOW' : 'YELLOW';
    // Find which sector from scope or message text
    if (latestFlagMsg?.scope && latestFlagMsg.scope.toLowerCase().includes('sector')) {
      sectorDetail = latestFlagMsg.scope.toUpperCase();
    } else if (latestFlagMsg?.messageEn && latestFlagMsg.messageEn.toLowerCase().includes('sector')) {
      const match = latestFlagMsg.messageEn.match(/sector\s*([0-9]+)/i);
      sectorDetail = match ? `SECTOR ${match[1]}` : 'SECTOR 2';
    } else {
      sectorDetail = 'SECTOR 2';
    }
  } else {
    flagType = 'GREEN';
    sectorDetail = 'PISTA DESPEJADA';
  }

  return (
    <div className="track-flag-indicator-bar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      borderRadius: '8px',
      marginBottom: '12px',
      boxSizing: 'border-box',
      transition: 'all 0.3s ease',
      ...(flagType === 'RED'
        ? {
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.28) 0%, rgba(185, 28, 28, 0.35) 100%)',
            border: '1.5px solid #ef4444',
            boxShadow: '0 0 16px rgba(239, 68, 68, 0.35)',
          }
        : flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW'
        ? {
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.3) 100%)',
            border: '1.5px solid #f59e0b',
            boxShadow: '0 0 14px rgba(245, 158, 11, 0.3)',
          }
        : flagType === 'SC' || flagType === 'VSC'
        ? {
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(234, 88, 12, 0.25) 100%)',
            border: '1.5px solid #fbbf24',
          }
        : flagType === 'CHEQUERED'
        ? {
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }
        : {
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.16) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }),
    }}>
      {/* Flag Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {flagType === 'RED' ? (
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 10px rgba(239,68,68,0.8)',
            animation: 'pulse 1.2s infinite',
          }}>
            <Flag size={16} />
          </div>
        ) : flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW' ? (
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            boxShadow: '0 0 10px rgba(245,158,11,0.8)',
          }}>
            <AlertTriangle size={16} />
          </div>
        ) : flagType === 'SC' || flagType === 'VSC' ? (
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
          }}>
            <ShieldAlert size={16} />
          </div>
        ) : flagType === 'CHEQUERED' ? (
          <span style={{ fontSize: '1.3rem' }}>🏁</span>
        ) : (
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <CheckCircle2 size={16} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.88rem',
            fontWeight: 900,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: flagType === 'RED'
              ? '#fca5a5'
              : flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW'
              ? '#fde047'
              : flagType === 'SC' || flagType === 'VSC'
              ? '#fef08a'
              : flagType === 'CHEQUERED'
              ? '#f1f5f9'
              : '#6ee7b7',
          }}>
            {flagType === 'RED'
              ? 'BANDERA ROJA'
              : flagType === 'DOUBLE_YELLOW'
              ? 'DOBLE BANDERA AMARILLA'
              : flagType === 'YELLOW'
              ? 'BANDERA AMARILLA'
              : flagType === 'SC'
              ? 'SAFETY CAR'
              : flagType === 'VSC'
              ? 'VIRTUAL SAFETY CAR'
              : flagType === 'CHEQUERED'
              ? 'BANDERA A CUADROS'
              : 'PISTA DESPEJADA (BANDERA VERDE)'}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#e2e8f0',
            letterSpacing: '0.03em',
          }}>
            {sectorDetail}
          </span>
        </div>
      </div>

      {/* Flag Status Pills for Sectors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          padding: '3px 8px',
          borderRadius: '4px',
          background: sectorDetail.includes('1') && (flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW')
            ? '#f59e0b'
            : flagType === 'RED'
            ? '#ef4444'
            : 'rgba(255,255,255,0.06)',
          color: sectorDetail.includes('1') && (flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW')
            ? '#000'
            : flagType === 'RED'
            ? '#fff'
            : '#94a3b8',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          SEC 1
        </div>
        <div style={{
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          padding: '3px 8px',
          borderRadius: '4px',
          background: sectorDetail.includes('2') && (flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW')
            ? '#f59e0b'
            : flagType === 'RED'
            ? '#ef4444'
            : 'rgba(255,255,255,0.06)',
          color: sectorDetail.includes('2') && (flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW')
            ? '#000'
            : flagType === 'RED'
            ? '#fff'
            : '#94a3b8',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          SEC 2
        </div>
        <div style={{
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          padding: '3px 8px',
          borderRadius: '4px',
          background: sectorDetail.includes('3') && (flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW')
            ? '#f59e0b'
            : flagType === 'RED'
            ? '#ef4444'
            : 'rgba(255,255,255,0.06)',
          color: sectorDetail.includes('3') && (flagType === 'YELLOW' || flagType === 'DOUBLE_YELLOW')
            ? '#000'
            : flagType === 'RED'
            ? '#fff'
            : '#94a3b8',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          SEC 3
        </div>
      </div>
    </div>
  );
};
