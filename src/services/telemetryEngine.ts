import type { 
  LeaderboardEntry, 
  CarTelemetry, 
  SessionState, 
  RaceControlMessage, 
  TeamRadio, 
  CircuitInfo, 
  PitPrediction,
  TelemetryComparisonPoint 
} from '../types/telemetry';
import { DRIVERS } from '../data/drivers';
import { CIRCUITS, CIRCUIT_MAP } from '../data/circuits';

// Realistic sample radio communications
const SAMPLE_RADIOS: Omit<TeamRadio, 'id' | 'timestamp'>[] = [
  {
    driver: DRIVERS[0], // VER
    speaker: 'Driver',
    messageEn: "Mate, my rear tyres are getting really hot in the middle sector. Struggling on traction.",
    messageEs: "Amigo, mis neumáticos traseros se están calentando mucho en el sector medio. Me cuesta la tracción.",
    audioToneType: 'frustration',
    durationSec: 4.2
  },
  {
    driver: DRIVERS[0], // VER
    speaker: 'Race Engineer',
    messageEn: "Copy Max, we see it on the telemetry. Strat mode 4 to protect tyre temps, pace is still good.",
    messageEs: "Recibido Max, lo vemos en la telemetría. Modo de motor Strat 4 para proteger temperaturas, el ritmo sigue siendo bueno.",
    audioToneType: 'calm',
    durationSec: 5.1
  },
  {
    driver: DRIVERS[1], // NOR
    speaker: 'Driver',
    messageEn: "Let's go guys! The balance feels mega. We can close this gap!",
    messageEs: "¡Vamos equipo! El equilibrio del coche se siente brutal. ¡Podemos cerrar este hueco!",
    audioToneType: 'celebration',
    durationSec: 3.8
  },
  {
    driver: DRIVERS[3], // HAM
    speaker: 'Driver',
    messageEn: "The Ferrari is flying today. Box this lap or extending?",
    messageEs: "El Ferrari está volando hoy. ¿Paramos en esta vuelta o alargamos el stint?",
    audioToneType: 'urgent',
    durationSec: 3.5
  },
  {
    driver: DRIVERS[6], // ALO
    speaker: 'Driver',
    messageEn: "Plan A is working! Tell me the pace of the cars behind.",
    messageEs: "¡El Plan A está funcionando! Decidme el ritmo de los coches de detrás.",
    audioToneType: 'calm',
    durationSec: 4.0
  },
  {
    driver: DRIVERS[2], // LEC
    speaker: 'Race Engineer',
    messageEn: "Charles, box now for Hard tyres. Box, box, confirm.",
    messageEs: "Charles, entramos ahora para montar neumáticos Duros. Box, box, confirma.",
    audioToneType: 'urgent',
    durationSec: 3.9
  }
];

export interface EngineListeners {
  onTick?: (data: {
    leaderboard: LeaderboardEntry[];
    telemetryMap: Map<string, CarTelemetry>;
    session: SessionState;
    selectedDriverTelemetry: CarTelemetry | null;
    pitPrediction: PitPrediction | null;
  }) => void;
  onRaceControlMessage?: (msg: RaceControlMessage) => void;
  onTeamRadio?: (radio: TeamRadio) => void;
}

export class TelemetryEngine {
  private circuit: CircuitInfo;
  private session: SessionState;
  private leaderboard: LeaderboardEntry[] = [];
  private telemetryMap = new Map<string, CarTelemetry>();
  private raceControlLog: RaceControlMessage[] = [];
  private teamRadioLog: TeamRadio[] = [];

  private selectedDriverId: string = 'ver';
  private isRunning: boolean = true;
  private playbackSpeed: number = 1;
  private timerId: number | null = null;
  private listeners: EngineListeners = {};

