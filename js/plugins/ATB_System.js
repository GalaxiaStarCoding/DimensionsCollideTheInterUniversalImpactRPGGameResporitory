//=============================================================================
// ATB_System.js
// Active Time Battle System — Inspired by RPG Maker 2003
// Compatible with: RPG Maker MV 1.6+
//=============================================================================

/*:
 * @plugindesc v1.0.0 Active Time Battle System inspired by RPG Maker 2003.
 * Real-time ATB gauges with pause on player input.
 * @author YourName
 *
 * @param ATB Speed
 * @type number
 * @min 1
 * @max 200
 * @desc Base speed at which ATB gauges fill (default: 100).
 * @default 100
 *
 * @param Gauge Color 1
 * @desc Left gradient color of the ATB gauge (CSS color).
 * @default #e8a000
 *
 * @param Gauge Color 2
 * @desc Right gradient color of the ATB gauge (CSS color).
 * @default #ffe840
 *
 * @param Gauge Full Color 1
 * @desc Left gradient when ATB gauge is full.
 * @default #00c8ff
 *
 * @param Gauge Full Color 2
 * @desc Right gradient when ATB gauge is full.
 * @default #ffffff
 *
 * @param Pause On Input
 * @type boolean
 * @desc Pause all ATB gauges while the player is selecting an action?
 * @default true
 *
 * @param ATB Wait On Menu
 * @type boolean
 * @desc Pause ATB while skill/item menus are open?
 * @default true
 *
 * @param Charge Sound
 * @desc Filename (no extension) of the SE played when an actor's gauge fills.
 * @default Decision1
 *
 * @param Show Gauge Label
 * @type boolean
 * @desc Show "ATB" label next to the gauge?
 * @default true
 *
 * @help
 * ============================================================================
 * INTRODUCTION
 * ============================================================================
 * This plugin replaces RPG Maker MV's default turn-based battle system with
 * an Active Time Battle (ATB) system, closely inspired by RPG Maker 2003.
 *
 * HOW IT WORKS
 * - Every battler (actor or enemy) has an ATB gauge that fills over time.
 * - Fill rate is determined by: battler AGI (speed) + base ATB Speed param.
 * - When a battler's gauge reaches 100%, they are READY to act.
 * - For actors: the game pauses (if Pause On Input = true) so the player
 *   can select an action from the battle command window.
 * - For enemies: they immediately execute their action and their gauge resets.
 * - After acting, the gauge resets to 0 and begins filling again.
 *
 * NOTETAGS
 * ============================================================================
 * Actor/Class/Enemy/Weapon/Armor/State notetags:
 *
 *   <atb speed: X>
 *     Adds X to the battler's ATB fill rate. Can be negative to slow them.
 *     Example: <atb speed: 25>
 *
 *   <atb start: X>
 *     Sets the battler's starting ATB gauge to X% at battle start (0-100).
 *     Example: <atb start: 50>
 *
 *   <atb charge: X>
 *     After this battler acts, fills their gauge to X% instead of 0.
 *     Useful for "fast" characters who chain actions.
 *     Example: <atb charge: 30>
 *
 * ============================================================================
 * PLUGIN COMMANDS
 * ============================================================================
 *   ATB Speed X          — Set the global ATB speed to X during battle.
 *   ATB Pause            — Pause all ATB gauges.
 *   ATB Resume           — Resume all ATB gauges.
 *   ATB Fill actorId X   — Set actor (by ID) ATB gauge to X% (0-100).
 *
 * ============================================================================
 */

