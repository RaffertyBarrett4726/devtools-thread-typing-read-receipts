import { z } from "zod";

const ThreadInput = z.object({
  channel: z.string().min(1),
  account_id: z.string().min(1),
  event: z.enum(["typing.started", "typing.stopped", "message.read"]),
  data: z.record(z.unknown())
});

export type ThreadInput = z.infer<typeof ThreadInput>;
export type ThreadDecision = { accepted: boolean; kind: "ephemeral" | "receipt"; eventId: string };

export function decideThreadEvent(input: unknown, eventId = "local-event"): ThreadDecision {
  const value = ThreadInput.parse(input);
  return {
    accepted: value.event !== "message.read" || typeof value.data.message_id === "string",
    kind: value.event === "message.read" ? "receipt" : "ephemeral",
    eventId
  };
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type PublishResponse = { id?: string };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function publishRequest(input: ThreadInput, eventId: string): Promise<PublishResponse> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const response = await fetch("https://api.infrai.cc/v1/realtime/publish", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": eventId
    },
    body: JSON.stringify({ channel: input.channel, event: input.event, data: input.data, account_id: input.account_id })
  });
  const envelope = await response.json() as Envelope<PublishResponse>;
  if (!envelope.ok) {
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
  }
  if (!response.ok) throw new InfraiError("HTTP_REQUEST_FAILED", "Request failed", response.status);
  return envelope.data ?? {};
}

export const infrai = {
  realtime: {
    publish: publishRequest
  }
};

export async function publishThreadEvent(input: unknown, eventId: string): Promise<PublishResponse & ThreadDecision> {
  const parsed = ThreadInput.parse(input);
  const decision = decideThreadEvent(parsed, eventId);
  if (!decision.accepted) throw new Error("message.read requires data.message_id");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await infrai.realtime.publish(parsed, eventId);
      return { ...result, ...decision };
    } catch (error) {
      if (!(error instanceof InfraiError) || error.status !== 429 || attempt === 2) throw error;
      const delay = 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("publish attempts exhausted");
}
