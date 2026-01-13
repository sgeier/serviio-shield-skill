# Serviio + Nvidia Shield Clawdbot Skill

> **Play movies from Serviio on your Nvidia Shield TV via voice/text commands**

Control your home theater through Clawdbot with natural language commands like "Play Inception on TV".

## Quick Start

```javascript
const ServiioShieldSkill = require('./dist/index.js').default;

const skill = new ServiioShieldSkill('./config.json');

// Play a movie - it wakes TV, finds media, and starts playback
await skill.playMovie('Inception');
// ✅ Playing "Inception" on Shield TV

// Control playback
await skill.pausePlayback();   // ⏸️ Playback paused
await skill.resumePlayback();  // ▶️ Playback resumed
await skill.stopPlayback();    // ⏹️ Playback stopped
```

## Features

✅ **Natural language media control** - "Play [movie] on TV"  
✅ **Automatic TV wake** - Shield wakes via ADB, TV wakes via HDMI-CEC  
✅ **Serviio integration** - Search and play from your media library  
✅ **Full playback control** - Play, pause, resume, stop  
✅ **Remote navigation** - Send D-pad commands to Shield  
✅ **Zero manual steps** - Complete end-to-end automation  

## How It Works

```
User: "Play Inception on TV"
  ↓
1. Search Serviio library via UPnP ContentDirectory
2. Wake Shield via ADB (triggers HDMI-CEC → TV powers on)
3. Load media on Shield via UPnP AVTransport
4. Start playback
  ↓
Movie plays on TV (3-5 seconds from command to playback)
```

## Prerequisites

### Hardware
- Nvidia Shield TV (any model)
- Serviio Media Server running on your network
- TV with HDMI-CEC support (recommended)
- All devices on same LAN

### One-Time Setup

**Shield:**
1. Enable Developer Mode (tap Build 7x in Settings → About)
2. Enable Network Debugging (Settings → Developer Options)
3. Enable HDMI-CEC (Settings → Display & Sound → Power control)
4. Note Shield IP address

**Serviio:**
1. Ensure Serviio is running and indexing media
2. Note Serviio IP address

**First ADB Connection:**
```bash
adb connect <SHIELD_IP>:5555
# Approve connection on TV screen (one-time)
```

## Installation

```bash
git clone https://github.com/yourusername/serviio-shield-skill.git
cd serviio-shield-skill

# Install dependencies
npm install

# Build TypeScript
npm run build

# Configure IPs
cp config.example.json config.json
nano config.json  # Edit with your Shield and Serviio IPs
```

## Usage Examples

### Basic Playback

```javascript
const skill = new ServiioShieldSkill('./config.json');

// Play movie
const result = await skill.playMovie('The Matrix');
console.log(result);  // ✅ Playing "The Matrix" on Shield TV

// Pause
await skill.pausePlayback();

// Resume
await skill.resumePlayback();

// Stop
await skill.stopPlayback();
```

### Search Library

```javascript
// Search without playing
const results = await skill.searchLibrary('Matrix');
results.forEach(movie => {
  console.log(`${movie.title} - ${movie.url}`);
});
```

### TV Control

```javascript
// Wake TV without playing
await skill.wakeTV();

// Put TV to sleep
await skill.sleepTV();

// Navigate Shield UI
await skill.navigate('UP');
await skill.navigate('CENTER');  // Select
await skill.navigate('BACK');
await skill.navigate('HOME');
```

### Clawdbot Integration

Use with Clawdbot message handlers:

```javascript
// In your Clawdbot skill handler
const ServiioShieldSkill = require('./skills/serviio-shield-skill/dist/index.js').default;

const skill = new ServiioShieldSkill('./skills/serviio-shield-skill/config.json');

// Handle natural language commands
if (message.includes('play') && message.includes('on tv')) {
  const movieTitle = extractMovieTitle(message);
  const result = await skill.playMovie(movieTitle);
  return result;
}

if (message.includes('pause')) {
  return await skill.pausePlayback();
}

if (message.includes('resume') || message.includes('continue')) {
  return await skill.resumePlayback();
}

if (message.includes('stop')) {
  return await skill.stopPlayback();
}
```

## Configuration

Edit `config.json`:

```json
{
  "shield": {
    "ip": "192.168.1.100",     // Your Shield IP
    "port": 5555,               // ADB port (default 5555)
    "wakeDelayMs": 3000         // Wait time after wake (ms)
  },
  "serviio": {
    "ip": "192.168.1.50",       // Your Serviio server IP
    "port": 23423               // Serviio port (default 23423)
  }
}
```