(function () {
    'use strict';

    //=========================================================================
    // PARAMETERS
    //=========================================================================
    const params       = PluginManager.parameters('ATB_System');
    const ATB_BASE     = Number(params['ATB Speed']    || 100);
    const GAUGE_C1     = String(params['Gauge Color 1']      || '#e8a000');
    const GAUGE_C2     = String(params['Gauge Color 2']      || '#ffe840');
    const GAUGE_F1     = String(params['Gauge Full Color 1'] || '#00c8ff');
    const GAUGE_F2     = String(params['Gauge Full Color 2'] || '#ffffff');
    const PAUSE_INPUT  = String(params['Pause On Input']     || 'true') === 'true';
    const PAUSE_MENU   = String(params['ATB Wait On Menu']   || 'true') === 'true';
    const CHARGE_SE    = String(params['Charge Sound']       || 'Decision1');
    const SHOW_LABEL   = String(params['Show Gauge Label']   || 'true') === 'true';

    const ATB_MAX      = 1000; // Internal max value (gauge / ATB_MAX = %)

    //=========================================================================
    // UTILITY — Notetag helpers
    //=========================================================================
    function getMetaNumber(obj, tag, fallback) {
        if (!obj || !obj.meta) return fallback;
        const v = obj.meta[tag];
        if (v === undefined || v === null) return fallback;
        return Number(v);
    }

    function getBattlerMeta(battler, tag, fallback) {
        const sources = [];
        if (battler.isActor()) {
            sources.push(battler.actor());
            sources.push(battler.currentClass());
            battler.equips().forEach(e => { if (e) sources.push(e); });
        } else {
            sources.push(battler.enemy());
        }
        battler.states().forEach(s => sources.push(s));

        let total = fallback;
        let found = false;
        sources.forEach(src => {
            if (src && src.meta && src.meta[tag] !== undefined) {
                total = found ? total + Number(src.meta[tag]) : Number(src.meta[tag]);
                found = true;
            }
        });
        return found ? total : fallback;
    }

    //=========================================================================
    // ATB STATE — Attached to Game_Battler
    //=========================================================================
    const _Game_Battler_initMembers = Game_Battler.prototype.initMembers;
    Game_Battler.prototype.initMembers = function () {
        _Game_Battler_initMembers.call(this);
        this._atbGauge    = 0;   // 0 to ATB_MAX
        this._atbReady    = false;
        this._atbPaused   = false;
    };

    Game_Battler.prototype.atbGauge = function () {
        return this._atbGauge || 0;
    };

    Game_Battler.prototype.atbRate = function () {
        return this._atbGauge / ATB_MAX;
    };

    Game_Battler.prototype.isAtbReady = function () {
        return this._atbReady === true;
    };

    // Fill rate per frame: based on AGI relative to a base of 100 AGI
    Game_Battler.prototype.atbFillRate = function () {
        const agi        = this.agi || 1;
        const speedBonus = getBattlerMeta(this, 'atb speed', 0);
        const base       = ATB_BASE + speedBonus;
        // Scale: at 100 AGI and ATB_BASE=100 → fills in ~600 frames (10s @ 60fps)
        return (agi / 100) * (base / 100) * (ATB_MAX / 360);
    };

    Game_Battler.prototype.atbChargeStart = function () {
        return getBattlerMeta(this, 'atb charge', 0);
    };

    Game_Battler.prototype.resetAtb = function () {
        const startPct   = this.atbChargeStart();
        this._atbGauge   = Math.floor(ATB_MAX * (startPct / 100));
        this._atbReady   = false;
    };

    Game_Battler.prototype.initAtbGauge = function () {
        const startPct   = getBattlerMeta(this, 'atb start', 0);
        this._atbGauge   = Math.floor(ATB_MAX * (startPct / 100));
        this._atbReady   = false;
    };

    Game_Battler.prototype.updateAtb = function () {
        if (!BattleManager.isAtbActive()) return;
        if (this._atbPaused) return;
        if (this._atbReady) return;
        if (!this.isAlive()) return;

        this._atbGauge = Math.min(ATB_MAX, this._atbGauge + this.atbFillRate());

        if (this._atbGauge >= ATB_MAX) {
            this._atbGauge = ATB_MAX;
            this._atbReady = true;
            this.onAtbReady();
        }
    };

    Game_Battler.prototype.onAtbReady = function () {
        // Overridden in actor/enemy below
    };

    //=========================================================================
    // ACTOR ATB
    //=========================================================================
    Game_Actor.prototype.onAtbReady = function () {
        // Play charge sound
        if (CHARGE_SE) {
            AudioManager.playSe({ name: CHARGE_SE, volume: 90, pitch: 100, pan: 0 });
        }
        // BattleManager will detect this and open command window
    };

    //=========================================================================
    // ENEMY ATB
    //=========================================================================
    Game_Enemy.prototype.onAtbReady = function () {
        // Enemy acts immediately — queued by BattleManager
    };

    //=========================================================================
    // BATTLE MANAGER — Core ATB Logic
    //=========================================================================
    BattleManager._atbActive  = false;
    BattleManager._atbPaused  = false;
    BattleManager._atbQueue   = []; // Battlers ready to act (enemies queued)
    BattleManager._atbInputActor = null; // Actor currently choosing action

    BattleManager.isAtbActive = function () {
        return this._atbActive && !this._atbPaused;
    };

    BattleManager.pauseAtb = function () {
        this._atbPaused = true;
    };

    BattleManager.resumeAtb = function () {
        this._atbPaused = false;
    };

    //-- Override: setup
    const _BM_setup = BattleManager.setup;
    BattleManager.setup = function (troopId, canEscape, canLose) {
        _BM_setup.call(this, troopId, canEscape, canLose);
        this._atbActive      = true;
        this._atbPaused      = false;
        this._atbQueue       = [];
        this._atbInputActor  = null;
        // Init gauges
        $gameParty.battleMembers().forEach(a => a.initAtbGauge());
        $gameTroop.members().forEach(e   => e.initAtbGauge());
    };

    //-- Override: battle type (disable default turn logic)
    BattleManager.isTurnBased = function () { return false; };
    BattleManager.isAtb       = function () { return true;  };

    //-- Override: startBattle
    const _BM_startBattle = BattleManager.startBattle;
    BattleManager.startBattle = function () {
        _BM_startBattle.call(this);
        this._phase = 'atb'; // Custom ATB phase
    };

    //-- Override: update (main loop)
    const _BM_update = BattleManager.update;
    BattleManager.update = function () {
        if (!this.isBusy() && !this.updateEvent()) {
            if (this._phase === 'atb') {
                this.updateAtbPhase();
                return;
            }
        }
        // Fall through for victory/defeat/escape handling
        if (this._phase === 'battleEnd' || this._phase === 'turnEnd') {
            _BM_update.call(this);
        }
    };

    BattleManager.updateAtbPhase = function () {
        // Check win/loss first
        if (this.checkAbort())  return;
        if (this.updateEvent()) return;

        const shouldPause = (PAUSE_INPUT && this._atbInputActor) ||
                            (PAUSE_MENU  && this._inSubWindow);

        if (!shouldPause) {
            // Tick all battlers
            const all = $gameParty.battleMembers().concat($gameTroop.members());
            all.forEach(b => { if (b.isAlive()) b.updateAtb(); });

            // Queue newly-ready enemies
            $gameTroop.members().forEach(e => {
                if (e.isAtbReady() && e.isAlive() && !this._atbQueue.includes(e)) {
                    this._atbQueue.push(e);
                }
            });
        }

        // Process enemy queue one at a time when no actor is inputting
        if (!this._atbInputActor && this._atbQueue.length > 0) {
            this.processAtbEnemy(this._atbQueue.shift());
            return;
        }

        // Find next ready actor (none currently inputting)
        if (!this._atbInputActor) {
            const readyActor = $gameParty.battleMembers().find(a => a.isAtbReady() && a.isAlive());
            if (readyActor) {
                this._atbInputActor = readyActor;
                this._actorIndex    = $gameParty.battleMembers().indexOf(readyActor);
                this.startActorInput();
            }
        }
    };

    BattleManager.startActorInput = function () {
        if (this._atbInputActor) {
            this._atbInputActor.setActionState('inputting');
            this._actorIndex = $gameParty.battleMembers().indexOf(this._atbInputActor);
            $gameParty.battleMembers().forEach(a => a.makeActions());
            SceneManager._scene.startActorCommandSelection();
        }
    };

    BattleManager.processAtbEnemy = function (enemy) {
        enemy.makeActions();
        const action = enemy.action(0);
        if (action) {
            this.executeAtbAction(enemy, action);
        }
        enemy.resetAtb();
    };

    BattleManager.executeAtbAction = function (subject, action) {
        this._subject   = subject;
        this._action    = action;
        this._targets   = action.makeTargets();
        subject.useItem(action.item());
        this.refreshStatus();

        // Log and animate
        this._logWindow.startAction(subject, action, this._targets);
        this._targets.forEach(target => {
            action.apply(target);
            this._logWindow.displayActionResults(subject, target);
        });
        this._logWindow.endAction(subject);
        this.refreshStatus();
        this.checkBattleEnd();
    };

    // Called when actor finishes selecting action
    BattleManager.inputtingActor = function () {
        return this._atbInputActor;
    };

    BattleManager.atbActorActionSelected = function () {
        const actor = this._atbInputActor;
        if (!actor) return;

        actor.setActionState('waiting');
        this._atbInputActor = null;

        const action = actor.action(0);
        if (action) {
            this.executeAtbAction(actor, action);
        }
        actor.resetAtb();
        this._phase = 'atb';
    };

    //-- Override: isBusy
    const _BM_isBusy = BattleManager.isBusy;
    BattleManager.isBusy = function () {
        return _BM_isBusy.call(this) ||
               (this._logWindow && this._logWindow.isBusy());
    };

    //-- Override checkBattleEnd to stay in atb phase
    const _BM_checkBattleEnd = BattleManager.checkBattleEnd;
    BattleManager.checkBattleEnd = function () {
        if (_BM_checkBattleEnd.call(this)) {
            this._atbActive = false;
            return true;
        }
        return false;
    };

    //=========================================================================
    // SCENE_BATTLE — Hook into actor command window
    //=========================================================================
    const _SB_isAnyInputWindowActive = Scene_Battle.prototype.isAnyInputWindowActive;
    Scene_Battle.prototype.isAnyInputWindowActive = function () {
        return _SB_isAnyInputWindowActive.call(this);
    };

    const _SB_startActorCommandSelection = Scene_Battle.prototype.startActorCommandSelection;
    Scene_Battle.prototype.startActorCommandSelection = function () {
        _SB_startActorCommandSelection.call(this);
        BattleManager._inSubWindow = false;
    };

    // Intercept "ok" on actor command to run ATB action
    const _SB_commandAttack = Scene_Battle.prototype.commandAttack;
    Scene_Battle.prototype.commandAttack = function () {
        const actor = BattleManager.inputtingActor();
        if (actor) {
            actor.action(0).setAttack();
        }
        BattleManager.atbActorActionSelected();
        this._actorCommandWindow.deactivate();
        this._partyCommandWindow.deactivate();
    };

    const _SB_commandSkill = Scene_Battle.prototype.commandSkill;
    Scene_Battle.prototype.commandSkill = function () {
        BattleManager._inSubWindow = true;
        _SB_commandSkill.call(this);
    };

    const _SB_commandItem = Scene_Battle.prototype.commandItem;
    Scene_Battle.prototype.commandItem = function () {
        BattleManager._inSubWindow = true;
        _SB_commandItem.call(this);
    };

    const _SB_commandGuard = Scene_Battle.prototype.commandGuard;
    Scene_Battle.prototype.commandGuard = function () {
        const actor = BattleManager.inputtingActor();
        if (actor) {
            actor.action(0).setGuard();
        }
        BattleManager.atbActorActionSelected();
        this._actorCommandWindow.deactivate();
        this._partyCommandWindow.deactivate();
    };

    // After skill selected
    const _SB_onSkillOk = Scene_Battle.prototype.onSkillOk;
    Scene_Battle.prototype.onSkillOk = function () {
        const actor  = BattleManager.inputtingActor();
        const skill  = this._skillWindow.item();
        if (actor && skill) {
            actor.action(0).setSkill(skill.id);
            actor.lastBattleSkill().setObject(skill);
        }
        this._skillWindow.hide();
        BattleManager._inSubWindow = false;
        BattleManager.atbActorActionSelected();
    };

    const _SB_onSkillCancel = Scene_Battle.prototype.onSkillCancel;
    Scene_Battle.prototype.onSkillCancel = function () {
        BattleManager._inSubWindow = false;
        _SB_onSkillCancel.call(this);
    };

    // After item selected
    const _SB_onItemOk = Scene_Battle.prototype.onItemOk;
    Scene_Battle.prototype.onItemOk = function () {
        const actor = BattleManager.inputtingActor();
        const item  = this._itemWindow.item();
        if (actor && item) {
            actor.action(0).setItem(item.id);
        }
        this._itemWindow.hide();
        BattleManager._inSubWindow = false;
        BattleManager.atbActorActionSelected();
    };

    const _SB_onItemCancel = Scene_Battle.prototype.onItemCancel;
    Scene_Battle.prototype.onItemCancel = function () {
        BattleManager._inSubWindow = false;
        _SB_onItemCancel.call(this);
    };

    //=========================================================================
    // WINDOW_BASE — ATB Gauge Drawing
    //=========================================================================
    Window_Base.prototype.drawAtbGauge = function (battler, x, y, width) {
        const rate   = battler.atbRate();
        const full   = battler.isAtbReady();
        const c1     = full ? GAUGE_F1 : GAUGE_C1;
        const c2     = full ? GAUGE_F2 : GAUGE_C2;
        const color0 = this.gaugeBackColor();
        const height = 6;

        // Background
        this.contents.fillRect(x, y + 18 - height, width, height, color0);
        // Fill
        const fillW = Math.floor(width * rate);
        if (fillW > 0) {
            const grad = this.contents.context.createLinearGradient(x, 0, x + width, 0);
            grad.addColorStop(0, c1);
            grad.addColorStop(1, c2);
            this.contents.context.fillStyle = grad;
            this.contents.context.fillRect(x, y + 18 - height, fillW, height);
        }

        if (SHOW_LABEL) {
            this.changeTextColor(full ? '#00e8ff' : '#c8c8c8');
            this.contents.fontSize = 12;
            this.drawText('ATB', x, y, width, 'right');
            this.resetFontSettings();
        }
    };

    //=========================================================================
    // WINDOW_BATTLESTATUS — Show ATB Gauges
    //=========================================================================
    const _WBS_drawBasicArea = Window_BattleStatus.prototype.drawBasicArea;
    Window_BattleStatus.prototype.drawBasicArea = function (rect, actor) {
        _WBS_drawBasicArea.call(this, rect, actor);
        // Draw ATB gauge below HP/MP
        const gx = rect.x;
        const gy = rect.y + rect.height - 24;
        this.drawAtbGauge(actor, gx, gy, rect.width - 2);
    };

    // Continuously refresh gauge during battle
    const _WBS_update = Window_BattleStatus.prototype.update;
    Window_BattleStatus.prototype.update = function () {
        _WBS_update.call(this);
        if ($gameParty.inBattle()) {
            this.refresh();
        }
    };

    //=========================================================================
    // PLUGIN COMMANDS
    //=========================================================================
    const _GI_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _GI_pluginCommand.call(this, command, args);
        if (command === 'ATB') {
            const sub = args[0];
            if (sub === 'Speed' && args[1]) {
                // Dynamic speed change not supported at runtime (ATB speed is per-battler)
                console.log('[ATB] Speed command received: ' + args[1]);
            } else if (sub === 'Pause') {
                BattleManager.pauseAtb();
            } else if (sub === 'Resume') {
                BattleManager.resumeAtb();
            } else if (sub === 'Fill') {
                const actorId = Number(args[1]);
                const pct     = Number(args[2]);
                const actor   = $gameActors.actor(actorId);
                if (actor) {
                    actor._atbGauge = Math.floor(ATB_MAX * (pct / 100));
                    if (actor._atbGauge >= ATB_MAX) {
                        actor._atbGauge = ATB_MAX;
                        actor._atbReady = true;
                    }
                }
            }
        }
    };

    //=========================================================================
    // GAME_PARTY — Disable default turn action selection
    //=========================================================================
    // MV's makeActions is designed for turn-based; skip in ATB
    const _GP_makeActions = Game_Party.prototype.makeActions;
    Game_Party.prototype.makeActions = function () {
        if (BattleManager.isAtb && BattleManager.isAtb()) return;
        _GP_makeActions.call(this);
    };

    const _GT_makeActions = Game_Troop.prototype.makeActions;
    Game_Troop.prototype.makeActions = function () {
        if (BattleManager.isAtb && BattleManager.isAtb()) return;
        _GT_makeActions.call(this);
    };

    // Each battler still needs to make their own action on demand
    const _GB_makeActions = Game_Battler.prototype.makeActions;
    Game_Battler.prototype.makeActions = function () {
        _GB_makeActions.call(this);
    };

    //=========================================================================
    // STATUS EFFECTS — Stun / Stop interactions
    //=========================================================================
    // If a battler is restricted (paralyzed, etc.) ATB does not fill
    const _GB_updateAtb = Game_Battler.prototype.updateAtb;
    Game_Battler.prototype.updateAtb = function () {
        if (this.isRestricted()) return; // Paralyzed, confused, etc. — no ATB
        _GB_updateAtb.call(this);
    };

    // Haste/Slow: use state notetags <atb speed: X> (already handled above)

    console.log('[ATB_System] Active Time Battle System loaded successfully.');

})();
