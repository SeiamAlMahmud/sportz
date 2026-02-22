import { WebSocket, WebSocketServer } from "ws";

const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
};

const brodCast = (wss: WebSocketServer, payload: unknown) => {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) return;

    client.send(JSON.stringify(payload));
  }
};

export const attachWebSocketServer = (server: ReturnType<typeof import("http").createServer>) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, // 1 MB,
  });

  wss.on("connection", (socket) => {
    console.log("New client connected");
    sendJson(socket, { message: "Welcome to the WebSocket server!" });

    // socket.on("message", (message) => {
    //   console.log("Received message:", message.toString());
    //   // Handle incoming messages from clients if needed
    // });
    socket.on("error", console.error);
    socket.on("close", () => {
      console.log("Client disconnected");
    });
  });

  const brodCastMatchCreated = (match: unknown) => {
    brodCast(wss, { event: "matchCreated", data: match });
  };

  return { brodCastMatchCreated };
};
