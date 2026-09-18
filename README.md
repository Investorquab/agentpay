# AgentPay

**Give an AI agent spending power without giving it your private key.**

AgentPay is a Pollar + Stellar application that lets an agent buy useful services over **x402** using USDC. The human controls the wallet and spending policy; the agent handles the payment flow.

## What the demo proves

1. A Pollar embedded Stellar wallet authenticates the owner.
2. The agent requests a paid service.
3. The service returns a standard HTTP **402 Payment Required** response.
4. `@x402/stellar` builds the payment and the Pollar signer authorizes it.
5. A Stellar facilitator verifies and settles the payment.
6. Only after settlement does the service execute.
7. The UI shows the settlement transaction and the amount spent.

## Paid services

| Service | Price | Purpose |
|---|---:|---|
| Live Crypto Price | $0.01 | Current CoinGecko market data |
| Live Weather | $0.01 | Current Open-Meteo conditions |
| URL Fetch | $0.01 | Retrieve a public webpage for inspection |
| Text Analysis | $0.02 | Words, characters, sentences and reading time |

The external providers are intentionally simple. They are **not** the payment system: x402 payment happens first, then the provider is called.

## Architecture

```
Human
  │
  ▼
Pollar embedded wallet
  │
  │ Pollar signer
  ▼
Agent client ──────► Paid service
  │                       │
  │ HTTP 402              │
  ▼                       │
x402 Stellar payment ─────┘
  │
  ▼
Facilitator
  │
  ▼
Stellar USDC settlement
  │
  ▼
Service result + transaction hash
```

The key integration is `lib/x402/pollar-signer.ts`: it adapts Pollar's wallet signing methods to x402's `ClientStellarSigner` interface, so the agent does not need a raw Stellar secret key.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Create two Stellar testnet accounts:

- **Treasury:** put its secret in `TREASURY_SECRET`; fund it with testnet XLM for facilitator fees.
- **Agent:** fund it with testnet USDC; use its secret in the Demo keypair tab.

Set `RECEIVING_ADDRESS` to the account that should receive settled USDC.

For the real Pollar path, create a Pollar application and set `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`, then authenticate through the Pollar wallet option.

## First test

Use **Text Analysis** or **Live Weather** first. A successful run should show:

```
402 quote
  → wallet signs
  → facilitator verifies
  → Stellar settlement
  → paid service executes
  → transaction hash appears in ledger
```

If payment fails, check the browser console and server terminal. Do not claim a payment is real until the returned transaction hash can be inspected on the Stellar testnet explorer.

## Security model

- Agent code does not require the owner's raw private key when using Pollar.
- Session spending is capped at the application layer.
- A per-payment limit is enforced before the network request.
- The facilitator treasury is server-side only.
- The demo uses Stellar testnet by default.

## Submission focus

**Problem:** AI agents increasingly need to purchase APIs and digital services, but giving an autonomous process a wallet key gives it unrestricted custody.

**Solution:** AgentPay separates *authorization* from *execution*: Pollar owns the wallet session, the agent operates within explicit spending limits, and x402 handles machine-to-machine payment over Stellar.

**Proof:** The settlement ledger records the actual x402 response and Stellar transaction returned by the facilitator.

## Status

The resource-server 402 path and x402 client integration are implemented. Live Stellar settlement and the Pollar-authenticated payment path must be verified with real testnet credentials before submission.
