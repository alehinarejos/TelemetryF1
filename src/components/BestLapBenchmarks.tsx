import React from 'react';
import { Timer, HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { TeamLogo } from './TeamLogo';
import type { LeaderboardEntry } from '../types/telemetry';

interface BestLapBenchmarksProps {
  entries: LeaderboardEntry[];
  sessionName?: string;
  circuitName?: string;
}

export const BestLapBenchmarks: React.FC<BestLapBenchmarksProps> = ({
  entries,
  sessionName = 'Practice 3',
  circuitName: _circuitName = 'Madrid',
}) => {
  // Helper to parse lap time to seconds
  const parseTimeToSec = (t?: string): number => {
    if (!t || t.includes('-') || t.includes('DNF') || t.trim() === '') return Infinity;
    const clean = t.replace('+', '').trim();
    const parts = clean.split(':');
    if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return parseFloat(clean) || Infinity;
  };

  // Find overall session best driver
  let sessionBestEntry: LeaderboardEntry | null = null;
  let minSec = Infinity;

  for (const entry of entries) {
    const s = parseTimeToSec(entry.bestLapTime);
    if (s < minSec) {
      minSec = s;
      sessionBestEntry = entry;
    }
  }

  // Format benchmark delta relative to session best
  const renderDeltaBadge = (benchmarkSec: number) => {
    if (minSec === Infinity) {
      return (
        <span style={{
          fontSize: '0.66rem',
          fontFamily: 'var(--font-mono)',
          color: '#94a3b8',
          background: 'rgba(255, 255, 255, 0.08)',
          padding: '2px 7px',
          borderRadius: '4px',
          fontWeight: 700,
        }}>
          +0.000s
        </span>
      );
    }
    const delta = minSec - benchmarkSec;
    const isSlower = delta > 0;
    const sign = isSlower ? '+' : '-';
    const text = `${sign}${Math.abs(delta).toFixed(3)}s`;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        fontSize: '0.68rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: 800,
        padding: '2px 8px',
        borderRadius: '4px',
        color: isSlower ? '#f87171' : '#34d399',
        background: isSlower ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.16)',
        border: `1px solid ${isSlower ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
      }}>
        {isSlower ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {text}
      </span>
    );
  };

  // Standard official benchmarks for Madrid / Spanish GP
  const prevEditionSec = 72.387; // 1:12.387
  const lapRecordSec = 75.743;   // 1:15.743
  const trackRecordSec = 71.383; // 1:11.383

  return (
    <div className="f1-card best-lap-benchmarks-card" style={{
      background: 'rgba(10, 10, 12, 0.94)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Timer size={18} color="#d354ff" />
          <span style={{
            fontSize: '0.90rem',
            fontWeight: 800,
            color: '#f8fafc',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.02em',
          }}>
            Best Lap Benchmarks
          </span>
        </div>
        <span title="Puntos de referencia de tiempos oficiales" style={{ display: 'inline-flex', cursor: 'pointer' }}>
          <HelpCircle size={15} color="#64748b" />
        </span>
      </div>

      {/* 1. SESSION BEST (Tiempo más rápido de la sesión actual en Morado) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(211, 84, 255, 0.12) 0%, rgba(147, 51, 234, 0.06) 100%)',
        border: '1.5px solid rgba(211, 84, 255, 0.35)',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            color: '#d8b4fe',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            SESSION BEST
          </span>
          <span style={{
            fontSize: '0.62rem',
            fontWeight: 800,
            color: '#d354ff',
            background: 'rgba(211, 84, 255, 0.18)',
            padding: '1px 6px',
            borderRadius: '3px',
            fontFamily: 'var(--font-mono)',
          }}>
            P1 ACTUAL
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.65rem',
            fontWeight: 900,
            color: '#d354ff',
            letterSpacing: '0.02em',
            textShadow: '0 0 14px rgba(211, 84, 255, 0.5)',
            lineHeight: 1.1,
          }}>
            {sessionBestEntry?.bestLapTime || '1:34.284'}
          </span>

          {sessionBestEntry && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TeamLogo team={sessionBestEntry.driver.team} size={26} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.96rem',
                  fontWeight: 900,
                  color: '#f8fafc',
                  lineHeight: 1,
                }}>
                  {sessionBestEntry.driver.code}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                  {sessionBestEntry.driver.lastName}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. PREVIOUS SESSION EDITION (Sesión anterior con delta) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{
          fontSize: '0.64rem',
          fontWeight: 700,
          color: '#94a3b8',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          PREVIOUS {sessionName.toUpperCase()} EDITION
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>
            1:12.387
          </span>
          {renderDeltaBadge(prevEditionSec)}
        </div>
        <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
          Oscar Piastri, 2025
        </span>
      </div>

      {/* 3. LAP RECORD (Récord de vuelta en carrera con delta) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{
          fontSize: '0.64rem',
          fontWeight: 700,
          color: '#94a3b8',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          LAP RECORD
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>
            1:15.743
          </span>
          {renderDeltaBadge(lapRecordSec)}
        </div>
        <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
          Oscar Piastri, 2025
        </span>
      </div>

      {/* 4. TRACK RECORD (Récord absoluto de la pista con delta) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{
          fontSize: '0.64rem',
          fontWeight: 700,
          color: '#94a3b8',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          TRACK RECORD
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>
            1:11.383
          </span>
          {renderDeltaBadge(trackRecordSec)}
        </div>
        <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
          Lando Norris, 2024
        </span>
      </div>
    </div>
  );
};
