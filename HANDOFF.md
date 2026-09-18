# Handoff: AgentPay (Pollar hackathon)

Read this whole file before touching code. It tells you what is real,
what is untested, and what to do next, in priority order.

## What this project is

An AI agent with a non-custodial Stellar wallet, paying per request
over the x402 protocol. The pitch: every other x402 agent wallet on
Stellar holds a raw secret key. This one's agent wallet is a real
Pollar embedded-wallet session instead, so the human owner can see and
revoke what the agent does, and the agent process never touches a
private key. See README.md for the full explanation and architecture
diagram of the request flow.

Built for a 5-day hackathon, submissions must run on Stellar. Track
requires: a working end-to-end payment flow, SDK integration quality,
proof of real usage, project clarity.

## Everything here is real code against real SDKs, not a mockup

I (Claude) built this by installing the actual `@pollar/core`,
`@pollar/react`, `@x402/core`, `@x402/stellar`, `@x402/fetch`, and
`@stellar/stellar-sdk` packages and reading their compiled `.d.ts`
type definitions directly, not from documentation (which was
incomplete/uncrawlable for Pollar's MCP Gateway page). Every function
signature, field name, and return shape in this codebase was checked
against the installed package before being used.

`npm run build` and `npm run lint` both pass with zero errors as of
this handoff. I also started a production server and hit
`/api/tools/joke` with no `X-PAYMENT` header, and got back a fully
correct, spec-shaped 402 response including a real testnet USDC
contract address and a correctly atomic-unit-converted price. That
confirms the resource-server half of the flow works.

## What is NOT yet verified

My build sandbox has no internet access to Stellar's testnet
infrastructure (Horizon, Soroban RPC, Friendbot, Circle's faucet), so
I could not test:

1. **The actual payment settlement.** `facilitator.verify()` and
   `facilitator.settle()` in `lib/x402/facilitator.server.ts` have
   never made a real network call. This is the single most important
   thing to test first on your machine.
2. **The demo signer producing a valid signature.**
   `lib/x402/demo-signer.ts` wraps `@x402/stellar`'s
   `createEd25519Signer` — this should just work since it's the
   library's own documented helper, but it's untested against a live
   network.
3. **The Pollar wallet login flow end to end.** `signAuthEntry` /
   `signTx` method names and shapes are confirmed correct against
   Pollar's types, but no real Pollar API key has been used yet (the
   user has not created a dashboard.pollar.xyz app as of this
   handoff).

## Confirmed working end to end (as of this handoff)

I reproduced the full client-side x402 payment flow in a Node script
(not just curl against the server) using the real
`@x402/core`/`@x402/fetch`/`@x402/stellar` client stack, exactly the
code path the browser runs:

1. Server returns 402 with a correctly-encoded `PAYMENT-REQUIRED`
   header. Confirmed.
2. Client (`wrapFetchWithPayment`) successfully parses that header
   and proceeds to build a payment. Confirmed — this was the bug
   fixed in this handoff (see "Known issue, fixed" below).
3. Client attempts to reach Soroban RPC to build/sign the payment
   authorization. This is where my sandbox's outbound network block
   stops the test (403 from my own egress proxy, not from Stellar).
   **This is the first thing to verify on a machine with real
   internet access.**

### Known issue, fixed in this handoff

The 402 route originally returned the payment terms only in the JSON
response body. The x402 v2 wire protocol actually expects them in a
`PAYMENT-REQUIRED` response header (base64-encoded), and only falls
back to a JSON body for v1 clients. `@x402/fetch`'s
`wrapFetchWithPayment` therefore failed with "Failed to parse payment
requirements: Invalid payment required response" on every call.
Fixed in `app/api/tools/[tool]/route.ts` by adding:

```ts
res.headers.set("PAYMENT-REQUIRED", encodePaymentRequiredHeader(paymentRequired));
```

Verified fixed both via curl (header present, `getPaymentRequiredResponse`
would decode it) and via a full Node reproduction of the browser's
client-side payment flow (parsing succeeds; the flow proceeds past
this step entirely).



1. `cd agentpay && npm install`
2. Generate a testnet keypair, fund with Friendbot (XLM) and Circle's
   faucet (USDC) — see README.md step 2. Do this for TWO accounts: one
   for `TREASURY_SECRET` (facilitator, only needs a little XLM for
   fees), one for the agent to pay from (needs USDC, used as the "demo
   keypair" in the UI).
3. `cp .env.example .env.local`, fill in `TREASURY_SECRET` and
   `RECEIVING_ADDRESS` (can reuse the treasury account's public key).
4. `npm run dev`, open localhost:3000, paste the agent's testnet
   secret into "Demo keypair" mode, click "Pay & run" on the Joke
   tool (cheapest, $0.005).
5. **If it works**: you'll see a real transaction hash in the ledger
   panel linking to stellar.expert/explorer/testnet. Take a screen
   recording immediately, this is your demo video's centerpiece.
6. **If it fails**: read the error in the browser console and the
   `npm run dev` terminal output first. Common likely failures, in
   order of likelihood:
   - RPC URL wrong or rate-limited (`https://soroban-testnet.stellar.org`
     is hardcoded as a default in `pollar-signer.ts` and used
     implicitly by `@x402/stellar`'s facilitator/client scheme
     classes; check for a `getRpcClient`/`RpcConfig` override if the
     default is flaky)
   - Trustline missing on the agent's account for testnet USDC (the
     Circle faucet flow is supposed to handle this, but verify with
     `stellar.expert/explorer/testnet/account/<G...>`)
   - Auth entry expiration too tight or too loose — see the
     `validUntilLedger` computation in `pollar-signer.ts`; this only
     applies to the Pollar wallet path, not the demo keypair path, so
     rule out demo-keypair issues first
7. Once a payment settles successfully with the demo keypair, get a
   real Pollar API key from dashboard.pollar.xyz, set
   `NEXT_PUBLIC_POLLAR_API_KEY` in `.env.local`, and test the "Pollar
   wallet" tab (Google login -> real embedded wallet -> pay). This is
   the actual differentiator for judging, so it needs to work for the
   final submission, not just the demo-keypair fallback.

## Stretch goals if time remains after the above works

- Wrap the agent side as an MCP server so Claude Desktop or another
  MCP client can be the paying agent directly, instead of the browser
  UI driving it. This is the strongest possible demo but is pure
  upside, not required for a working submission.
- Passkey / smart-wallet (C-address) login via `@pollar/accesly-adapter`
  as a second non-custodial path, pitched alongside the OAuth login.
- Swap `NEXT_PUBLIC_X402_NETWORK` to `stellar:pubnet` and a mainnet
  `RECEIVING_ADDRESS` for a real-money demo, if you're confident in
  the testnet flow and comfortable with mainnet fees (small, since
  facilitators sponsor them, but real).

## Do not re-litigate these decisions

Already decided, with reasoning, earlier in this build. Don't redo
this research, just build on it:

- **Corridor / cross-border remittance track: explicitly rejected.**
  It's crowded (multiple competing submissions already deep into it,
  one with a full Soroban escrow contract and CI). This project
  deliberately took the x402/agent-payments angle instead, which no
  competitor appeared to be building.
- **Pollar's SDK has no built-in x402 support.** Confirmed by reading
  the full `@pollar/core` v0.11.3 changelog and package contents.
  That's not a blocker, it's the whole opportunity: this project
  builds the missing layer on top of Pollar's existing wallet
  primitives (`signAuthEntry`, `signTx`), rather than waiting for
  Pollar to ship it.
- **In-process facilitator, not a hosted one.** Simpler for a
  hackathon deployment; a hosted facilitator (OpenZeppelin Relayer
  plugin, or Accensa's conformance spike) is a valid later upgrade but
  adds a second service to deploy and was not worth the complexity
  here.
- **No external API calls in tool logic.** Deliberately
  dependency-free (`lib/tools/registry.ts`) so a flaky third-party API
  can never break the demo mid-pitch.
