"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedMemory = void 0;
class SharedMemory {
    constructor(config) {
        if (!config.apiKey)
            throw new Error("apiKey is required");
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
    async request(method, path, body) {
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
        }
        finally {
            clearTimeout(timer);
        }
    }
    entityScope(override) {
        return {
            user_id: override?.userId || this.userId,
            agent_id: override?.agentId || this.agentId,
            app_id: override?.appId || this.appId,
            session_id: override?.sessionId || this.sessionId,
        };
    }
    // ─── Core Memory Operations (Mem0-compatible) ───
    /** Add a memory. Alias: remember() */
    async add(content, opts) {
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
    async remember(content, opts) {
        return this.add(content, opts);
    }
    /** Search memories by semantic similarity. */
    async search(query, opts) {
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
    async recall(query, opts) {
        return this.search(query, opts);
    }
    /** Get a single memory by ID. */
    async get(memoryId, opts) {
        const vol = opts?.volumeId || this.volumeId;
        return this.request("GET", `/agent/memory/${memoryId}?volume_id=${encodeURIComponent(vol)}`);
    }
    /** Update a memory's content. */
    async update(memoryId, content, opts) {
        return this.request("PATCH", `/agent/memory/${memoryId}`, {
            volume_id: opts?.volumeId || this.volumeId,
            content,
            metadata: opts?.metadata,
        });
    }
    /** Delete (soft-invalidate) a memory. */
    async delete(memoryId, opts) {
        return this.request("DELETE", `/agent/memory/${memoryId}`, {
            volume_id: opts?.volumeId || this.volumeId,
        });
    }
    /** Batch delete up to 100 memories in a single request. */
    async deleteMany(memoryIds, opts) {
        return this.request("POST", "/agent/memory/delete/batch", {
            volume_id: opts?.volumeId || this.volumeId,
            memory_ids: memoryIds,
        });
    }
    /** Batch update up to 100 memories in a single request. */
    async updateMany(updates, opts) {
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
    async addMany(memories) {
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
    async feedback(memoryId, feedback, opts) {
        return this.request("POST", "/memory/feedback", {
            memory_id: memoryId,
            volume_id: opts?.volumeId || this.volumeId,
            ...feedback,
            ...this.entityScope(),
        });
    }
    /** Get the history of changes for a memory. */
    async history(memoryId) {
        return this.request("GET", `/memory/feedback/history/${memoryId}`);
    }
    // ─── Knowledge Graph ───
    /** Get a specific entity from the knowledge graph. */
    async getEntity(name, opts) {
        return this.request("POST", "/agent/entity", {
            entity_name: name,
            volume_id: opts?.volumeId || this.volumeId,
        });
    }
    /** Search entities by name pattern. */
    async searchEntities(query, opts) {
        return this.request("POST", "/agent/entities/search", {
            query,
            volume_id: opts?.volumeId || this.volumeId,
            limit: opts?.limit || 10,
        });
    }
    /** Get the knowledge graph for a volume. */
    async getGraph(opts) {
        return this.request("POST", "/agent/graph", {
            volume_id: opts?.volumeId || this.volumeId,
        });
    }
    // ─── Volumes ───
    /** List volumes this agent has access to. */
    async listVolumes() {
        return this.request("GET", "/agent/volumes");
    }
    // ─── Context Assembly ───
    /** Assemble a context block for LLM prompting (Zep-style). */
    async assembleContext(opts) {
        return this.request("POST", "/memory/context/assemble", {
            volume_id: opts?.volumeId || this.volumeId,
            template_id: opts?.templateId,
            ...this.entityScope(opts),
        });
    }
    // ─── Real-time ───
    /** Subscribe to real-time updates on a volume. */
    subscribe(opts) {
        const vol = opts.volumeId || this.volumeId;
        const wsUrl = this.baseUrl.replace(/^http/, "ws");
        const ws = new WebSocket(`${wsUrl}?volume=${vol}&user=${this.agentName}&type=agent`);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "graph_update" && opts.onMemory)
                    opts.onMemory(data);
                if (data.type === "activity" && opts.onActivity)
                    opts.onActivity(data);
                if (data.type === "agent_presence_update" && opts.onPresence)
                    opts.onPresence(data);
            }
            catch { /* ignore malformed messages */ }
        };
        return {
            close: () => ws.close(),
        };
    }
    // ─── Webhooks ───
    /** Register a persistent HTTP webhook for volume events. */
    async webhookSubscribe(opts) {
        return this.request("POST", "/agent/memory/subscribe", {
            volume_id: opts.volumeId || this.volumeId,
            url: opts.url,
            events: opts.events || ["memory.approved", "memory.flagged"],
            secret: opts.secret,
        });
    }
    /** Remove a persistent HTTP webhook subscription. */
    async webhookUnsubscribe(opts) {
        return this.request("DELETE", "/agent/memory/unsubscribe", {
            volume_id: opts.volumeId || this.volumeId,
            url: opts.url,
        });
    }
    // ─── Sessions ───
    /** Start a new session for scoped memory tracking. */
    async startSession(sessionId, opts) {
        return this.request("POST", "/memory/sessions/start", {
            session_id: sessionId,
            volume_id: opts?.volumeId || this.volumeId,
            ...this.entityScope(opts),
        });
    }
    /** End a session. If autoSummarize=true, compresses session memories into long-term storage. */
    async endSession(sessionId, opts) {
        return this.request("POST", "/memory/sessions/end", {
            session_id: sessionId,
            volume_id: opts?.volumeId || this.volumeId,
            auto_summarize: opts?.autoSummarize ?? true,
        });
    }
    /** Get session details by ID. */
    async getSession(sessionId) {
        return this.request("GET", `/memory/sessions/${sessionId}`);
    }
    /** List sessions for a volume. */
    async listSessions(opts) {
        const vol = opts?.volumeId || this.volumeId;
        const params = new URLSearchParams({ volume_id: vol });
        if (opts?.status)
            params.set("status", opts.status);
        if (opts?.limit)
            params.set("limit", String(opts.limit));
        return this.request("GET", `/memory/sessions?${params.toString()}`);
    }
    // ─── Export / Import ───
    /** Export all memories for a volume. */
    async exportMemories(opts) {
        const vol = opts?.volumeId || this.volumeId;
        const params = new URLSearchParams({ volume_id: vol });
        if (opts?.format)
            params.set("format", opts.format);
        if (opts?.includeGraph !== undefined)
            params.set("include_graph", String(opts.includeGraph));
        return this.request("GET", `/memory/export?${params.toString()}`);
    }
    /** Bulk import memories into a volume. */
    async importMemories(memories, opts) {
        return this.request("POST", "/memory/import", {
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
    async extract(text, schemaId, opts) {
        return this.request("POST", "/memory/extract", {
            text,
            volume_id: opts?.volumeId || this.volumeId,
            schema_id: schemaId,
        });
    }
    /** Create an extraction schema. */
    async createExtractionSchema(schema) {
        return this.request("POST", "/memory/extract/schemas", {
            name: schema.name,
            description: schema.description,
            json_schema: schema.jsonSchema,
            volume_id: schema.volumeId || this.volumeId,
        });
    }
    /** List extraction schemas for a volume. */
    async listExtractionSchemas(opts) {
        const vol = opts?.volumeId || this.volumeId;
        return this.request("GET", `/memory/extract/schemas?volume_id=${encodeURIComponent(vol)}`);
    }
    // ─── Agents (v2) ───
    /** Agent profile management. Requires user-session auth or admin-scoped API key. */
    get agents() {
        const req = this.request.bind(this);
        return {
            /** Create an agent with a system prompt. Returns the agent + one-time API key. */
            async create(opts) {
                return req("POST", "/agents", {
                    org_id: opts.orgId,
                    project_id: opts.projectId,
                    name: opts.name,
                    description: opts.description,
                    system_prompt: opts.systemPrompt,
                });
            },
            /** List agents in an org, optionally filtered by project. */
            async list(opts) {
                const qs = opts.projectId ? `&project_id=${opts.projectId}` : "";
                return req("GET", `/agents?org_id=${opts.orgId}${qs}`);
            },
            /** Get a single agent by ID. */
            async get(agentId) {
                return req("GET", `/agents/${agentId}`);
            },
            /** Update an agent's name, description, or system prompt. */
            async update(agentId, updates) {
                return req("PATCH", `/agents/${agentId}`, {
                    name: updates.name,
                    description: updates.description,
                    system_prompt: updates.systemPrompt,
                    is_active: updates.isActive,
                });
            },
            /** Deactivate an agent and revoke its API key. */
            async delete(agentId) {
                return req("DELETE", `/agents/${agentId}`);
            },
            /** Rotate an agent's API key. Old key is revoked immediately. */
            async rotateKey(agentId) {
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
            async list() {
                return req("GET", "/orgs");
            },
            /** Get a single organization by ID. */
            async get(orgId) {
                return req("GET", `/orgs/${orgId}`);
            },
            /** List members of an organization. */
            async members(orgId) {
                return req("GET", `/orgs/${orgId}/members`);
            },
            /** Apply a promo code to an organization. */
            async applyPromo(orgId, code) {
                return req("POST", `/orgs/${orgId}/promo`, { code });
            },
        };
    }
}
exports.SharedMemory = SharedMemory;
exports.default = SharedMemory;
