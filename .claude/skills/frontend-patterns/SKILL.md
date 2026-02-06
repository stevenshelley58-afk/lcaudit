---
name: frontend-patterns
description: React component patterns, hooks, performance, and accessibility rules for lcaudit. Use when building UI components or client-side logic.
---

# Frontend Patterns — lcaudit

## Component Patterns

### Composition Over Inheritance
Build complex UI from simple components. Card → CardHeader + CardBody. SectionCard → FindingRow children.

### Custom Hooks
```typescript
// Reusable state + logic
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}
```

### State Management
- `useState` for simple local state
- `useReducer` for complex state transitions (audit execution state machine)
- Context only for truly global state (debug mode, audit config)
- Functional updates: `setCount(prev => prev + 1)` not `setCount(count + 1)`

## Performance

### Memoisation
- `useMemo` for expensive computations (sorting findings, calculating scores)
- `useCallback` for functions passed to children
- `React.memo` for pure components (FindingRow, SectionCard)

### Code Splitting
```typescript
const DebugOverlay = lazy(() => import('./DebugOverlay'))
// Only loaded when debug mode active
```

### Conditional Rendering
```typescript
// GOOD: Clear
{isLoading && <Spinner />}
{error && <ErrorView error={error} />}
{data && <ResultsView data={data} />}

// BAD: Ternary hell
{isLoading ? <Spinner /> : error ? <ErrorView /> : <ResultsView />}
```

## Accessibility
- Keyboard navigation on all interactive elements
- ARIA labels on icon-only buttons
- Focus management in modals and expandable sections
- Colour contrast meets WCAG AA

## Error Boundaries
Wrap major sections in error boundaries so one failing section doesn't crash the whole report.
