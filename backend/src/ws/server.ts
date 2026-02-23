import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";
import type { IncomingMessage } from "http";

const matchSubscribers = new Map<string, Set<WebSocket>>();

const subscribe = (socket: WebSocket, matchId: string) => {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId)?.add(socket);
}
const unsubscribe = (socket: WebSocket, matchId: string) => {
 
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;
  if (subscribers) {
    subscribers.delete(socket);
    if (subscribers.size === 0) {
      matchSubscribers.delete(matchId);
    }
  }
}

const cleanupSubscriptions = (socket: WebSocket) => {
  for(const matchId of socket.subscriptions) {
    unsubscribe(socket, matchId);
  }
}

const brodCastToMatch = (matchId: string, payload: unknown) => {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;
  const message = JSON.stringify(payload);
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      sendJson(client, message);
    }
  }
}
const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
};

const brodCastToAll = (wss: WebSocketServer, payload: unknown) => {
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

  wss.on("connection", async (socket: AliveSocket, req: IncomingMessage) => {


    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          console.log("WS Connection denied by Arcjet:", decision.reason.toString());
          const code = decision.reason.isRateLimit() ? 1013 : 1008; // 1013: Try Again Later, 1008: Policy Violation
          const reason = decision.reason.isRateLimit() ? "Too many requests. Please try again later." : "Forbidden.";
          socket.close(code, reason);
          return;
        }
      } catch (error) {
        console.log("WS Connection error:",error);
        socket.close(1011, "Forbidden");
        return;
      }
    }





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
    brodCastToAll(wss, { event: "matchCreated", data: match });
  };

  return { brodCastMatchCreated };
};
