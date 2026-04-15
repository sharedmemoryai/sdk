# @sharedmemory/sdk

TypeScript client for the [SharedMemory](https://sharedmemory.ai) API — persistent memory for AI agents.

## Installation

```bash
npm install @sharedmemory/sdk
```

Requires Node.js 18+.

## Usage

```typescript
import { SharedMemory } from '@sharedmemory/sdk';

const memory = new SharedMemory({
  apiKey: 'sm_live_...',
  volumeId: 'your-volume-id',
});

// Write
const result = await memory.remember('John is the CTO of Acme Corp');

// Read
const recall = await memory.recall('Who is John?');

// Graph
const entity = await memory.getEntity('John');
const results = await memory.searchEntities('React');
const graph = await memory.getGraph();

// Real-time
const sub = memory.subscribe({
  onMemory: (event) => console.log(event),
  onActivity: (event) => console.log(event),
});
sub.close();
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Required. API key (`sm_live_...`) |
| `baseUrl` | `string` | `https://api.sharedmemory.ai` | API endpoint |
| `volumeId` | `string` | `default` | Default volume for all operations |
| `agentName` | `string` | `sdk-agent` | Agent name for attribution |
| `timeout` | `number` | `30000` | Request timeout (ms) |

## Methods

| Method | Description |
|--------|-------------|
| `remember(content, opts?)` | Store a memory |
| `recall(query, opts?)` | Search memories and graph facts |
| `getEntity(name, opts?)` | Get entity details and relationships |
| `searchEntities(query, opts?)` | Search entities by name |
| `getGraph(opts?)` | Retrieve the full knowledge graph |
| `listVolumes()` | List accessible volumes |
| `subscribe(opts)` | Real-time updates via WebSocket |

## Documentation

https://docs.sharedmemory.ai/sdks/typescript-sdk

## License

MIT
