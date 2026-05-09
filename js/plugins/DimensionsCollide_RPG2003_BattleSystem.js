//=============================================================================
// DimensionsCollide_RPG2003_BattleSystem.js
// v1.3 — Fix: ReferenceError + Improved Dialogue Messages
//=============================================================================

(function() {
    'use strict';

    const BAR_HEIGHT = 14; 
    const HP_C1 = '#ff3300'; const HP_C2 = '#ffcc00';
    const MP_C1 = '#3366ff'; const MP_C2 = '#00ffff';
    const TP_C1 = '#00aa00'; const TP_C2 = '#00ff00';

    //=============================================================================
    // 1. TOP DIALOGUE BAR
    //=============================================================================
    function Window_BattleDialogue() { this.initialize.apply(this, arguments); }
    Window_BattleDialogue.prototype = Object.create(Window_Base.prototype);
    Window_BattleDialogue.prototype.constructor = Window_BattleDialogue;

    Window_BattleDialogue.prototype.initialize = function() {
        Window_Base.prototype.initialize.call(this, 0, 0, Graphics.boxWidth, 70);
        this._text = "";
    };

    Window_BattleDialogue.prototype.setText = function(text) {
        if (this._text !== text) {
            this._text = text;
            this.contents.clear();
            this.drawText(this._text, 0, 0, this.contentsWidth(), 'center');
        }
    };

    //=============================================================================
    // 2. SEQUENTIAL ATB LOGIC
    //=============================================================================
    
    BattleManager.getNextSubject = function() { return null; };

    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        this.updateSequentialAtb();
    };

    Scene_Battle.prototype.updateSequentialAtb = function() {
        if (!BattleManager.isBusy() && !this.isAnyWindowActive()) {
            $gameParty.battleMembers().concat($gameTroop.members()).forEach(battler => {
                if (battler.isAlive() && battler.tp < 100) {
                    battler.gainTp(battler.agi / 80); 
                    if (battler.tp >= 100) {
                        this.processSequentialTurn(battler);
                    }
                }
            });
        }
    };

    Scene_Battle.prototype.isAnyWindowActive = function() {
        return this._actorCommandWindow.active || this._skillWindow.active || this._itemWindow.active;
    };

    Scene_Battle.prototype.processSequentialTurn = function(battler) {
        if (battler.isActor()) {
            BattleManager._subject = battler;
            this._dialogueWindow.setText(battler.name() + "'s Turn!"); 
            this.startActorCommandSelection();
        } else {
            this._dialogueWindow.setText(battler.name() + " Attacks!");
            battler.makeActions();
            BattleManager.startAction();
            battler.setTp(0);
        }
    };

    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        if (this._subject) this._subject.setTp(0);
        _BattleManager_endAction.call(this);
    };

    //=============================================================================
    // 3. LAYOUT & WINDOW CREATION (FIXED)
    //=============================================================================

    // 🟢 FIXED ALIASING HERE:
    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        this._dialogueWindow = new Window_BattleDialogue();
        this.addWindow(this._dialogueWindow);
        this._dialogueWindow.setText("Battle Start!"); 
    };

    Window_Base.prototype.drawGauge = function(x, y, width, rate, color1, color2) {
        const fillW = Math.floor(width * rate);
        const gaugeY = y + this.lineHeight() - BAR_HEIGHT - 2;
        this.contents.fillRect(x, gaugeY, width, BAR_HEIGHT, '#333333');
        this.contents.gradientFillRect(x, gaugeY, fillW, BAR_HEIGHT, color1, color2);
    };

    Window_Base.prototype.hpGaugeColor1 = function() { return HP_C1; };
    Window_Base.prototype.hpGaugeColor2 = function() { return HP_C2; };
    Window_Base.prototype.mpGaugeColor1 = function() { return MP_C1; };
    Window_Base.prototype.mpGaugeColor2 = function() { return MP_C2; };
    Window_Base.prototype.tpGaugeColor1 = function() { return TP_C1; };
    Window_Base.prototype.tpGaugeColor2 = function() { return TP_C2; };

})();