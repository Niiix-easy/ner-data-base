import { createHash, createHmac } from "node:crypto";

const PORT = parseInt(Deno.env.get("PORT") || "8787");

function extractAuthToken(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/neer-data-base_admin_auth=([^;]+)/);
  return match ? match[1] : null;
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Very simplistic security check matching the rest of the application
  const token = extractAuthToken(req);

  const secret = Deno.env.get("STUDIO_SESSION_SECRET");
  if (!secret) {
     return new Response(JSON.stringify({ error: "Server Configuration Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expectedToken = createHmac("sha256", secret)
    .update("authenticated")
    .digest("hex");

  if (token !== expectedToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/execute") {
     // A mock execution endpoint where user's custom function could theoretically execute
     return new Response(JSON.stringify({ message: "Edge function executed successfully", timestamp: new Date().toISOString() }), {
       status: 200,
       headers: { "Content-Type": "application/json" },
     });
  }

  return new Response("Not Found", { status: 404 });
};

console.log(`Functions runtime listening on http://0.0.0.0:${PORT}`);
Deno.serve({ port: PORT }, handler);
