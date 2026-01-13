declare module 'node-ssdp' {
  import { EventEmitter } from 'events';

  export class Client extends EventEmitter {
    constructor(options?: any);
    search(serviceType: string): void;
    stop(): void;
  }

  export class Server extends EventEmitter {
    constructor(options?: any);
    addUSN(usn: string): void;
    start(): void;
    stop(): void;
  }
}
