import { decode, encode } from 'cbor-x';
import type { LeaderboardEntry, SectorStatus, TyreCompound } from '../types/telemetry';
import { DRIVERS } from '../data/drivers';

export const STORAGE_LIVE_LEADERBOARD_KEY = 'f1_live_leaderboard';

export interface RawF1TimingLine {
  Position?: string;
  Line?: number;
  RacingNumber?: string;
  BestLapTime?: {
    Value?: string;
    Lap?: number;
  };
  LastLapTime?: {
    Value?: string;
    OverallFastest?: boolean;
    PersonalFastest?: boolean;
  };
  TimeDiffToFastest?: string;
  TimeDiffToPositionAhead?: string;
  GapToLeader?: string;
  IntervalToPositionAhead?: {
    Value?: string;
    Catching?: boolean;
  };
  NumberOfLaps?: number;
  NumberOfPitStops?: number;
  InPit?: boolean;
  PitOut?: boolean;
  Stopped?: boolean;
  Retired?: boolean;
  Sectors?: Array<{
    Value?: string;
    PreviousValue?: string;
    Status?: number;
    OverallFastest?: boolean;
    PersonalFastest?: boolean;
    Segments?: Array<{ Status?: number }> | Record<string, { Status?: number }>;
  }> | Record<string, {
    Value?: string;
    PreviousValue?: string;
    Status?: number;
    OverallFastest?: boolean;
    PersonalFastest?: boolean;
    Segments?: Array<{ Status?: number }> | Record<string, { Status?: number }>;
  }>;
  Speeds?: {
    ST?: { Value?: string; OverallFastest?: boolean; PersonalFastest?: boolean };
    I1?: { Value?: string; OverallFastest?: boolean; PersonalFastest?: boolean };
    I2?: { Value?: string; OverallFastest?: boolean; PersonalFastest?: boolean };
    FL?: { Value?: string; OverallFastest?: boolean; PersonalFastest?: boolean };
  };
}

export interface RawF1DriverItem {
  RacingNumber?: string;
  BroadcastName?: string;
  FullName?: string;
  Tla?: string;
  Line?: number;
  TeamName?: string;
  TeamColour?: string;
  FirstName?: string;
  LastName?: string;
  HeadshotUrl?: string;
}

export interface RawF1StintItem {
  Compound?: string;
  TotalLaps?: number;
  New?: string;
  LapTime?: string;
  LapNumber?: number;
}

export interface RawF1TimingAppDataLine {
  RacingNumber?: string;
  Line?: number;
  Stints?: RawF1StintItem[];
}

export interface F1LiveSessionStatus {
  sessionName?: string;
  sessionType?: string;
  sessionStatus?: 'Started' | 'Finished' | 'Inactive' | 'Aborted';
  remaining?: string;
  remainingSec?: number;
  isFinished: boolean;
  isChequered: boolean;
  trackStatus?: string;
  safetyCar?: boolean;
  vsc?: boolean;
  finishedUtc?: string;
}

export class F1LiveWebSocketService {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimeout: number | null = null;
  private listeners = new Set<(entries: LeaderboardEntry[]) => void>();
  private sessionStatusListeners = new Set<(status: F1LiveSessionStatus) => void>();

  // In-memory state cache
  private cachedTimingLines: Map<string, RawF1TimingLine> = new Map();
  private cachedDrivers: Map<string, RawF1DriverItem> = new Map();
  private cachedStints: Map<string, RawF1StintItem[]> = new Map();
  private currentLeaderboard: LeaderboardEntry[] = [];
  private lastEmitTime = 0;

  // Session lifecycle state
  private currentSessionStatus: F1LiveSessionStatus = {
    isFinished: false,
    isChequered: false,
  };

  constructor() {
    this.currentLeaderboard = this.loadFromStorage();
  }

  public getSessionStatus(): F1LiveSessionStatus {
    return { ...this.currentSessionStatus };
  }

