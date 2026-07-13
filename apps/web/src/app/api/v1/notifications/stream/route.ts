import { getServerSession } from "next-auth";
import Redis from "ioredis";
import { authOptions } from "@/lib/auth";
import { notificationChannel } from "@/modules/notifications/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });
  const encoder = new TextEncoder();
  const channel = notificationChannel(session.user.id);
  let subscriber: Redis | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: string) => {
        if (!closed) controller.enqueue(encoder.encode(value));
      };
      const close = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (subscriber) {
          try { await subscriber.unsubscribe(channel); } catch {}
          subscriber.disconnect();
        }
        try { controller.close(); } catch {}
      };
      request.signal.addEventListener("abort", () => void close(), { once: true });
      send(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);
      heartbeat = setInterval(() => send(`: heartbeat ${Date.now()}\n\n`), 20_000);
      try {
        subscriber = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
          lazyConnect: true,
          maxRetriesPerRequest: null,
        });
        subscriber.on("error", (error) => console.error("[notifications] Redis subscriber error", error.message));
        subscriber.on("message", (receivedChannel, message) => {
          if (receivedChannel === channel) send(`event: notification\ndata: ${message}\n\n`);
        });
        await subscriber.connect();
        await subscriber.subscribe(channel);
      } catch (error) {
        console.error("[notifications] SSE started without Redis subscription", error);
        send(`event: degraded\ndata: ${JSON.stringify({ realtime: false })}\n\n`);
      }
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      subscriber?.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
