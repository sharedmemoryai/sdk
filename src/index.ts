/**
 * @sharedmemory/sdk — The persistent memory layer for AI agents.
 *
 * Usage:
 *   import { SharedMemory } from '@sharedmemory/sdk'
 *   const memory = new SharedMemory({ apiKey: 'sm_live_...' })
 *   await memory.add("The user prefers dark mode")
 *   const results = await memory.search("user preferences")
 */

export interface SharedMemoryConfig {
  apiKey: string;
  baseUrl?: string;
  volumeId?: string;
  agentName?: string;
  timeout?: number;
  userId?: string;
  agentId?: string;
  appId?: string;
  sessionId?: string;
}

export interface MemoryResult {
  status: string;
  reason: string;
  confidence: number;
  memory_id: string;
  memory_class?: string;
}

export interface RecallResult {
  answer: string;
  sources: Array<{ id: string; content: string; score: number }>;
  graph_facts: Array<{ source: string; type: string; target: string }>;
  reranked?: boolean;
  context?: ContextBlock;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  memory_type?: string;
  memory_class?: string;
  agent?: string;
  created_at?: string;
  document_id?: string;
  filename?: string;
}

export interface Entity {
  name: string;
  type: string;
  summary: string;
  facts: string[];
  relationships: Array<{ entity: string; type: string; description?: string }>;
}

export interface ContextBlock {
  blocks: string[];
  token_estimate: number;
  template_used?: string;
}

export interface MemoryFeedback {
  feedback: "POSITIVE" | "NEGATIVE" | "VERY_NEGATIVE";
  feedback_reason?: string;
}

export interface MemoryHistory {
  id: number;
  memory_id: string;
  event: string;
  old_content?: string;
  new_content?: string;
  actor?: string;
  detail?: Record<string, any>;
  created_at: string;
}

export interface EntityScope {
  userId?: string;
  agentId?: string;
  appId?: string;
  sessionId?: string;
}

export interface MetadataFilter {
  AND?: MetadataFilter[];
  OR?: MetadataFilter[];
  NOT?: MetadataFilter;
  field?: string;
  op?: string;
  value?: any;
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
  private userId?: string;
  private agentId?: string;
  private appId?: string;
  private sessionId?: string;

  constructor(config: SharedMemoryConfig) {
    if (!config.apiKey) throw new Error("apiKey is required");
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || "https://api.sharedmemory.ai").replace(/\/$/, "");
    this.volumeId = config.volumeId || "default";
    this.agentName = config.agentName || "sdk-agent";
    this.timeout = config.timeout || 30000;
    this.userId = config.userId;
    this.agentId = config.agentId;
    this.appId = config.appId;
    this.sessionId = config.sessionId;
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

  private entityScope(override?: EntityScope): Record<string, string | undefined> {
    return {
      user_id: override?.userId || this.userId,
      agent_id: override?.agentId || this.agentId,
      app_id: override?.appId || this.appId,
      session_id: override?.sessionId || this.sessionId,
    };
  }

  // ─── Core Memory Operations (Mem0-compatible) ───

  /** Add a memory. Alias: remember() */
  async add(content: string, opts?: {
    memoryType?: string;
    source?: string;
    volumeId?: string;
    metadata?: Record<string, any>;
  } & EntityScope): Promise<MemoryResult> {
    return this.request("POST", "/agent/memory/write", {
      content,
      volume_id: opts?.volumeId || this.volumeId,
      agent: this.agentName,
      memory_type: opts?.memoryType || "factual",
      source: opts?.source || "sdk",
      metadata: opts?.metadata,
      ...this.entityScope(opts),
    });
  }

  /** Alias for add() */
  async remember(content: string, opts?: Parameters<SharedMemory["add"]>[1]): Promise<MemoryResult> {
    return this.add(content, opts);
  }

