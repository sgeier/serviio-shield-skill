/**
 * Serviio media server client
 * Query ContentDirectory and search for media
 */

import * as http from 'http';
import * as xml2js from 'xml2js';

export interface ServiioConfig {
  ip: string;
  port: number;
}

export interface MediaItem {
  id: string;
  title: string;
  url: string;
  mimeType?: string;
  duration?: number;
  resolution?: string;
}

export class ServiioClient {
  private ip: string;
  private port: number;
  private controlUrl: string;

  constructor(config: ServiioConfig) {
    this.ip = config.ip;
    this.port = config.port;
    // Serviio ContentDirectory control URL
    this.controlUrl = `/cds/control`;
  }

  /**
   * Search for media by title
   */
  async searchByTitle(title: string, maxResults: number = 10): Promise<MediaItem[]> {
    const searchCriteria = `dc:title contains "${title}"`;
    return await this.search(searchCriteria, maxResults);
  }

  /**
   * Search ContentDirectory with custom criteria
   */
  async search(searchCriteria: string, maxResults: number = 10): Promise<MediaItem[]> {
    const action = 'Search';
    const args = {
      ContainerID: '0',
      SearchCriteria: searchCriteria,
      Filter: '*',
      StartingIndex: '0',
      RequestedCount: String(maxResults),
      SortCriteria: ''
    };

    try {
      const response = await this.callAction(action, args);
      return this.parseSearchResponse(response);
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Browse ContentDirectory (list contents of a container)
   */
  async browse(containerId: string = '0', maxResults: number = 100): Promise<MediaItem[]> {
    const action = 'Browse';
    const args = {
      ObjectID: containerId,
      BrowseFlag: 'BrowseDirectChildren',
      Filter: '*',
      StartingIndex: '0',
      RequestedCount: String(maxResults),
      SortCriteria: ''
    };

    try {
      const response = await this.callAction(action, args);
      return this.parseSearchResponse(response);
    } catch (error) {
      throw new Error(`Browse failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find a single media item by exact title
   */
  async findByTitle(title: string): Promise<MediaItem | null> {
    const results = await this.searchByTitle(title, 20);
    
    // Try exact match first
    const exactMatch = results.find(item => 
      item.title.toLowerCase() === title.toLowerCase()
    );
    
    if (exactMatch) return exactMatch;
    
    // Return best fuzzy match
    return results[0] || null;
  }

  /**
   * Call a UPnP ContentDirectory SOAP action
   */
  private async callAction(action: string, args: any): Promise<any> {
    const serviceType = 'urn:schemas-upnp-org:service:ContentDirectory:1';
    
    // Build SOAP arguments
    let argsXml = '';
    for (const [key, value] of Object.entries(args)) {
      // Escape XML special characters
      const escapedValue = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      argsXml += `<${key}>${escapedValue}</${key}>`;
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
      const options = {
        hostname: this.ip,
        port: this.port,
        path: this.controlUrl,
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

      req.on('error', (error) => {
        reject(new Error(`Connection failed: ${error.message}`));
      });

      req.write(soap);
      req.end();
    });
  }

  /**
   * Parse DIDL-Lite XML response into MediaItem array
   */
  private async parseSearchResponse(xmlResponse: string): Promise<MediaItem[]> {
    return new Promise((resolve, reject) => {
      // Extract Result field from SOAP response
      xml2js.parseString(xmlResponse, { explicitArray: false }, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          // Navigate SOAP envelope
          const body = result['s:Envelope']['s:Body'];
          const searchResponse = body['u:SearchResponse'] || body['u:BrowseResponse'];
          const didlXml = searchResponse?.Result;

          if (!didlXml) {
            resolve([]);
            return;
          }

          // Parse DIDL-Lite XML
          xml2js.parseString(didlXml, { explicitArray: false }, (err2, didlResult) => {
            if (err2) {
              reject(err2);
              return;
            }

            const items: MediaItem[] = [];
            const didl = didlResult['DIDL-Lite'];
            
            if (!didl) {
              resolve([]);
              return;
            }

            // Handle both single item and array
            const rawItems = didl.item;
            const itemArray = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);

            for (const item of itemArray) {
              try {
                const res = item.res;
                const url = typeof res === 'string' ? res : res?._;
                
                if (url) {
                  items.push({
                    id: item.$ ? item.$['id'] : '',
                    title: item['dc:title'] || 'Unknown',
                    url: url,
                    mimeType: res?.$ ? res.$['protocolInfo']?.split(':')[2] : undefined,
                    duration: res?.$ ? this.parseDuration(res.$['duration']) : undefined,
                    resolution: res?.$ ? res.$['resolution'] : undefined
                  });
                }
              } catch (e) {
                // Skip malformed items
              }
            }

            resolve(items);
          });
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
   * Parse duration string (HH:MM:SS) to seconds
   */
  private parseDuration(duration?: string): number | undefined {
    if (!duration) return undefined;
    
    const parts = duration.split(':');
    if (parts.length !== 3) return undefined;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
  }
}
