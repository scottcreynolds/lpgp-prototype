# Infrastructure, Contracts, and Ledger

We're going to work on some core features of the game that involve the infrastructure and ledger elements.

## building infrastructure

provide a feature to allow players to build infrastructure during their turn in the operations phase.
  
Functional Requirements:

- the allowable types and associated values are in the rules.md document.
- the player can build on behalf of someone else, so the owner should default to the player that clicked it but be selectable
- the ledger should reflect the action taken, who was involved, and the associated cost. the building player's EV should immediately reflect the build cost. see the ./doc/PRD.md for more on the ledger
- there should be a free text entry for the board space where the infrastructure will be placed.
- the owning player's inventory should reflect that they own the infrastructure, and their numbers should update acordingly.
- there should be a visual indicator as to whether or not the piece is active or dormant. it should automatically be dormant if the player does not currently meet the crew and power requirements or automatically active if they do.
- players should be able to toggle an active piece of infrastructure to dormant to free up power and crew capacity
- players should be able to toggle a dormnant piece of infrastructure to active if and only if they have enough available power and crew
- provide a modal view so a player can see all of their current infrastructure, the status of each, and manage active/dormant status

## Contracts

Let's make a feature to allow players to lease or trade services and capacity with each other.
  
Functional Requirements:

- One player can enter into a contract with another player that can either last a certain number of rounds or be open-ended
- The players can exchange any of the following:
     *EV
  - Crew Capacity
  - Power Capacity
- contracts can only be made during governance
- a player can choose to break a contract so we need a way to "deactivate" it and mark it as either ended or broken
- the act of making a contract should be in the ledger
- the act of breaking or otherwise ending a contract should be in the ledger
- exchange of EV can either be one-time or per-round for as long as the contract lasts
    *if one-time, the EV should be deducted from the giving player and granted ot the receiving player immediately and a ledger entry logged
  - if per-round, EV should be deducted and granted accordingly at the end of each round and ledger entries logged to reflect the payments

- Manual Adjustments

 We also need a system where players can make one-time adjustments to a player's EV or REP that takes effect immediately and requires a reason to be given. This should go in the ledger.