  constructor(circuitId: string = 'monza') {
    const selectedCircuit = CIRCUIT_MAP.get(circuitId) || CIRCUITS[0];
    this.circuit = selectedCircuit;

    this.session = {
      id: `session-${Date.now()}`,
      circuit: this.circuit,
      type: 'RACE',
      name: `Gran Premio de ${this.circuit.country}`,
      trackStatus: 'GREEN',
      currentLap: 38,
      totalLaps: this.circuit.laps,
      timeRemainingSec: 2450,
      airTemp: 27.4,
      trackTemp: 39.8,
      humidity: 48,
      rainProbability: 5,
      windSpeed: 12.4,
      windDirection: 'NE',
      safetyCarDeployed: false,
      vscDeployed: false,
      redFlagDeployed: false,
      drsEnabled: true,
    };

    this.initDrivers();
    this.initInitialMessages();
  }

  public setCircuit(circuitId: string) {
    const circuit = CIRCUIT_MAP.get(circuitId);
    if (!circuit) return;
    this.circuit = circuit;
    this.session.circuit = circuit;
    this.session.totalLaps = circuit.laps;
    this.session.name = `Gran Premio de ${circuit.country}`;
    this.initDrivers();
  }

  public setSessionType(type: SessionState['type']) {
    this.session.type = type;
    if (type === 'QUALIFYING') {
      this.session.totalLaps = 0;
      this.session.timeRemainingSec = 720; // 12 mins Q3
    } else if (type === 'PRACTICE') {
      this.session.totalLaps = 0;
      this.session.timeRemainingSec = 2100;
    } else {
      this.session.currentLap = Math.floor(this.circuit.laps * 0.65);
      this.session.totalLaps = this.circuit.laps;
    }
  }

  private initDrivers() {
    this.leaderboard = DRIVERS.map((driver, index) => {
      // Base speed factor according to competitive 2025/2026 performance
      const baseLap = 81.5 + index * 0.22 + (Math.random() * 0.15 - 0.07);
      const gapSec = index === 0 ? 0 : (index * 1.8 + Math.random() * 0.5);
      const intervalSec = index === 0 ? 0 : (1.4 + Math.random() * 0.8);

      // Tyres
      const compound = index % 3 === 0 ? 'HARD' : index % 3 === 1 ? 'MEDIUM' : 'SOFT';
      const tyreAge = Math.min(26, Math.max(3, 14 + (index % 7) * 2 - Math.floor(Math.random() * 4)));

      // Starting progress staggered along track
      const progress = (1.0 - (index * 0.045) + 1.0) % 1.0;

      return {
        position: index + 1,
        previousPosition: index + 1,
        driver,
        gapToLeader: index === 0 ? 'LEADER' : `+${gapSec.toFixed(3)}s`,
        gapToAhead: index === 0 ? 'LEADER' : `+${intervalSec.toFixed(3)}s`,
        intervalNum: intervalSec,
        currentLapTime: this.formatLapTime(baseLap + (Math.random() * 0.4 - 0.2)),
        bestLapTime: this.formatLapTime(baseLap),
        s1Time: (26.5 + (index * 0.08) + Math.random() * 0.2).toFixed(3),
        s2Time: (27.9 + (index * 0.09) + Math.random() * 0.2).toFixed(3),
        s3Time: (27.1 + (index * 0.07) + Math.random() * 0.2).toFixed(3),
        s1Status: index === 0 ? 'purple' : index < 4 ? 'green' : 'yellow',
        s2Status: index === 1 ? 'purple' : index < 5 ? 'green' : 'yellow',
        s3Status: index === 2 ? 'purple' : index < 6 ? 'green' : 'yellow',
        tyre: {
          compound,
          age: tyreAge,
          used: tyreAge > 10,
        },
        pitStops: index % 4 === 0 ? 2 : 1,
        inPit: false,
        isPitOut: false,
        isKnockedOut: this.session.type === 'QUALIFYING' && index >= 15,
        isEliminationRisk: this.session.type === 'QUALIFYING' && index >= 10 && index < 15,
        speedTrap: Math.round(342 - index * 1.5 + Math.random() * 3),
        lastLapTimeNum: baseLap,
        trackProgress: progress,
      };
    });

    // Initialize telemetry map
    this.leaderboard.forEach(entry => {
      this.telemetryMap.set(entry.driver.id, {
        driverId: entry.driver.id,
        speed: 280,
        rpm: 12200,
        gear: 7,
        throttle: 100,
        brake: 0,
        drs: 0,
        steerAngle: 0,
        gForceLat: 0.2,
        gForceLong: 0.1,
        ersBattery: 84,
        ersDeploy: 65,
      });
    });
  }

