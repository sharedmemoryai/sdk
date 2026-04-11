# @sharedmemory/sdk

The official TypeScript/JavaScript client for [SharedMemory](https://sharedmemory.ai) — the persistent memory layer for AI agents.

## Install

```bash
npm install @sharedmemory/sdk
```

## Quick Start

```typescript
import { SharedMemory } from '@sharedmemory/sdk';

const memory = new SharedMemory({
  apiKey: 'sm_live_...',
  volumeId: 'your-volume-id',
});

// Store a memory
const result = await memory.remember('John is the CTO of Acme Corp');
console.log(result.status); // "approved"

// Recall memories
const recall = await memory.recall('Who is John?');
console.log(recall.sources);

// Get entity details
const entity = await memory.getEntity('John');
console.log(entity.facts);

// Search entities
const entities = await memory.searchEntities('React');

// Get full knowledge graph
const graph = await memory.getGraph();

// List accessible volumes
const volumes = await memory.listVolumes();

// Real-time updates
const sub = memory.subscribe({
  onMemory: (event) => console.log('New memory:', event),
  onActivity: (event) => console.log('Activity:', event),
});
// sub.close() to disconnect
```

## Configuration

```typescript
const memory = new SharedMemory({
  apiKey: 'sm_live_...',       // Required
  baseUrl: 'https://api.sharedmemory.ai', // Default
  volumeId: 'default',         // Default volume for all calls
  agentName: 'sdk-agent',      // Agent name for attribution
  timeout: 30000,              // Request timeout in ms
});
```

## API Reference

| Method | Description |
|--------|-------------|
| `remember(content, opts?)` | Store a memory |
| `recall(query, opts?)` | Search memories + graph facts |
| `getEntity(name, opts?)` | Get entity details |
| `searchEntities(query, opts?)` | Search entities by name |
| `getGraph(opts?)` | Get full knowledge graph |
| `listVolumes()` | List accessible volumes |
| `subscribe(opts)` | Real-time WebSocket updates |

## Docs

Full documentation: [docs.sharedmemory.ai/sdks/typescript-sdk](https://docs.sharedmemory.ai/sdks/typescript-sdk)

## License

MIT
