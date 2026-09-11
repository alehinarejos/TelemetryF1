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
            name: 'FP1 - GP de España (Madrid)',
            circuit: 'Madring',
            dateStart: '2026-09-11T11:30:00Z',
          },
        };
      }

      const latest = data[0];
      const now = new Date().getTime();
      const startTime = new Date(latest.date_start).getTime();
      const endTime = new Date(latest.date_end).getTime();

      // Is it live right now?
      const isLive = now >= startTime && now <= endTime;

      return {
        isLive,
        statusMessage: isLive 
          ? `🔴 SESIÓN EN DIRECTO: ${latest.session_name} - ${latest.circuit_short_name}` 
          : `⚪ EN ESPERA: Sin sesión en pista en este momento. Última: ${latest.session_name} (${latest.circuit_short_name})`,
        activeSession: isLive ? latest : null,
        latestCompletedSession: latest,
        nextSession: {
          name: 'FP1 - GP de España (Madrid)',
          circuit: 'Madring',
          dateStart: '2026-09-11T11:30:00Z',
        },
      };
    } catch {
      return {
        isLive: false,
        statusMessage: 'Conectado a los datos oficiales • En espera',
        activeSession: null,
        latestCompletedSession: null,
        nextSession: {
          name: 'FP1 - GP de España (Madrid)',
          circuit: 'Madring',
          dateStart: '2026-09-11T11:30:00Z',
        },
      };
    }
  }

  // Fetch official positions for a session
  public async getSessionPositions(sessionKey: number): Promise<OpenF1Position[]> {
    try {
      const res = await fetch(`${this.baseUrl}/position?session_key=${sessionKey}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  // Fetch official drivers for a session
  public async getSessionDrivers(sessionKey: number) {
    try {
      const res = await fetch(`${this.baseUrl}/drivers?session_key=${sessionKey}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  // Fetch official car telemetry for a driver in a session
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
