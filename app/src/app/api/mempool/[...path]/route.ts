import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Handle special case: localhost:3000/api/mempool/testnet4/apiaddress/<addr>/utxo (missing slash in "api/address")
  if (
    request.url.startsWith(
      "http://localhost:3000/api/mempool/testnet4/apiaddress/"
    ) &&
    request.url.endsWith("/utxo")
  ) {
    // Extract the Bitcoin address
    // Pattern: .../apiaddress/<address>/utxo
    const matches = request.url.match(/apiaddress\/([^/]+)\/utxo/);
    if (matches && matches[1]) {
      const address = matches[1];
      const fixedUrl = `http://localhost:3000/api/mempool/testnet4/api/address/${address}/utxo`;
      // Proxy the corrected request
      const resp = await fetch(fixedUrl, { cache: "no-store" });
      const contentType =
        resp.headers.get("Content-Type") || "application/json";
      const body = await resp.arrayBuffer();
      return new NextResponse(body, {
        status: resp.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
  }

  // Hardcoded special case for "apiv1/fees/recommended"
  if (
    request.url ===
    "http://localhost:3000/api/mempool/testnet4/apiv1/fees/recommended"
  ) {
    const specialUrl =
      "http://localhost:3000/api/mempool/testnet4/api/v1/fees/recommended";
    const resp = await fetch(specialUrl, { cache: "no-store" });
    const contentType = resp.headers.get("Content-Type") || "application/json";
    const body = await resp.arrayBuffer();
    return new NextResponse(body, {
      status: resp.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Hardcoded special case for "apiv1/cpfp/<txid>"
  // Match: http://localhost:3000/api/mempool/testnet4/apiv1/cpfp/<txid>
  const cpfpMatch = request.url.match(
    /^http:\/\/localhost:3000\/api\/mempool\/testnet4\/apiv1\/cpfp\/([a-f0-9]{64})(\?.*)?$/
  );
  if (cpfpMatch) {
    const txid = cpfpMatch[1];
    const query = cpfpMatch[2] || "";
    const fixedUrl = `http://localhost:3000/api/mempool/testnet4/api/v1/cpfp/${txid}${query}`;
    const resp = await fetch(fixedUrl, { cache: "no-store" });
    const contentType = resp.headers.get("Content-Type") || "application/json";
    const body = await resp.arrayBuffer();
    return new NextResponse(body, {
      status: resp.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `https://mempool.space/${path}${
      searchParams ? `?${searchParams}` : ""
    }`;

    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return new NextResponse(text, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const contentType =
      upstream.headers.get("Content-Type") || "application/json";
    const bodyBuffer = await upstream.arrayBuffer();
    return new NextResponse(bodyBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error proxying mempool request:", error);
    return NextResponse.json(
      { error: "Failed to fetch from mempool" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
