'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function TestWebSocket() {
  const [messages, setMessages] = useState<any[]>([]);
  const [transactionId] = useState('test-transaction-123');

  const handleMessage = (message: any) => {
    console.log('Test page received message:', message);
    setMessages(prev => [...prev, { ...message, timestamp: new Date() }]);
  };

  const handleError = (error: Event) => {
    console.error('Test page WebSocket error:', error);
    setMessages(prev => [...prev, { type: 'error', error: 'Connection error', timestamp: new Date() }]);
  };

  const handleClose = () => {
    console.log('Test page WebSocket closed');
    setMessages(prev => [...prev, { type: 'info', message: 'Connection closed', timestamp: new Date() }]);
  };

  const { isConnected, isConnecting, sendMessage } = useWebSocket({
    transactionId,
    onMessage: handleMessage,
    onError: handleError,
    onClose: handleClose,
  });

  const sendTestMessage = () => {
    sendMessage({
      type: 'test',
      message: 'Hello from test page',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">WebSocket Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <div className="space-y-2">
          <p>Transaction ID: <code className="bg-gray-200 px-2 py-1 rounded">{transactionId}</code></p>
          {/* <p>Connection Status: 
            <span className={`ml-2 px-2 py-1 rounded text-white ${
              isConnected ? 'bg-green-500' : 
              isConnecting ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Disconnected'}
            </span>
          </p> */}
        </div>
      </div>

      <div className="mb-6">
        {/* <button 
          onClick={sendTestMessage}
          disabled={!isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Send Test Message
        </button> */}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Received Messages</h2>
        <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages received yet...</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, index) => (
                <div key={index} className="p-2 bg-white border rounded">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold">{msg.type}</span>
                    <span className="text-sm text-gray-500">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-sm mt-1 overflow-x-auto">
                    {JSON.stringify(msg, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>This page tests the WebSocket connection and message handling.</p>
        <p>Check the browser console for detailed logs.</p>
      </div>
    </div>
  );
}
