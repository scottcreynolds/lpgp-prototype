# Plan: Hex-Based Game Board with Board Selection and Click-to-Build

Add 60-hex grid system with two manually configured board templates ("basic" and "scarcity"). Board initialization happens during setup phase with loading state. Players click hexes to build with visual capacity feedback and resource-type constraints. All board instances scoped to game_id with composite keys preventing cross-game collisions.

## Steps

### 1. Create board configuration system with template files

Create [`src/config/boards/basic.ts`](src/config/boards) and [`src/config/boards/scarcity.ts`](src/config/boards) each exporting `BoardConfig` with `displayName: string` and `hexes` array containing ~10 example hexes: `{ id: 'hex-1', displayLabel: 'Artemis-A', sectionName: 'Artemis' | 'Apollo' | 'Mercury' | 'Gemini', available_resources: ['water_ice'], coordinates: { q: 0, r: 0, s: 0 }, sectionColor: '#FFD700' }`.

Include mix of buildable resources (water_ice, helium_3, solar_energy, habitat_zone) and 1-2 non-buildable (communications_hub, launch_hub) across 4 sections with colors:

- Artemis `#FFD700` (gold)
- Apollo `#00CED1` (cyan)
- Mercury `#FF6347` (tomato)
- Gemini `#9370DB` (purple)

Create [`src/config/boards/index.ts`](src/config/boards) exporting `AVAILABLE_BOARDS: Record<string, BoardConfig>` and `BoardConfig` type.

Create [`src/config/boardConfig.ts`](src/config) with:

- `RESOURCE_TYPES` (id, name, iconPath from `common_tokens/`, hexFillColor for dark backgrounds, infrastructureTypes, isBuildable)
- `INFRASTRUCTURE_RESOURCE_MAP: Record<string, string>` mapping infrastructure type to required resource
- `HEX_VISUAL_CONFIG` (radius: 40, strokeWidth: 2, defaultStroke: '#666', fullCapacityStroke: '#ff0000')

### 2. Add board initialization database with composite keys

Create migration `database/migrations/031_board_system.sql` with:

**`board_hexes` table:**

- hex_id TEXT
- display_label TEXT
- section_name TEXT
- available_resources TEXT[]
- coordinates JSONB `{q, r, s}`
- section_color TEXT
- game_id UUID
- PRIMARY KEY (hex_id, game_id)
- FOREIGN KEY (game_id) REFERENCES game_state ON DELETE CASCADE

**Indexes:**

- `idx_board_hexes_game(game_id, hex_id)`
- `idx_player_infra_location(game_id, location)`

**Add to `game_state`:**

- `board_initialized BOOLEAN DEFAULT false`
- `board_type TEXT`

**Create RPC `initialize_board(p_game_id UUID, p_board_type TEXT, board_hexes_config JSONB)`:**

- Delete existing hexes for game_id
- Insert hexes from JSONB config
- Update game_state setting board_initialized and board_type

**Update `player_infrastructure`:**

- Add composite FK `FOREIGN KEY (location, game_id) REFERENCES board_hexes(hex_id, game_id)`
- Add NOT NULL constraint on location column

**TypeScript updates:**

- Add `BoardHex` interface to [`database.types.ts`](src/lib/database.types.ts)
- Update mock [`mockSupabaseClient.ts`](src/lib/mockSupabaseClient.ts) with `rpcInitializeBoard` storing hexes in localStorage keyed by `board_hexes_${gameId}`

### 3. Add board template selection UI with loading state

Update [`GameStateDisplay`](src/components/GameStateDisplay.tsx):

- Display `board_type` when `board_initialized` is true
- Otherwise (in Setup phase only) show:
  - `NativeSelect` populated with board display names from `AVAILABLE_BOARDS`
  - "Initialize Board" button
- Create `useInitializeBoard()` mutation in [`useGameData.ts`](src/hooks/useGameData.ts)
  - Call `initialize_board` RPC with current game_id, selected board type, and `AVAILABLE_BOARDS[boardType].hexes` serialized as JSONB
  - Show Chakra Spinner with "Initializing board..." text during `isPending`
  - Invalidate `gameKeys.dashboard()` and `gameKeys.board()` on success

Update [`AddPlayerModal`](src/components/AddPlayerModal.tsx):

- Disable trigger and show tooltip "Initialize board first" when `!board_initialized`

### 4. Update build_infrastructure with composite key validation

Modify [`build_infrastructure`](database/migrations/007_infrastructure_and_contract_rpcs.sql):

