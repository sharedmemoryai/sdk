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
    sources: Array<{
        id: string;
        content: string;
        score: number;
    }>;
    graph_facts: Array<{
        source: string;
        type: string;
        target: string;
    }>;
}
export interface Entity {
    name: string;
    type: string;
    summary: string;
    facts: string[];
    relationships: Array<{
        entity: string;
        type: string;
        description?: string;
    }>;
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
export declare class SharedMemory {
    private apiKey;
    private baseUrl;
    private volumeId;
    private agentName;
    private timeout;
    constructor(config: SharedMemoryConfig);
    private request;
    /** Store a memory in the shared knowledge base. */
    remember(content: string, opts?: {
        memoryType?: string;
        source?: string;
        volumeId?: string;
    }): Promise<MemoryResult>;
    /** Recall memories relevant to a query. Returns an AI-synthesized answer + sources. */
    recall(query: string, opts?: {
        volumeId?: string;
        autoLearn?: boolean;
    }): Promise<RecallResult>;
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
    /** Subscribe to real-time updates on a volume. */
    subscribe(opts: {
        volumeId?: string;
        onMemory?: (event: any) => void;
        onActivity?: (event: ActivityEvent) => void;
        onPresence?: (event: any) => void;
    }): {
        close: () => void;
    };
}
export default SharedMemory;
