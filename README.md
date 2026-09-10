# 🏎️ TelemetryF1

Dashboard de **telemetría y tiempos de Fórmula 1 en tiempo real**, construido con React, TypeScript y Vite. Se conecta directamente al stream oficial de F1 (`livetiming.formula1.com`) por WebSocket/SignalR, sin intermediarios, y utiliza [OpenF1](https://openf1.org) como apoyo para el estado de sesiones y datos oficiales.

> ⚠️ Proyecto no oficial creado por fans, sin afiliación con Formula 1, FIA, Liberty Media ni ninguna escudería. Todas las marcas pertenecen a sus respectivos propietarios.

## ✨ Características

- **Conexión SignalR en directo** — negocia y abre un WebSocket nativo contra `livetiming.formula1.com/signalrcore` y se suscribe a los canales oficiales: `Heartbeat`, `CarData.z`, `Position.z`, `TimingData`, `TimingAppData`, `TrackStatus`, `WeatherData`, `RaceControlMessages`, `SessionInfo`, `DriverList`, `TeamRadio` y `LapCount`.
- **Descompresión de paquetes** — los canales comprimidos (`.z`) se decodifican en el cliente con `pako` (Base64 + Deflate).
- **Tabla de tiempos en vivo** con posiciones, intervalos y estado de cada piloto.
- **Mapa del circuito** con geometría real y posición de los monoplazas en pista.
- **Circle of Doom** — predicción de estrategia y ventana de parada en boxes.
- **Telemetría del monoplaza** — velocidad, RPM, marcha, acelerador, freno y DRS por piloto seleccionado.
- **Control de carrera y radios de equipo** con mensajes traducidos al español.
- **Clasificación oficial** del Mundial de Pilotos y Constructores.
- **Calendario completo** de la temporada 2026.
- **Reconexión automática** y estado de conexión visible (`connecting`, `connected`, `live_streaming`, `error`, etc.) en la cabecera.
- Modo de **respaldo/vista previa** con datos de la última sesión oficial cuando no hay ninguna carrera en directo.

## 🧱 Stack técnico

| Categoría | Tecnología |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Iconos | lucide-react |
| Descompresión de datos | pako |
| Linter | Oxlint |
| Fuentes de datos | Stream oficial F1 SignalR (WebSocket) + [OpenF1 API](https://openf1.org) |

## 📁 Estructura del proyecto

```
TelemetryF1/
├── public/                    # Assets estáticos (favicon, iconos SVG)
├── src/
│   ├── components/            # Componentes de UI (Leaderboard, CircuitMap, CarTelemetry, RaceControl...)
│   ├── data/                  # Datos estáticos: pilotos, circuitos, calendario, resultados
│   ├── services/
│   │   ├── f1SignalRClient.ts     # Cliente WebSocket que habla directo con F1 SignalR
│   │   ├── officialF1Api.ts       # Cliente de la API OpenF1 (estado de sesiones, resultados)
│   │   ├── telemetryEngine.ts     # Motor que orquesta y expone los datos a la UI
│   │   ├── scheduleSyncService.ts # Sincroniza el calendario con SessionInfo en vivo
│   │   ├── standingsSyncService.ts# Sincroniza clasificaciones al finalizar sesiones
│   │   └── soundFx.ts             # Efectos de sonido
│   ├── styles/                 # CSS por módulo
│   ├── types/telemetry.ts      # Tipos compartidos
│   └── App.tsx                 # Layout principal y pestañas (Home, Timing, Leaderboard, Schedule)
└── vite.config.ts              # Proxy de desarrollo hacia livetiming.formula1.com
```

## 🚀 Puesta en marcha

### Requisitos

- Node.js 18 o superior
- npm

### Instalación

```bash
git clone https://github.com/alehinarejos/TelemetryF1.git
cd TelemetryF1
npm install
```

### Desarrollo

```bash
npm run dev
```

Esto levanta el servidor de Vite con un **proxy** configurado (`vite.config.ts`) que reenvía las rutas `/f1-signalr` y `/f1-static` hacia `livetiming.formula1.com`, evitando así los problemas de CORS del navegador al hablar directamente con el servidor oficial de F1.

### Build de producción

```bash
npm run build
```

> Nota: el proxy de desarrollo solo existe en el servidor de Vite. Para desplegar en producción necesitarás replicar ese mismo proxy (por ejemplo con un reverse proxy, una función serverless, o un servidor Node) que reenvíe `/f1-signalr` → `https://livetiming.formula1.com/signalrcore` y `/f1-static` → `https://livetiming.formula1.com/static`.

### Otros scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Compila TypeScript y genera el build de producción |
| `npm run preview` | Sirve localmente el build de producción |
| `npm run lint` | Ejecuta Oxlint sobre el código |

## 📡 Cómo funciona la conexión en directo

1. El cliente negocia una conexión contra `/f1-signalr/negotiate` (proxied a F1).
2. Con el token recibido, abre un `WebSocket` a `wss://livetiming.formula1.com/signalrcore`.
3. Realiza el *handshake* del protocolo SignalR Core (`{"protocol":"json","version":1}`).
4. Envía una invocación `Subscribe` con la lista de canales oficiales de telemetría y timing.
5. Cada paquete entrante se procesa según su tópico; los canales `.z` se descomprimen con `pako` antes de parsear el JSON.
6. Cuando no hay sesión activa, la app usa [OpenF1](https://openf1.org) para comprobar periódicamente si hay una sesión en curso y mostrar el próximo Gran Premio del calendario.

## ⚖️ Aviso legal

Este proyecto es un ejercicio personal/fan-made y **no está afiliado, respaldado ni asociado** con Formula 1 Companies, la FIA ni Liberty Media. Los datos se obtienen de fuentes públicas ([OpenF1](https://openf1.org)) y del stream de *live timing* que utiliza la propia F1 TV; su disponibilidad y estabilidad dependen de terceros y pueden cambiar sin previo aviso.

## 📄 Licencia

Sin licencia especificada todavía — añade un archivo `LICENSE` si quieres definir los términos de uso y distribución del código.
