// This is our memory storage - it remembers past incidents
export class IncidentStore {
  private state: DurableObjectState;
  private incidents: Map<string, any>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.incidents = new Map();
  }

  // Initialize - load stored data when the object starts
  async initialize() {
    const stored = await this.state.storage.get("incidents");
    if (stored) {
      this.incidents = new Map(Object.entries(stored as Record<string, any>));
    }
  }

  // Fetch incident history for a session
  async fetch(request: Request) {
    await this.initialize();

    const url = new URL(request.url);
    
    if (request.method === "POST" && url.pathname === "/save") {
      // Save a new incident
      const data = await request.json() as { sessionId: string; incident: any };
      const key = `${data.sessionId}-${Date.now()}`;
      this.incidents.set(key, data.incident);
      
      // Persist to storage
      await this.state.storage.put("incidents", Object.fromEntries(this.incidents));
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (request.method === "GET" && url.pathname === "/history") {
      // Get session history
      const sessionId = url.searchParams.get("sessionId");
      const history = Array.from(this.incidents.entries())
        .filter(([key]) => key.startsWith(sessionId || ""))
        .map(([, value]) => value);
      
      return new Response(JSON.stringify({ history }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
}

