/**
 * @sharedmemory/sdk — The persistent memory layer for AI agents.
 *
 * Usage:
 *   import { SharedMemory } from '@sharedmemory/sdk'
 *   const memory = new SharedMemory({ apiKey: 'sm_live_...' })
 *   await memory.remember("The user prefers dark mode")
 *   const results = await memory.recall("user preferences")
 */

export interface SharedMemoryConfig {
  apiKey: string;
  baseUrl?: string;
  volumeId?: string;
  agentName?: string;
  timeout?: number;
}

export interface MemoryResult {
  status: string;
  reason: string;
  confidence: number;
  memory_id: string;
}

export interface RecallResult {
  answer: string;
  sources: Array<{ id: string; content: string; score: number }>;
  graph_facts: Array<{ source: string; type: string; target: string }>;
}

export interface Entity {
  name: string;
  type: string;
  summary: string;
  facts: string[];
  relationships: Array<{ entity: string; type: string; description?: string }>;
}

export interface ActivityEvent {
  event_id: string;
  volume_id: string;
  actor_type: string;
  actor_id: string;
  actor_name: string;
  event_type: string;
  title: string;
  detail: Record<string, any>;
  created_at: string;
}

export class SharedMemory {
  private apiKey: string;
  private baseUrl: string;
  private volumeId: string;
  private agentName: string;
  private timeout: number;

  constructor(config: SharedMemoryConfig) {
    if (!config.apiKey) throw new Error("apiKey is required");
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || "https://api.sharedmemory.ai").replace(/\/$/, "");
    this.volumeId = config.volumeId || "default";
    this.agentName = config.agentName || "sdk-agent";
    this.timeout = config.timeout || 30000;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }

      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Store a memory in the shared knowledge base. */
  async remember(content: string, opts?: {
    memoryType?: string;
    source?: string;
    volumeId?: string;
  }): Promise<MemoryResult> {
    return this.request("POST", "/agent/memory/write", {
      content,
      volume_id: opts?.volumeId || this.volumeId,
      agent: this.agentName,
      memory_type: opts?.memoryType || "factual",
      source: opts?.source || "sdk",
    });
  }

  /** Recall memories relevant to a query. Returns an AI-synthesized answer + sources. */
  async recall(query: string, opts?: {
    volumeId?: string;
    autoLearn?: boolean;
  }): Promise<RecallResult> {
    return this.request("POST", "/agent/memory/query", {
      query,
      volume_id: opts?.volumeId || this.volumeId,
      auto_learn: opts?.autoLearn || false,
    });
  }

  /** Get a specific entity from the knowledge graph. */
  async getEntity(name: string, opts?: { volumeId?: string }): Promise<Entity> {
    return this.request("POST", "/agent/entity", {
      name,
      volume_id: opts?.volumeId || this.volumeId,
    });
  }

  /** Search entities by name pattern. */
  async searchEntities(query: string, opts?: {
    volumeId?: string;
    limit?: number;
  }): Promise<Entity[]> {
    return this.request("POST", "/agent/entities/search", {
      query,
      volume_id: opts?.volumeId || this.volumeId,
      limit: opts?.limit || 10,
    });
  }

  /** Get the knowledge graph for a volume. */
  async getGraph(opts?: { volumeId?: string }): Promise<{
    entities: any[];
    relationships: any[];
  }> {
    return this.request("POST", "/agent/graph", {
      volume_id: opts?.volumeId || this.volumeId,
    });
  }

  /** List volumes this agent has access to. */
  async listVolumes(): Promise<any[]> {
    return this.request("GET", "/agent/volumes");
  }

  /** Subscribe to real-time updates on a volume. */
  subscribe(opts: {
    volumeId?: string;
    onMemory?: (event: any) => void;
    onActivity?: (event: ActivityEvent) => void;
    onPresence?: (event: any) => void;
  }): { close: () => void } {
    const vol = opts.volumeId || this.volumeId;
    const wsUrl = this.baseUrl.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}?volume=${vol}&user=${this.agentName}&type=agent`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "graph_update" && opts.onMemory) opts.onMemory(data);
        if (data.type === "activity" && opts.onActivity) opts.onActivity(data);
        if (data.type === "agent_presence_update" && opts.onPresence) opts.onPresence(data);
      } catch { /* ignore malformed messages */ }
    };

    return {
      close: () => ws.close(),
    };
  }
}

export default SharedMemory;
