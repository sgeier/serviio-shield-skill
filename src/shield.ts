/**
 * High-level Nvidia Shield controller
 * Combines ADB control with UPnP media rendering
 */

import { ADBController } from './adb';
import { UPnPClient, AVTransportClient } from './upnp';

export interface ShieldConfig {
  ip: string;
  port: number;
  wakeDelayMs?: number;
}

export class ShieldController {
  private adb: ADBController;
  private upnpClient: UPnPClient;
  private avTransport?: AVTransportClient;
  private config: ShieldConfig;
  private wakeDelayMs: number;

  constructor(config: ShieldConfig) {
    this.config = config;
    this.wakeDelayMs = config.wakeDelayMs || 3000;
    
    this.adb = new ADBController({
      ip: config.ip,
      port: config.port
    });
    
    this.upnpClient = new UPnPClient(5000);
  }

  /**
   * Wake Shield and TV (via HDMI-CEC)
   */
  async wake(): Promise<void> {
    await this.adb.wake();
    // Wait for Shield to fully boot
    await this.sleep(this.wakeDelayMs);
  }

  /**
   * Put Shield to sleep
   */
  async sleepDevice(): Promise<void> {
    await this.adb.sleep();
  }

  /**
   * Initialize UPnP connection to Shield
   */
  private async initUPnP(): Promise<void> {
    if (this.avTransport) return;

    const device = await this.upnpClient.findDevice('Shield');
    
    if (!device) {
      throw new Error('Shield MediaRenderer not found on network. Is it awake?');
    }

    this.avTransport = new AVTransportClient(device);
  }

  /**
   * Play media from URL on Shield
   */
  async playMedia(mediaUrl: string, title?: string): Promise<void> {
    // Ensure Shield is awake
    await this.wake();
    
    // Initialize UPnP if needed
    await this.initUPnP();
    
    if (!this.avTransport) {
      throw new Error('Failed to initialize AVTransport');
    }

    // Build minimal DIDL metadata
    const metadata = title ? this.buildDIDLMetadata(title, mediaUrl) : '';

    // Load media
    await this.avTransport.setAVTransportURI(mediaUrl, metadata);
    
    // Start playback
    await this.avTransport.play();
  }

  /**
   * Pause current playback
   */
  async pausePlayback(): Promise<void> {
    if (!this.avTransport) {
      await this.initUPnP();
    }
    
    if (!this.avTransport) {
      throw new Error('Not connected to Shield');
    }

    await this.avTransport.pause();
  }

  /**
   * Resume playback
   */
  async resumePlayback(): Promise<void> {
    if (!this.avTransport) {
      await this.initUPnP();
    }
    
    if (!this.avTransport) {
      throw new Error('Not connected to Shield');
    }

    await this.avTransport.play();
  }

  /**
   * Stop playback
   */
  async stopPlayback(): Promise<void> {
    if (!this.avTransport) {
      await this.initUPnP();
    }
    
    if (!this.avTransport) {
      throw new Error('Not connected to Shield');
    }

    await this.avTransport.stop();
  }

  /**
   * Get current playback state
   */
  async getPlaybackState(): Promise<string> {
    if (!this.avTransport) {
      await this.initUPnP();
    }
    
    if (!this.avTransport) {
      throw new Error('Not connected to Shield');
    }

    const info = await this.avTransport.getTransportInfo();
    return info;
  }

  /**
   * Send key events via ADB (for advanced control)
   */
  async sendKey(key: 'PLAY' | 'PAUSE' | 'STOP' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CENTER' | 'BACK' | 'HOME'): Promise<void> {
    const keyMap: { [key: string]: () => Promise<void> } = {
      PLAY: () => this.adb.play(),
      PAUSE: () => this.adb.pause(),
      STOP: () => this.adb.stop(),
      UP: () => this.adb.navUp(),
      DOWN: () => this.adb.navDown(),
      LEFT: () => this.adb.navLeft(),
      RIGHT: () => this.adb.navRight(),
      CENTER: () => this.adb.navCenter(),
      BACK: () => this.adb.back(),
      HOME: () => this.adb.home()
    };

    const action = keyMap[key];
    if (action) {
      await action();
    } else {
      throw new Error(`Unknown key: ${key}`);
    }
  }

  /**
   * Disconnect from Shield
   */
  async disconnect(): Promise<void> {
    await this.adb.disconnect();
    this.upnpClient.stop();
    this.avTransport = undefined;
  }

  /**
   * Build minimal DIDL-Lite metadata for media
   */
  private buildDIDLMetadata(title: string, url: string): string {
    return `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">
  <item id="0" parentID="-1" restricted="1">
    <dc:title>${this.escapeXml(title)}</dc:title>
    <upnp:class>object.item.videoItem.movie</upnp:class>
    <res protocolInfo="http-get:*:video/*:*">${this.escapeXml(url)}</res>
  </item>
</DIDL-Lite>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