Or use environment variables:
```bash
export SHIELD_IP=192.168.1.100
export SERVIIO_IP=192.168.1.50
```

## API Reference

### Core Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `playMovie(title)` | Search and play movie | Success message |
| `searchLibrary(query, limit?)` | Search Serviio | MediaItem[] |
| `pausePlayback()` | Pause current playback | Status message |
| `resumePlayback()` | Resume playback | Status message |
| `stopPlayback()` | Stop playback | Status message |
| `wakeTV()` | Wake Shield and TV | Status message |
| `sleepTV()` | Put Shield to sleep | Status message |
| `navigate(direction)` | Send navigation key | Status message |
| `disconnect()` | Cleanup connections | void |

See [SKILL.md](./SKILL.md) for complete documentation.

## Troubleshooting

### Connection Issues

**ADB Connection Failed:**
- Check Shield IP address
- Ensure Network Debugging is enabled
- Verify ADB authorization on TV

**Shield Not Found on Network:**
- Ensure Shield is awake
- Check all devices on same network
- Increase `wakeDelayMs` in config

### Playback Issues

**Movie Not Found:**
- Verify movie is in Serviio library
- Check Serviio web console: `http://SERVIIO_IP:23423/console`
- Try partial title search

**TV Not Waking:**
- Enable HDMI-CEC in TV settings
- Enable CEC in Shield settings
- Some TVs require specific HDMI ports for CEC

See [SKILL.md](./SKILL.md#troubleshooting) for detailed troubleshooting.

## Architecture

```
┌─────────────────────────────────────────┐
│   ServiioShieldSkill (index.ts)        │
│   Main orchestration layer              │
└───────────┬─────────────┬───────────────┘
            │             │
   ┌────────▼─────┐   ┌──▼──────────────┐
   │ ServiioClient│   │ ShieldController│
   │ (serviio.ts) │   │   (shield.ts)   │
   └────────┬─────┘   └──┬──────────┬───┘
            │            │          │
     ┌──────▼──────┐  ┌──▼────┐ ┌──▼────────┐
     │UPnP Content │  │  ADB  │ │AVTransport│
     │  Directory  │  │Control│ │  Client   │
     └─────────────┘  └───────┘ └───────────┘
```

- **ServiioClient**: Queries media library via UPnP ContentDirectory
- **ShieldController**: High-level Shield control (combines ADB + UPnP)
- **ADBController**: Wake, sleep, key events via Android Debug Bridge
- **AVTransportClient**: Media playback control via UPnP

## Technical Stack

- **Node.js/TypeScript** - Modern, type-safe development
- **ADB** - Android Debug Bridge for Shield control
- **UPnP/DLNA** - Standard protocols for media discovery and playback
- **SOAP** - UPnP action invocation
- **HDMI-CEC** - Automatic TV power control

## Development

```bash
# Build
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Clean build artifacts
npm run clean
```

## Project Structure

```
serviio-shield-skill/
├── src/
│   ├── index.ts       # Main skill entry point
│   ├── serviio.ts     # Serviio ContentDirectory client
│   ├── shield.ts      # High-level Shield controller
│   ├── adb.ts         # ADB wrapper
│   └── upnp.ts        # UPnP device discovery + AVTransport
├── dist/              # Compiled JavaScript (generated)
├── config.json        # Your configuration
├── config.example.json
├── package.json
├── tsconfig.json
├── SKILL.md           # Detailed skill documentation
└── README.md
```

## Contributing

This is a community skill for Clawdbot. Contributions welcome!

**Ideas for enhancement:**
- TV series support with episode selection
- Playlist/queue management
- Resume from last position
- Integration with Plex/Kodi
- Voice search improvements
- Subtitle control

## License

MIT

## Credits

Developed as a Clawdbot community contribution.

**Technologies:**
- [Serviio Media Server](http://serviio.org/)
- [Nvidia Shield TV](https://www.nvidia.com/shield)
- [UPnP Standards](http://upnp.org/)
- [Android Debug Bridge](https://developer.android.com/tools/adb)

## Support

- Issues: [GitHub Issues](https://github.com/yourusername/serviio-shield-skill/issues)
- Docs: [SKILL.md](./SKILL.md)
- Clawdbot: [ClawdHub](https://github.com/clawdbot)

---

**Status:** ✅ Functional - Core flow working (search → wake → play)

Built with ❤️ for the Clawdbot community
