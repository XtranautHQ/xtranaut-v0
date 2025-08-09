import { WebSocketServer, WebSocket } from 'ws';

// Ensure a single global instance across hot reloads and module graphs
if (!globalThis.__wsManager) {
  globalThis.__wsManager = null;
}

export class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map<string, Set<WebSocket>>
  }

  initialize(server) {
    if (this.wss) return; // idempotent
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
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
  }

  subscribeToTransaction(transactionId, ws) {
    if (!this.clients.has(transactionId)) {
      this.clients.set(transactionId, new Set());
    }
    this.clients.get(transactionId).add(ws);
  }

  unsubscribeFromTransaction(transactionId, ws) {
    const clients = this.clients.get(transactionId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(transactionId);
      }
    }
  }

  removeClient(ws) {
    for (const [transactionId, clients] of this.clients.entries()) {
      if (clients.has(ws)) {
        clients.delete(ws);
        if (clients.size === 0) {
          this.clients.delete(transactionId);
        }
      }
    }
  }

  broadcastToTransaction(transactionId, message) {
    const clients = this.clients.get(transactionId);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    } else {
      console.log(`No clients subscribed to transaction: ${transactionId}`);
    }
  }

  broadcastToAll(message) {
    if (this.wss) {
      const messageStr = JSON.stringify(message);
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  }

  getConnectedClientsCount() {
    return this.wss ? this.wss.clients.size : 0;
  }

  getTransactionSubscribers(transactionId) {
    return this.clients.get(transactionId)?.size || 0;
  }
}

export function getWebSocketManager() {
  if (!globalThis.__wsManager) {
    globalThis.__wsManager = new WebSocketManager();
  }
  return globalThis.__wsManager;
}

export function initializeWebSocket(server) {
  const manager = getWebSocketManager();
  manager.initialize(server);
}

export function broadcastTransactionUpdate(transactionId, data) {
  const manager = getWebSocketManager();
  manager.broadcastToTransaction(transactionId, {
    type: 'status_update',
    transactionId,
    data,
  });
}

export function broadcastTransactionComplete(transactionId, data) {
  const manager = getWebSocketManager();
  manager.broadcastToTransaction(transactionId, {
    type: 'transaction_complete',
    transactionId,
    data,
  });
}

export function broadcastError(transactionId, error) {
  const manager = getWebSocketManager();
  manager.broadcastToTransaction(transactionId, {
    type: 'error',
    transactionId,
    error,
  });
}