  public subscribeSessionStatus(fn: (status: F1LiveSessionStatus) => void): () => void {
    this.sessionStatusListeners.add(fn);
    fn({ ...this.currentSessionStatus });
    return () => {
      this.sessionStatusListeners.delete(fn);
    };
  }

  private notifySessionStatus(): void {
    const statusCopy = { ...this.currentSessionStatus };
    this.sessionStatusListeners.forEach(fn => fn(statusCopy));
  }

  public getInitialLeaderboard(): LeaderboardEntry[] {
    if (this.currentLeaderboard.length === 0) {
      this.currentLeaderboard = this.loadFromStorage();
    }
    return this.currentLeaderboard;
  }

  public subscribe(fn: (entries: LeaderboardEntry[]) => void): () => void {
    this.listeners.add(fn);
    if (this.currentLeaderboard.length > 0) {
      fn(this.currentLeaderboard);
    }
    this.startConnection();
    return () => {
      this.listeners.delete(fn);
      if (this.listeners.size === 0 && this.sessionStatusListeners.size === 0) {
        this.stopConnection();
      }
    };
  }

  public startConnection(): void {
    if (this.ws || this.isConnecting) return;
    this.attemptConnect();
  }

  public stopConnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.isConnecting = false;
  }

  private attemptConnect(useProxy = false): void {
    this.isConnecting = true;

    const wsUrl = useProxy && typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/f1-live-ws`
      : 'wss://api.f1telemetry.com/';

    try {
      console.info(`[F1LiveWS] Connecting to ${wsUrl}...`);
      const socket = new WebSocket(wsUrl);
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        console.info(`[F1LiveWS] Connected successfully to ${wsUrl}`);
        this.ws = socket;
        this.isConnecting = false;
        try {
          socket.send(encode({ type: 'get:state' }));
        } catch (e) {
          console.warn('[F1LiveWS] Failed to send get:state:', e);
        }
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          if (!(event.data instanceof ArrayBuffer)) return;
          const u8 = new Uint8Array(event.data);
          const decoded = decode(u8) as any;
          this.handleDecodedMessage(decoded);
        } catch (e) {
          console.warn('[F1LiveWS] Message processing error:', e);
        }
      };

      socket.onerror = (err) => {
        console.warn('[F1LiveWS] WebSocket error:', err);
      };

      socket.onclose = () => {
        console.info('[F1LiveWS] WebSocket closed');
        this.ws = null;
        this.isConnecting = false;
        // Reconnect after 3s (switch to proxy if direct failed, or retry)
        this.reconnectTimeout = window.setTimeout(() => {
          this.attemptConnect(!useProxy);
        }, 3000);
      };
    } catch (err) {
      console.warn('[F1LiveWS] Connection attempt failed:', err);
      this.isConnecting = false;
      this.reconnectTimeout = window.setTimeout(() => {
        this.attemptConnect(!useProxy);
      }, 4000);
    }
  }

  private handleDecodedMessage(msg: any): void {
    if (!msg || typeof msg !== 'object') return;

    let hasTimingUpdate = false;

    // 1. Initial snapshot in R
    if (msg.R && typeof msg.R === 'object') {
      if (msg.R.SessionInfo) {
        this.processSessionInfo(msg.R.SessionInfo);
      }
      if (msg.R.SessionData) {
        this.processSessionData(msg.R.SessionData);
      }
      if (msg.R.ExtrapolatedClock) {
        this.processExtrapolatedClock(msg.R.ExtrapolatedClock);
      }
      if (msg.R.TrackStatus) {
        this.processTrackStatus(msg.R.TrackStatus);
      }
      if (msg.R.DriverList) {
        this.processDriverList(msg.R.DriverList);
      }
      if (msg.R.TimingAppData) {
        this.processTimingAppData(msg.R.TimingAppData);
      }
      if (msg.R.TimingData) {
        this.processTimingData(msg.R.TimingData);
        hasTimingUpdate = true;
      }
    }

    // 2. Real-time streaming updates in M (feed)
    if (Array.isArray(msg.M)) {
      for (const item of msg.M) {
        if (!item || !Array.isArray(item.A)) continue;
        const topic = item.A[0];
        const data = item.A[1];
        if (topic === 'TimingData') {
          this.processTimingData(data);
          hasTimingUpdate = true;
        } else if (topic === 'TimingAppData') {
          this.processTimingAppData(data);
          hasTimingUpdate = true;
        } else if (topic === 'DriverList') {
          this.processDriverList(data);
        } else if (topic === 'SessionData') {
          this.processSessionData(data);
        } else if (topic === 'ExtrapolatedClock') {
          this.processExtrapolatedClock(data);
        } else if (topic === 'SessionInfo') {
          this.processSessionInfo(data);
        } else if (topic === 'TrackStatus') {
          this.processTrackStatus(data);
        }
      }
    }

    if (hasTimingUpdate) {
      this.throttleEmitLeaderboard();
    }
  }

  private processSessionInfo(data: any): void {
    if (!data || typeof data !== 'object') return;
    this.currentSessionStatus = {
      ...this.currentSessionStatus,
      sessionName: data.Name || this.currentSessionStatus.sessionName,
      sessionType: data.Type || this.currentSessionStatus.sessionType,
    };
    this.notifySessionStatus();
  }

  private processSessionData(data: any): void {
    if (!data || typeof data !== 'object') return;
    let status: 'Started' | 'Finished' | 'Inactive' | 'Aborted' | undefined = undefined;
    let finishedUtc: string | undefined = undefined;

    if (Array.isArray(data.StatusSeries)) {
      for (let i = data.StatusSeries.length - 1; i >= 0; i--) {
        const item = data.StatusSeries[i];
        if (item && item.SessionStatus) {
          status = item.SessionStatus;
          if (status === 'Finished') finishedUtc = item.Utc;
          break;
        }
      }
    } else if (data.SessionStatus) {
      status = data.SessionStatus;
    }

    if (status) {
      const isFinished = status === 'Finished' || this.currentSessionStatus.remaining === '00:00:00';
      this.currentSessionStatus = {
        ...this.currentSessionStatus,
        sessionStatus: status,
        finishedUtc: finishedUtc || this.currentSessionStatus.finishedUtc,
        isFinished,
        isChequered: isFinished,
      };
      this.notifySessionStatus();
    }
  }

  private processExtrapolatedClock(data: any): void {
    if (!data || typeof data !== 'object') return;
    const remainingStr = data.Remaining;
    let remainingSec = 0;
    if (remainingStr && typeof remainingStr === 'string') {
      const parts = remainingStr.split(':').map(Number);
      if (parts.length === 3) {
        remainingSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        remainingSec = parts[0] * 60 + parts[1];
      }
    }
    const isFinished = remainingStr === '00:00:00' || this.currentSessionStatus.sessionStatus === 'Finished';
    this.currentSessionStatus = {
      ...this.currentSessionStatus,
      remaining: remainingStr,
      remainingSec,
      isFinished,
      isChequered: isFinished,
    };
    this.notifySessionStatus();
  }

  private processTrackStatus(data: any): void {
    if (!data || typeof data !== 'object') return;
    const code = String(data.Status || '');
    this.currentSessionStatus = {
      ...this.currentSessionStatus,
      trackStatus: code,
      safetyCar: code === '4',
      vsc: code === '6',
    };
    this.notifySessionStatus();
  }

  private processDriverList(data: any): void {
    if (!data) return;
    const entries = data.Lines ? Object.entries(data.Lines) : Object.entries(data);
    for (const [key, val] of entries) {
      if (key === '_kf' || !val || typeof val !== 'object') continue;
      const numStr = (val as any).RacingNumber || key;
      this.cachedDrivers.set(String(numStr), val as RawF1DriverItem);
    }
  }

  private processTimingAppData(data: any): void {
    if (!data || !data.Lines) return;
    for (const [key, val] of Object.entries(data.Lines)) {
      if (key === '_kf' || !val || typeof val !== 'object') continue;
      const appData = val as RawF1TimingAppDataLine;
      const numStr = appData.RacingNumber || key;
      if (Array.isArray(appData.Stints)) {
        this.cachedStints.set(String(numStr), appData.Stints);
      }
    }
  }

  private processTimingData(data: any): void {
    if (!data || !data.Lines) return;
    for (const [key, val] of Object.entries(data.Lines)) {
      if (key === '_kf' || !val || typeof val !== 'object') continue;
      const numStr = (val as any).RacingNumber || key;
      const existing = this.cachedTimingLines.get(String(numStr)) || {};
      const merged = this.mergeTimingLine(existing, val as RawF1TimingLine);
      this.cachedTimingLines.set(String(numStr), merged);
    }
  }

  private mergeTimingLine(existing: RawF1TimingLine, delta: RawF1TimingLine): RawF1TimingLine {
    const res: RawF1TimingLine = { ...existing, ...delta };

    // Deep merge Sectors
    if (delta.Sectors) {
      const existingSectors = Array.isArray(existing.Sectors)
        ? [...existing.Sectors]
        : existing.Sectors ? Object.values(existing.Sectors) : [];

      const deltaSectors = delta.Sectors;
      const sectorEntries = Array.isArray(deltaSectors)
        ? deltaSectors.entries()
        : Object.entries(deltaSectors).map(([k, v]) => [Number(k), v] as [number, any]);

      for (const [idx, deltaSec] of sectorEntries) {
        if (!deltaSec) continue;
        const curSec = existingSectors[idx] || {};
        const mergedSec = { ...curSec, ...deltaSec };

        // Deep merge Segments
        if (deltaSec.Segments) {
          const curSegs = Array.isArray(curSec.Segments)
            ? [...curSec.Segments]
            : curSec.Segments ? Object.values(curSec.Segments) : [];

          if (Array.isArray(deltaSec.Segments)) {
            mergedSec.Segments = deltaSec.Segments;
          } else if (typeof deltaSec.Segments === 'object') {
            for (const [segIdx, segVal] of Object.entries(deltaSec.Segments)) {
              const sNum = Number(segIdx);
              if (Number.isFinite(sNum)) {
                curSegs[sNum] = segVal as any;
              }
            }
            mergedSec.Segments = curSegs;
          }
        }
        existingSectors[idx] = mergedSec;
      }
      res.Sectors = existingSectors;
    }

    if (delta.BestLapTime) {
      res.BestLapTime = { ...(existing.BestLapTime || {}), ...delta.BestLapTime };
    }
    if (delta.LastLapTime) {
      res.LastLapTime = { ...(existing.LastLapTime || {}), ...delta.LastLapTime };
    }
    if (delta.IntervalToPositionAhead) {
      res.IntervalToPositionAhead = { ...(existing.IntervalToPositionAhead || {}), ...delta.IntervalToPositionAhead };
    }

    return res;
  }

  private throttleEmitLeaderboard(): void {
    const now = Date.now();
    if (now - this.lastEmitTime < 250) return; // throttle to max 4 updates per sec for silky stable UI
    this.lastEmitTime = now;
    this.buildAndEmitLeaderboard();
  }

  private buildAndEmitLeaderboard(): void {
    const entries: LeaderboardEntry[] = [];

    // Map cached entries
    for (const [numStr, line] of this.cachedTimingLines.entries()) {
      const driverMeta = this.cachedDrivers.get(numStr);
      const stints = this.cachedStints.get(numStr) || [];
      const currentStint = stints[stints.length - 1];

      const driverNum = parseInt(numStr, 10);
      const driver = this.resolveDriver(driverNum, driverMeta);

      const pos = parseInt(line.Position || '99', 10);

      // Best lap & last lap
      const bestLap = line.BestLapTime?.Value || '';
      const lastLap = line.LastLapTime?.Value || '';

      // Sectors
      const sectors = Array.isArray(line.Sectors) ? line.Sectors : line.Sectors ? Object.values(line.Sectors) : [];
      const s1 = sectors[0];
      const s2 = sectors[1];
      const s3 = sectors[2];

      const s1Time = s1?.Value || '';
      const s2Time = s2?.Value || '';
      const s3Time = s3?.Value || '';

      const s1Status = this.resolveSectorStatus(s1, line.InPit);
      const s2Status = this.resolveSectorStatus(s2, line.InPit);
      const s3Status = this.resolveSectorStatus(s3, line.InPit);

      const s1Segments = this.resolveSegments(s1?.Segments, s1Status);
      const s2Segments = this.resolveSegments(s2?.Segments, s2Status);
      const s3Segments = this.resolveSegments(s3?.Segments, s3Status);

      // Gaps
      const gapToLeader = line.GapToLeader || line.TimeDiffToFastest || '';
      const gapToAhead = line.IntervalToPositionAhead?.Value || line.TimeDiffToPositionAhead || line.TimeDiffToFastest || '';

      // Compound & Tyres
      const rawComp = (currentStint?.Compound || 'SOFT').toUpperCase();
      const compound: TyreCompound = (['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'].includes(rawComp)
        ? rawComp
        : 'SOFT') as TyreCompound;
      const tyreAge = currentStint?.TotalLaps || 0;
      const tyreUsed = currentStint?.New === 'false' || tyreAge > 1;

      // Existing entry for trackProgress preservation
      const existingEntry = this.currentLeaderboard.find(e => e.driver.number === driverNum || e.driver.id === driver.id);

      entries.push({
        position: pos,
        previousPosition: existingEntry?.previousPosition || pos,
        driver,
        gapToLeader: pos === 1 ? '' : (gapToLeader ? (gapToLeader.startsWith('+') ? gapToLeader : `+${gapToLeader}`) : ''),
        gapToAhead: pos === 1 ? '' : (gapToAhead ? (gapToAhead.startsWith('+') ? gapToAhead : `+${gapToAhead}`) : ''),
        intervalNum: this.parseLapTimeToSeconds(gapToAhead),
        currentLapTime: lastLap || bestLap || '--:--.---',
        bestLapTime: bestLap || lastLap || '--:--.---',
        lastLapTime: lastLap || '--:--.---',
        s1Time,
        s2Time,
        s3Time,
        s1Status,
        s2Status,
        s3Status,
        s1Segments,
        s2Segments,
        s3Segments,
        tyre: {
          compound,
          age: tyreAge,
          used: tyreUsed,
        },
        pitStops: line.NumberOfPitStops || 0,
        inPit: Boolean(line.InPit),
        isPitOut: Boolean(line.PitOut),
        speedTrap: parseFloat(line.Speeds?.ST?.Value || '0') || (existingEntry?.speedTrap || 315),
        lastLapTimeNum: this.parseLapTimeToSeconds(lastLap || bestLap),
        trackProgress: existingEntry ? existingEntry.trackProgress : (1 - (pos - 1) * 0.045 + 1) % 1,
      });
    }

    if (entries.length === 0) return;

    // Sort by position ascending with driver number tiebreaker for rock-solid stability
    entries.sort((a, b) => a.position - b.position || a.driver.number - b.driver.number);

    // Re-verify position numbering
    entries.forEach((e, idx) => {
      if (e.position > 50) e.position = idx + 1;
    });

    this.currentLeaderboard = entries;
    this.saveToStorage(entries);
    this.listeners.forEach(fn => fn(entries));
  }

  private resolveDriver(num: number, raw?: RawF1DriverItem): any {
    const matched = DRIVERS.find(d => d.number === num || (raw?.Tla && d.code === raw.Tla));
    if (matched) {
      return {
        ...matched,
        number: num,
        teamColor: raw?.TeamColour ? `#${raw.TeamColour}` : matched.teamColor,
        team: raw?.TeamName || matched.team,
      };
    }

    // Construct dynamically if not in local DRIVERS array
    const code = raw?.Tla || `D${num}`;
    const lastName = raw?.LastName || raw?.BroadcastName || `Piloto ${num}`;
    const firstName = raw?.FirstName || '';
    const team = raw?.TeamName || 'F1 Team';
    const teamColor = raw?.TeamColour ? `#${raw.TeamColour}` : '#00D7B6';

    return {
      id: code.toLowerCase(),
      code,
      number: num,
      firstName,
      lastName,
      team,
      teamColor,
      country: 'ES',
      flag: '🏁',
    };
  }

  private resolveSectorStatus(sec?: any, inPit = false): SectorStatus {
    if (!sec) return inPit ? 'pit' : 'none';
    if (sec.OverallFastest || sec.Status === 2051) return 'purple';
    if (sec.PersonalFastest || sec.Status === 2049) return 'green';
    if (sec.Value || sec.Status === 2048) return 'yellow';
    if (inPit) return 'pit';
    return 'none';
  }

  private resolveSegments(rawSegs: any, fallback: SectorStatus): SectorStatus[] {
    if (!rawSegs) {
      return [fallback, fallback, fallback];
    }
    const segList: any[] = Array.isArray(rawSegs) ? rawSegs : Object.values(rawSegs);
    if (segList.length === 0) {
      return [fallback, fallback, fallback];
    }

    const mapped = segList.map(s => {
      const code = s && typeof s === 'object' ? s.Status : s;
      if (code === 2051) return 'purple' as SectorStatus;
      if (code === 2049) return 'green' as SectorStatus;
      if (code === 2048) return 'yellow' as SectorStatus;
      if (code === 2064) return 'pit' as SectorStatus;
      return 'none' as SectorStatus;
    });

    // Sample 3 segments for the 3-bar indicator
    if (mapped.length <= 3) {
      while (mapped.length < 3) mapped.push(fallback);
      return mapped;
    }
    const i1 = 0;
    const i2 = Math.floor(mapped.length / 2);
    const i3 = mapped.length - 1;
    return [mapped[i1], mapped[i2], mapped[i3]];
  }

  private parseLapTimeToSeconds(timeStr?: string): number {
    if (!timeStr) return 0;
    const clean = timeStr.trim().replace(/^\+/, '');
    if (clean.includes(':')) {
      const [minStr, secStr] = clean.split(':');
      return (parseFloat(minStr) || 0) * 60 + (parseFloat(secStr) || 0);
    }
    return parseFloat(clean) || 0;
  }

  public loadFromStorage(): LeaderboardEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_LIVE_LEADERBOARD_KEY) ||
                  localStorage.getItem('f1_saved_leaderboard_madrid') ||
                  localStorage.getItem('f1_official_live_timing_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[F1LiveWS] Failed reading localStorage:', e);
    }
    return [];
  }

  public saveToStorage(entries: LeaderboardEntry[]): void {
    if (typeof window === 'undefined' || !entries || entries.length === 0) return;
    try {
      const json = JSON.stringify(entries);
      localStorage.setItem(STORAGE_LIVE_LEADERBOARD_KEY, json);
      localStorage.setItem('f1_saved_leaderboard_madrid', json);
      localStorage.setItem('f1_official_live_timing_cache', json);
    } catch (e) {
      console.warn('[F1LiveWS] Failed writing localStorage:', e);
    }
  }
}

export const f1LiveWebSocketService = new F1LiveWebSocketService();
