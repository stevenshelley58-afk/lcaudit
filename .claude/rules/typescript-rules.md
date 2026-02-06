# TypeScript Rules — lcaudit

## Immutability (CRITICAL)

```typescript
// WRONG: Mutation
user.name = 'New Name'
items.push(newItem)

// CORRECT: Spread
const updated = { ...user, name: 'New Name' }
const newList = [...items, newItem]
```

## Error Handling

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  throw new Error(`Descriptive message: ${(error as Error).message}`)
}
```

## Parallel Execution

```typescript
// CORRECT: Parallel when independent
const [users, markets, stats] = await Promise.all([
  fetchUsers(), fetchMarkets(), fetchStats()
])

// WRONG: Sequential when unnecessary
const users = await fetchUsers()
const markets = await fetchMarkets()
```

## Input Validation (Zod)

```typescript
import { z } from 'zod'
const schema = z.object({
  url: z.string().url(),
  options: z.object({ /* ... */ }).optional()
})
const validated = schema.parse(input)
```

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

## No `any`

```typescript
// WRONG
function process(data: any): any { }

// CORRECT
function process(data: CollectedData): AnalysisResult { }
```
