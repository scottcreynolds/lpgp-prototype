# Lunar Scoreboard Web Application — Product Requirements Document (PRD)
Version 0.1 · November 3, 2025

---

## Table of Contents
1. [Overview](#1-overview)
2. [Objectives](#2-objectives)
3. [Target Users](#3-target-users)
4. [Gameplay Framework](#4-gameplay-framework)
5. [Functional Requirements](#5-functional-requirements)
6. [Data Model](#6-data-model)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Scoring and Cooperation Logic](#8-scoring-and-cooperation-logic)
9. [Research Integration](#9-research-integration)
10. [User Experience Principles](#10-user-experience-principles)
11. [Future Development](#11-future-development)
12. [Development Phases](#12-development-phases)
13. [Success Metrics](#13-success-metrics)
14. [Change Log](#14-change-log)

[↑ Back to top](#lunar-scoreboard-web-application--product-requirements-document-prd)

---

## 1. Overview
The Lunar Policy Gaming Platform (LPGP) is a serious-game for simulating cooperative lunar development being developed as part of a student research project at University.

This project is the companion automated scorekeeping and dashboard system. 
 
Players, representing Lunar Development Companies (LDCs), manage individual and shared infrastructure, resources, and territory.  

The system tracks economic value (EV) and reputation (REP) to simulate collaboration and competition.

---

## 2. Objectives

### 2.1 Project Goals
- Deliver a functional SPA using React and Supabase/Postgres.  
- Capture gameplay actions as structured data for behavioral research.  
- Support iterative experimentation with scenarios and policies.
- Provide a fun and meaningful player experience and reduce the cognitive load of keeping track of game actions and values.

### 2.2 Game Objectives
- Encourage cooperative strategies under resource limits.  
- Balance competition (EV) with cooperation (REP).  
- Produce empirical datasets of decisions and outcomes.

---

## 3. Target Users

| User | Description | Primary Goal |
|------|--------------|---------------|
| **Players** | Participants representing LDCs | Build infrastructure and reach 500 EV |
| **Facilitators / Researchers** | Moderators and analysts | Observe, export, and evaluate cooperation patterns |
| **Developers / Designers** | Technical contributors | Extend the simulation or add scenario variations |

---

## 4. Gameplay Framework

All values should be configurable even when defaults are present. The goal is to be able to easily test different game parameters.

### 4.1 Starting Conditions
- Each player starts with **50 EV** and **10 REP**  
- Shared commons: **Communications Tower**, **Launch Pad**, **Solar Array**, **Habitat**  
- Victory condition: **500 EV**

### 4.2 Player Specializations
All players adopt a main role of "Lunar Development Company Rep" but can choose from three specializations, each of which confers different bonuses.

- **Resource Extractor** — Specializes in mining and resource acquisition
	* starting equipment: H2O Extractor  
- **Infrastructure Provider** — Specializes in construction and energy systems  
	* starting equipment: Solar Array
- **Operations Manager** — specializes in logistics and human resources. 
	* starting equipment: Habitat 

Each begins with three allocated skill points and three additional that they can allocate as they choose.

#### 4.2.1 Skill Trees

Definition in progress. Ignore for now.

### 4.3 Gameplay

The game consists of multiple rounds that each have two phases: Governance, and Operations.

#### 4.3.1 Governance Phase

- The Governance Phase begins with the drawing of a World Event Card, which creates a condition persistent for the current round of play that affects some or all players in some way.
- The player with the highest current REP value gets the right to bring up the first issue/proposal in Governance.
- In the case of a tie vote, the player with the highest current rep gets the tiebreaking vote.
- The governance phase is time-limited. The time can be configured but defaults to 3 minutes.

In the Governance phase, players can:

- enter into contracts and agreements
- decide where to build infrastructure or allocate rsources
- jointly agree to share or trade resources
- vote to change rules
- vote to penalize other players for breaching contracts and agreements

#### 4.3.2 Operations Phase

- The Operations phase is where players build and manage their infrastructure and gain/lose currency
- The turn order is determined by random generation
- Players cannot enter new contracts in the operations phase but can choose not to uphold existing ones if they think it will benefit them

In the operations phase, players can:

- Build infrastructure for themself or others
- allocate power and crew to infrastructure for themself or others


### 4.4 Admin

- Players should be able to make manual adjustments to EV and rep and enter gains and losses for the round in addition to the automated actions

---

## 5. Functional Requirements

### 5.1 Modules
**Players** — manage EV/REP, subtype, and skills; adjust scores with reason logging.  
**Infrastructure** — list/build facilities; auto-deduct EV cost; log ledger + event.  
**Territories** — display and claim lunar sites; show contested status.  
**Contracts** - Represent deals players have made with each other to share or trade resources and currency for one or more rounds.
**Rounds** — summarize EV/REP deltas and events.  
**Admin** — reset to seed data; import/export CSVs; initialize new rounds.
**Dashboard** - display realtime stats on the game in progress for all players

---

## 6. Data Model

We will build this out but the key entities are:
- players: tracks current players and their values
- inventory: tracks what infrastructure players currently own and where they are placed on the board
- ledger: tracks every transation and action in the game including any currency changes and which round it occurred in
- contracts: agreements players have entered into and associated values of rep, resources, or EV changing hands and for how many rounds
- infrastructure: tracks available infrastructure that can be built by players and associated costs and yields

---

## 7. Non-Functional Requirements

| Category | Requirement |
|-----------|--------------|
| **Architecture** | React SPA + Supabase/Postgres |
| **Performance** | < 100 ms typical transaction latency |
| **Reliability** | All mutations atomic via RPC functions |
| **Security** | Supabase RLS; authenticated writes only |
| **Extensibility** | Schema and RPC easily versioned |
| **Traceability** | Complete audit trail in `events` + `ledger_entries` |

---

## 8. Scoring and Cooperation Logic

### 8.1 EV / REP
EV → economic success  REP → cooperative trust.  
Both stored on the player and adjusted through RPC functions.


### 8.3 Victory Condition
A player wins when EV ≥ 500.  

---

## 9. Research Integration
All player actions create:
- a **ledger entry** (row in `ledger_entries`)  

This supports quantitative and qualitative analysis, replay, and visualization.

---

## 10. User Experience Principles
| Principle | Description |
|------------|--------------|
| **Play** | Immediate feedback and visible scoring |
| **Meaning** | End-of-round debrief explains causality |
| **Reality** | Realistic lunar resource and policy constraints |

---

## 11. Future Development
1. Player turn planner
2. Scenario imports (SpaceNet-style)  
3. Skill tree layer
4. Policy/governance rule layer  
5. Analytics and visualization dashboard  


---

## 13. Success Metrics

| Metric | Target |
|---------|--------|
| Functional completeness | All core modules implemented |
| Data fidelity | 100 % of actions logged |
| Usability | < 2 min onboarding |
| Research utility | Export usable without cleanup |

---

## 14. Change Log

| Version | Date | Summary |
|----------|------|----------|
| **v0.1** | Nov 3 2025 | Initial specification, React + Supabase architecture |
| **v0.2** | TBD | Add inventory quantities + lease durations |

[↑ Back to top](#lunar-scoreboard-web-application--product-requirements-document-prd)