  private initInitialMessages() {
    this.raceControlLog = [
      {
        id: 'rc-1',
        timestamp: '14:32:04',
        flag: 'GREEN',
        scope: 'Track',
        messageEn: 'GREEN FLAG - Track clear throughout all sectors.',
        messageEs: 'BANDERA VERDE - Pista despejada en todos los sectores.',
        category: 'FLAG',
      },
      {
        id: 'rc-2',
        timestamp: '14:34:18',
        scope: 'Track',
        messageEn: 'DRS ENABLED in all designated zones.',
        messageEs: 'DRS HABILITADO en todas las zonas designadas.',
        category: 'DRS',
      },
      {
        id: 'rc-3',
        timestamp: '14:41:50',
        scope: 'Sector 2',
        messageEn: 'CAR 14 (ALO) - TRACK LIMITS TURN 7 - LAP TIME DELETED',
        messageEs: 'COCHE 14 (ALO) - LÍMITES DE PISTA CURVA 7 - TIEMPO DE VUELTA ELIMINADO',
        category: 'TRACK_LIMITS',
      },
    ];

    this.teamRadioLog = [
      {
        id: 'tr-0',
        timestamp: '14:44:10',
        ...SAMPLE_RADIOS[0]
      },
      {
        id: 'tr-1',
        timestamp: '14:44:22',
        ...SAMPLE_RADIOS[1]
      }
    ];
  }

  public setListeners(listeners: EngineListeners) {
    this.listeners = listeners;
  }

  public setSelectedDriver(driverId: string) {
    this.selectedDriverId = driverId;
  }

  public getSelectedDriverId(): string {
    return this.selectedDriverId;
  }

  public start() {
    if (this.timerId !== null) return;
    this.isRunning = true;
    const intervalMs = 60; // ~16.6 Hz update rate for high precision
    this.timerId = window.setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }

  public setPlaybackSpeed(speed: number) {
    this.playbackSpeed = speed;
  }

  public getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  public isEngineRunning(): boolean {
    return this.isRunning;
  }

  public triggerSafetyCar() {
    this.session.safetyCarDeployed = !this.session.safetyCarDeployed;
    this.session.vscDeployed = false;
    this.session.trackStatus = this.session.safetyCarDeployed ? 'SC' : 'GREEN';
    
    const msg: RaceControlMessage = {
      id: `rc-${Date.now()}`,
      timestamp: this.getCurrentTimeString(),
      flag: this.session.safetyCarDeployed ? 'YELLOW' : 'GREEN',
      scope: 'Track',
      messageEn: this.session.safetyCarDeployed ? 'SAFETY CAR DEPLOYED' : 'SAFETY CAR IN THIS LAP - TRACK CLEAR',
      messageEs: this.session.safetyCarDeployed ? 'SAFETY CAR DESPLEGADO EN PISTA' : 'SAFETY CAR ENTRA EN ESTA VUELTA - PISTA DESPEJADA',
      category: 'SAFETY_CAR',
    };
    this.raceControlLog.unshift(msg);
    this.listeners.onRaceControlMessage?.(msg);
  }

  public triggerVSC() {
    this.session.vscDeployed = !this.session.vscDeployed;
    this.session.safetyCarDeployed = false;
    this.session.trackStatus = this.session.vscDeployed ? 'VSC' : 'GREEN';

    const msg: RaceControlMessage = {
      id: `rc-${Date.now()}`,
      timestamp: this.getCurrentTimeString(),
      flag: this.session.vscDeployed ? 'YELLOW' : 'GREEN',
      scope: 'Track',
      messageEn: this.session.vscDeployed ? 'VIRTUAL SAFETY CAR DEPLOYED - REDUCE SPEED' : 'VIRTUAL SAFETY CAR ENDING',
      messageEs: this.session.vscDeployed ? 'SAFETY CAR VIRTUAL DESPLEGADO - REDUZCA LA VELOCIDAD' : 'FINALIZA EL SAFETY CAR VIRTUAL',
      category: 'SAFETY_CAR',
    };
    this.raceControlLog.unshift(msg);
    this.listeners.onRaceControlMessage?.(msg);
  }

