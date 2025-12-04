# LPGP User Instructions

This guide explains how to use the Lunar Policy Gaming Platform (LPGP): getting started, core actions, session flow, rules, and where to get help.

## Quick Start

- Mock mode (no backend):
  1. Install and run:

    ```zsh
    pnpm install
    pnpm dev
    ```

  1. The app opens at `http://localhost:5173` and uses localStorage-based mock data. You’ll see: “🎭 Using mock data…”.

- Real Supabase (multi-user):
  1. Follow `doc/SETUP.md` to set up Supabase and run all migrations.
  2. Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  3. Start with `pnpm dev`.

## Digital Platform Design Philosophy

The LPGP Digital Dashboard companion application was created to help balance both player and researcher user experience and cognitive load while allowing for more meaningful or complex mechanics to be a part of the core gameplay. It was also created to allow the game design team to quickly iterate on and test game mechanics of varying complexity without having to create physical artifacts.

### Gameplay and Player Experience Considerations

The design team sought to balance playability/fun, meaning, and reality throughout the process of developing the LPGP MVP. The digital platform allowed us to explore and test more complex mechanics, such as the dual-currency system of REP and EV and the differentiated operational abilities of multiple "specializations" or player types without having to rely on either the players or a facilitator to manually track and enforce those things.

### Researcher and Game Developer Considerations

The digital dashboard paves the way for a true platform-oriented approach to iterating and expanding on the game itself. By having a system in place to model base gameplay loops and various rules and mechanics, it's easier to add new rulesets and quickly test them in the context of the rest of the game.

In addition, the digital platform made it easy for us to tweak certain parameters within the game, such as the infrastructure-related costs and reward values or the win conditions for the game.

As an example, early on in the game design process we identified the two-currency system of REP and EV and while EV was easy to understand as a stand-in for money, REP required more discussion and exploration in terms of how it would affect gameplay. For our first iteration, we landed on REP being an important component in the Governance Phase gameplay but opted not to make it meaningful as a direct contributing value for the win condition. After the first live gameplay with external players, it became clear that REP needed to be factored into the win condition with EV, and it was a simple configuration change to do that immediately before the next playtest.

For the research aspect, we created the concept of the Ledger which is an accurate, move-by-move representation of game state reflecting every action any player takes (or the system takes on their behalf), such that, if necessary, you could recreate a game entirely from the ledger entries.

Encoding this ledger into the digital platform gave us a way to ensure its accuracy and also alleviate the burden of any one player or facilitator having to essentially act as a bookkeeper, allowin them to focus on gameplay.

In addition to that, it is a simple matter to then export the ledger for any game (or all games) as structured data for further programmatic analysis to identify insights into gameplay strategies and trends.

## Using the Dashboard

- Header Controls:
  - Start New Game: Creates a new `game_id` and initializes the board.
  - End Game: If the game needs to end before the natural win condition in met, this will declare a winner and perform the appropriate end-of-game ledger maintenance.
- Help Bar:
  - Links to helpful information about major game concepts such as infrastructure, currencty, and contracts.
- Narrative Panel:
  - Narrative elements of the game based on current phase/round.
- Main Sections:
  - Game State: Shows current round, phase, and next actions. Has a tips section for the current phase/round and controls to advance the game.
  - Player Rankings: Lists players, ranked by EV/REP. Allows for system actions to be taken per player such as editing their information, managing/building infrastructure, and making manual adjustments.
  - Infrastructure: Cards showing player-owned infrastructure and their status along with current resources, per-round income/outflow of EV, and capacity requirements.
  - Contracts: Active agreements affecting EV/REP.

## Common Actions

- Add Player: Open Add Player, enter name and specialization, confirm.
- Edit Player: Open Edit Player from the player list to change name or specialization.
- Build Infrastructure: Select an infrastructure card, review cost/effects, and build. Some infra auto-activate under conditions.
- Toggle Infrastructure: Activate/deactivate as needed; certain types auto-deactivate at round end.
- Create/End Contracts: Manage agreements; they can boost or reduce REP and affect operations.
- Manual Adjustments: Facilitator can apply EV/REP changes. These are recorded in the ledger.

## System Game Loop

### Setup (Round 0)

Initialize players and starter infrastructure. Give players an opportunity to do the "New Player Walkthrough".

*Rules/Constraints:*

- Players cannot be added once the game is started.
- Player specialization cannot be changed once the game is started.
- Players can be created by anyone. It's up to each person to identify which "player" they are.
- People my join as facilitator/observer. This does not prevent them from interacting with the game or even creating a player if they choose to do so. In a future iteration a more robust/restrictive facilitation/observation mode could be implemented but right now it is intentionally open-ended.

### Governance

Decide policy, plan builds/contracts.

*Rules/Constraints:*

- Contracts may only be created in the Governance phase, so it is imperative that players plan ahead and create contracts that cover their planned Operations Phase needs
  - Contracts can, however, be broken at any time (for a REP penalty) or mutually ended.
- The timer in the Game State panel is intended to guide the length of the phase, but is not a hard system constraint. Players could choose to ignore it, set it for longer or shorter, or implement a different system altogether, such as limiting each Governance phase to a set number of discussions/contracts.

### Operations

Apply builds, activate infrastructure, process effects.

*Rules/Constraints:*

- Infrastructure can only be built in the Operations Phase
- If the player does not have the requissite power/crew capacity to operate the infrastructure when built, it will be marked as inactive. The player will need to activate it once they have the capacity. This can be done in any phase.
- Infrastructure must be placed on the board in an appropriate spot. The system does not currently constrain the map placement by capacity or type, but that could be added.

### End of Round

System applies automatic rules, then advances to next Governance. Calculates REP/EV gains losses for active contracts, infrastructure yield and maintenance. Checks against the win condition. Auto-deactivates any infrastructure that doesn't meet capacity requirements.
