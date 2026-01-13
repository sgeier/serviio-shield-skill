/**
 * Serviio + Nvidia Shield Clawdbot Skill
 * Main entry point
 */

import { ServiioClient, MediaItem } from './serviio';
import { ShieldController } from './shield';
import * as fs from 'fs';
import * as path from 'path';

export interface Config {
  shield: {
    ip: string;
    port: number;
    wakeDelayMs?: number;
  };
  serviio: {
    ip: string;
    port: number;
  };
  upnp?: {
    discoveryTimeoutMs?: number;
    searchTimeoutMs?: number;
  };
}

export class ServiioShieldSkill {
  private config: Config;
  private serviio: ServiioClient;
  private shield: ShieldController;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
    
    this.serviio = new ServiioClient({
      ip: this.config.serviio.ip,
      port: this.config.serviio.port
    });
    
    this.shield = new ShieldController({
      ip: this.config.shield.ip,
      port: this.config.shield.port,
      wakeDelayMs: this.config.shield.wakeDelayMs
    });
  }

  /**
   * Load configuration from file or environment
   */
  private loadConfig(configPath?: string): Config {
    // Try to load from file
    if (configPath && fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }

    // Try default config.json in current directory
    const defaultPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(defaultPath)) {
      const data = fs.readFileSync(defaultPath, 'utf-8');
      return JSON.parse(data);
    }

    // Fall back to environment variables or defaults
    return {
      shield: {
        ip: process.env.SHIELD_IP || '192.168.1.100',
        port: parseInt(process.env.SHIELD_PORT || '5555', 10),
        wakeDelayMs: parseInt(process.env.SHIELD_WAKE_DELAY || '3000', 10)
      },
      serviio: {
        ip: process.env.SERVIIO_IP || '192.168.1.50',
        port: parseInt(process.env.SERVIIO_PORT || '23423', 10)
      },
      upnp: {
        discoveryTimeoutMs: 5000,
        searchTimeoutMs: 10000
      }
    };
  }

  /**
   * Play a movie by title on Shield TV
   * Main use case: "Play Inception on TV"
   */
  async playMovie(title: string): Promise<string> {
    try {
      // 1. Search for movie in Serviio
      console.log(`Searching for "${title}" in Serviio library...`);
      const media = await this.serviio.findByTitle(title);
      
      if (!media) {
        return `❌ Movie "${title}" not found in library`;
      }

      console.log(`Found: ${media.title} (${media.url})`);

      // 2. Wake Shield and TV
      console.log('Waking Shield TV...');
      await this.shield.wake();

      // 3. Play media on Shield
      console.log('Starting playback...');
      await this.shield.playMedia(media.url, media.title);

      return `✅ Playing "${media.title}" on Shield TV`;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `❌ Error: ${errorMsg}`;
    }
  }

  /**
   * Search Serviio library without playing
   */
  async searchLibrary(query: string, limit: number = 10): Promise<MediaItem[]> {
    return await this.serviio.searchByTitle(query, limit);
  }

  /**
   * Pause current playback
   */
  async pausePlayback(): Promise<string> {
    try {
      await this.shield.pausePlayback();
      return '⏸️ Playback paused';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `❌ Failed to pause: ${errorMsg}`;
    }
  }

  /**
   * Resume playback
   */
  async resumePlayback(): Promise<string> {
    try {
      await this.shield.resumePlayback();
      return '▶️ Playback resumed';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `❌ Failed to resume: ${errorMsg}`;
    }
  }

  /**
   * Stop playback
   */
  async stopPlayback(): Promise<string> {
    try {
      await this.shield.stopPlayback();
      return '⏹️ Playback stopped';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `❌ Failed to stop: ${errorMsg}`;
    }
  }

  /**
   * Wake TV without playing anything
   */
  async wakeTV(): Promise<string> {
    try {
      await this.shield.wake();
      return '📺 Shield TV is now awake';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `❌ Failed to wake TV: ${errorMsg}`;
    }
  }

  /**
   * Put Shield to sleep
   */
  async sleepTV(): Promise<string> {
    try {
      await this.shield.sleepDevice();
      return '💤 Shield TV is now sleeping';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `❌ Failed to sleep: ${errorMsg}`;
    }
  }

  /**
   * Send navigation key
   */
  async navigate(direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CENTER' | 'BACK' | 'HOME'): Promise<string> {
    try {
      await this.shield.sendKey(direction);
      return `✅ Sent ${direction} key`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `❌ Failed to send key: ${errorMsg}`;
    }
  }

  /**
   * Cleanup connections
   */
  async disconnect(): Promise<void> {
    await this.shield.disconnect();
  }
}

// Export main class and types
export { MediaItem } from './serviio';
export { ADBController } from './adb';
export { UPnPClient, AVTransportClient } from './upnp';
export { ShieldController } from './shield';
export { ServiioClient } from './serviio';

// Default export for easy usage
export default ServiioShieldSkill;
