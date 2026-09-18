import { NextRequest, NextResponse } from "next/server";
import { decodePaymentSignatureHeader, encodePaymentResponseHeader, encodePaymentRequiredHeader } from "@x402/core/http";
import type { PaymentPayload } from "@x402/core/types";
import { getTool } from "@/lib/x402/config";
import { buildRequirements } from "@/lib/x402/requirements.server";
import { getFacilitator } from "@/lib/x402/facilitator.server";
import { runTool } from "@/lib/tools/registry";

export const runtime = "nodejs";

async function handle(req: NextRequest, toolId: string) {
  const tool = getTool(toolId);
  if (!tool) return NextResponse.json({ error: "unknown tool" }, { status: 404 });

  const requirements = await buildRequirements(tool);
  const paymentHeader = req.headers.get("X-PAYMENT");

  if (!paymentHeader) {
    const paymentRequired = { x402Version: 2 as const, resource: { url: req.nextUrl.pathname, description: tool.description }, accepts: [requirements] };
    const res = NextResponse.json(paymentRequired, { status: 402 });
    res.headers.set("PAYMENT-REQUIRED", encodePaymentRequiredHeader(paymentRequired));
    return res;
  }

  let payload: PaymentPayload;
  try { payload = decodePaymentSignatureHeader(paymentHeader); }
  catch { return NextResponse.json({ error: "malformed X-PAYMENT header" }, { status: 400 }); }

  const facilitator = getFacilitator();
  const verify = await facilitator.verify(payload, requirements);
  if (!verify.isValid) return NextResponse.json({ error: "payment_invalid", reason: verify.invalidReason }, { status: 402 });

  const settle = await facilitator.settle(payload, requirements);
  if (!settle.success) return NextResponse.json({ error: "settlement_failed", reason: settle.errorReason }, { status: 402 });

  try {
    const result = await runTool(tool.id, Object.fromEntries(req.nextUrl.searchParams.entries()));
    const res = NextResponse.json({
      tool: tool.id, price: tool.price, result,
      settlement: { transaction: settle.transaction, network: settle.network, payer: settle.payer },
    });
    res.headers.set("X-PAYMENT-RESPONSE", encodePaymentResponseHeader(settle));
    return res;
  } catch (error) {
    return NextResponse.json({
      error: "service_execution_failed",
      message: error instanceof Error ? error.message : "service execution failed",
      settlement: { transaction: settle.transaction, network: settle.network, payer: settle.payer },
    }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  return handle(req, (await params).tool);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  return handle(req, (await params).tool);
}
