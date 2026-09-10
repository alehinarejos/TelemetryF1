import React from 'react';
import type { 
  CircuitInfo, 
  LeaderboardEntry, 
  CarTelemetry as CarTelemetryType, 
  DriverInfo, 
  PitPrediction 
} from '../types/telemetry';
import { TelemetrixBox } from './TelemetrixBox';
import { ScheduleBox } from './ScheduleBox';
import { LeaderboardBox } from './LeaderboardBox';

interface HomeSketchLayoutProps {
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
  onOpenFullSchedule: () => void;
}

export const HomeSketchLayout: React.FC<HomeSketchLayoutProps> = ({
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
  onOpenFullSchedule,
}) => {
  return (
    <div className="home-layout-grid">
      {/* Left Column: telemetrix on top, SCHEDULE below */}
      <div className="home-left-column">
        {/* Top: telemetrix */}
        <TelemetrixBox
          circuit={circuit}
          entries={entries}
          selectedDriverId={selectedDriverId}
          onSelectDriver={onSelectDriver}
          telemetry={telemetry}
          selectedDriver={selectedDriver}
          pitPrediction={pitPrediction}
          trackStatus={trackStatus}
          isOfficialLive={isOfficialLive}
          statusMessage={statusMessage}
          nextSessionName={nextSessionName}
        />

        {/* Bottom: SCHEDULE */}
        <ScheduleBox
          onOpenFullSchedule={onOpenFullSchedule}
        />
      </div>

      {/* Right Column: Led (Leaderboard tall column) */}
      <div className="home-right-column">
        <LeaderboardBox
          selectedDriverId={selectedDriverId}
          onSelectDriver={onSelectDriver}
          isSessionActive={isOfficialLive}
        />
      </div>
    </div>
  );
};
