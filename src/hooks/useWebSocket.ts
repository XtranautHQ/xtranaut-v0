import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: 'status_update' | 'transaction_complete' | 'error';
  transactionId: string;
  data?: any;
  error?: string;
}

interface UseWebSocketOptions {
  transactionId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export function useWebSocket({ transactionId, onMessage, onError, onClose }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttempts.current = 0;

      // Subscribe to transaction updates
      const subscribeMessage = {
        type: 'subscribe',
        transactionId
      };
      console.log('Sending subscription message:', subscribeMessage);
      ws.send(JSON.stringify(subscribeMessage));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        if (onMessage) {
          onMessage(message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setIsConnecting(false);
      
      if (onError) {
        onError(error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setIsConnected(false);
      setIsConnecting(false);

      // Attempt to reconnect if not a normal closure
     
    };
  }, [transactionId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    if (transactionId) {
      console.log(`Connecting to WebSocket for transaction: ${transactionId}`);
      connect();
    }
  }, [transactionId]);

  return {
    isConnected,
    isConnecting,
    sendMessage,
    disconnect
  };
}
