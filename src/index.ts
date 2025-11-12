import { IncidentStore } from "./incident-store";

// Cloudflare Worker environment bindings interface
export interface Env {
  AI: any; // Workers AI binding (undefined for local dev)
  INCIDENT_STORE: DurableObjectNamespace; // Durable Object binding
}

// Export Durable Object so Wrangler sees it
export { IncidentStore };

// Worker entrypoint
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }


    const url = new URL(request.url);

        if (url.pathname === "/" && request.method === "GET") {
  // Serve the HTML from public/index.html as a static asset
  const file = await env.__STATIC_CONTENT.get("index.html");
  const contentType = "text/html";
  return new Response(file, {
    headers: { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" },
  });
}
    // Health check endpoint
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify({ ok: true, msg: "AI Security Incident Decoder API" }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Analyze endpoint
    if (url.pathname === "/analyze" && request.method === "POST") {
      // 1. Parse JSON body safely
      let textInput = "";
      let sessionId = "";
      try {
        const raw = await request.text();
        const data = JSON.parse(raw || "{}");
        textInput = typeof data.text === "string" ? data.text : "";
        sessionId = typeof data.sessionId === "string" ? data.sessionId : "";
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      if (!textInput || !sessionId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: text, sessionId" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      try {
        // 2. Get Durable Object stub for this session
        const id = env.INCIDENT_STORE.idFromName(sessionId);
        const stub = env.INCIDENT_STORE.get(id);

        // 3. Fetch incident history to provide prompt context
        const historyResp = await stub.fetch(`http://internal/history?sessionId=${encodeURIComponent(sessionId)}`);
        const { history } = (await historyResp.json()) as { history: any[] };

        // 4. Call Workers AI (if available) or use fallback response for local testing
        let analysis: string;
        if (env.AI && typeof env.AI.run === "function") {
          const aiResp = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
              {
                role: "system",
                content: "You are a security incident analyst. Analyze the alert/log, identify the problem, assess impact, and provide clear remediation steps. Be concise and structured.",
              },
              {
                role: "user",
                content: `Analyze this incident:\n\n${textInput}\n\nProvide:\n1. Diagnosis\n2. Impact\n3. Actions (step-by-step with concrete commands if relevant)\n` +
                        (history?.length ? `Context: You have ${history.length} prior incident(s) this session; avoid repetition.` : ""),
              },
            ],
          });

          analysis = typeof aiResp?.response === "string" ? aiResp.response : JSON.stringify(aiResp);
        } else {
          // Fallback if AI is missing (local dev)
          analysis = [
            "Diagnosis: Example only (local mode)—pod is restarting due to OOMKill (exit code 137 suggests out-of-memory).",
            "Impact: Service instances are unstable; user requests may fail intermittently.",
            "Actions:",
            "1. Check pod memory limit; increase if too low.",
            "2. Inspect pod logs: kubectl logs <pod> -n <ns> --previous",
            "3. Review HPA and resource requests; optimize app if possible."
          ].join("\n");
        }

        // 5. Save incident to DO memory
        await stub.fetch("http://internal/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            incident: {
              text: textInput,
              analysis,
              timestamp: new Date().toISOString(),
            },
          }),
        });

        // 6. Return analysis result to user
        return new Response(JSON.stringify({ analysis, historyCount: history?.length || 0 }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (err: any) {
        // 7. Fail gracefully with error message
        return new Response(
          JSON.stringify({ error: err?.message || "Unknown error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }
    }

    // 404 fallback for all other routes
    return new Response("Not found", { status: 404 });
  },
};

