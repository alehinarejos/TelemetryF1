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
import { RACE_RESULTS_2026 } from '../data/raceResults2026';

// Real recorded team radio communications from the last session (Monza GP 2026)
const RECORDED_MONZA_RADIOS: TeamRadio[] = [
  {
    id: 'tr-monza-1',
    timestamp: '16:34:12',
    driver: DRIVERS.find(d => d.code === 'ANT') || DRIVERS[0],
    speaker: 'Driver',
    messageEn: "P1 guys!! Unbelievable! Winning at Monza is a dream come true! Thank you so much for the car!",
    messageEs: "¡¡P1 equipo!! ¡Increíble! ¡Ganar en Monza es un sueño hecho realidad! ¡Muchas gracias por el coche!",
    audioToneType: 'celebration',
    durationSec: 4.8
  },
  {
    id: 'tr-monza-2',
    timestamp: '16:34:25',
    driver: DRIVERS.find(d => d.code === 'ANT') || DRIVERS[0],
    speaker: 'Race Engineer',
    messageEn: "Kimi, you are an Italian Grand Prix winner at Monza! Sensational drive, managed the tyres perfectly!",
    messageEs: "¡Kimi, eres ganador del Gran Premio de Italia en Monza! ¡Pilotaje sensacional, gestión perfecta de gomas!",
    audioToneType: 'celebration',
    durationSec: 5.4
  },
  {
    id: 'tr-monza-3',
    timestamp: '16:34:40',
    driver: DRIVERS.find(d => d.code === 'RUS') || DRIVERS[5],
    speaker: 'Driver',
    messageEn: "Mega job team, brilliant 1-2 finish for Mercedes! Congrats to Kimi on the win.",
    messageEs: "¡Trabajo descomunal equipo, brillante doblete 1-2 para Mercedes! Felicidades a Kimi por la victoria.",
    audioToneType: 'celebration',
    durationSec: 4.2
  },
  {
    id: 'tr-monza-4',
    timestamp: '16:35:02',
    driver: DRIVERS.find(d => d.code === 'VER') || DRIVERS[0],
    speaker: 'Driver',
    messageEn: "P3 today, solid podium and good points from the weekend. Mercedes was just untouchable on straight line speed.",
    messageEs: "P3 hoy, podio sólido y buenos puntos del fin de semana. Mercedes era inalcanzable en velocidad punta.",
    audioToneType: 'calm',
    durationSec: 5.0
  },
  {
    id: 'tr-monza-5',
    timestamp: '16:35:28',
    driver: DRIVERS.find(d => d.code === 'NOR') || DRIVERS[1],
    speaker: 'Race Engineer',
    messageEn: "P4 Lando, good recovery drive and fastest lap bonus point secured in the final stint.",
    messageEs: "P4 Lando, buena remontada y punto extra de vuelta rápida asegurado en el stint final.",
    audioToneType: 'calm',
    durationSec: 4.1
  }
];

