import type { WebSocket } from "ws";

/**
 * Singleton Socket Manager
 * Maintains a dictionary of active WebSocket connections indexed by authKey_serviceId
 */
class SocketManager {
  private static instance: SocketManager;
  private socketDict: { [key: string]: WebSocket } = {};

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * Store a socket connection
   * @param key - Format: "authKey_serviceId"
   * @param socket - WebSocket instance
   */
  public setSocket(key: string, socket: WebSocket): void {
    this.socketDict[key] = socket;
  }

  /**
   * Retrieve a socket connection
   * @param key - Format: "authKey_serviceId"
   * @returns WebSocket instance or undefined
   */
  public getSocket(key: string): WebSocket | undefined {
    return this.socketDict[key];
  }

  /**
   * Remove a socket connection
   * @param key - Format: "authKey_serviceId"
   * @returns true if socket was removed, false if not found
   */
  public removeSocket(key: string): boolean {
    if (this.socketDict[key]) {
      delete this.socketDict[key];
      return true;
    }
    return false;
  }

  /**
   * Check if a socket exists
   * @param key - Format: "authKey_serviceId"
   */
  public hasSocket(key: string): boolean {
    return key in this.socketDict;
  }

  /**
   * Get all socket keys
   */
  public getKeys(): string[] {
    return Object.keys(this.socketDict);
  }

  /**
   * Get all sockets
   */
  public getAllSockets(): { [key: string]: WebSocket } {
    return { ...this.socketDict };
  }

  /**
   * Clear all sockets
   */
  public clearAll(): void {
    this.socketDict = {};
  }

  /**
   * Get the number of active sockets
   */
  public getCount(): number {
    return Object.keys(this.socketDict).length;
  }
}

// Export the singleton instance
export default SocketManager.getInstance();
