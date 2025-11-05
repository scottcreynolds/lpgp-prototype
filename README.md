# Lunar Policy Gaming Platform (LPGP)

A serious-game simulation for cooperative lunar development, built for university research on cooperation patterns under resource constraints.

## Quick Start

### Option 1: Mock Data (Recommended for Initial Development)

Start developing immediately without any backend setup:

```bash
pnpm install
pnpm dev
```

The app will automatically use localStorage-based mock data. You'll see:
```
🎭 Using mock data (localStorage-based)
```

### Option 2: Real Supabase Backend

For real-time multi-user features:

1. Set up Supabase (see [SETUP.md](./SETUP.md))
2. Create `.env.local`:
   ```bash
   cp .env.example .env.local
   # Add your Supabase credentials
   ```
3. Run the app:
   ```bash
   pnpm dev
   ```

## Project Structure

```
lpgp-prototype/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # TanStack Query hooks
│   ├── lib/            # Supabase client & types
│   └── store/          # Zustand state management
├── database/
│   └── migrations/     # SQL schema & seed data
├── doc/                # Documentation & implementation logs
└── .todo               # Development task list
```

## Key Features

- **Real-time Dashboard** - Live updates of game state, player rankings, and infrastructure
- **Mock Data Layer** - Develop without backend setup using localStorage
- **Optimistic Locking** - Race condition protection for concurrent updates
- **Research Integration** - Complete audit trail via ledger entries

## Tech Stack

- **Frontend:** React 19, TypeScript, Chakra UI v3
- **State:** TanStack Query, Zustand
- **Backend:** Supabase (Postgres + real-time subscriptions)
- **Build:** Vite, pnpm

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with Supabase
- **[doc/PRD.md](./doc/PRD.md)** - Product requirements
- **[doc/rules.md](./doc/rules.md)** - Game rules and mechanics
- **[doc/implementation-log-dashboard-v1.md](./doc/implementation-log-dashboard-v1.md)** - Dashboard implementation details
- **[doc/implementation-log-mock-data.md](./doc/implementation-log-mock-data.md)** - Mock data architecture
- **[.todo](./.todo)** - Development roadmap

## Architecture Highlights

### Facade Pattern

Data source selection happens in **one place**: `src/lib/supabase.ts`

```typescript
// Automatic detection - no environment checks anywhere else
export const supabase = !envVarsPresent
  ? mockSupabaseClient      // localStorage
  : createClient(...);       // Supabase
```

Components and hooks remain completely unaware of the data source.

### State Management

- **TanStack Query** - Server state with real-time subscriptions
- **Zustand** - Lightweight client state
- **localStorage** - Mock data persistence

### Real-time Updates

Game state changes trigger automatic refetches across all connected clients (or tabs in mock mode).

## Contributing

See [CLAUDE.md](./CLAUDE.md) for coding standards and architectural principles.

## License

This is a research project for educational purposes.
