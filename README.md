# AgentPay

An AI agent with its own non-custodial wallet, paying per request over
**x402** on **Stellar**, built for the Pollar hackathon.

## The idea

Every existing x402 agent wallet on Stellar holds a raw secret key
(`S...`) in an environment variable. That is the entire threat model
of "AI agent with money": if the process or the box is compromised,
the funds are gone, and the human who owns the money has no way to
see or revoke what the agent is doing.

AgentPay's agent wallet is a real **Pollar** embedded wallet instead.
The human owner logs in once (Google, passkey, email OTP), Pollar
holds a DPoP-bound session, and the agent signs Soroban authorization
entries through that session, never a private key. The owner can
revoke the session from any device at any time
(`client.logoutEverywhere()`), and every payment is a real, on-chain,
inspectable Stellar transaction.

The x402 protocol itself is untouched, standard, spec-conformant
`@x402/stellar` (`ExactStellarScheme`, x402 v2, CAIP-2 network IDs).
The only new thing here is the signer: `lib/x402/pollar-signer.ts`
implements x402's `ClientStellarSigner` interface on top of a Pollar
session instead of a keypair. That's the whole pitch.

## How it works

1. The agent calls a paid endpoint, e.g. `GET /api/tools/quote`.
2. No `X-PAYMENT` header yet, so the server responds `402` with a
   price quote (`PaymentRequirements`): asset, amount, destination,
   timeout.
3. The agent's x402 client builds a payment authorization, signs it
   through the connected wallet (Pollar session or demo testnet
   keypair), and retries with an `X-PAYMENT` header.
4. The server hands the payload to an x402 **facilitator**
   (`lib/x402/facilitator.server.ts`), which verifies the signed
   authorization against Stellar and settles it on-chain. Facilitators
   always sponsor the network fee, so the agent only ever needs USDC,
   never XLM.
5. Only after settlement does the server run the actual tool and
   return the result, plus the transaction hash in
   `X-PAYMENT-RESPONSE`.

Every step above is the real `@x402/core` / `@x402/stellar` wire
protocol, not a custom shortcut.

## Running it

### 1. Install

```bash
npm install
```

### 2. Get testnet funds

You need a Stellar **testnet** account for the facilitator's treasury
(pays network fees only, sponsored fees per spec) and, if you're using
the demo wallet mode, a second one for the agent to spend from.

```bash
# generate a keypair
node -e "console.log(require('@stellar/stellar-sdk').Keypair.random().secret())"
```

Fund it with XLM (for fees) via Friendbot:
https://lab.stellar.org/account/fund

Fund it with testnet USDC via the Circle faucet (select "Stellar",
paste your `G...` address):
https://faucet.circle.com/

### 3. Configure

```bash
cp .env.example .env.local
```

Fill in:
- `TREASURY_SECRET` - the facilitator's own testnet secret key (fees only)
- `RECEIVING_ADDRESS` - where paid-for tool calls send USDC (can be the
  same account's public key, or a separate one)
- `NEXT_PUBLIC_POLLAR_API_KEY` - optional, from dashboard.pollar.xyz.
  Without it the "Pollar wallet" tab is disabled but the app fully
  works with the demo testnet-keypair signer.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000. Connect a wallet (demo keypair works
immediately), set a session budget, and click "Pay & run" on any
tool. Watch the ledger panel for the real Stellar transaction hash.

## Project structure

```
lib/x402/
  config.ts              network + paid tool catalog
  facilitator.server.ts  in-process x402 facilitator (server-only)
  requirements.server.ts builds PaymentRequirements per tool
  pollar-signer.ts        <-- the actual differentiator
  demo-signer.ts          raw-keypair fallback for immediate demoing
  agent-client.ts         client-side: wraps fetch with payment + budget cap
lib/tools/
  registry.ts             the paid tool logic (no external API deps)
app/api/tools/[tool]/
  route.ts                the 402-gated endpoint
components/
  WalletSetup.tsx         demo keypair / Pollar wallet toggle
  AgentConsole.tsx        tool trigger buttons
  LedgerPanel.tsx         live settlement feed with stellar.expert links
  SpendMeter.tsx          cumulative session budget cap
```

## What's real vs. what's a placeholder

**Real and verified** (typechecked and built against the actual
installed `@pollar/core`, `@x402/core`, `@x402/stellar` packages,
zero errors):
- The full 402 quote -> pay -> verify -> settle -> respond cycle
- Correct `PaymentRequirements` construction (confirmed the exact
  wire response including real testnet USDC contract address and
  correctly-converted atomic amount)
- The `PollarStellarSigner` adapter, matching `PollarClient`'s actual
  `signAuthEntry` / `signTx` method signatures

**Needs your Stellar testnet credentials to actually settle a
payment** (verified up to but not past this point; my build sandbox
has no internet access to Stellar's testnet RPC, so this is the first
thing to test on your machine):
- `facilitator.verify()` / `facilitator.settle()` actually talking to
  Soroban RPC
- The demo-keypair signer's `createEd25519Signer` producing a
  signature Soroban RPC accepts

**Not wired up** (time-boxed out, listed in HANDOFF.md):
- Passkey / smart-wallet (C-address) login path
- Mainnet config (testnet only right now)
