"use strict";
/**
 * @sharedmemory/sdk — The persistent memory layer for AI agents.
 *
 * Usage:
 *   import { SharedMemory } from '@sharedmemory/sdk'
 *   const memory = new SharedMemory({ apiKey: 'sm_live_...' })
 *   await memory.remember("The user prefers dark mode")
 *   const results = await memory.recall("user preferences")
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
    /** Store a memory in the shared knowledge base. */
    async remember(content, opts) {
        return this.request("POST", "/agent/memory/write", {
            content,
            volume_id: opts?.volumeId || this.volumeId,
            agent: this.agentName,
            memory_type: opts?.memoryType || "factual",
            source: opts?.source || "sdk",
        });
    }
    /** Recall memories relevant to a query. Returns an AI-synthesized answer + sources. */
    async recall(query, opts) {
        return this.request("POST", "/agent/memory/query", {
            query,
            volume_id: opts?.volumeId || this.volumeId,
            auto_learn: opts?.autoLearn || false,
        });
    }
    /** Get a specific entity from the knowledge graph. */
    async getEntity(name, opts) {
        return this.request("POST", "/agent/entity", {
            name,
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
    /** List volumes this agent has access to. */
    async listVolumes() {
        return this.request("GET", "/agent/volumes");
    }
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
}
exports.SharedMemory = SharedMemory;
exports.default = SharedMemory;
