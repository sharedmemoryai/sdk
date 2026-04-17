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
const result = await memory.add('John is the CTO of Acme Corp');

// Batch write
await memory.addMany([
  { content: 'Jane is VP of Engineering' },
  { content: 'Acme Corp uses React and Node.js' },
]);

// Search
const recall = await memory.search('Who is John?');

// Get / Update / Delete
const mem = await memory.get('memory-id');
await memory.update('memory-id', 'Updated content');
await memory.delete('memory-id');

// Graph
const entity = await memory.getEntity('John');
const results = await memory.searchEntities('React');
const graph = await memory.getGraph();

// Context assembly
const context = await memory.assembleContext('Tell me about Acme Corp');

// Agent management
const agent = await memory.agents.create({
  orgId: 'org-id',
  projectId: 'project-id',
  name: 'my-agent',
});
const agents = await memory.agents.list('org-id');

// Real-time
const sub = memory.subscribe({
  onMemory: (event) => console.log(event),
  onActivity: (event) => console.log(event),
  onPresence: (event) => console.log(event),
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

### Memory

| Method | Description |
|--------|-------------|
| `add(content, opts?)` | Store a memory (alias: `remember`) |
| `search(query, opts?)` | Search memories and graph facts (alias: `recall`) |
| `get(memoryId)` | Get a memory by ID |
| `update(memoryId, content)` | Update a memory |
| `delete(memoryId)` | Delete a memory |
| `addMany(items, opts?)` | Store multiple memories in batch |
| `feedback(memoryId, rating)` | Submit feedback on a memory |
| `history(opts?)` | Get memory history |

### Graph

| Method | Description |
|--------|-------------|
| `getEntity(name, opts?)` | Get entity details and relationships |
| `searchEntities(query, opts?)` | Search entities by name |
| `getGraph(opts?)` | Retrieve the full knowledge graph |

### Context

| Method | Description |
|--------|-------------|
| `assembleContext(query, opts?)` | Assemble relevant context for a query |

### Volumes

| Method | Description |
|--------|-------------|
| `listVolumes()` | List accessible volumes |

### Agents (`memory.agents.*`)

| Method | Description |
|--------|-------------|
| `agents.create(opts)` | Create a new agent and get an API key |
| `agents.list(orgId)` | List agents in an organization |
| `agents.get(agentId)` | Get agent details |
| `agents.update(agentId, opts)` | Update agent name, description, or prompt |
| `agents.delete(agentId)` | Deactivate an agent and revoke its key |
| `agents.rotateKey(agentId)` | Rotate an agent's API key |

### Organizations (`memory.orgs.*`)

| Method | Description |
|--------|-------------|
| `orgs.list()` | List organizations |
| `orgs.get(orgId)` | Get organization details |
| `orgs.members(orgId)` | List organization members |
| `orgs.applyPromo(orgId, code)` | Apply a promo code |

### Real-time

| Method | Description |
|--------|-------------|
| `subscribe(opts)` | Real-time updates via WebSocket |

## Documentation

https://docs.sharedmemory.ai/sdks/typescript-sdk

## License

MIT
