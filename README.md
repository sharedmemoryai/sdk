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

// Chat (RAG + LLM answer)
const answer = await memory.chat('What does John do at Acme?');
console.log(answer.answer, answer.sources, answer.citations);

// Get / Update / Delete
const mem = await memory.get('memory-id');
await memory.update('memory-id', 'Updated content');
await memory.delete('memory-id');

// Graph
const entity = await memory.getEntity('John');
const results = await memory.searchEntities('React');
const graph = await memory.getGraph();

// Context assembly
const context = await memory.assembleContext({ volumeId: 'your-volume-id' });

// Agent management
const agent = await memory.agents.create({
  orgId: 'org-id',
  projectId: 'project-id',
  name: 'my-agent',
});
const agents = await memory.agents.list({ orgId: 'org-id' });

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
| `userId` | `string` | — | Scope memories to a specific user |
| `agentId` | `string` | — | Scope memories to a specific agent |
| `appId` | `string` | — | App identifier for scoping |
| `sessionId` | `string` | — | Default session ID |

## Methods

### Memory

| Method | Description |
|--------|-------------|
| `add(content, opts?)` | Store a memory (alias: `remember`) |
| `search(query, opts?)` | Search memories and graph facts (alias: `recall`) |
| `chat(query, opts?)` | Ask a question — LLM answers using your memories |
| `get(memoryId)` | Get a memory by ID |
| `update(memoryId, content)` | Update a memory |
| `delete(memoryId)` | Delete a memory |
| `addMany(items, opts?)` | Store multiple memories in batch |
| `deleteMany(memoryIds, opts?)` | Delete multiple memories in batch |
| `updateMany(updates, opts?)` | Update multiple memories in batch |
| `feedback(memoryId, feedback)` | Submit feedback (`{ feedback: 'POSITIVE' \| 'NEGATIVE', feedback_reason?: string }`) |
| `history(memoryId)` | Get memory audit trail |

### Graph

| Method | Description |
|--------|-------------|
| `getEntity(name, opts?)` | Get entity details and relationships |
| `searchEntities(query, opts?)` | Search entities by name |
| `getGraph(opts?)` | Retrieve the full knowledge graph |

### Context

| Method | Description |
|--------|-------------|
| `assembleContext(opts?)` | Assemble relevant context for LLM prompting |

### Volumes

| Method | Description |
|--------|-------------|
| `listVolumes()` | List accessible volumes |

### Agents (`memory.agents.*`)

| Method | Description |
|--------|-------------|
| `agents.create(opts)` | Create a new agent and get an API key |
| `agents.list(opts)` | List agents in an organization |
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

### Webhooks

| Method | Description |
|--------|-------------|
| `webhookSubscribe(opts)` | Register a webhook for memory events |
| `webhookUnsubscribe(opts)` | Remove a webhook subscription |

### Sessions

| Method | Description |
|--------|-------------|
| `startSession(sessionId, opts?)` | Start a conversation session |
| `endSession(sessionId, opts?)` | End a session (auto-summarize) |
| `getSession(sessionId)` | Get session details |
| `listSessions(opts?)` | List sessions |

### Export / Import

| Method | Description |
|--------|-------------|
| `exportMemories(opts?)` | Export all memories |
| `importMemories(memories, opts?)` | Bulk import memories |

### Extraction

| Method | Description |
|--------|-------------|
| `extract(text, schemaId, opts?)` | Extract structured data from text |
| `createExtractionSchema(schema)` | Create a new extraction schema |
| `listExtractionSchemas(opts?)` | List extraction schemas |

## Documentation

https://docs.sharedmemory.ai/sdks/typescript-sdk

## License

MIT
