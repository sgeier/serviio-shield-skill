/**
 * ADB wrapper for Nvidia Shield control
 * Handles device connection, wake/sleep, and key events
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ADBConfig {
  ip: string;
  port: number;
}

export class ADBController {
  private ip: string;
  private port: number;
  private connected: boolean = false;

  constructor(config: ADBConfig) {
    this.ip = config.ip;
    this.port = config.port;
  }

  /**
   * Connect to Shield via network ADB
   */
  async connect(): Promise<void> {
    try {
      const { stdout } = await execAsync(`adb connect ${this.ip}:${this.port}`);
      
      if (stdout.includes('connected') || stdout.includes('already connected')) {
        this.connected = true;
      } else {
        throw new Error(`Failed to connect: ${stdout}`);
      }
    } catch (error) {
      throw new Error(`ADB connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from Shield
   */
  async disconnect(): Promise<void> {
    try {
      await execAsync(`adb disconnect ${this.ip}:${this.port}`);
      this.connected = false;
    } catch (error) {
      // Ignore disconnect errors
    }
  }

  /**
   * Check if device is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('adb devices');
      return stdout.includes(`${this.ip}:${this.port}`);
    } catch {
      return false;
    }
  }

  /**
   * Wake Shield from standby (triggers HDMI-CEC to wake TV)
   */
  async wake(): Promise<void> {
    await this.ensureConnected();
    await this.sendKeyEvent('KEYCODE_WAKEUP');
  }

  /**
   * Put Shield to sleep (can trigger TV power-off via CEC if configured)
   */
  async sleep(): Promise<void> {
    await this.ensureConnected();
    await this.sendKeyEvent('KEYCODE_SLEEP');
  }

  /**
   * Send media control key events
   */
  async playPause(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_MEDIA_PLAY_PAUSE');
  }

  async play(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_MEDIA_PLAY');
  }

  async pause(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_MEDIA_PAUSE');
  }

  async stop(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_MEDIA_STOP');
  }

  async next(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_MEDIA_NEXT');
  }

  async previous(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_MEDIA_PREVIOUS');
  }

  /**
   * Navigation controls
   */
  async navUp(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_DPAD_UP');
  }

  async navDown(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_DPAD_DOWN');
  }

  async navLeft(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_DPAD_LEFT');
  }

  async navRight(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_DPAD_RIGHT');
  }

  async navCenter(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_DPAD_CENTER');
  }

  async back(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_BACK');
  }

  async home(): Promise<void> {
    await this.sendKeyEvent('KEYCODE_HOME');
  }

  /**
   * Open a media URL using Android intent
   */
  async openMedia(url: string, mimeType: string = 'video/*'): Promise<void> {
    await this.ensureConnected();
    
    const command = `adb -s ${this.ip}:${this.port} shell am start -a android.intent.action.VIEW -d "${url}" -t "${mimeType}"`;
    
    try {
      await execAsync(command);
    } catch (error) {
      throw new Error(`Failed to open media: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send arbitrary key event
   */
  private async sendKeyEvent(keycode: string): Promise<void> {
    await this.ensureConnected();
    
    try {
      await execAsync(`adb -s ${this.ip}:${this.port} shell input keyevent ${keycode}`);
    } catch (error) {
      throw new Error(`Failed to send key event ${keycode}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure ADB connection is established
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
}
