# ManolitoZurrapa

> *El bot de Twitch más castizo de to internet, illo*

Bot de Twitch con personalidad andaluza que crea clips, responde preguntas con IA, busca en internet, celebra eventos del canal, echa piropos a las reinas del chat y genera resúmenes del stream.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![Twitch](https://img.shields.io/badge/Twitch-Bot-9146FF?logo=twitch)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-orange)
![Brave](https://img.shields.io/badge/Brave-Search_API-FB542B?logo=brave)
![Discord](https://img.shields.io/badge/Discord-Webhooks-5865F2?logo=discord)

---

## Características

### Sistema de Clips
- **`!clip [duración] [título]`** - Crea clips del stream
- Duraciones: 15, 30, 45, 60, 90 segundos
- Cooldown de 30s entre clips
- Permisos: Broadcaster, Mods, VIPs
- Notificación automática a Discord

### Chat con IA (Groq + Llama 3.3 70B)
- **`!oyemanolito <pregunta>`** - Pregúntale lo que quieras
- **`@ManolitoZurrapa <mensaje>`** - Menciónalo directamente
- Personalidad andaluza: illo, quillo, aro, ozú, miarma...
- Contexto del canal: conoce al streamer y la comunidad
- Memoria de usuario: recuerda tus últimas conversaciones

### Búsqueda Web (Brave Search + IA)
- **`@ManolitoZurrapa busca/buscame <query>`** - Busca en internet
- Sintetiza resultados de múltiples fuentes
- Cooldown de 10 minutos tras alcanzar límite (resetea contador)

### Multi-idioma
- **Español** - Acento andaluz (illo, quillo, miarma...)
- **English** - British/Australian casual (mate, bloke, cheers...)
- **Afrikaans** - South African slang (boet, tjom, lekker...)
- Detección automática del idioma del mensaje
- Respuestas en el mismo idioma detectado

### Resumen de Stream
- **`!resumen`** - Genera resumen del directo (solo broadcaster)
- Sistema de resúmenes progresivos cada 30 minutos
- Trackea: clips, subs, raids, bits, búsquedas
- Combina mini-resúmenes en un resumen final

### Eventos de Twitch
El bot responde automáticamente a:
- **Suscripciones** - Bienvenida a nuevos subs
- **Resubs** - Celebra la fidelidad
- **Sub gifts** - Agradece a los gifters
- **Raids** - Da la bienvenida a raiders
- **Bits/Cheers** - Agradece las donaciones
- **Watch Streaks** - Celebra rachas de visualización

### Token Auto-Refresh
- Validación proactiva cada 30 minutos
- Refresh automático antes de que expire
- Reconexión transparente del cliente de chat
- Notificaciones Discord si algo falla

### Sistema de Tiers

| Tier | Mensajes IA | Búsquedas |
|------|-------------|-----------|
| No sub | - | - |
| T1 / Prime | 30/sesión | - |
| T2 | 60/sesión | 10 + cooldown 10min |
| T3 | Infinito | 150 + cooldown 10min |
| VIP/Mod | Infinito | 150 + cooldown 10min |
| Broadcaster | Infinito | Infinito |

---

## Instalación

```bash
# Clonar el repo
git clone https://github.com/teseo/manolitozurrapa.git
cd manolitozurrapa

# Instalar dependencias
npm install

# Configurar credenciales
cp .env.example .env
cp src/config/community.example.ts src/config/community.ts
cp CONTEXTO.example.md CONTEXTO.md

# Editar archivos de configuración con tus datos

# Autenticación OAuth con Twitch
npm run auth

# Build TypeScript
npm run build

# Iniciar el bot
npm start
```

---

## Configuración

### Variables de entorno (`.env`)

```env
TWITCH_CLIENT_ID=tu_client_id
TWITCH_CLIENT_SECRET=tu_client_secret
TWITCH_CHANNEL=tu_canal
TWITCH_BOT_USERNAME=nombre_del_bot
GROQ_API_KEY=tu_groq_api_key
BRAVE_API_KEY=tu_brave_api_key
DISCORD_WEBHOOK_URL=tu_webhook_url
```

### Archivos de configuración

- **`CONTEXTO.md`** - Información del canal para las respuestas de IA
- **`literales.json`** - Textos, piropos y personalidad (ES/EN/AF)
- **`src/config/community.ts`** - Comunidad: reinas, mods, VIPs, emotes

---

## Estructura del Proyecto

```
manolitozurrapa/
├── src/
│   ├── index.ts              # Bot principal
│   ├── env.ts                # Carga de variables de entorno
│   ├── auth.ts               # Autenticación OAuth
│   ├── config/
│   │   ├── constants.ts      # Configuración y límites
│   │   └── community.ts      # Roles y emotes del canal
│   ├── services/
│   │   ├── ai.ts             # Integración Groq/Llama
│   │   ├── search.ts         # Brave Search
│   │   ├── discord.ts        # Webhooks Discord
│   │   └── twitch.ts         # API de Twitch
│   ├── managers/
│   │   ├── token.ts          # Gestión de tokens OAuth
│   │   ├── memory.ts         # Memoria de usuarios
│   │   └── stream-summary.ts # Resúmenes de stream
│   ├── utils/
│   │   ├── helpers.ts        # Utilidades generales
│   │   └── logger.ts         # Sistema de logging
│   └── types/
│       └── index.ts          # Tipos TypeScript
├── tests/                    # Tests unitarios
├── literales.json            # Textos multi-idioma
├── data/                     # Datos de sesión (ignorado)
└── logs/                     # Logs de sesión (ignorado)
```

---

## Scripts

```bash
npm start          # Iniciar bot (producción)
npm run dev        # Iniciar con hot-reload
npm run build      # Compilar TypeScript
npm run auth       # Obtener tokens OAuth
npm test           # Ejecutar tests
npm run validate   # Verificar sintaxis TypeScript
```

---

## Comandos del Bot

| Comando | Descripción | Permisos |
|---------|-------------|----------|
| `!clip [seg] [título]` | Crear clip | VIP/Mod/Broadcaster |
| `!oyemanolito <msg>` | Chat con IA | Subs |
| `@ManolitoZurrapa <msg>` | Chat con IA (+ búsqueda con "busca/buscame") | Subs (búsqueda T2+) |
| `!cuentamealgomanolito` | Dato curioso | Todos |
| `!mismensajes` | Ver uso restante | Todos |
| `!resumen` | Resumen del stream | Broadcaster |
| `!ayudaclip` | Ayuda de clips | Todos |

---

## Stack Técnico

- **Runtime:** Node.js 20+ (ES Modules)
- **Lenguaje:** TypeScript 5+
- **Chat:** tmi.js
- **LLM:** Groq API + Llama 3.3 70B Versatile
- **Search:** Brave Search API
- **Notificaciones:** Discord Webhooks
- **Auth:** Twitch OAuth 2.0 con auto-refresh
- **Tests:** Jest

---

## Contribuir

1. Fork el repo
2. Crea tu rama (`git checkout -b feature/MiFeature`)
3. Commit (`git commit -m 'Add MiFeature'`)
4. Push (`git push origin feature/MiFeature`)
5. Abre un Pull Request

---

## Licencia

MIT

---

<p align="center">
  <i>Hecho con manzanilla en Andalucía</i><br>
  <b>¡Aro que aro!</b>
</p>
