import assert from "node:assert/strict";
import test from "node:test";
import { decideThreadEvent } from "./realtime_thread.ts";

test("a read event becomes a receipt only when it names a message", () => {
  const result = decideThreadEvent({
    channel: "thread-demo",
    account_id: "account-1",
    event: "message.read",
    data: { message_id: "msg-42" }
  }, "read-msg-42-agent-7");
  assert.deepEqual(result, { accepted: true, kind: "receipt", eventId: "read-msg-42-agent-7" });
  assert.equal(decideThreadEvent({ channel: "thread-demo", account_id: "account-1", event: "typing.started", data: {} }).kind, "ephemeral");
});