  public triggerRandomRadio() {
    const randomTemplate = SAMPLE_RADIOS[Math.floor(Math.random() * SAMPLE_RADIOS.length)];
    const newRadio: TeamRadio = {
      id: `tr-${Date.now()}`,
      timestamp: this.getCurrentTimeString(),
      ...randomTemplate,
    };
    this.teamRadioLog.unshift(newRadio);
    this.listeners.onTeamRadio?.(newRadio);
  }

  private tick() {
    const dt = (0.060 * this.playbackSpeed); // delta time scaled

    // Update car positions & physics
    this.leaderboard.forEach((entry, idx) => {
      // Pace calculation
      let speedFactor = 1.0 - (idx * 0.008);
      if (this.session.safetyCarDeployed) speedFactor *= 0.55;
      else if (this.session.vscDeployed) speedFactor *= 0.65;

      // Pit lane logic
      if (entry.inPit) {
        speedFactor *= 0.28; // Pit speed limiter (80 km/h)
      }

      // Base lap time is ~80s. 1 / 80 = 0.0125 progress per second
      const baseRate = (1 / 82) * speedFactor;
      const prevProgress = entry.trackProgress;
      let newProgress = prevProgress + baseRate * dt;

      // Completed a lap
      if (newProgress >= 1.0) {
        newProgress -= 1.0;
        if (idx === 0 && this.session.type === 'RACE') {
          if (this.session.currentLap < this.session.totalLaps) {
            this.session.currentLap += 1;
          }
        }
        // Increment tyre age
        entry.tyre.age += 1;

        // Exit pit lane if was in pit
        if (entry.inPit) {
          entry.inPit = false;
          entry.isPitOut = true;
          setTimeout(() => {
            entry.isPitOut = false;
          }, 4000);
        }

        // Random pit stop trigger for realism when tyre age > 24
        if (entry.tyre.age > 24 && Math.random() < 0.08 && !entry.inPit) {
          entry.inPit = true;
          entry.pitStops += 1;
          entry.tyre.age = 0;
          // Change compound
          entry.tyre.compound = entry.tyre.compound === 'SOFT' ? 'MEDIUM' : 'HARD';
        }
      }

      entry.trackProgress = newProgress;

      // Calculate car telemetry based on progress along track (straights vs corners)
      const telemetry = this.calculateTelemetryForProgress(entry.driver.id, newProgress, entry.inPit);
      this.telemetryMap.set(entry.driver.id, telemetry);
    });

    // Re-evaluate positions (sorting by completed progress/distance)
    // Add small random variations to create realistic gap fluctuations
    this.leaderboard.sort((a, b) => {
      // In race mode, order is generally preserved unless an overtake occurs
      return a.position - b.position;
    });

    // Update gaps relative to leader
    this.leaderboard.forEach((entry, i) => {
      if (i === 0) {
        entry.gapToLeader = 'LEADER';
        entry.gapToAhead = 'LEADER';
      } else {
        // Calculate dynamic gap
        const currentInterval = Math.max(0.2, entry.intervalNum + (Math.random() * 0.04 - 0.02) * dt);
        entry.intervalNum = currentInterval;
        entry.gapToAhead = `+${currentInterval.toFixed(3)}s`;

        // Cumulative gap to leader
        const totalGap = (i * 1.5) + (currentInterval - 1.5);
        entry.gapToLeader = `+${Math.max(0.4, totalGap).toFixed(3)}s`;
      }
    });

    // Calculate Pit Prediction ("Circle of Doom") for selected driver
    const pitPrediction = this.calculatePitPrediction(this.selectedDriverId);

    // Broadcast update to subscribers
    this.listeners.onTick?.({
      leaderboard: [...this.leaderboard],
      telemetryMap: new Map(this.telemetryMap),
      session: { ...this.session },
      selectedDriverTelemetry: this.telemetryMap.get(this.selectedDriverId) || null,
      pitPrediction,
    });
  }

