// OpenF1 API Service — fetches real F1 timing, position and telemetry data

export interface OpenF1Session {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_name: string;
  country_code: string;
  location: string;
  year: number;
  is_cancelled: boolean;
}

export interface OpenF1Position {
  date: string;
  session_key: number;
  driver_number: number;
  meeting_key: number;
  position: number;
}

export interface OpenF1CarData {
  date: string;
  session_key: number;
  speed: number;
  rpm: number;
  n_gear: number;
  throttle: number;
  brake: number;
  drs: number | null;
  driver_number: number;
}

export interface OpenF1Lap {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  is_pit_out_lap: boolean;
  lap_duration: number | null;
  segments_sector_1: number[];
  segments_sector_2: number[];
  segments_sector_3: number[];
}

export interface OpenF1Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string | null;
  session_key: number;
  meeting_key: number;
}

export interface BestLapResult {
  driverNumber: number;
  nameAcronym: string;
  teamName: string;
  teamColor: string;
  bestLapSec: number;
  bestLapFormatted: string;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  speedTrap: number | null;
  finalPosition: number;
}

export interface LiveSessionStatus {
  isLive: boolean;
  statusMessage: string;
  activeSession: OpenF1Session | null;
  latestCompletedSession: OpenF1Session | null;
  nextSession: {
    name: string;
    circuit: string;
    dateStart: string;
  } | null;
}

function formatLapTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

class OfficialF1Service {
  private baseUrl = 'https://api.openf1.org/v1';

  // Check whether an official session is currently taking place in 2026
  public async checkLiveStatus(): Promise<LiveSessionStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/sessions?session_key=latest`);
      if (!res.ok) throw new Error('API network error');
      const data: OpenF1Session[] = await res.json();
      
      if (!data || data.length === 0) {
        return {
          isLive: false,
          statusMessage: 'No hay sesiones registradas en la temporada 2026',
          activeSession: null,
          latestCompletedSession: null,
          nextSession: {
            name: 'FP2 - GP de España (Madrid)',
            circuit: 'Madring',
            dateStart: '2026-09-11T15:00:00Z',
          },
        };
      }

      const latest = data[0];
      const now = new Date().getTime();
      const startTime = new Date(latest.date_start).getTime();
      const endTime = new Date(latest.date_end).getTime();

      const isLive = now >= startTime && now <= endTime;

      return {
        isLive,
        statusMessage: isLive 
          ? `🔴 SESIÓN EN DIRECTO: ${latest.session_name} - ${latest.circuit_short_name}` 
          : `⚪ EN ESPERA: Sin sesión en pista. Última: ${latest.session_name} (${latest.circuit_short_name})`,
        activeSession: isLive ? latest : null,
        latestCompletedSession: latest,
        nextSession: {
          name: 'FP2 - GP de España (Madrid)',
          circuit: 'Madring',
          dateStart: '2026-09-11T15:00:00Z',
        },
      };
    } catch {
      return {
        isLive: false,
        statusMessage: 'Conectado a los datos oficiales • En espera',
        activeSession: null,
        latestCompletedSession: null,
        nextSession: {
          name: 'FP2 - GP de España (Madrid)',
          circuit: 'Madring',
          dateStart: '2026-09-11T15:00:00Z',
        },
      };
    }
  }

  /**
   * Get sessions for a meeting (GP)
   */
  public async getMeetingSessions(meetingKey: number): Promise<OpenF1Session[]> {
    try {
      const res = await fetch(`${this.baseUrl}/sessions?meeting_key=${meetingKey}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  /**
   * Get drivers for a session
   */
  public async getSessionDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
    try {
      const res = await fetch(`${this.baseUrl}/drivers?session_key=${sessionKey}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  /**
   * Get ALL laps for a session and compute best lap per driver
   */
  public async getSessionBestLaps(sessionKey: number): Promise<BestLapResult[]> {
    try {
      const [lapsRes, posRes, driversRes] = await Promise.all([
        fetch(`${this.baseUrl}/laps?session_key=${sessionKey}`),
        fetch(`${this.baseUrl}/position?session_key=${sessionKey}`),
        fetch(`${this.baseUrl}/drivers?session_key=${sessionKey}`),
      ]);

      if (!lapsRes.ok) return [];

      const laps: OpenF1Lap[] = await lapsRes.json();
      const positions: OpenF1Position[] = posRes.ok ? await posRes.json() : [];
      const drivers: OpenF1Driver[] = driversRes.ok ? await driversRes.json() : [];

      // Build driver map
      const driverMap = new Map<number, OpenF1Driver>();
      drivers.forEach(d => driverMap.set(d.driver_number, d));

      // Compute best lap per driver (exclude pit-out laps and null durations)
      const bestLaps = new Map<number, {
        dur: number;
        s1: number | null;
        s2: number | null;
        s3: number | null;
        speedTrap: number | null;
      }>();

      laps.forEach(lap => {
        if (!lap.lap_duration || lap.is_pit_out_lap) return;
        const existing = bestLaps.get(lap.driver_number);
        if (!existing || lap.lap_duration < existing.dur) {
          bestLaps.set(lap.driver_number, {
            dur: lap.lap_duration,
            s1: lap.duration_sector_1,
            s2: lap.duration_sector_2,
            s3: lap.duration_sector_3,
            speedTrap: lap.st_speed,
          });
        }
      });

      // Compute final positions from position data (last known position per driver)
      const finalPositions = new Map<number, number>();
      positions.forEach(p => {
        finalPositions.set(p.driver_number, p.position);
      });

      // Build results sorted by best lap time
      const results: BestLapResult[] = [];
      bestLaps.forEach((lap, driverNum) => {
        const driver = driverMap.get(driverNum);
        results.push({
          driverNumber: driverNum,
          nameAcronym: driver?.name_acronym || String(driverNum),
          teamName: driver?.team_name || 'Unknown',
          teamColor: driver?.team_colour ? `#${driver.team_colour}` : '#ffffff',
          bestLapSec: lap.dur,
          bestLapFormatted: formatLapTime(lap.dur),
          s1: lap.s1,
          s2: lap.s2,
          s3: lap.s3,
          speedTrap: lap.speedTrap,
          finalPosition: finalPositions.get(driverNum) || 99,
        });
      });

      // Sort by best lap time (practice/qualifying) — P1 = fastest
      results.sort((a, b) => a.bestLapSec - b.bestLapSec);

      // Re-assign sequential positions
      results.forEach((r, i) => { r.finalPosition = i + 1; });

      return results;
    } catch (e) {
      console.warn('[OpenF1] Failed to fetch session best laps:', e);
      return [];
    }
  }

  /**
   * Get latest car telemetry for a driver in a session (last known data point)
   */
  public async getLatestCarTelemetry(sessionKey: number, driverNumber: number): Promise<OpenF1CarData | null> {
    try {
      const res = await fetch(`${this.baseUrl}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}`);
      if (!res.ok) return null;
      const data: OpenF1CarData[] = await res.json();
      if (!data || data.length === 0) return null;
      return data[data.length - 1]; // Latest data point
    } catch {
      return null;
    }
  }

  /**
   * Get official positions for a session
   */
  public async getSessionPositions(sessionKey: number): Promise<OpenF1Position[]> {
    try {
      const res = await fetch(`${this.baseUrl}/position?session_key=${sessionKey}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  /**
   * Get official car telemetry for a driver in a session
   */
  public async getDriverTelemetry(sessionKey: number, driverNumber: number): Promise<OpenF1CarData[]> {
    try {
      const res = await fetch(`${this.baseUrl}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
}

export const officialF1Api = new OfficialF1Service();
