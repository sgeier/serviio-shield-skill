/**
 * UPnP device discovery and media renderer control
 * Handles SSDP discovery and AVTransport control
 */

import { Client as SSDPClient } from 'node-ssdp';
import * as http from 'http';
import * as xml2js from 'xml2js';

export interface UPnPDevice {
  location: string;
  server: string;
  usn: string;
  st: string;
  friendlyName?: string;
  manufacturer?: string;
  modelName?: string;
}

export class UPnPClient {
  private ssdpClient: SSDPClient;
  private discoveryTimeoutMs: number;

  constructor(discoveryTimeoutMs: number = 5000) {
    this.ssdpClient = new SSDPClient();
    this.discoveryTimeoutMs = discoveryTimeoutMs;
  }

  /**
   * Discover UPnP devices on the network
   */
  async discover(searchTarget: string = 'ssdp:all'): Promise<UPnPDevice[]> {
    return new Promise((resolve) => {
      const devices: UPnPDevice[] = [];
      const seen = new Set<string>();

      this.ssdpClient.on('response', (headers: any, statusCode: number, rinfo: any) => {
        if (statusCode === 200 && headers.LOCATION && !seen.has(headers.LOCATION)) {
          seen.add(headers.LOCATION);
          devices.push({
            location: headers.LOCATION,
            server: headers.SERVER || '',
            usn: headers.USN || '',
            st: headers.ST || ''
          });
        }
      });

      this.ssdpClient.search(searchTarget);

      setTimeout(() => {
        this.ssdpClient.stop();
        resolve(devices);
      }, this.discoveryTimeoutMs);
    });
  }

  /**
   * Find a specific device by name (searches friendly name)
   */
  async findDevice(name: string): Promise<UPnPDevice | null> {
    const devices = await this.discover();
    
    for (const device of devices) {
      try {
        const details = await this.getDeviceDetails(device.location);
        if (details.friendlyName?.toLowerCase().includes(name.toLowerCase())) {
          return { ...device, ...details };
        }
      } catch {
        // Skip devices that fail to fetch details
      }
    }
    
    return null;
  }

  /**
   * Find media renderers on the network
   */
  async findMediaRenderers(): Promise<UPnPDevice[]> {
    const allDevices = await this.discover('urn:schemas-upnp-org:device:MediaRenderer:1');
    const renderers: UPnPDevice[] = [];

    for (const device of allDevices) {
      try {
        const details = await this.getDeviceDetails(device.location);
        renderers.push({ ...device, ...details });
      } catch {
        // Skip devices that fail
      }
    }

    return renderers;
  }

  /**
   * Find media servers on the network (like Serviio)
   */
  async findMediaServers(): Promise<UPnPDevice[]> {
    const allDevices = await this.discover('urn:schemas-upnp-org:device:MediaServer:1');
    const servers: UPnPDevice[] = [];

    for (const device of allDevices) {
      try {
        const details = await this.getDeviceDetails(device.location);
        servers.push({ ...device, ...details });
      } catch {
        // Skip devices that fail
      }
    }

    return servers;
  }

  /**
   * Get device description from location URL
   */
  private async getDeviceDetails(location: string): Promise<Partial<UPnPDevice>> {
    return new Promise((resolve, reject) => {
      http.get(location, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          xml2js.parseString(data, (err, result) => {
            if (err) {
              reject(err);
              return;
            }
            
            try {
              const device = result.root?.device?.[0];
              resolve({
                friendlyName: device?.friendlyName?.[0],
                manufacturer: device?.manufacturer?.[0],
                modelName: device?.modelName?.[0]
              });
            } catch (e) {
              reject(e);
            }
          });
        });
      }).on('error', reject);
    });
  }

  /**
   * Stop SSDP discovery
   */
  stop(): void {
    this.ssdpClient.stop();
  }
}

export interface MediaRendererClient {
  device: UPnPDevice;
  controlUrl?: string;
}

export class AVTransportClient {
  private device: UPnPDevice;
  private controlUrl: string;

  constructor(device: UPnPDevice, controlUrl?: string) {
    this.device = device;
    // Parse control URL from device location
    const url = new URL(device.location);
    this.controlUrl = controlUrl || `http://${url.hostname}:${url.port}/AVTransport/control`;
  }

  /**
   * Set the current media URI (load media without playing)
   */
  async setAVTransportURI(mediaUrl: string, metadata: string = ''): Promise<void> {
    const action = 'SetAVTransportURI';
    const args = {
      InstanceID: 0,
      CurrentURI: mediaUrl,
      CurrentURIMetaData: metadata
    };

    await this.callAction(action, args);
  }

  /**
   * Start playback
   */
  async play(): Promise<void> {
    await this.callAction('Play', { InstanceID: 0, Speed: '1' });
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    await this.callAction('Pause', { InstanceID: 0 });
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    await this.callAction('Stop', { InstanceID: 0 });
  }

  /**
   * Seek to position (seconds)
   */
  async seek(seconds: number): Promise<void> {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const target = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    await this.callAction('Seek', {
      InstanceID: 0,
      Unit: 'REL_TIME',
      Target: target
    });
  }

  /**
   * Get current transport state (PLAYING, PAUSED, STOPPED, etc.)
   */
  async getTransportInfo(): Promise<any> {
    return await this.callAction('GetTransportInfo', { InstanceID: 0 });
  }

  /**
   * Call a UPnP SOAP action
   */
  private async callAction(action: string, args: any): Promise<any> {
    const serviceType = 'urn:schemas-upnp-org:service:AVTransport:1';
    
    // Build SOAP envelope
    let argsXml = '';
    for (const [key, value] of Object.entries(args)) {
      argsXml += `<${key}>${value}</${key}>`;
    }

    const soap = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="${serviceType}">
      ${argsXml}
    </u:${action}>
  </s:Body>
</s:Envelope>`;

    return new Promise((resolve, reject) => {
      const url = new URL(this.controlUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset="utf-8"',
          'Content-Length': Buffer.byteLength(soap),
          'SOAPAction': `"${serviceType}#${action}"`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`SOAP action failed: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(soap);
      req.end();
    });
  }
}