  private calculateTelemetryForProgress(driverId: string, progress: number, inPit: boolean): CarTelemetry {
    if (inPit) {
      return {
        driverId,
        speed: 79 + Math.floor(Math.random() * 3),
        rpm: 6200 + Math.floor(Math.random() * 200),
        gear: 2,
        throttle: 35,
        brake: 0,
        drs: 0,
        steerAngle: 0,
        gForceLat: 0.1,
        gForceLong: 0.0,
        ersBattery: 78,
        ersDeploy: 20,
      };
    }

    // Determine if in DRS zone
    let drsState: 0 | 1 | 2 = 0;
    const inDrsZone = this.circuit.drsZones.some(
      z => progress >= z.startProgress && progress <= z.endProgress
    );

    // Approximate corner zones vs straights based on progress
    // Straights: high speed, gear 7-8, throttle 100%, 0% brake
    // Corners / Braking zones: speed drops to 90-150, gear 2-4, brake spike 80-100%, throttle 0-30%
    const cornerZones = [
      { start: 0.12, end: 0.17 }, // T1 chicane
      { start: 0.32, end: 0.38 }, // Lesmo / Second chicane
      { start: 0.52, end: 0.58 }, // Ascari
      { start: 0.88, end: 0.94 }, // Parabolica
    ];

    const inCorner = cornerZones.find(c => progress >= c.start && progress <= c.end);
    const approachingCorner = cornerZones.find(c => progress >= c.start - 0.03 && progress < c.start);

    let speed = 310;
    let rpm = 12500;
    let gear = 7;
    let throttle = 100;
    let brake = 0;
    let steerAngle = 0;
    let gLat = 0.2;
    let gLong = 0.8;

    if (inDrsZone && this.session.drsEnabled && !this.session.safetyCarDeployed) {
      drsState = 2; // Active!
      speed = 340 + Math.floor(Math.random() * 8);
      rpm = 13800 + Math.floor(Math.random() * 400);
      gear = 8;
      throttle = 100;
      brake = 0;
    } else if (approachingCorner) {
      // Heavy braking point
      speed = Math.max(140, Math.floor(320 - ((progress - (approachingCorner.start - 0.03)) / 0.03) * 180));
      brake = 95 + Math.floor(Math.random() * 5);
      throttle = 0;
      gear = speed > 220 ? 5 : speed > 160 ? 4 : 3;
      rpm = 11200;
      gLong = -4.8; // -4.8G braking force
      drsState = 0;
    } else if (inCorner) {
      // Mid-corner apex & exit
      speed = 115 + Math.floor(Math.random() * 25);
      throttle = 35 + Math.floor(Math.random() * 40);
      brake = 0;
      gear = 3;
      rpm = 9400 + Math.floor(Math.random() * 800);
      steerAngle = Math.sin(progress * 40) * 65;
      gLat = 3.6; // 3.6G cornering
      gLong = 0.3;
      drsState = 0;
    } else {
      // Full throttle on straight
      speed = 285 + Math.floor(Math.sin(progress * 15) * 45);
      rpm = 11900 + Math.floor(Math.random() * 900);
      gear = speed > 295 ? 8 : speed > 255 ? 7 : 6;
      throttle = 100;
      brake = 0;
      gLat = 0.4;
      gLong = 1.2;
    }

    if (this.session.safetyCarDeployed || this.session.vscDeployed) {
      speed = Math.min(speed, 160);
      rpm = Math.min(rpm, 9800);
      gear = Math.min(gear, 5);
      drsState = 0;
    }

    return {
      driverId,
      speed,
      rpm,
      gear,
      throttle,
      brake,
      drs: drsState,
      steerAngle,
      gForceLat: Number(gLat.toFixed(1)),
      gForceLong: Number(gLong.toFixed(1)),
      ersBattery: Math.max(15, Math.min(100, Math.floor(75 + Math.sin(progress * 10) * 20))),
      ersDeploy: throttle > 90 ? 80 : 0,
    };
  }

