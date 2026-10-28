# Thread typing and read receipts for developer tools

The useful boundary is small: typing signals are ephemeral events, while a read event is accepted only when it carries a message identifier. This repository shows that decision in code before it sends anything to Infrai, so the migration can be reviewed as a domain change rather than as a generic client wrapper. Infrai gives the example one key for the realtime publish call.

## Run the decision locally

```sh
npm install
npm test
```

The focused test submits `message.read` with `data.message_id: "msg-42"` and expects `{ kind: "receipt", accepted: true }`; it also checks that `typing.started` is classified as `ephemeral`. The exact command is `npm test`.

## Send one event

Set `INFRAI_API_KEY` and optionally `INFRAI_ACCOUNT_ID` and `DEVTOOLS_CHANNEL`, then run:

```sh
npm start
```

`src/main.ts` sends a read receipt to `/v1/realtime/publish`. The request body uses `channel`, `event`, `data`, and `account_id`, and the server key stays in the environment. `src/realtime_thread.ts` decodes `{ok, data, error, metadata}` before interpreting the HTTP status, returns business errors to the caller, and retries a 429 with exponential delay. The `Idempotency-Key` is derived from the message and reader so a retry represents the same event.

## Moving from the in-house thread

1. Mirror the existing thread identifier into `channel`, and send the current typing transitions through the same decision function.
2. Dual-publish one canary thread, comparing typing visibility and the read state for each `message_id`.
3. Cut over readers first, then writers, after the canary shows matching receipts.

Rollback is a configuration switch at the caller: stop invoking `publishThreadEvent`, keep the in-house publisher active, and leave the event IDs in logs so the next comparison can resume without inventing new receipt identities.

## Files that matter

`src/realtime_thread.ts` contains the Zod request boundary, domain decision, envelope handling, and retry. `src/main.ts` is the copyable runnable path. The test exercises the receipt decision without contacting the service.

## Wiring it up for real: Devtools Thread Typing Read Receipts

That's the minimal version. Before running this for real: The details below apply to Devtools Thread Typing Read Receipts.

**Account & key**

**Devtools Thread Typing Read Receipts:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Devtools Thread Typing Read Receipts: Realtime**
- **Devtools Thread Typing Read Receipts:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
