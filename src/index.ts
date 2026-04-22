/**
 * @sharedmemory/sdk — Persistent memory infrastructure for AI agents.
 *
 * Usage:
 *   import { SharedMemory } from '@sharedmemory/sdk'
 *   const memory = new SharedMemory({ apiKey: 'sm_proj_rw_...' })
 *   await memory.add("The user prefers dark mode")
 *   const results = await memory.search("user preferences")
 *
 * Agent profiles:
 *   const agents = await memory.agents.list({ orgId: '...' })
 *   const agent = await memory.agents.create({ orgId, projectId, name, systemPrompt })
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
  query: string;
  volume_id: string;
  memories: Array<{ memory_id: string; content: string; score: number; memory_type?: string; memory_class?: string; agent?: string; created_at?: string }>;
  graph_facts: Array<{ source: string; type: string; target: string; description?: string }>;
  document_sources?: Array<{ document_id: string; filename: string; content: string; score: number }>;
  total_results: number;
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
  facts: Array<{ content: string; category?: string; importance?: number }>;
  summaries?: Array<{ content: string; version?: number }>;
  relationships: Array<{ name: string; type?: string; rel_type: string; direction?: string }>;
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

export interface Agent {
  agent_id: string;
  name: string;
  description: string | null;
  system_prompt: string | null;
  project_id: string;
  project_name?: string;
  is_active: boolean;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentCreateResult extends Agent {
  api_key: string;
  api_key_prefix: string;
}

export interface Organization {
  org_id: string;
  name: string;
  slug: string;
  plan: string;
  usage_limit_memories: number;
  usage_limit_queries: number;
  usage_limit_projects: number;
  usage_limit_seats: number;
  created_at: string;
}

export interface OrgMember {
  id: number;
  user_id: number;
  email: string;
  name: string;
  role: string;
  joined_at: string;
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
    if (!config.volumeId) throw new Error("volumeId is required. Get yours from the SharedMemory dashboard.");
    this.volumeId = config.volumeId;
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

  /** Batch delete up to 100 memories in a single request. */
  async deleteMany(memoryIds: string[], opts?: { volumeId?: string }): Promise<{ status: string; deleted: number; total: number }> {
    return this.request("POST", "/agent/memory/delete/batch", {
      volume_id: opts?.volumeId || this.volumeId,
      memory_ids: memoryIds,
    });
  }

  /** Batch update up to 100 memories in a single request. */
  async updateMany(updates: Array<{
    memoryId: string;
    content: string;
    metadata?: Record<string, any>;
  }>, opts?: { volumeId?: string }): Promise<{ total: number; results: Array<{ memory_id: string; status: string }> }> {
    return this.request("POST", "/agent/memory/update/batch", {
      volume_id: opts?.volumeId || this.volumeId,
      updates: updates.map(u => ({
        memory_id: u.memoryId,
        content: u.content,
        ...(u.metadata ? { metadata: u.metadata } : {}),
      })),
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
    return this.request("POST", "/agent/memory/feedback", {
      memory_id: memoryId,
      volume_id: opts?.volumeId || this.volumeId,
      ...feedback,
      ...this.entityScope(),
    });
  }

  /** Get the history of changes for a memory. */
  async history(memoryId: string): Promise<{ memory: any; history: MemoryHistory[]; feedback: any[] }> {
    return this.request("GET", `/agent/memory/feedback/history/${memoryId}`);
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
    return this.request("POST", "/agent/memory/context/assemble", {
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

  // ─── Webhooks ───

  /** Register a persistent HTTP webhook for volume events. */
  async webhookSubscribe(opts: {
    volumeId?: string;
    url: string;
    events?: string[];
    secret?: string;
  }): Promise<{ webhook_id: string; status: string; events: string[] }> {
    return this.request("POST", "/agent/memory/subscribe", {
      volume_id: opts.volumeId || this.volumeId,
      url: opts.url,
      events: opts.events || ["memory.approved", "memory.flagged"],
      secret: opts.secret,
    });
  }

  /** Remove a persistent HTTP webhook subscription. */
  async webhookUnsubscribe(opts: {
    volumeId?: string;
    url: string;
  }): Promise<{ status: string }> {
    return this.request("DELETE", "/agent/memory/unsubscribe", {
      volume_id: opts.volumeId || this.volumeId,
      url: opts.url,
    });
  }

  // ─── Sessions ───

  /** Start a new session for scoped memory tracking. */
  async startSession(sessionId: string, opts?: {
    volumeId?: string;
  } & EntityScope): Promise<any> {
    return this.request("POST", "/agent/memory/sessions/start", {
      session_id: sessionId,
      volume_id: opts?.volumeId || this.volumeId,
      ...this.entityScope(opts),
    });
  }

  /** End a session. If autoSummarize=true, compresses session memories into long-term storage. */
  async endSession(sessionId: string, opts?: {
    volumeId?: string;
    autoSummarize?: boolean;
  }): Promise<any> {
    return this.request("POST", "/agent/memory/sessions/end", {
      session_id: sessionId,
      volume_id: opts?.volumeId || this.volumeId,
      auto_summarize: opts?.autoSummarize ?? true,
    });
  }

  /** Get session details by ID. */
  async getSession(sessionId: string): Promise<any> {
    return this.request("GET", `/agent/memory/sessions/${sessionId}`);
  }

  /** List sessions for a volume. */
  async listSessions(opts?: {
    volumeId?: string;
    status?: string;
    limit?: number;
  }): Promise<any[]> {
    const vol = opts?.volumeId || this.volumeId;
    const params = new URLSearchParams({ volume_id: vol });
    if (opts?.status) params.set("status", opts.status);
    if (opts?.limit) params.set("limit", String(opts.limit));
    return this.request("GET", `/agent/memory/sessions?${params.toString()}`);
  }

  // ─── Export / Import ───

  /** Export all memories for a volume. */
  async exportMemories(opts?: {
    volumeId?: string;
    format?: "json" | "jsonl";
    includeGraph?: boolean;
  }): Promise<any> {
    const vol = opts?.volumeId || this.volumeId;
    const params = new URLSearchParams({ volume_id: vol });
    if (opts?.format) params.set("format", opts.format);
    if (opts?.includeGraph !== undefined) params.set("include_graph", String(opts.includeGraph));
    return this.request("GET", `/agent/memory/export?${params.toString()}`);
  }

  /** Bulk import memories into a volume. */
  async importMemories(memories: Array<{
    content: string;
    memoryType?: string;
    metadata?: Record<string, any>;
  }>, opts?: { volumeId?: string }): Promise<any> {
    return this.request("POST", "/agent/memory/export/import", {
      volume_id: opts?.volumeId || this.volumeId,
      memories: memories.map((m) => ({
        content: m.content,
        memory_type: m.memoryType || "factual",
        metadata: m.metadata,
      })),
    });
  }

  // ─── Structured Extraction ───

  /** Extract structured data from text using a predefined JSON schema. */
  async extract(text: string, schemaId: string, opts?: {
    volumeId?: string;
  }): Promise<any> {
    return this.request("POST", "/agent/memory/extract", {
      text,
      volume_id: opts?.volumeId || this.volumeId,
      schema_id: schemaId,
    });
  }

  /** Create an extraction schema. */
  async createExtractionSchema(schema: {
    name: string;
    description?: string;
    jsonSchema: Record<string, any>;
    volumeId?: string;
  }): Promise<any> {
    return this.request("POST", "/agent/memory/extract/schemas", {
      name: schema.name,
      description: schema.description,
      json_schema: schema.jsonSchema,
      volume_id: schema.volumeId || this.volumeId,
    });
  }

  /** List extraction schemas for a volume. */
  async listExtractionSchemas(opts?: { volumeId?: string }): Promise<any[]> {
    const vol = opts?.volumeId || this.volumeId;
    return this.request("GET", `/agent/memory/extract/schemas?volume_id=${encodeURIComponent(vol)}`);
  }

  // ─── Agents (v2) ───

  /** Agent profile management. Requires user-session auth or admin-scoped API key. */
  get agents() {
    const req = this.request.bind(this);
    return {
      /** Create an agent with a system prompt. Returns the agent + one-time API key. */
      async create(opts: {
        orgId: string;
        projectId: string;
        name: string;
        description?: string;
        systemPrompt?: string;
      }): Promise<AgentCreateResult> {
        return req("POST", "/agents", {
          org_id: opts.orgId,
          project_id: opts.projectId,
          name: opts.name,
          description: opts.description,
          system_prompt: opts.systemPrompt,
        });
      },

      /** List agents in an org, optionally filtered by project. */
      async list(opts: { orgId: string; projectId?: string }): Promise<Agent[]> {
        const qs = opts.projectId ? `&project_id=${opts.projectId}` : "";
        return req("GET", `/agents?org_id=${opts.orgId}${qs}`);
      },

      /** Get a single agent by ID. */
      async get(agentId: string): Promise<Agent> {
        return req("GET", `/agents/${agentId}`);
      },

      /** Update an agent's name, description, or system prompt. */
      async update(agentId: string, updates: {
        name?: string;
        description?: string;
        systemPrompt?: string;
        isActive?: boolean;
      }): Promise<Agent> {
        return req("PATCH", `/agents/${agentId}`, {
          name: updates.name,
          description: updates.description,
          system_prompt: updates.systemPrompt,
          is_active: updates.isActive,
        });
      },

      /** Deactivate an agent and revoke its API key. */
      async delete(agentId: string): Promise<{ status: string; agent_id: string }> {
        return req("DELETE", `/agents/${agentId}`);
      },

      /** Rotate an agent's API key. Old key is revoked immediately. */
      async rotateKey(agentId: string): Promise<{ agent_id: string; api_key: string; api_key_prefix: string }> {
        return req("POST", `/agents/${agentId}/rotate-key`);
      },
    };
  }

  // ─── Organizations (v2) ───

  /** Organization management. Requires user-session auth. */
  get orgs() {
    const req = this.request.bind(this);
    return {
      /** List organizations the current user belongs to. */
      async list(): Promise<Organization[]> {
        return req("GET", "/orgs");
      },

      /** Get a single organization by ID. */
      async get(orgId: string): Promise<Organization> {
        return req("GET", `/orgs/${orgId}`);
      },

      /** List members of an organization. */
      async members(orgId: string): Promise<OrgMember[]> {
        return req("GET", `/orgs/${orgId}/members`);
      },

      /** Apply a promo code to an organization. */
      async applyPromo(orgId: string, code: string): Promise<any> {
        return req("POST", `/orgs/${orgId}/promo`, { code });
      },
    };
  }
}

export default SharedMemory;
