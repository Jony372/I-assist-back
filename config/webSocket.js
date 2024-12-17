const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  ws.on('message', (message) => {
    console.log('Mensaje recibido del cliente:', message);
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

// Función para enviar mensajes a todos los clientes conectados
function broadcastToClients(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

module.exports = { broadcastToClients };