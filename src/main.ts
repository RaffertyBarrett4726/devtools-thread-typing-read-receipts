import { publishThreadEvent } from "./realtime_thread.ts";

const event = {
  channel: process.env.DEVTOOLS_CHANNEL ?? "thread-demo",
  account_id: process.env.INFRAI_ACCOUNT_ID ?? "local-account",
  event: "message.read" as const,
  data: { message_id: "msg-42", reader_id: "agent-7" }
};

const result = await publishThreadEvent(event, `read-${event.data.message_id}-${event.data.reader_id}`);
console.log(JSON.stringify({ event: event.event, state: result.kind, eventId: result.eventId }));
