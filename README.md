# Serviio + Nvidia Shield Skill

Control your Nvidia Shield TV and stream media from Serviio via voice/chat commands.

## Features (Planned)

- 🎬 **Play movies** - "Play Inception on TV"
- ⏸️ **Playback control** - Play, pause, stop, resume
- 📺 **TV power control** - Wake TV via HDMI-CEC
- 🔍 **Library search** - Find movies in Serviio library

## Tech Stack

- **Serviio** - DLNA/UPnP media server
- **Nvidia Shield** - Android TV device
- **ADB** - Android Debug Bridge for remote control
- **HDMI-CEC** - TV power control via Shield

## Requirements

- Nvidia Shield with Developer Mode enabled
- Network ADB access to Shield
- Serviio media server running
- TV connected via HDMI (for CEC control)

## Setup

1. Enable Developer Mode on Shield (Settings → About → Build 7x)
2. Enable USB/Network Debugging
3. Note Shield IP address
4. Connect via ADB: `adb connect <shield-ip>`

## Usage

```bash
# Coming soon
```

## Status

🔬 **Research Phase** - Investigating feasibility

## License

MIT

---

Built for [Clawdbot](https://github.com/clawdbot/clawdbot) skills ecosystem.