  // Calculate the "Circle of Doom" pit prediction
  public calculatePitPrediction(driverId: string): PitPrediction | null {
    const driverIdx = this.leaderboard.findIndex(e => e.driver.id === driverId);
    if (driverIdx === -1) return null;

    const currentEntry = this.leaderboard[driverIdx];
    const pitLoss = this.circuit.pitLossSeconds; // e.g. 23.4s

    // Calculate driver's accumulated time ahead of others
    // For each car behind, how much gap does driver have?
    let rejoiningPos = currentEntry.position;
    let accumulatedGapBehind = 0;

    for (let i = driverIdx + 1; i < this.leaderboard.length; i++) {
      accumulatedGapBehind += this.leaderboard[i].intervalNum;
      if (accumulatedGapBehind < pitLoss) {
        rejoiningPos = this.leaderboard[i].position + 1;
      } else {
        break;
      }
    }

    rejoiningPos = Math.min(rejoiningPos, this.leaderboard.length);
    const aheadDriver = rejoiningPos > 1 ? this.leaderboard[rejoiningPos - 2]?.driver : undefined;
    const behindDriver = rejoiningPos <= this.leaderboard.length ? this.leaderboard[rejoiningPos - 1]?.driver : undefined;

    return {
      driverId,
      currentPosition: currentEntry.position,
      rejoiningPosition: rejoiningPos,
      rejoiningAheadOfDriver: behindDriver,
      rejoiningBehindDriver: aheadDriver,
      projectedGapAheadSec: 1.4,
      projectedGapBehindSec: 0.8,
      isInTraffic: rejoiningPos > currentEntry.position + 3,
    };
  }

  // Generate comparison telemetry curves between two drivers
  public getTelemetryComparison(_driver1Id: string, _driver2Id: string): TelemetryComparisonPoint[] {
    const points: TelemetryComparisonPoint[] = [];
    const totalPoints = 100;

    for (let i = 0; i <= totalPoints; i++) {
      const p = i / totalPoints;
      // High speed straights vs corners
      const isCorner1 = (p >= 0.12 && p <= 0.18) || (p >= 0.33 && p <= 0.39) || (p >= 0.54 && p <= 0.60) || (p >= 0.88 && p <= 0.94);
      const isStraight = !isCorner1;

      let d1Speed = isStraight ? 320 + Math.sin(p * 20) * 25 : 110 + Math.cos(p * 25) * 35;
      let d2Speed = isStraight ? 316 + Math.sin(p * 20 + 0.1) * 27 : 115 + Math.cos(p * 25 + 0.1) * 33;

      let d1Throttle = isStraight ? 100 : Math.max(0, Math.floor(Math.sin(p * 30) * 80));
      let d2Throttle = isStraight ? 100 : Math.max(0, Math.floor(Math.sin(p * 30 + 0.2) * 75));

      let d1Brake = isCorner1 && p < 0.15 ? 90 : 0;
      let d2Brake = isCorner1 && p < 0.16 ? 95 : 0;

      let d1Gear = d1Speed > 290 ? 8 : d1Speed > 250 ? 7 : d1Speed > 180 ? 5 : 3;
      let d2Gear = d2Speed > 290 ? 8 : d2Speed > 250 ? 7 : d2Speed > 180 ? 5 : 3;

      points.push({
        distancePercent: Math.round(p * 100),
        distanceMeters: Math.round(p * this.circuit.lengthKm * 1000),
        driver1Speed: Math.round(d1Speed),
        driver2Speed: Math.round(d2Speed),
        driver1Throttle: Math.round(d1Throttle),
        driver2Throttle: Math.round(d2Throttle),
        driver1Brake: Math.round(d1Brake),
        driver2Brake: Math.round(d2Brake),
        driver1Gear: d1Gear,
        driver2Gear: d2Gear,
        deltaSeconds: Number((Math.sin(p * 8) * 0.18).toFixed(3)),
      });
    }

    return points;
  }

  public getLeaderboard(): LeaderboardEntry[] {
    return [...this.leaderboard];
  }

  public getSession(): SessionState {
    return { ...this.session };
  }

  public getRaceControlMessages(): RaceControlMessage[] {
    return [...this.raceControlLog];
  }

  public getTeamRadios(): TeamRadio[] {
    return [...this.teamRadioLog];
  }

  private formatLapTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(3);
    const paddedSecs = Number(secs) < 10 ? `0${secs}` : secs;
    return `${mins}:${paddedSecs}`;
  }

  private getCurrentTimeString(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }
}
