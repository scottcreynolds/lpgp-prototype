# Game Rules Summary (Draft)

## 1. Overview
The Lunar Scoreboard models cooperative lunar development under shared commons constraints.  
Players act as **Lunar Development Companies (LDCs)** that build infrastructure, trade resources, and establish territorial operations.  
The rules combine economic simulation with behavioral cooperation tracking.

---

## 2. Starting State

| Category | Starting Value |
|-----------|----------------|
| **Economic Value (EV)** | 50 |
| **Reputation (REP)** | 10 |
| **Shared Infrastructure** | Communications Tower, Launch Pad, Solar Array, Habitat |
| **Objective** | Reach 500 EV while maintaining positive REP |

---

## 3. Player Specializations

| Subtype | Focus | Starting Infrastructure |
|----------|--------|------------------|
| **Resource Extractor** | Resource extraction and mining | H2O Extractor |
| **Infrastructure Provider** | Infrastructure and energy systems | Solar Array |
| **Operations Manager** | Logistics and commerce | Habitat |

### 3.1 Starting Infrastructure

Each subtype has different equipment to begin the game. Starting equipment does not have an initial build cost nor does it have a power or crew requirement but it will share the same maintenance/yield/capacity values of non-starter equipment of the same type.

The starting equipment is assumed to be powered/serviced by the starting commons infrastructure.

---

## 4. Infrastructure

Players can build infrastructure based on their specialty. Each piece of infrastructure provides benefits to the player or other players and has associated costs, yields, and capacity.

### 4.0.1 Associated Values

Each piece of infrastructure has several associated values. This is what they mean:

- cost to build: how much EV should be immediately deducted as a purchase price
- per round maintenance: how much EV should be deducted at the end of every round for maintenance costs.
- capacity: how much of an available resource the infrastructure can provide. this is for Habitats and Solar arrays only.
- yield: how much EV the player gets per round for operating the machinery. Applies to extractors only
- power requirement: how much unused power the player must have available to operate this infrastructure
- crew rquiremet: how much unused habitat space the player must have available to house the crew to operate the infrastructure.

### 4.1 Habitats

Habitats serve as housing and medical facilities for crew. Each piece of infrastructure has as a constraint the number of crew required to operate it, and so each player must have access to an amount of habitat capacity to support that crew. Players who own habitats can lease or trade access to crew space to other players.

- Can be operated by: Operations Manager, Infrastructure Provider
- Cost to Build: 15 EV
- Per Round Maintenance: 10 EV
- Capacity: 25
- Yield: n/a
- Power Requirement: 10
- Crew Requirement: 5

### 4.2 Solar Arrays

Solar arrays provide power to players' infrastructure so that they can be operational. Each piece of infrastructure has as a constraint an amount of power required to operate it and the player must have access to that amount of power for every round the infrastructure is operational. Players can lease or trade access to power to other players.

- Can be operated by: Infrastructure Provider, Resource Extractor
- Cost to Build: 10 EV
- Per Round Maintenance: 5 EV
- Capacity: 25
- Yield: n/a
- Power Requirement: n/a
- Crew Requirement: 5

### 4.3 Helium-3 Extractors

Extractors serve to mine and refine resources from the lunar surface for sale or trade to other players in the form of a direct EV yield per round as long as they are adequately powered and crewed. Helium-3 Extractors are more advanced than H2O extractors and have a higher cost but higher yield.

= Can be operated by: Resource Extractor
- Cost to Build: 20 EV
- Per Round Maintenance: 5 EV
- Capacity: n/a
- Yield: 20 EV
- Power Requirement: 5
- Crew Requirement: 5

### 4.3 H2O Extractors

Extractors serve to mine and refine resources from the lunar surface for sale or trade to other players in the form of a direct EV yield per round as long as they are adequately powered and crewed. H2O extractors mine water-ice for building material, fuel, and life support systems.

- Can be operated by: Resource Extractor, Infrastructure Provider
- Cost to Build: 10 EV
- Per Round Maintenance: 5 EV
- Capacity: n/a
- Yield: 12 EV
- Power Requirement: 5
- Crew Requirement: 5