  /** Search memories by semantic similarity. */
  async search(query: string, opts?: {
    volumeId?: string;
    limit?: number;
    filters?: MetadataFilter;
    rerank?: boolean;
    rerankMethod?: "llm" | "heuristic";
    includeContext?: boolean;
    templateId?: string;
  } & EntityScope): Promise<RecallResult> {
    return this.request("POST", "/agent/memory/query", {
      query,
      volume_id: opts?.volumeId || this.volumeId,
      limit: opts?.limit || 10,
      filters: opts?.filters,
      rerank: opts?.rerank,
      rerank_method: opts?.rerankMethod,
      include_context: opts?.includeContext,
      template_id: opts?.templateId,
      ...this.entityScope(opts),
    });
  }

  /** Alias for search() */
  async recall(query: string, opts?: Parameters<SharedMemory["search"]>[1]): Promise<RecallResult> {
    return this.search(query, opts);
  }

  /** Get a single memory by ID. */
  async get(memoryId: string, opts?: { volumeId?: string }): Promise<any> {
    const vol = opts?.volumeId || this.volumeId;
    return this.request("GET", `/agent/memory/${memoryId}?volume_id=${encodeURIComponent(vol)}`);
  }

  /** Update a memory's content. */
  async update(memoryId: string, content: string, opts?: {
    volumeId?: string;
    metadata?: Record<string, any>;
  }): Promise<{ status: string; memory_id: string }> {
    return this.request("PATCH", `/agent/memory/${memoryId}`, {
      volume_id: opts?.volumeId || this.volumeId,
      content,
      metadata: opts?.metadata,
    });
  }

  /** Delete (soft-invalidate) a memory. */
  async delete(memoryId: string, opts?: { volumeId?: string }): Promise<{ status: string; memory_id: string }> {
    return this.request("DELETE", `/agent/memory/${memoryId}`, {
      volume_id: opts?.volumeId || this.volumeId,
    });
  }

  /** Write multiple memories in a single request. */
  async addMany(memories: Array<{
    content: string;
    volumeId?: string;
    memoryType?: string;
    metadata?: Record<string, any>;
  } & EntityScope>): Promise<{ total: number; results: MemoryResult[] }> {
    return this.request("POST", "/agent/memory/batch", {
      memories: memories.map((m) => ({
        content: m.content,
        volume_id: m.volumeId || this.volumeId,
        memory_type: m.memoryType || "factual",
        metadata: m.metadata,
        ...this.entityScope(m),
      })),
    });
  }

  // ─── Feedback & History ───

  /** Submit feedback on a memory (positive, negative, or very_negative). */
  async feedback(memoryId: string, feedback: MemoryFeedback, opts?: {
    volumeId?: string;
  }): Promise<any> {
    return this.request("POST", "/memory/feedback", {
      memory_id: memoryId,
      volume_id: opts?.volumeId || this.volumeId,
      ...feedback,
      ...this.entityScope(),
    });
  }

  /** Get the history of changes for a memory. */
  async history(memoryId: string): Promise<{ memory: any; history: MemoryHistory[]; feedback: any[] }> {
    return this.request("GET", `/memory/feedback/history/${memoryId}`);
  }

  // ─── Knowledge Graph ───

  /** Get a specific entity from the knowledge graph. */
  async getEntity(name: string, opts?: { volumeId?: string }): Promise<Entity> {
    return this.request("POST", "/agent/entity", {
      entity_name: name,
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

  // ─── Volumes ───

  /** List volumes this agent has access to. */
  async listVolumes(): Promise<any[]> {
    return this.request("GET", "/agent/volumes");
  }

  // ─── Context Assembly ───

  /** Assemble a context block for LLM prompting (Zep-style). */
  async assembleContext(opts?: {
    volumeId?: string;
    templateId?: string;
  } & EntityScope): Promise<ContextBlock> {
    return this.request("POST", "/memory/context/assemble", {
      volume_id: opts?.volumeId || this.volumeId,
      template_id: opts?.templateId,
      ...this.entityScope(opts),
    });
  }

  // ─── Real-time ───

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