- Require `p_location TEXT NOT NULL`
- Validate hex exists: `SELECT 1 FROM board_hexes WHERE hex_id = p_location AND game_id = p_game_id`
- Count infrastructure at location cross-player: `SELECT COUNT(*) FROM player_infrastructure WHERE location = p_location AND game_id = p_game_id`
- Reject if count >= `hex_capacity` from `game_settings`
- Verify infrastructure type's required resource (from `INFRASTRUCTURE_RESOURCE_MAP`) exists in hex's `available_resources` array
- Insert with composite FK validation automatically enforced
- Return errors: "Hex at capacity (3/3)" or "Cannot build {type} - requires {resource}"

Update mock [`rpcBuildInfrastructure`](src/lib/mockSupabaseClient.ts):

- Mirror identical validation logic using hexes from localStorage

### 5. Build HexTile with visual states and click interaction

Create [`src/components/HexTile.tsx`](src/components) rendering SVG `<polygon>`:

**Visual elements:**

- Fill: `RESOURCE_TYPES.find(r => r.id === hex.available_resources[0]).hexFillColor`
- Stroke: `hex.sectionColor` (or `fullCapacityStroke` red if at capacity)
- Display label: white text on `rgba(0,0,0,0.7)` semi-transparent background (padding: 2px 4px, borderRadius: 2px)
- Resource icon: centered as 40% opacity watermark
- Capacity badge: top-right corner, color-coded green/yellow/red ("2/3" or "FULL")
- Infrastructure icons: grouped by unique type using [`getInfrastructureIcon`](src/components/InfrastructureCards.tsx), positioned in hex bottom with "×N" badges for multiples

**Props:**

- `hex: BoardHex`
- `infrastructure: PlayerInfrastructureItem[]`
- `currentCapacity: number`
- `maxCapacity: number`
- `mode: 'view' | 'select'`
- `isSelectable: boolean`
- `isSelected: boolean`
- `onClick: () => void`

**Visual states:**

- Selectable: hover glow effect + pointer cursor + brightness increase
- Non-selectable: 30% opacity + grayscale filter
- Selected: thick cyan border

**Interaction:**

- Click opens Chakra Popover with hex details (label, resource, infrastructure list with owner names colored by [`getSpecializationColor`](src/lib/specialization.ts), capacity status)
- Show "Build Here" button in select mode

### 6. Create HexGrid, BoardView, and integrate click-to-build

**Create [`src/lib/hexMath.ts`](src/lib) with:**

- `hexToPixel({ q, r, s }, radius): { x, y }`
  - Flat-top hex formula: `x = radius * (sqrt(3) * q + sqrt(3)/2 * r)`, `y = radius * (3/2 * r)`
- `getHexPolygonPoints(radius): string` - generates 6 vertices for SVG polygon
- `calculateGridBounds(hexes): { minX, maxX, minY, maxY }` - for SVG viewBox
- `validateHexCoordinates({ q, r, s }): boolean` - ensures `q + r + s === 0`

**Create [`src/components/HexGrid.tsx`](src/components):**

- Render `<svg>` element
- Map hexes to `<HexTile>` components positioned via `hexToPixel`
- Accept props:
  - `hexes: BoardHex[]`
  - `infrastructureByLocation: Map<string, PlayerInfrastructureItem[]>`
  - `capacity: number`
  - `mode: 'view' | 'select'`
  - `onHexSelect: (hexId: string) => void`
  - `validHexIds: string[]` for filtering selectability

**Create [`src/components/BoardView.tsx`](src/components/BoardView.tsx):**

- Parent `<Box>` with CSS: `background: linear-gradient(180deg, #1a1a1a, #0a0a0a)`
- Use `useBoardHexes()` from [`useGameData.ts`](src/hooks/useGameData.ts)
  - Query: `board_hexes WHERE game_id = current_game_id`
- Group all infrastructure by location from dashboard data
- Render `<HexGrid mode="view">`

**Add to [`Dashboard`](src/components/Dashboard.tsx):**

- Add `<BoardView />` as prominent top section

**Update [`BuildInfrastructureModal`](src/components/BuildInfrastructureModal.tsx):**

- Replace location text input with embedded `<HexGrid mode="select">`
- Filter hexes via `getValidHexesForInfrastructure` from [`src/lib/boardValidation.ts`](src/lib)
  - Check resource match via `INFRASTRUCTURE_RESOURCE_MAP`
  - Check capacity availability
- Pass selected hex ID to build mutation

**Update [`AddPlayerModal`](src/components/AddPlayerModal.tsx):**

- Add hex selection step after specialization choice
- Show `<HexGrid mode="select">` filtered by starter infrastructure's resource requirement
- Pass selected hex to `add_player` RPC

**Add to [`useGameData.ts`](src/hooks/useGameData.ts):**

- Add `gameKeys.board()` query key factory
- Invalidate on infrastructure mutations

## Further Considerations

None—plan is complete and ready for implementation.
