import React, { useState } from 'react';
import type { RaceControlMessage, TeamRadio } from '../types/telemetry';
import { AlertCircle, Radio, Volume2, VolumeX } from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface RaceControlProps {
  messages: RaceControlMessage[];
  radios: TeamRadio[];
}

export const RaceControl: React.FC<RaceControlProps> = ({
  messages,
  radios,
}) => {
  const [activeTab, setActiveTab] = useState<'rc' | 'radio'>('rc');
  const [playingRadioId, setPlayingRadioId] = useState<string | null>(null);

  const handlePlayRadio = (id: string) => {
    soundFx.playRadioIntro();
    setPlayingRadioId(id);
    setTimeout(() => {
      setPlayingRadioId(null);
    }, 3800);
  };

  return (
    <div className="f1-card race-control-container">
      {/* Tab Switcher */}
      <div className="tab-switcher">
        <button
          className={`tab-btn ${activeTab === 'rc' ? 'active' : ''}`}
          onClick={() => setActiveTab('rc')}
        >
          <AlertCircle size={15} />
          <span>Control de Carrera ({messages.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'radio' ? 'active' : ''}`}
          onClick={() => setActiveTab('radio')}
        >
          <Radio size={15} />
          <span>Radios de Equipo ({radios.length})</span>
        </button>
      </div>

      {/* Feed Content */}
      <div className="feed-list">
        {activeTab === 'rc' ? (
          messages.map((msg) => {
            const flagClass = 
              msg.flag === 'GREEN' ? 'flag-green' :
              msg.flag === 'YELLOW' ? 'flag-yellow' :
              msg.category === 'SAFETY_CAR' ? 'sc' : 'flag-green';

            return (
              <div key={msg.id} className={`incident-card ${flagClass}`}>
                <div className="incident-header">
                  <span className="incident-scope">{msg.scope}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="incident-message">
                  {msg.messageEn}
                </div>
                <div className="incident-message-es">
                  {msg.messageEs}
                </div>
              </div>
            );
          })
        ) : (
          radios.map((radio) => {
            const isPlaying = playingRadioId === radio.id;

            return (
              <div key={radio.id} className="radio-card">
                <div className="radio-header">
                  <div className="radio-driver-info">
                    <span style={{ fontSize: '0.9rem' }}>{radio.driver.flag}</span>
                    <strong style={{ color: radio.driver.teamColor }}>
                      {radio.driver.code} #{radio.driver.number}
                    </strong>
                    <span className="radio-speaker">[{radio.speaker}]</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {radio.timestamp}
                    </span>
                    <button
                      className="radio-play-btn"
                      onClick={() => handlePlayRadio(radio.id)}
                      title="Reproducir audio de radio"
                    >
                      {isPlaying ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                  </div>
                </div>

                <div className="radio-text-en">
                  "{radio.messageEn}"
                </div>

                <div className="radio-text-es">
                  "{radio.messageEs}"
                </div>

                {isPlaying && (
                  <div className="radio-waveform">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="wave-bar" 
                        style={{ animationDelay: `${(i % 5) * 0.12}s` }} 
                      />
                    ))}
                    <span style={{ fontSize: '0.65rem', color: 'var(--f1-red)', marginLeft: '6px', fontWeight: 700 }}>
                      AUDIO EN VIVO
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
