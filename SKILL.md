# Serviio + Nvidia Shield Skill

Control Nvidia Shield TV and play media from Serviio via Clawdbot.

## What It Does

This skill enables voice/text control of your Nvidia Shield TV, allowing you to:
- Play movies from your Serviio media library
- Control playback (play, pause, stop, resume)
- Wake Shield TV and connected TV (via HDMI-CEC)
- Navigate Shield interface with remote control commands

## Use Cases

```
User: "Play Inception on TV"
Bot: ✅ Playing "Inception" on Shield TV

User: "Pause playback"
Bot: ⏸️ Playback paused

User: "Resume"
Bot: ▶️ Playback resumed

User: "Stop playback"
Bot: ⏹️ Playback stopped

User: "Wake TV"
Bot: 📺 Shield TV is now awake
```

## Prerequisites

### Hardware Setup

1. **Nvidia Shield TV** connected to your network
2. **Serviio Media Server** running on your network
3. **TV with HDMI-CEC support** (optional but recommended)
4. All devices on the same LAN

### Shield Configuration (One-time)

1. Enable Developer Mode:
   - Go to Settings → About
   - Tap "Build" 7 times to unlock Developer Options

2. Enable Network Debugging:
   - Settings → Developer Options
   - Enable "USB debugging"
   - Enable "Network debugging"

3. Enable HDMI-CEC (for TV power control):
   - Settings → Display & Sound → Power control
   - Enable "Put device to sleep and turn off TV"
   - Enable "Turn on TV and wake device"

4. Note your Shield's IP address:
   - Settings → Network → Advanced settings

### Serviio Configuration

1. Ensure Serviio is running and indexing your media
2. Note Serviio machine's IP address
3. Verify UPnP/DLNA is enabled (default: enabled)

### ADB Pairing (First-time)

From your Clawdbot machine, connect to Shield:

```bash
adb connect <SHIELD_IP>:5555
```

A dialog will appear on your TV screen - select "Always allow from this computer" and approve.

## Installation

1. Clone or download this skill:
```bash
cd /path/to/clawdbot/skills
git clone https://github.com/yourusername/serviio-shield-skill.git
cd serviio-shield-skill
```

2. Install dependencies:
```bash
npm install
```

3. Build TypeScript:
```bash
npm run build
```

4. Create configuration:
```bash
cp config.example.json config.json
```

5. Edit `config.json` with your IPs:
```json
{
  "shield": {
    "ip": "192.168.1.100",
    "port": 5555,
    "wakeDelayMs": 3000
  },
  "serviio": {
    "ip": "192.168.1.50",
    "port": 23423
  }
}
```

## Usage

### From Clawdbot

Import and use in your Clawdbot instance:

```javascript
const ServiioShieldSkill = require('./skills/serviio-shield-skill/dist/index.js');

const skill = new ServiioShieldSkill.default('./skills/serviio-shield-skill/config.json');

// Play a movie
await skill.playMovie('Inception');

// Control playback
await skill.pausePlayback();
await skill.resumePlayback();
await skill.stopPlayback();

// Wake TV
await skill.wakeTV();
```

### Standalone Usage

```javascript
const ServiioShieldSkill = require('./dist/index.js').default;

async function main() {
  const skill = new ServiioShieldSkill('./config.json');
  
  // Play movie
  const result = await skill.playMovie('The Matrix');
  console.log(result);
  
  // Search library
  const movies = await skill.searchLibrary('Matrix');
  console.log(movies);
  
  // Cleanup
  await skill.disconnect();
}

main();
```

## API Reference

### Constructor

```typescript
new ServiioShieldSkill(configPath?: string)
```

Loads configuration from:
1. Provided `configPath`
2. `./config.json` in current directory
3. Environment variables (fallback)

### Methods

#### `playMovie(title: string): Promise<string>`

Search for a movie in Serviio and play it on Shield TV. Automatically wakes the TV.

**Example:**
```javascript
await skill.playMovie('Inception');
// Returns: "✅ Playing 'Inception' on Shield TV"
```

#### `searchLibrary(query: string, limit?: number): Promise<MediaItem[]>`

Search Serviio library without playing.

**Example:**
```javascript
const results = await skill.searchLibrary('Matrix', 10);
// Returns array of MediaItem objects
```

#### `pausePlayback(): Promise<string>`

