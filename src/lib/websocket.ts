import { WebSocketServer, WebSocket } from 'ws';

interface WebSocketMessage {
  type: 'status_update' | 'transaction_complete' | 'error';
  transactionId: string;
  data?: any;
  error?: string;
}

// Ensure a single global instance across Next.js hot reloads and different module graphs
declare global {
  // eslint-disable-next-line no-var
  var __wsManager: WebSocketManager | undefined;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocket>> = new Map();

  initialize(server: any) {
    // Avoid re-initializing the WebSocket server on hot reloads
    if (this.wss) {
      return;
    }
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, request) => {
      console.log('WebSocket client connected');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('WebSocket message received:', data);
          

          if (data.type === 'subscribe' && data.transactionId) {
            this.subscribeToTransaction(data.transactionId, ws);
          } else if (data.type === 'unsubscribe' && data.transactionId) {
            this.unsubscribeFromTransaction(data.transactionId, ws);
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });

    console.log('WebSocket server initialized');
  }

  private subscribeToTransaction(transactionId: string, ws: WebSocket) {
    if (!this.clients.has(transactionId)) {
      this.clients.set(transactionId, new Set());
    }
    this.clients.get(transactionId)!.add(ws);
    console.log(`Client subscribed to transaction: ${transactionId}`);
  }

  private unsubscribeFromTransaction(transactionId: string, ws: WebSocket) {
    const clients = this.clients.get(transactionId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(transactionId);
      }
    }
    console.log(`Client unsubscribed from transaction: ${transactionId}`);
  }

  private removeClient(ws: WebSocket) {
    for (const [transactionId, clients] of this.clients.entries()) {
      if (clients.has(ws)) {
        clients.delete(ws);
        if (clients.size === 0) {
          this.clients.delete(transactionId);
        }
      }
    }
  }

  broadcastToTransaction(transactionId: string, message: WebSocketMessage) {
    const clients = this.clients.get(transactionId);

    if (clients) {
      const messageStr = JSON.stringify(message);
      let sentCount = 0;
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
          sentCount++;
        }
      });
      console.log(`Broadcasted to ${sentCount}/${clients.size} clients for transaction: ${transactionId}`);
    } else {
      console.log(`No clients subscribed to transaction: ${transactionId}`);
    }
  }

  broadcastToAll(message: WebSocketMessage) {
    if (this.wss) {
      const messageStr = JSON.stringify(message);
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  }

  getConnectedClientsCount(): number {
    return this.wss ? this.wss.clients.size : 0;
  }

  getTransactionSubscribers(transactionId: string): number {
    return this.clients.get(transactionId)?.size || 0;
  }
}

export function getWebSocketManager(): WebSocketManager {
  if (!globalThis.__wsManager) {
    globalThis.__wsManager = new WebSocketManager();
  }
  return globalThis.__wsManager;
}

export function initializeWebSocket(server: any): void {
  const manager = getWebSocketManager();
  manager.initialize(server);
}

export function broadcastTransactionUpdate(transactionId: string, data: any): void {
  const manager = getWebSocketManager();
  manager.broadcastToTransaction(transactionId, {
    type: 'status_update',
    transactionId,
    data
  });
}

export function broadcastTransactionComplete(transactionId: string, data: any): void {
  console.log(`broadcastTransactionComplete called for transaction: ${transactionId}`, data);
  const manager = getWebSocketManager();
  manager.broadcastToTransaction(transactionId, {
    type: 'transaction_complete',
    transactionId,
    data
  });
}

export function broadcastError(transactionId: string, error: string): void {
  console.log(`broadcastError called for transaction: ${transactionId}`, error);
  const manager = getWebSocketManager();
  manager.broadcastToTransaction(transactionId, {
    type: 'error',
    transactionId,
    error
  });
}
