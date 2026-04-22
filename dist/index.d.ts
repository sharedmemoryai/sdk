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
    memories: Array<{
        memory_id: string;
        content: string;
        score: number;
        memory_type?: string;
        memory_class?: string;
        agent?: string;
        created_at?: string;
    }>;
    graph_facts: Array<{
        source: string;
        type: string;
        target: string;
        description?: string;
    }>;
    document_sources?: Array<{
        document_id: string;
        filename: string;
        content: string;
        score: number;
    }>;
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
    facts: Array<{
        content: string;
        category?: string;
        importance?: number;
    }>;
    summaries?: Array<{
        content: string;
        version?: number;
    }>;
    relationships: Array<{
        name: string;
        type?: string;
        rel_type: string;
        direction?: string;
    }>;
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
export declare class SharedMemory {
    private apiKey;
    private baseUrl;
    private volumeId;
    private agentName;
    private timeout;
    private userId?;
    private agentId?;
    private appId?;
    private sessionId?;
    constructor(config: SharedMemoryConfig);
    private request;
    private entityScope;
    /** Add a memory. Alias: remember() */
    add(content: string, opts?: {
        memoryType?: string;
        source?: string;
        volumeId?: string;
        metadata?: Record<string, any>;
    } & EntityScope): Promise<MemoryResult>;
    /** Alias for add() */
    remember(content: string, opts?: Parameters<SharedMemory["add"]>[1]): Promise<MemoryResult>;
    /** Search memories by semantic similarity. */
    search(query: string, opts?: {
        volumeId?: string;
        limit?: number;
        filters?: MetadataFilter;
        rerank?: boolean;
        rerankMethod?: "llm" | "heuristic";
        includeContext?: boolean;
        templateId?: string;
    } & EntityScope): Promise<RecallResult>;
    /** Alias for search() */
    recall(query: string, opts?: Parameters<SharedMemory["search"]>[1]): Promise<RecallResult>;
    /** Get a single memory by ID. */
    get(memoryId: string, opts?: {
        volumeId?: string;
    }): Promise<any>;
    /** Update a memory's content. */
    update(memoryId: string, content: string, opts?: {
        volumeId?: string;
        metadata?: Record<string, any>;
    }): Promise<{
        status: string;
        memory_id: string;
    }>;
    /** Delete (soft-invalidate) a memory. */
    delete(memoryId: string, opts?: {
        volumeId?: string;
    }): Promise<{
        status: string;
        memory_id: string;
    }>;
    /** Batch delete up to 100 memories in a single request. */
    deleteMany(memoryIds: string[], opts?: {
        volumeId?: string;
    }): Promise<{
        status: string;
        deleted: number;
        total: number;
    }>;
    /** Batch update up to 100 memories in a single request. */
    updateMany(updates: Array<{
        memoryId: string;
        content: string;
        metadata?: Record<string, any>;
    }>, opts?: {
        volumeId?: string;
    }): Promise<{
        total: number;
        results: Array<{
            memory_id: string;
            status: string;
        }>;
    }>;
    /** Write multiple memories in a single request. */
    addMany(memories: Array<{
        content: string;
        volumeId?: string;
        memoryType?: string;
        metadata?: Record<string, any>;
    } & EntityScope>): Promise<{
        total: number;
        results: MemoryResult[];
    }>;
    /** Submit feedback on a memory (positive, negative, or very_negative). */
    feedback(memoryId: string, feedback: MemoryFeedback, opts?: {
        volumeId?: string;
    }): Promise<any>;
    /** Get the history of changes for a memory. */
    history(memoryId: string, opts?: {
        volumeId?: string;
    }): Promise<{
        memory: any;
        history: MemoryHistory[];
        feedback: any[];
    }>;
    /** Get a specific entity from the knowledge graph. */
    getEntity(name: string, opts?: {
        volumeId?: string;
    }): Promise<Entity>;
    /** Search entities by name pattern. */
    searchEntities(query: string, opts?: {
        volumeId?: string;
        limit?: number;
    }): Promise<Entity[]>;
    /** Get the knowledge graph for a volume. */
    getGraph(opts?: {
        volumeId?: string;
    }): Promise<{
        entities: any[];
        relationships: any[];
    }>;
    /** List volumes this agent has access to. */
    listVolumes(): Promise<any[]>;
    /** Assemble a context block for LLM prompting (Zep-style). */
    assembleContext(opts?: {
        volumeId?: string;
        templateId?: string;
    } & EntityScope): Promise<ContextBlock>;
    /** Subscribe to real-time updates on a volume. */
    subscribe(opts: {
        volumeId?: string;
        onMemory?: (event: any) => void;
        onActivity?: (event: ActivityEvent) => void;
        onPresence?: (event: any) => void;
    }): {
        close: () => void;
    };
    /** Register a persistent HTTP webhook for volume events. */
    webhookSubscribe(opts: {
        volumeId?: string;
        url: string;
        events?: string[];
        secret?: string;
    }): Promise<{
        webhook_id: string;
        status: string;
        events: string[];
    }>;
    /** Remove a persistent HTTP webhook subscription. */
    webhookUnsubscribe(opts: {
        volumeId?: string;
        url: string;
    }): Promise<{
        status: string;
    }>;
    /** Start a new session for scoped memory tracking. */
    startSession(sessionId: string, opts?: {
        volumeId?: string;
    } & EntityScope): Promise<any>;
    /** End a session. If autoSummarize=true, compresses session memories into long-term storage. */
    endSession(sessionId: string, opts?: {
        volumeId?: string;
        autoSummarize?: boolean;
    }): Promise<any>;
    /** Get session details by ID. */
    getSession(sessionId: string, opts?: {
        volumeId?: string;
    }): Promise<any>;
    /** List sessions for a volume. */
    listSessions(opts?: {
        volumeId?: string;
        status?: string;
        limit?: number;
    }): Promise<any[]>;
    /** Export all memories for a volume. */
    exportMemories(opts?: {
        volumeId?: string;
        format?: "json" | "jsonl";
        includeGraph?: boolean;
    }): Promise<any>;
    /** Bulk import memories into a volume. */
    importMemories(memories: Array<{
        content: string;
        memoryType?: string;
        metadata?: Record<string, any>;
    }>, opts?: {
        volumeId?: string;
    }): Promise<any>;
    /** Extract structured data from text using a predefined JSON schema. */
    extract(text: string, schemaId: string, opts?: {
        volumeId?: string;
    }): Promise<any>;
    /** Create an extraction schema. */
    createExtractionSchema(schema: {
        schemaId?: string;
        name: string;
        description?: string;
        jsonSchema: Record<string, any>;
        volumeId?: string;
    }): Promise<any>;
    /** List extraction schemas for a volume. */
    listExtractionSchemas(opts?: {
        volumeId?: string;
    }): Promise<any[]>;
    /** Agent profile management. Requires user-session auth or admin-scoped API key. */
    get agents(): {
        /** Create an agent with a system prompt. Returns the agent + one-time API key. */
        create(opts: {
            orgId: string;
            projectId: string;
            name: string;
            description?: string;
            systemPrompt?: string;
        }): Promise<AgentCreateResult>;
        /** List agents in an org, optionally filtered by project. */
        list(opts: {
            orgId: string;
            projectId?: string;
        }): Promise<Agent[]>;
        /** Get a single agent by ID. */
        get(agentId: string): Promise<Agent>;
        /** Update an agent's name, description, or system prompt. */
        update(agentId: string, updates: {
            name?: string;
            description?: string;
            systemPrompt?: string;
            isActive?: boolean;
        }): Promise<Agent>;
        /** Deactivate an agent and revoke its API key. */
        delete(agentId: string): Promise<{
            status: string;
            agent_id: string;
        }>;
        /** Rotate an agent's API key. Old key is revoked immediately. */
        rotateKey(agentId: string): Promise<{
            agent_id: string;
            api_key: string;
            api_key_prefix: string;
        }>;
    };
    /** Organization management. Requires user-session auth. */
    get orgs(): {
        /** List organizations the current user belongs to. */
        list(): Promise<Organization[]>;
        /** Get a single organization by ID. */
        get(orgId: string): Promise<Organization>;
        /** List members of an organization. */
        members(orgId: string): Promise<OrgMember[]>;
        /** Apply a promo code to an organization. */
        applyPromo(orgId: string, code: string): Promise<any>;
    };
}
export default SharedMemory;
