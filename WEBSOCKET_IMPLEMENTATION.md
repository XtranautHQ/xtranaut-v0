# WebSocket Implementation for Real-time Transaction Updates

## Overview

This implementation replaces Server-Sent Events (SSE) with WebSocket connections for real-time transaction updates. WebSocket provides better performance, bidirectional communication, and more reliable connections.

## Architecture

### Backend Components

1. **WebSocketManager** (`src/lib/websocket.ts`)
   - Manages WebSocket server and client connections
   - Handles subscription/unsubscription to transaction updates
   - Broadcasts messages to specific transaction subscribers

2. **Custom Server** (`server.js`)
   - Integrates WebSocket server with Next.js
   - Initializes WebSocketManager on server startup

3. **M-Pesa Callback** (`src/app/api/mpesa/callback/route.ts`)
   - Broadcasts real-time updates when transactions are updated
   - Uses `broadcastTransactionUpdate`, `broadcastTransactionComplete`, and `broadcastError` functions

### Frontend Components

1. **useWebSocket Hook** (`src/hooks/useWebSocket.ts`)
   - Manages WebSocket connection lifecycle
   - Handles reconnection logic with exponential backoff
   - Provides connection status and message handling

2. **TransferStepper Component** (`src/components/TransferStepper.tsx`)
   - Uses WebSocket hook for real-time updates
   - Displays connection status and transaction progress
   - Handles different message types (status_update, transaction_complete, error)

## Message Types

### From Server to Client
- `status_update`: General transaction status updates
- `transaction_complete`: Transaction completion notification
- `error`: Error notifications

### From Client to Server
- `subscribe`: Subscribe to transaction updates
- `unsubscribe`: Unsubscribe from transaction updates

## Connection Flow

1. **Client Connection**: Frontend establishes WebSocket connection
2. **Subscription**: Client sends subscription message with transaction ID
3. **Real-time Updates**: Server broadcasts updates when transactions change
4. **Reconnection**: Automatic reconnection with exponential backoff on connection loss

## Benefits over SSE

- **Bidirectional Communication**: Can send messages from client to server
- **Better Performance**: Lower overhead than HTTP-based SSE
- **Reliable Connections**: Built-in reconnection handling
- **Connection Status**: Real-time connection status indicators
- **Scalable**: Better handling of multiple concurrent connections

## Usage

### Starting the Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Configuration

The WebSocket server is automatically initialized when the custom server starts. No additional configuration is required.

## Error Handling

- Automatic reconnection with exponential backoff
- Connection status indicators in the UI
- Graceful handling of connection errors
- Fallback mechanisms for failed connections