Pause current playback.

#### `resumePlayback(): Promise<string>`

Resume paused playback.

#### `stopPlayback(): Promise<string>`

Stop playback completely.

#### `wakeTV(): Promise<string>`

Wake Shield TV and connected TV (via HDMI-CEC) without playing anything.

#### `sleepTV(): Promise<string>`

Put Shield TV to sleep.

#### `navigate(direction): Promise<string>`

Send navigation key event.

**Direction:** `'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CENTER' | 'BACK' | 'HOME'`

**Example:**
```javascript
await skill.navigate('UP');
await skill.navigate('CENTER'); // Select
```

#### `disconnect(): Promise<void>`

Clean up connections and resources.

## Configuration

### Environment Variables (Optional)

If no config file is provided, these environment variables are used:

- `SHIELD_IP` - Shield IP address (default: 192.168.1.100)
- `SHIELD_PORT` - ADB port (default: 5555)
- `SHIELD_WAKE_DELAY` - Milliseconds to wait after wake (default: 3000)
- `SERVIIO_IP` - Serviio server IP (default: 192.168.1.50)
- `SERVIIO_PORT` - Serviio port (default: 23423)

## Troubleshooting

### "ADB connection failed"

- Verify Shield IP address is correct
- Ensure Network Debugging is enabled on Shield
- Check if ADB connection is authorized (should see prompt on TV first time)
- Try manually: `adb connect <SHIELD_IP>:5555`

### "Shield MediaRenderer not found on network"

- Ensure Shield is awake (not in deep sleep)
- Verify all devices are on same network
- Check firewall isn't blocking UPnP/SSDP (port 1900)
- Try increasing `wakeDelayMs` in config (Shield may need more time to boot)

### "Movie not found in library"

- Check movie title spelling
- Try partial title search
- Verify Serviio has indexed the media file
- Check Serviio web console: http://SERVIIO_IP:23423/console

### "HDMI-CEC not waking TV"

- Ensure TV supports HDMI-CEC (may be called Anynet+, Bravia Sync, Simplink, etc.)
- Enable CEC in TV settings
- Enable CEC in Shield settings (Display & Sound → Power control)
- Some TVs require specific HDMI port for CEC

### "Failed to play media"

- Verify Shield supports the video codec/format
- Check Serviio URL is accessible from Shield
- Ensure network connectivity between Shield and Serviio
- Try accessing media URL directly in browser

## Architecture

```
Command (Telegram/Signal/etc.)
  ↓
ServiioShieldSkill (index.ts)
  ↓
  ├─ ServiioClient (serviio.ts)
  │    └─ UPnP ContentDirectory → Search/Browse media
  │
  └─ ShieldController (shield.ts)
       ├─ ADBController (adb.ts) → Wake/Sleep/Keys
       └─ AVTransportClient (upnp.ts) → Playback control
```

## Technical Details

### How It Works

1. **Media Discovery:** Queries Serviio's UPnP ContentDirectory service via SOAP
2. **Wake Shield:** Sends `KEYCODE_WAKEUP` via ADB network connection
3. **Wake TV:** Shield's HDMI-CEC automatically powers on TV
4. **Play Media:** Uses UPnP AVTransport to load media URL on Shield
5. **Control:** UPnP AVTransport for play/pause/stop, ADB for navigation

### Protocols Used

- **ADB (Android Debug Bridge):** Remote control of Shield
- **UPnP/DLNA:** Device discovery and media control
- **SOAP:** UPnP action invocation
- **HDMI-CEC:** TV power control (automatic)

### Dependencies

- `node-ssdp` - UPnP/SSDP device discovery
- `xml2js` - XML parsing for SOAP/DIDL-Lite
- `adb` - System ADB tools (pre-installed in Clawdbot)

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Clean

```bash
npm run clean
```

## Contributing

Contributions welcome! This skill is designed as a community contribution.

## License

MIT

## Credits

Created as a Clawdbot community skill. Based on research into Nvidia Shield, Serviio, UPnP/DLNA, and HDMI-CEC standards.

## Related

- [Serviio Media Server](http://serviio.org/)
- [Nvidia Shield TV](https://www.nvidia.com/shield)
- [UPnP Device Architecture](http://upnp.org/)
- [Android Debug Bridge (ADB)](https://developer.android.com/tools/adb)
