import { randomUUID } from 'crypto';
import type { WebSocket } from 'ws';


export interface UserConnection {
  userId: string;
  socketId: string;
  socket: WebSocket;
  connectedAt: number;
  lastActivity: number;
  metadata?: Record<string, any>;
}

export interface ConnectionStats {
  totalUsers: number;
  totalConnections: number;
  userConnections: Record<string, number>;
}

export class HashMapManager {
  private userSockets: Map<string, Set<string>> = new Map();
  private socketToUser: Map<string, string> = new Map();
  private socketConnections: Map<string, UserConnection> = new Map();
  private activeUsers: Set<string> = new Set();

  public generateSocketId(): string {
    return `socket_${randomUUID()}`;
  }
  
  public removeConnection(socketId: string): string | null {
    const userId = this.socketToUser.get(socketId);
    
    if (!userId) {
      return null;
    }

    // Remove socketId from user's socket set
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      
      // If user has no more connections, remove from active users
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
        this.activeUsers.delete(userId);
      }
    }

    // Remove socket-to-user mapping
    this.socketToUser.delete(socketId);

    // Remove connection data
    this.socketConnections.delete(socketId);

    console.log(`Connection removed: userId=${userId}, socketId=${socketId}`);
    return userId;
  }

  public getUserBySocketId(socketId: string): string | null {
    return this.socketToUser.get(socketId) || null;
  }
  public getUserSocketIds(userId: string): string[] {
    const socketSet = this.userSockets.get(userId);
    return socketSet ? Array.from(socketSet) : [];
  }
  public getUserConnections(userId: string): UserConnection[] {
    const socketIds = this.getUserSocketIds(userId);
    return socketIds
      .map(socketId => this.socketConnections.get(socketId))
      .filter((conn): conn is UserConnection => conn !== undefined);
  }
  public getConnection(socketId: string): UserConnection | null {
    return this.socketConnections.get(socketId) || null;
  }
  public getSocket(socketId: string): WebSocket | null {
    const connection = this.socketConnections.get(socketId);
    return connection ? connection.socket : null;
  }
  public updateLastActivity(socketId: string): void {
    const connection = this.socketConnections.get(socketId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }
  public getActiveUsers(): string[] {
    return Array.from(this.activeUsers);
  }

  public getAllConnections(): UserConnection[] {
    return Array.from(this.socketConnections.values());
  }

  public getConnectionStats(): ConnectionStats {
    const userConnections: Record<string, number> = {};
    let totalConnections = 0;

    for (const userId of this.activeUsers) {
      const socketIds = this.getUserSocketIds(userId);
      userConnections[userId] = socketIds.length;
      totalConnections += socketIds.length;
    }

    return {
      totalUsers: this.activeUsers.size,
      totalConnections,
      userConnections
    };
  }

  public isUserActive(userId: string): boolean {
    return this.activeUsers.has(userId);
  }

  public cleanupStaleConnections(maxInactiveMs: number = 3600000): number {
    const now = Date.now();
    const staleSocketIds: string[] = [];

    for (const [socketId, connection] of this.socketConnections) {
      if (now - connection.lastActivity > maxInactiveMs) {
        staleSocketIds.push(socketId);
      }
    }
    for (const socketId of staleSocketIds) {
      const connection = this.socketConnections.get(socketId);
      if (connection && connection.socket.readyState !== connection.socket.OPEN) {
        this.removeConnection(socketId);
      }
    }

    return staleSocketIds.length;
  }

  public sendToUser(userId: string, message: any): void {
    const connections = this.getUserConnections(userId);
    
    for (const connection of connections) {
      if (connection.socket.readyState === connection.socket.OPEN) {
        try {
          connection.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send message to user ${userId}, socket ${connection.socketId}:`, error);
        }
      }
    }
  }

  public sendToSocket(socketId: string, message: any): boolean {
    const connection = this.socketConnections.get(socketId);
    
    if (!connection || connection.socket.readyState !== connection.socket.OPEN) {
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send message to socket ${socketId}:`, error);
      return false;
    }
  }

  public broadcastToAll(message: any): void {
    const connections = this.getAllConnections();
    
    for (const connection of connections) {
      if (connection.socket.readyState === connection.socket.OPEN) {
        try {
          connection.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to broadcast to socket ${connection.socketId}:`, error);
        }
      }
    }
  }

  public getDebugInfo(): {
    userSocketsMap: Record<string, string[]>;
    socketToUserMap: Record<string, string>;
    activeUsers: string[];
    totalConnections: number;
  } {
    const userSocketsMap: Record<string, string[]> = {};
    for (const [userId, socketSet] of this.userSockets) {
      userSocketsMap[userId] = Array.from(socketSet);
    }

    const socketToUserMap: Record<string, string> = {};
    for (const [socketId, userId] of this.socketToUser) {
      socketToUserMap[socketId] = userId;
    }

    return {
      userSocketsMap,
      socketToUserMap,
      activeUsers: Array.from(this.activeUsers),
      totalConnections: this.socketConnections.size
    };
  }
}