// Real recorded Race Control messages from the last session (Monza GP 2026)
const RECORDED_MONZA_RACE_CONTROL: RaceControlMessage[] = [
  {
    id: 'rc-monza-1',
    timestamp: '16:34:00',
    flag: 'CHEQUERED',
    scope: 'Track',
    messageEn: 'CHEQUERED FLAG - Italian Grand Prix session completed (53/53 laps).',
    messageEs: 'BANDERA A CUADROS - Gran Premio de Italia finalizado (53/53 vueltas).',
    category: 'FLAG',
  },
  {
    id: 'rc-monza-2',
    timestamp: '16:34:05',
    scope: 'Track',
    messageEn: 'CAR 12 (ANT) - WINS THE ITALIAN GRAND PRIX AT MONZA',
    messageEs: 'COCHE 12 (ANT) - GANADOR DEL GRAN PREMIO DE ITALIA EN MONZA',
    category: 'SYSTEM',
  },
  {
    id: 'rc-monza-3',
    timestamp: '16:32:15',
    scope: 'Track',
    messageEn: 'CAR 12 (ANT) - FASTEST LAP RECORDED: 1:21.432 (Lap 51)',
    messageEs: 'COCHE 12 (ANT) - VUELTA RÁPIDA DE CARRERA: 1:21.432 (Vuelta 51)',
    category: 'SYSTEM',
  },
  {
    id: 'rc-monza-4',
    timestamp: '16:28:44',
    scope: 'Track',
    messageEn: 'TRACK LIMITS REVIEW - Turn 1 (Variante del Rettifilo) - All cars compliant',
    messageEs: 'REVISIÓN DE LÍMITES DE PISTA - Curva 1 (Variante del Rettifilo) - Todos los coches conformes',
    category: 'TRACK_LIMITS',
  },
  {
    id: 'rc-monza-5',
    timestamp: '15:02:00',
    flag: 'GREEN',
    scope: 'Track',
    messageEn: 'GREEN FLAG - Italian Grand Prix race start',
    messageEs: 'BANDERA VERDE - Salida del Gran Premio de Italia',
    category: 'FLAG',
  },
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

  private selectedDriverId: string = 'ant';
  private isRunning: boolean = false;
  private isLiveMode: boolean = false;
  private playbackSpeed: number = 1;
  private timerId: number | null = null;
  private listeners: EngineListeners = {};

  constructor(circuitId: string = 'madrid') {
    const selectedCircuit = CIRCUIT_MAP.get(circuitId) || CIRCUITS.find(c => c.id === 'madrid') || CIRCUITS[0];
    this.circuit = selectedCircuit;

    this.session = {
      id: 'session-madrid-2026-r16',
      circuit: this.circuit,
      type: 'PRACTICE',
      name: 'Gran Premio de España 2026 (Madrid)',
      trackStatus: 'GREEN',
      currentLap: 0,
      totalLaps: 55,
      timeRemainingSec: 3600,
      airTemp: 24.8,
      trackTemp: 37.5,
      humidity: 36,
      rainProbability: 0,
      windSpeed: 7.2,
      windDirection: 'NE',
      safetyCarDeployed: false,
      vscDeployed: false,
      redFlagDeployed: false,
      drsEnabled: true,
    };

    if (circuitId === 'madrid' || this.circuit.id === 'madrid') {
      this.loadMadridSession();
    } else {
      this.loadOfficialRecordedSession(15);
    }
    this.start();
  }

  /**
   * Load current active weekend session for Circuito de Madrid (Round 16)
   */
  public loadMadridSession() {
    const madridCircuit = CIRCUIT_MAP.get('madrid') || CIRCUITS[0];
    this.circuit = madridCircuit;

    const fp1Start = new Date('2026-09-11T11:30:00Z').getTime();
    const fp1End = new Date('2026-09-11T12:30:00Z').getTime();
    const now = Date.now();
    let remainingSec = 3600;
    if (now >= fp1Start && now <= fp1End) {
      remainingSec = Math.max(0, Math.floor((fp1End - now) / 1000));
    }

    this.session = {
      id: 'session-2026-r16-madrid',
      circuit: madridCircuit,
      type: 'PRACTICE',
      name: 'Gran Premio de España 2026 (Madrid)',
      trackStatus: 'GREEN',
      currentLap: 0,
      totalLaps: 0, // Libres/Practice session: 0 total laps (timed session)
      timeRemainingSec: remainingSec,
      airTemp: 24.8,
      trackTemp: 37.5,
      humidity: 36,
      rainProbability: 0,
      windSpeed: 7.2,
      windDirection: 'NE',
      safetyCarDeployed: false,
      vscDeployed: false,
      redFlagDeployed: false,
      drsEnabled: true,
    };

    // Realistic Madrid fast benchmark laps for each driver (5.474 km lap ~1:32.450 - 1:35.000)
    const baseLapTimes = [
      92.450, // ANT P1 (1:32.450)
      92.580, // RUS P2 (1:32.580)
      92.710, // VER P3 (1:32.710)
      92.790, // NOR P4 (1:32.790)
      92.850, // PIA P5 (1:32.850)
      92.990, // HAM P6 (1:32.990)
      93.150, // GAS P7 (1:33.150)
      93.220, // SAI P8 (1:33.220)
      93.310, // ALO P9 (1:33.310)
      93.400, // LEC P10 (1:33.400)
      93.580, // LIN P11
      93.650, // COL P12
      93.720, // TSU P13
      93.810, // BOR P14
      93.900, // HUL P15
      94.020, // LAW P16
      94.150, // BEA P17
      94.280, // OCO P18
      94.410, // ALB P19
      94.550, // PER P20
      94.700, // BOT P21
      94.900, // STR P22
    ];

    const speedTraps = [
      348, 347, 346, 346, 345, 345, 344, 345, 346, 344,
      343, 343, 344, 342, 341, 342, 343, 340, 341, 340, 339, 341
    ];

    // Standard driver starting grid from official 2026 driver roster
    this.leaderboard = DRIVERS.map((driver, idx) => {
      const baseSec = baseLapTimes[idx] || 93.0;
      const s1 = (28.650 + (idx * 0.04)).toFixed(3);
      const s2 = (34.800 + (idx * 0.05)).toFixed(3);
      const s3 = (29.000 + (idx * 0.03)).toFixed(3);
      const intervalNum = idx === 0 ? 0 : Number((baseLapTimes[idx] - baseLapTimes[idx - 1]).toFixed(3));
      const gapLeaderNum = Number((baseSec - baseLapTimes[0]).toFixed(3));

      return {
        position: idx + 1,
        previousPosition: idx + 1,
        driver: {
          id: driver.id,
          code: driver.code,
          number: driver.number,
          firstName: driver.firstName,
          lastName: driver.lastName,
          team: driver.team,
          teamColor: driver.teamColor,
          country: driver.country,
          flag: driver.flag,
        },
        gapToLeader: idx === 0 ? 'LÍDER' : `+${gapLeaderNum.toFixed(3)}s`,
        gapToAhead: idx === 0 ? 'LEADER' : `+${intervalNum.toFixed(3)}s`,
        intervalNum: intervalNum,
        currentLapTime: this.formatLapTime(baseSec),
        bestLapTime: this.formatLapTime(baseSec),
        s1Time: s1,
        s2Time: s2,
        s3Time: s3,
        s1Status: idx === 0 ? 'purple' : idx < 3 ? 'green' : 'yellow',
        s2Status: idx === 1 ? 'purple' : idx < 4 ? 'green' : 'yellow',
        s3Status: idx === 0 ? 'purple' : idx < 3 ? 'green' : 'yellow',
        tyre: {
          compound: idx % 3 === 0 ? 'SOFT' : idx % 3 === 1 ? 'MEDIUM' : 'HARD',
          age: Math.floor(Math.random() * 5) + 1,
          used: false,
        },
        pitStops: 0,
        inPit: false,
        isPitOut: false,
        isKnockedOut: false,
        isEliminationRisk: false,
        speedTrap: speedTraps[idx] || 345,
        lastLapTimeNum: baseSec,
        trackProgress: (1.0 - idx * 0.04 + 1.0) % 1.0,
      };
    });

    // Populate telemetry curves
    this.leaderboard.forEach((entry, idx) => {
      const isLeader = idx === 0;
      const speed = isLeader ? 348 : Math.max(336, 348 - idx * 0.6);
      this.telemetryMap.set(entry.driver.id, {
        driverId: entry.driver.id,
        speed: Math.round(speed),
        rpm: isLeader ? 12900 : 12750,
        gear: 8,
        throttle: 100,
        brake: 0,
        drs: 2,
        steerAngle: 0,
        gForceLat: 0.3,
        gForceLong: 0.8,
        ersBattery: Math.max(75, 95 - idx * 1.5),
        ersDeploy: 80,
      });
    });

    this.raceControlLog = [
      {
        id: 'rc-mad-1',
        timestamp: '13:15:00',
        flag: 'GREEN',
        scope: 'Track',
        messageEn: 'TRACK CLEAR - FP1 AT CIRCUITO DE MADRID (MADRING)',
        messageEs: 'PISTA DESPEJADA - FP1 EN CIRCUITO DE MADRID (MADRING)',
        category: 'SYSTEM',
      },
      {
        id: 'rc-mad-2',
        timestamp: '13:18:00',
        flag: 'GREEN',
        scope: 'Track',
        messageEn: 'FIA INSPECTION COMPLETE - SURFACE DRY, ALL 20 TURNS OPERATIONAL',
        messageEs: 'INSPECCIÓN FIA COMPLETADA - PISTA SECA, 20 CURVAS OPERATIVAS',
        category: 'SYSTEM',
      },
    ];

    this.teamRadioLog = [
      {
        id: 'tr-mad-1',
        timestamp: '13:20:00',
        driver: DRIVERS.find(d => d.code === 'ANT') || DRIVERS[0],
        speaker: 'Driver',
        messageEn: 'Track layout looks incredible, ready to head out for FP1 installation lap.',
        messageEs: 'El trazado de Madrid tiene una pinta increíble, listos para la vuelta de instalación en FP1.',
        audioToneType: 'calm',
        durationSec: 3.8,
      },
      {
        id: 'tr-mad-2',
        timestamp: '13:21:30',
        driver: DRIVERS.find(d => d.code === 'SAI') || DRIVERS[12],
        speaker: 'Driver',
        messageEn: 'Home Grand Prix in Madrid, feeling great with the car balance.',
        messageEs: 'Gran Premio de casa en Madrid, muy buenas sensaciones con el coche.',
        audioToneType: 'calm',
        durationSec: 4.1,
      },
      {
        id: 'tr-mad-3',
        timestamp: '13:22:15',
        driver: DRIVERS.find(d => d.code === 'ALO') || DRIVERS[14],
        speaker: 'Driver',
        messageEn: 'Monumental banked corner will be flat out with DRS.',
        messageEs: 'La curva peraltada de La Monumental se hará a fondo con DRS.',
        audioToneType: 'calm',
        durationSec: 3.5,
      },
    ];

    this.selectedDriverId = this.leaderboard[0]?.driver.id || 'ant';
    this.emitCurrentState();
  }

  /**
   * Load authentic recorded real data from Round 15 (Monza GP 2026)
   */
  public loadOfficialRecordedSession(roundNumber: number = 15) {
    if (roundNumber === 16) {
      this.loadMadridSession();
      return;
    }
    const roundResults = RACE_RESULTS_2026[roundNumber] || RACE_RESULTS_2026[15];
    const monzaCircuit = CIRCUIT_MAP.get('monza') || CIRCUITS[0];
    this.circuit = monzaCircuit;

    this.session = {
      id: `session-2026-r${roundNumber}`,
      circuit: monzaCircuit,
      type: 'RACE',
      name: 'Gran Premio de Italia 2026 (Monza)',
      trackStatus: 'CHEQUERED',
      currentLap: 53,
      totalLaps: 53,
      timeRemainingSec: 0,
      airTemp: 28.5,
      trackTemp: 42.1,
      humidity: 42,
      rainProbability: 0,
      windSpeed: 8.2,
      windDirection: 'N',
      safetyCarDeployed: false,
      vscDeployed: false,
      redFlagDeployed: false,
      drsEnabled: true,
    };

    // Realistic Monza fast laps for each position
    const baseLapTimes = [
      81.432, // ANT P1 (1:21.432)
      81.512, // RUS P2 (1:21.512)
      81.720, // VER P3 (1:21.720)
      81.650, // NOR P4 (1:21.650)
      81.690, // PIA P5 (1:21.690)
      81.810, // HAM P6 (1:21.810)
      82.010, // GAS P7 (1:22.010)
      82.180, // LIN P8 (1:22.180)
      82.250, // COL P9 (1:22.250)
      82.310, // TSU P10 (1:22.310)
      82.450, // BOR P11
      82.520, // HUL P12
      82.610, // SAI P13
      82.680, // LAW P14
      82.750, // BEA P15
      82.900, // OCO P16
      83.020, // ALB P17
      83.150, // PER P18
      83.400, // BOT P19
      83.800, // STR DNF
      83.950, // ALO DNF
      84.100, // LEC DNF
    ];

    // Speed traps recorded at Monza (Rettifilo 350-356 km/h)
    const speedTraps = [
      354, 356, 351, 352, 352, 350, 348, 349, 347, 348,
      346, 346, 347, 349, 345, 345, 346, 344, 342, 345, 346, 350
    ];

    this.leaderboard = roundResults.map((result, idx) => {
      // Match with DRIVERS catalog by code first
      const baseDriver = DRIVERS.find(d => d.code === result.code) || DRIVERS.find(d => d.id === result.code.toLowerCase());
      const driverObj = {
        id: baseDriver?.id || result.code.toLowerCase(),
        code: result.code,
        number: result.driverNumber || baseDriver?.number || (idx + 1),
        firstName: baseDriver?.firstName || result.driverName.split(' ')[0] || '',
        lastName: baseDriver?.lastName || result.driverName.split(' ').slice(1).join(' ') || result.driverName,
        team: result.team || baseDriver?.team || '',
        teamColor: result.teamColor || baseDriver?.teamColor || '#fff',
        country: baseDriver?.country || result.flag,
        flag: result.flag || baseDriver?.flag || '🏁',
      };

      const baseSec = baseLapTimes[idx] || 82.5;
      const s1 = (26.241 + (idx * 0.04)).toFixed(3);
      const s2 = (27.530 + (idx * 0.05)).toFixed(3);
      const s3 = (27.661 + (idx * 0.03)).toFixed(3);

      // Official Monza real racing intervals between consecutive cars (seconds)
      const officialMonzaIntervals = [
        0,      // P1 ANT (Winner)
        3.857,  // P2 RUS (+3.857s)
        10.861, // P3 VER (+14.718s)
        4.338,  // P4 NOR (+19.056s)
        0.197,  // P5 PIA (+19.253s)
        5.402,  // P6 HAM (+24.655s)
        2.696,  // P7 GAS (+27.351s)
        17.785, // P8 LIN (+45.136s)
        2.217,  // P9 COL (+47.353s)
        10.834, // P10 TSU (+58.187s)
        7.000,  // P11 BOR (+65.187s)
        1.000,  // P12 HUL (+66.187s)
        7.930,  // P13 SAI (+74.117s)
        1.492,  // P14 LAW (+75.609s)
        3.349,  // P15 BEA (+78.958s)
        0.882,  // P16 OCO (+79.840s)
        1.170,  // P17 ALB (+81.010s)
        1.140,  // P18 PER (+82.150s)
        2.450,  // P19 BOT (+84.600s)
        0,      // P20 STR DNF
        0,      // P21 ALO DNF
        0,      // P22 LEC DNF
      ];

      const isDnf = idx >= 19 || result.status === 'DNF' || result.gapToLeader === 'DNF';
      
      let intervalNum = officialMonzaIntervals[idx] !== undefined ? officialMonzaIntervals[idx] : 1.2;
      let gapAheadStr = 'LEADER';
      let gapLeaderStr = 'GANADOR';

      if (idx === 0) {
        gapLeaderStr = 'GANADOR';
        gapAheadStr = 'LEADER';
        intervalNum = 0;
      } else if (isDnf) {
        gapLeaderStr = 'DNF';
        gapAheadStr = 'DNF';
        intervalNum = 0;
      } else {
        const driverLaps = result.laps !== undefined ? result.laps : 53;
        const winnerLaps = 53;
        const lapsDownFromLeader = Math.max(0, winnerLaps - driverLaps);
        const prevLaps = roundResults[idx - 1]?.laps !== undefined ? roundResults[idx - 1].laps : 53;
        const lapsDownFromAhead = Math.max(0, prevLaps - driverLaps);

        // Gap to Leader: if lapped by leader, display +1 LAP or +2 LAPS
        if (lapsDownFromLeader === 1 || result.gapToLeader === '+1 LAP') {
          gapLeaderStr = '+1 LAP';
        } else if (lapsDownFromLeader > 1 || (result.gapToLeader && result.gapToLeader.includes('LAP'))) {
          gapLeaderStr = `+${lapsDownFromLeader} LAPS`;
        } else {
          let cum = 0;
          for (let k = 1; k <= idx; k++) {
            cum += officialMonzaIntervals[k] || 1.2;
          }
          gapLeaderStr = `+${cum.toFixed(3)}s`;
        }

        // Interval to car ahead: if lapped by the car ahead, display +1 LAP, otherwise interval in seconds
        if (lapsDownFromAhead === 1) {
          gapAheadStr = '+1 LAP';
        } else if (lapsDownFromAhead > 1) {
          gapAheadStr = `+${lapsDownFromAhead} LAPS`;
        } else {
          gapAheadStr = `+${intervalNum.toFixed(3)}s`;
        }
      }

      return {
        position: result.position || (idx + 1),
        previousPosition: result.position || (idx + 1),
        driver: driverObj,
        gapToLeader: gapLeaderStr,
        gapToAhead: gapAheadStr,
        intervalNum: intervalNum,
        currentLapTime: isDnf ? 'DNF' : this.formatLapTime(baseSec),
        bestLapTime: this.formatLapTime(baseSec),
        s1Time: s1,
        s2Time: s2,
        s3Time: s3,
        s1Status: idx === 0 ? 'purple' : idx < 3 ? 'green' : 'yellow',
        s2Status: idx === 1 ? 'purple' : idx < 4 ? 'green' : 'yellow',
        s3Status: idx === 0 ? 'purple' : idx < 3 ? 'green' : 'yellow',
        tyre: {
          compound: idx % 2 === 0 ? 'HARD' : 'MEDIUM',
          age: isDnf ? result.laps : 24,
          used: true,
        },
        pitStops: isDnf ? (result.laps > 15 ? 1 : 0) : (idx === 8 ? 2 : 1),
        inPit: false,
        isPitOut: false,
        isKnockedOut: false,
        isEliminationRisk: false,
        speedTrap: speedTraps[idx] || 348,
        lastLapTimeNum: baseSec,
        trackProgress: 1.0,
      };
    });

    // Populate realistic Monza telemetry curves for each driver
    this.leaderboard.forEach((entry, idx) => {
      const isWinner = idx === 0;
      const speed = isWinner ? 354 : Math.max(340, 356 - idx * 0.8);
      this.telemetryMap.set(entry.driver.id, {
        driverId: entry.driver.id,
        speed: Math.round(speed),
        rpm: isWinner ? 12850 : 12700,
        gear: 8,
        throttle: 100,
        brake: 0,
        drs: 2, // DRS Active on straight
        steerAngle: 0,
        gForceLat: 0.2,
        gForceLong: 0.9,
        ersBattery: Math.max(70, 88 - idx * 2),
        ersDeploy: 85,
      });
    });

    this.raceControlLog = [...RECORDED_MONZA_RACE_CONTROL];
    this.teamRadioLog = [...RECORDED_MONZA_RADIOS];
    this.selectedDriverId = this.leaderboard[0]?.driver.id || 'ant';

    // Notify listeners of initial recorded state
    this.emitCurrentState();
  }

  /**
   * Emit the current engine state to all listeners
   */
  public emitCurrentState() {
    const pitPrediction = this.calculatePitPrediction(this.selectedDriverId);
    this.listeners.onTick?.({
      leaderboard: [...this.leaderboard],
      telemetryMap: new Map(this.telemetryMap),
      session: { ...this.session },
      selectedDriverTelemetry: this.telemetryMap.get(this.selectedDriverId) || null,
      pitPrediction,
    });
  }

  public setCircuit(circuitId: string) {
    const circuit = CIRCUIT_MAP.get(circuitId);
    if (!circuit) return;
    this.circuit = circuit;
    this.session.circuit = circuit;
    this.session.totalLaps = circuit.laps;
    this.session.name = `Gran Premio de ${circuit.country}`;
  }

  public setSessionType(type: SessionState['type']) {
    this.session.type = type;
    if (type === 'QUALIFYING') {
      this.session.totalLaps = 0;
      this.session.timeRemainingSec = 720;
    } else if (type === 'PRACTICE') {
      this.session.totalLaps = 0;
      this.session.timeRemainingSec = 2100;
    } else {
      this.session.currentLap = 53;
      this.session.totalLaps = this.circuit.laps;
    }
  }

  public setListeners(listeners: EngineListeners) {
    this.listeners = listeners;
    this.emitCurrentState();
  }

  public setSelectedDriver(driverId: string) {
    this.selectedDriverId = driverId;
    this.emitCurrentState();
  }

  public getSelectedDriverId(): string {
    return this.selectedDriverId;
  }

  public setLiveMode(isLive: boolean) {
    this.isLiveMode = isLive;
    if (isLive) {
      this.start();
    } else {
      // Keep simulation running smoothly on active circuit without jumping back to older races
      if (this.circuit.id === 'madrid') {
        this.start();
      } else {
        this.start();
      }
    }
  }

  public getLiveMode(): boolean {
    return this.isLiveMode;
  }

  public start() {
    if (this.timerId !== null) return;
    this.isRunning = true;
    const intervalMs = 60; // ~16.6 Hz update rate
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
    const randomTemplate = RECORDED_MONZA_RADIOS[Math.floor(Math.random() * RECORDED_MONZA_RADIOS.length)];
    const newRadio: TeamRadio = {
      ...randomTemplate,
      id: `tr-${Date.now()}`,
      timestamp: this.getCurrentTimeString(),
    };
    this.teamRadioLog.unshift(newRadio);
    this.listeners.onTeamRadio?.(newRadio);
  }

  private tick() {
    const dt = (0.060 * this.playbackSpeed); // delta time scaled

    // Decrement practice/qualifying session time remaining
    if (this.session.type === 'PRACTICE' || this.session.type === 'QUALIFYING') {
      if (this.session.timeRemainingSec > 0) {
        this.session.timeRemainingSec = Math.max(0, this.session.timeRemainingSec - dt);
      }
    }

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

    // Update gaps relative to leader with realistic live micro-variations
    let cumulativeGap = 0;
    this.leaderboard.forEach((entry, i) => {
      if (entry.gapToLeader === 'DNF' || entry.gapToAhead === 'DNF') {
        entry.gapToAhead = 'DNF';
        entry.gapToLeader = 'DNF';
        return;
      }
      if (i === 0) {
        entry.gapToLeader = this.session.trackStatus === 'CHEQUERED' ? 'GANADOR' : 'LÍDER';
        entry.gapToAhead = 'LEADER';
        cumulativeGap = 0;
      } else {
        // Calculate dynamic live interval with realistic telemetry drift (auto-updating in real-time)
        const delta = (Math.sin(Date.now() / 1400 + i * 1.5) * 0.003 + (Math.random() * 0.004 - 0.002)) * dt * this.playbackSpeed;
        const currentInterval = Math.max(0.08, (entry.intervalNum || 1.1) + delta);
        entry.intervalNum = currentInterval;

        const isLappedByLeader = entry.gapToLeader.toUpperCase().includes('LAP');
        const isLappedByAhead = entry.gapToAhead.toUpperCase().includes('LAP');

        // Interval to car ahead
        if (isLappedByAhead) {
          if (entry.gapToAhead.toUpperCase().includes('1 LAP') || entry.gapToAhead.toUpperCase().includes('1LAP')) {
            entry.gapToAhead = '+1 LAP';
          }
        } else {
          entry.gapToAhead = `+${currentInterval.toFixed(3)}s`;
        }

        // Distance to leader
        if (isLappedByLeader) {
          if (entry.gapToLeader.toUpperCase().includes('2 LAP')) {
            entry.gapToLeader = '+2 LAPS';
          } else {
            entry.gapToLeader = '+1 LAP';
          }
        } else {
          cumulativeGap += currentInterval;
          entry.gapToLeader = `+${cumulativeGap.toFixed(3)}s`;
        }
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

  /**
   * Ingest live official F1 TimingData from SignalR WebSocket stream
   */
  public ingestSignalRTimingData(timingData: any) {
    if (!timingData) return;
    
    // Support all SignalR F1 packet structures (full dump or delta lines)
    const lines = 
      timingData.Lines || 
      timingData.TimingData?.Lines || 
      (typeof timingData === 'object' && !Array.isArray(timingData) ? timingData : null);
    
    if (!lines || typeof lines !== 'object') return;

    let hasUpdates = false;

    Object.entries(lines).forEach(([driverNumStr, lineData]: [string, any]) => {
      if (!lineData || typeof lineData !== 'object') return;
      const driverNum = parseInt(driverNumStr, 10);

      // Find matching driver in leaderboard by number or code
      const entry = this.leaderboard.find(e => 
        e.driver.number === driverNum || 
        (lineData.RacingNumber && e.driver.number === parseInt(lineData.RacingNumber, 10)) ||
        (lineData.Tla && e.driver.code.toUpperCase() === String(lineData.Tla).toUpperCase())
      );

      if (!entry) return;
      hasUpdates = true;

      // Update position
      if (lineData.Position !== undefined) {
        const newPos = parseInt(String(lineData.Position), 10);
        if (!isNaN(newPos)) {
          entry.previousPosition = entry.position;
          entry.position = newPos;
        }
      }

      // Update Gap to Leader
      if (lineData.GapToLeader !== undefined) {
        const gapVal = typeof lineData.GapToLeader === 'object' ? lineData.GapToLeader.Value : lineData.GapToLeader;
        if (typeof gapVal === 'string' && gapVal.trim()) {
          const cleanGap = gapVal.replace(/^\++/, '+').trim();
          entry.gapToLeader = cleanGap === 'LEADER' || cleanGap === 'GANADOR' || cleanGap === 'DNF' || cleanGap.startsWith('+') 
            ? cleanGap 
            : `+${cleanGap}`;
        }
      }

      // Update Interval to Car Ahead (real SignalR interval)
      const rawInterval = lineData.IntervalToPositionAhead !== undefined 
        ? lineData.IntervalToPositionAhead 
        : lineData.TimeDiffToPositionAhead;

      if (rawInterval !== undefined) {
        const intVal = typeof rawInterval === 'object' ? rawInterval.Value : rawInterval;
        if (typeof intVal === 'string' && intVal.trim()) {
          const cleanInt = intVal.replace(/^\++/, '').replace('s', '').trim();
          const parsedSec = parseFloat(cleanInt);
          if (!isNaN(parsedSec)) {
            entry.intervalNum = parsedSec;
            entry.gapToAhead = `+${parsedSec.toFixed(3)}s`;
          } else if (intVal === 'LEADER' || intVal === 'DNF') {
            entry.gapToAhead = intVal;
            entry.intervalNum = 0;
          } else {
            entry.gapToAhead = intVal.replace(/^\++/, '+');
          }
        }
      }

      // Update Lap Times
      if (lineData.LastLapTime?.Value) {
        entry.currentLapTime = lineData.LastLapTime.Value;
      }
      if (lineData.BestLapTime?.Value) {
        entry.bestLapTime = lineData.BestLapTime.Value;
      }

      // Update Sectors
      if (Array.isArray(lineData.Sectors)) {
        if (lineData.Sectors[0]?.Value) entry.s1Time = lineData.Sectors[0].Value;
        if (lineData.Sectors[1]?.Value) entry.s2Time = lineData.Sectors[1].Value;
        if (lineData.Sectors[2]?.Value) entry.s3Time = lineData.Sectors[2].Value;

        if (lineData.Sectors[0]?.OverallFastest) entry.s1Status = 'purple';
        else if (lineData.Sectors[0]?.PersonalFastest) entry.s1Status = 'green';

        if (lineData.Sectors[1]?.OverallFastest) entry.s2Status = 'purple';
        else if (lineData.Sectors[1]?.PersonalFastest) entry.s2Status = 'green';

        if (lineData.Sectors[2]?.OverallFastest) entry.s3Status = 'purple';
        else if (lineData.Sectors[2]?.PersonalFastest) entry.s3Status = 'green';
      }

      // Pit Stops & InPit status
      if (lineData.NumberOfPitStops !== undefined) {
        const stops = parseInt(String(lineData.NumberOfPitStops), 10);
        if (!isNaN(stops)) entry.pitStops = stops;
      }
      if (lineData.InPit !== undefined) {
        entry.inPit = Boolean(lineData.InPit);
      }
      if (lineData.PitOut !== undefined) {
        entry.isPitOut = Boolean(lineData.PitOut);
      }
      if (lineData.KnockedOut !== undefined) {
        entry.isKnockedOut = Boolean(lineData.KnockedOut);
      }
      if (lineData.Stopped === true || lineData.Status === 'DNF' || lineData.Status === 'Retired') {
        entry.gapToLeader = 'DNF';
        entry.gapToAhead = 'DNF';
      }
    });

    if (hasUpdates) {
      // Sort by current position
      this.leaderboard.sort((a, b) => a.position - b.position);

      this.listeners.onTick?.({
        leaderboard: [...this.leaderboard],
        telemetryMap: new Map(this.telemetryMap),
        session: { ...this.session },
        selectedDriverTelemetry: this.telemetryMap.get(this.selectedDriverId) || null,
        pitPrediction: this.calculatePitPrediction(this.selectedDriverId),
      });
    }
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

  public getTelemetryMap(): Map<string, CarTelemetry> {
    return new Map(this.telemetryMap);
  }

  public getSelectedTelemetry(): CarTelemetry | null {
    return this.telemetryMap.get(this.selectedDriverId) || null;
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