## 5. Turn and Round Flow

A **round** represents one operational cycle (e.g., one lunar month) and has both an operations and a governance phase.

### 4.1 Sequence of Play
1. **Declare Actions** — players propose builds, trades, or claims.  
2. **Negotiate / Resolve Conflicts** — contested territory or resource conflicts are mediated.  
3. **Execute Actions** — Supabase RPC functions update tables atomically.  
4. **Log and Record** — each state change writes an `event` and `ledger_entry`.  
5. **Review Results** — players debrief using the round summary dashboard.  

### 4.2 Round Closure
At the end of each round:
- Calculate total EV and REP deltas for each player.  
- Display infrastructure built, territories claimed, and trades completed.  
- Record a “snapshot” of state for research reproducibility.

---

## 6. Economic Value (EV)

**Definition:** Numeric measure of accumulated assets, production, and trade success.  

**Increases when:**  
- Building infrastructure that enables further output.  
- Completing trades that yield net gain.  
- Sharing commons productively (if bonuses apply).

**Decreases when:**  
- Spending on construction.  
- Failing cooperative commitments or sustaining losses.

All EV changes generate a corresponding ledger entry.

---

## 7. Reputation (REP)

**Definition:** Social capital reflecting cooperation, transparency, and adherence to agreements.  
**Increases when:**  
- Participating in cooperative actions or resource sharing.  
- Resolving disputes amicably.  

**Decreases when:**  
- Violating resource-sharing rules.  
- Failing to honor negotiated outcomes.

Low REP limits future access to shared resources or joint missions.

---

## 8. Constraint Mechanics

In addition to the currencies, there are constraint mechanics placed on the building and operating of infrastructure.

Each piece of infrastructure has associated requirements of how much power the player must have access to for it to run and how much habitat (crew) space the player must have to operate it.

These capacities are inherent to Solar Arrays and Habitats, respectively, and the player can have access to them either by owning their own facilities or entering contracts with other players who have excess capacity.

If, for instance, a player has access to a total of 20 power, and already has infrastructure built that requires 20 power, then they can build additional infrastructure but it will be dormant until either they get more power through building or trade or deallocate power from another piece they own.

## 9. Commons Infrastructure

Commons assets are owned collectively and available to all players.

| Facility | Function | Access Rule |
|-----------|-----------|-------------|
| **Communications Tower** | Enables communication and trade coordination | Open to all; downtime penalizes REP |
| **Launch Pad** | Enables off-world shipments | Shared; scheduling conflicts resolved by facilitator |
| **Solar Array** | Provides shared power resource | May become contested during peak load |
| **Habitat** | Shared living/operations area | Supports cooperative expansion |

Players utilizing the commons infrastructure will pay 10 EV total per round as maintenance and upkeep.

---

## 10. Victory and Endgame

**Win Condition:**  
- First player to reach **500 EV** wins the simulation.  
- Secondary recognition for highest REP.

**Tiebreaker:**  
- If multiple players exceed 500 EV in the same round, the highest combined EV + REP wins.

The facilitator may also designate **collective victory** if all players achieve positive outcomes without REP violations.

---

## 11. Research Integration Rules

- Every state change triggers two writes:  
  - `events` → qualitative log  
  - `ledger_entries` → quantitative record  

- Rounds end only when **all events are logged** and confirmed.  
- Data exports must include timestamped events for reproducibility.  
- Facilitators may annotate events in an external JSON file for later coding.

---

## 12. Facilitator Controls

Facilitators can:
- Reset the simulation to seed data.  
- Import/export CSVs from Supabase Storage.  
- Override values for testing or demonstration.  
- Mediate conflicts and document reasoning in `notes`.

---

## 13. Data Export Rules

At the end of a session:
- Export all tables (`players`, `infrastructure`, `territories`, `events`, `ledger_entries`, `rounds`) as JSON or CSV.  
- Maintain consistent field names for analysis pipelines.  
- Store outputs in `supabase/storage` under `/exports/<session_id>/`.

---


_Last updated: November 3, 2025_
