# ATB Battle System - RPG Maker 2003 Style
## Setup Guide

---

## What This Plugin Does

Recreates the RPG Maker 2003 battle flow inside RPG Maker MV, including:

- **Party Command** — Fight / Auto / Escape appears first when battle starts
- **ATB (TR) Bar** — Each character has a Time bar that fills up over time
- **Actor Command** — Attack / Skill / Item / Defend appear when TR bar is full
- **Result Banner** — "Enemy Defeated!" or "Defeated..." banner at the top
- **Face Shake** — Character face shakes when they take damage
- **KO Face Dim** — Character face goes dark when HP = 0

---

## Installation

1. Copy `ATB_BattleSystem_2003Style.js` into your project folder:
   `YourProject/js/plugins/ATB_BattleSystem_2003Style.js`

2. Open RPG Maker MV

3. Go to Tools → Plugin Manager

4. Click an empty row, then click the ... button to browse

5. Select ATB_BattleSystem_2003Style

6. Set the parameters (see below), then click OK

---

## Plugin Parameters

- **ATB Speed** (default: 3) — How fast the TR bar fills. 1 = very slow, 10 = super fast.
- **Show Party Command First** (default: true) — Shows Fight/Auto/Escape at battle start. Keep this true.

---

## Battle Flow

### Step 1 — Battle Starts: Party Command (Image 1)

Fight / Auto / Escape menu appears in the top-left:
- **Fight**: You manually control each actor when their TR bar fills
- **Auto**: The game auto-attacks for all your actors
- **Escape**: Attempt to flee the battle

### Step 2 — TR Bar Fills: Actor Command (Image 2)

When a character's TR bar becomes full, their command menu appears:
- **Attack** — Basic attack on an enemy
- **Skill** — Opens the skill list
- **Item** — Opens the item bag
- **Defend** — Guard stance (reduces incoming damage)

While you choose, that character's action is paused. Other TR bars keep filling and enemies keep acting!

### Step 3 — Battle Ends: Result Banner (Image 3)

After all enemies are defeated or your party is wiped out, a banner appears at the top of the screen:
- Win: "Enemy Defeated!"
- Lose: "Defeated..."

---

## Status Bar Layout (Bottom of Screen)

Each party member at the bottom shows:

  [FACE]  HP [bar]  2999
          WE [bar]   328
          TR [bar]  (fills over time — when full, your turn!)

- HP = Health Points
- WE = Weapon Energy / MP
- TR = Time Rate (the ATB gauge)

---

## Compatibility

- Works with the default MV battle scene
- Turn OFF other ATB or battle system plugins to avoid conflicts
- Actors need Face Graphics assigned in the database for the face display to work
- Enemies need Actions set in the Troops tab in the database

---

## Troubleshooting

- Party command doesn't show → Set "Show Party Command First" to true in Plugin Manager
- TR bar missing → Make sure no other status window plugins override the status window
- Enemies never act → Add actions to your troop in the database
- Battle never ends → Check your troop win/lose conditions in the database
