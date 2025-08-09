import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeWebSocket } from './src/lib/websocket.ts';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Handle WebSocket upgrade requests
      if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        // Let the WebSocket server handle the upgrade
        return;
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket server
  initializeWebSocket(server);
  

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
