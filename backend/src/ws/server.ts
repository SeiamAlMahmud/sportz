import { WebSocket, WebSocketServer } from "ws";

const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
};

const brodCast = (wss: WebSocketServer, payload: unknown) => {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
};

export const attachWebSocketServer = (server: ReturnType<typeof import("http").createServer>) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, // 1 MB
  });

  type AliveSocket = WebSocket & { isAlive?: boolean };

  wss.on("connection", (socket: AliveSocket) => {
    socket.isAlive = true;
    console.log("[ws] client connected, isAlive=true");

    socket.on("pong", () => {
      socket.isAlive = true;
      console.log("[ws] pong received, isAlive=true");
    });

    console.log("New client connected");
    sendJson(socket, { message: "Welcome to the WebSocket server!" });

    socket.on("error", console.error);
    socket.on("close", () => {
      console.log("Client disconnected");
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as AliveSocket;

      if (socket.isAlive === false) {
        console.log("[ws] no pong since last ping, terminating client");
        socket.terminate();
        return;
      }

      console.log("[ws] sending ping, set isAlive=false and wait for pong");
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  const brodCastMatchCreated = (match: unknown) => {
    brodCast(wss, { event: "matchCreated", data: match });
  };

  return { brodCastMatchCreated };
};
