import { NextRequest, NextResponse } from "next/server";
import {
  decodePaymentSignatureHeader,
  encodePaymentResponseHeader,
  encodePaymentRequiredHeader,
} from "@x402/core/http";
import type { PaymentPayload } from "@x402/core/types";
import { getTool } from "@/lib/x402/config";
import { buildRequirements } from "@/lib/x402/requirements.server";
import { getFacilitator } from "@/lib/x402/facilitator.server";
import { runTool } from "@/lib/tools/registry";

export const runtime = "nodejs";

async function handle(req: NextRequest, toolId: string) {
  const tool = getTool(toolId);
  if (!tool) {
    return NextResponse.json({ error: "unknown tool" }, { status: 404 });
  }

  const requirements = await buildRequirements(tool);
  const paymentHeader = req.headers.get("X-PAYMENT");

  // No payment attached yet: quote the price. The x402 v2 wire
  // protocol reads this from the PAYMENT-REQUIRED response header
  // (base64), not the JSON body -- the body here is just for anyone
  // poking the endpoint manually in a browser.
  if (!paymentHeader) {
    const paymentRequired = {
      x402Version: 2 as const,
      resource: { url: req.nextUrl.pathname, description: tool.description },
      accepts: [requirements],
    };
    const res = NextResponse.json(paymentRequired, { status: 402 });
    res.headers.set("PAYMENT-REQUIRED", encodePaymentRequiredHeader(paymentRequired));
    return res;
  }

  // Payment attached: decode, verify against the facilitator, settle on-chain.
  let payload: PaymentPayload;
  try {
    payload = decodePaymentSignatureHeader(paymentHeader);
  } catch {
    return NextResponse.json({ error: "malformed X-PAYMENT header" }, { status: 400 });
  }

  const facilitator = getFacilitator();

  const verifyResult = await facilitator.verify(payload, requirements);
  if (!verifyResult.isValid) {
    return NextResponse.json(
      { error: "payment_invalid", reason: verifyResult.invalidReason },
      { status: 402 }
    );
  }

  const settleResult = await facilitator.settle(payload, requirements);
  if (!settleResult.success) {
    return NextResponse.json(
      { error: "settlement_failed", reason: settleResult.errorReason },
      { status: 402 }
    );
  }

  const input = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = runTool(tool.id, input);

  const res = NextResponse.json({
    tool: tool.id,
    price: tool.price,
    result,
    settlement: {
      transaction: settleResult.transaction,
      network: settleResult.network,
      payer: settleResult.payer,
    },
  });
  res.headers.set("X-PAYMENT-RESPONSE", encodePaymentResponseHeader(settleResult));
  return res;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  return handle(req, tool);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  return handle(req, tool);
}
