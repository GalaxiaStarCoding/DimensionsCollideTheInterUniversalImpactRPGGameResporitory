//=============================================================================
// BlindMode.js
// Accessibility Plugin — Blind Mode for RPG Maker MV
// Supports: NVDA, JAWS, Windows Narrator, Generic Screen Reader
//=============================================================================

/*:
 * @plugindesc v1.0.0 Adds Blind Mode to the Options Menu with support for
 * NVDA, JAWS, Windows Narrator, and Generic Screen Reader.
 * @author YourName
 *
 * @param Default Blind Mode
 * @type select
 * @option Off
 * @value 0
 * @option NVDA
 * @value 1
 * @option JAWS
 * @value 2
 * @option Narrator
 * @value 3
 * @option Screen Reader
 * @value 4
 * @desc The default Blind Mode on first launch.
 * @default 0
 *
 * @param Announce Battle Events
 * @type boolean
 * @desc Announce battle events (attacks, damage, skill use) via screen reader?
 * @default true
 *
 * @param Announce Menu Navigation
 * @type boolean
 * @desc Announce menu items when navigating?
 * @default true
 *
 * @param Announce Map Events
 * @type boolean
 * @desc Announce NPC names and map locations when interacting?
 * @default true
 *
 * @param Speech Rate
 * @type number
 * @min 0.5
 * @max 2.0
 * @decimals 1
 * @desc Speech rate for Web Speech API fallback (1.0 = normal).
 * @default 1.0
 *
 * @param Speech Volume
 * @type number
 * @min 0
 * @max 1
 * @decimals 1
 * @desc Speech volume for Web Speech API fallback (0.0 - 1.0).
 * @default 1.0
 *
 * @help
 * ============================================================================
 * INTRODUCTION
 * ============================================================================
 * BlindMode.js adds a "Blind Mode" option to the RPG Maker MV Options menu,
 * allowing players who use screen readers to select their assistive technology.
 * The plugin then adapts its announcements and ARIA live regions to best
 * communicate with the selected reader.
 *
 * BLIND MODE OPTIONS
 * ============================================================================
 *   Off          — No screen reader support active.
 *   NVDA         — Optimized for NonVisual Desktop Access (NVDA).
 *                  Uses ARIA live regions with "assertive" priority for
 *                  battle events, "polite" for menus.
 *   JAWS         — Optimized for Job Access With Speech (JAWS).
 *                  Uses role="alert" injection for reliable JAWS pickup.
 *   Narrator     — Optimized for Windows Narrator.
 *                  Uses aria-live="polite" with short, structured phrases.
 *   Screen Reader— Generic mode compatible with any ARIA-aware screen reader.
 *                  Uses Web Speech API as fallback if ARIA is unavailable.
 *
 * WHAT GETS ANNOUNCED
 * ============================================================================
 *   - Menu navigation: item names, descriptions, current selection index.
 *   - Battle events: who attacks whom, damage dealt, skills used, death.
 *   - Map interaction: NPC names, chest contents, event trigger feedback.
 *   - System messages: save confirmed, level up, game over.
 *
 * PLUGIN COMMANDS
 * ============================================================================
 *   BlindMode Set 1       — Set blind mode to NVDA (1=NVDA,2=JAWS,3=Narrator,4=Screen Reader,0=Off)
 *   BlindMode Announce text here  — Manually trigger an announcement.
 *   BlindMode Silence     — Cancel any queued speech.
 *
 * NOTETAGS (Maps & Events)
 * ============================================================================
 *   <announce: Your custom text here>
 *   Place in an event's Note field. When the player interacts with that event
 *   or steps on it (if it's an autorun/parallel), the text is announced.
 *
 *   <location: Room Name>
 *   Place in Map Note fields. Announces the room name when the player enters.
 *
 * KEYBOARD SHORTCUT
 * ============================================================================
 *   F8 — Cycle through Blind Modes in-game (Off → NVDA → JAWS → Narrator →
 *        Screen Reader → Off).
 *
 * ============================================================================
 */

(function () {
    'use strict';

    //=========================================================================
    // PARAMETERS
    //=========================================================================
    const params          = PluginManager.parameters('BlindMode');
    const DEFAULT_MODE    = Number(params['Default Blind Mode']      || 0);
    const ANNOUNCE_BATTLE = String(params['Announce Battle Events']  || 'true') === 'true';
    const ANNOUNCE_MENU   = String(params['Announce Menu Navigation']|| 'true') === 'true';
    const ANNOUNCE_MAP    = String(params['Announce Map Events']     || 'true') === 'true';
    const SPEECH_RATE     = parseFloat(params['Speech Rate']         || 1.0);
    const SPEECH_VOL      = parseFloat(params['Speech Volume']       || 1.0);

    //=========================================================================
    // BLIND MODE CONSTANTS
    //=========================================================================
    const BLIND_OFF    = 0;
    const BLIND_NVDA   = 1;
    const BLIND_JAWS   = 2;
    const BLIND_NARR   = 3;
    const BLIND_SR     = 4;

    const MODE_NAMES = ['Off', 'NVDA', 'JAWS', 'Narrator', 'Screen Reader'];

    //=========================================================================
    // CONFIG SAVE/LOAD
    //=========================================================================
    // Extend ConfigManager to persist blind mode
    Object.defineProperty(ConfigManager, 'blindMode', {
        get: function () {
            return this._blindMode !== undefined ? this._blindMode : DEFAULT_MODE;
        },
        set: function (v) {
            this._blindMode = v;
        },
        configurable: true
    });

    const _CM_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function () {
        const config = _CM_makeData.call(this);
        config.blindMode = this.blindMode;
        return config;
    };

    const _CM_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function (config) {
        _CM_applyData.call(this, config);
        this.blindMode = (config.blindMode !== undefined) ? config.blindMode : DEFAULT_MODE;
        BlindModeManager.applyMode(this.blindMode);
    };

    //=========================================================================
    // BLIND MODE MANAGER
    //=========================================================================
    const BlindModeManager = {
        _mode:        DEFAULT_MODE,
        _ariaDiv:     null,
        _alertDiv:    null,
        _speechQueue: [],
        _speaking:    false,

        //----------------------------------------------------------------------
        // Setup ARIA live region in the DOM
        //----------------------------------------------------------------------
        initialize: function () {
            if (this._ariaDiv) return;

            // Polite live region (NVDA, Narrator, generic SR)
            this._ariaDiv = document.createElement('div');
            this._ariaDiv.id = 'blindmode-live';
            this._ariaDiv.setAttribute('aria-live', 'polite');
            this._ariaDiv.setAttribute('aria-atomic', 'true');
            this._ariaDiv.setAttribute('aria-relevant', 'additions text');
            this._ariaDiv.style.cssText = [
                'position:absolute',
                'left:-9999px',
                'top:-9999px',
                'width:1px',
                'height:1px',
                'overflow:hidden',
                'clip:rect(0,0,0,0)',
                'white-space:nowrap',
                'border:0'
            ].join(';');
            document.body.appendChild(this._ariaDiv);

            // Assertive live region (NVDA battle, JAWS alerts)
            this._alertDiv = document.createElement('div');
            this._alertDiv.id = 'blindmode-alert';
            this._alertDiv.setAttribute('role', 'alert');
            this._alertDiv.setAttribute('aria-live', 'assertive');
            this._alertDiv.setAttribute('aria-atomic', 'true');
            this._alertDiv.style.cssText = this._ariaDiv.style.cssText;
            document.body.appendChild(this._alertDiv);

            // Title the canvas for screen readers
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.setAttribute('role', 'application');
                canvas.setAttribute('aria-label', 'RPG Maker MV Game');
            }

            // Trap F8 to cycle mode
            document.addEventListener('keydown', function (e) {
                if (e.key === 'F8') {
                    const next = (BlindModeManager._mode + 1) % 5;
                    BlindModeManager.applyMode(next);
                    ConfigManager.blindMode = next;
                    ConfigManager.save();
                    BlindModeManager.announce('Blind Mode: ' + MODE_NAMES[next], true);
                }
            });
        },

        //----------------------------------------------------------------------
        // Apply a mode (0-4)
        //----------------------------------------------------------------------
        applyMode: function (mode) {
            this._mode = mode;
            if (mode === BLIND_OFF) {
                this.silence();
            }
            console.log('[BlindMode] Mode set to: ' + MODE_NAMES[mode]);
        },

        //----------------------------------------------------------------------
        // Core announce function — routes to appropriate method per mode
        //----------------------------------------------------------------------
        announce: function (text, urgent) {
            if (this._mode === BLIND_OFF) return;
            if (!text || text.trim() === '') return;

            urgent = urgent || false;

            switch (this._mode) {
                case BLIND_NVDA: this._announceNVDA(text, urgent);   break;
                case BLIND_JAWS: this._announceJAWS(text, urgent);   break;
                case BLIND_NARR: this._announceNarrator(text);       break;
                case BLIND_SR:   this._announceSR(text, urgent);     break;
            }
        },

        //----------------------------------------------------------------------
        // NVDA — ARIA live regions (assertive for urgent, polite for normal)
        //----------------------------------------------------------------------
        _announceNVDA: function (text, urgent) {
            const div = urgent ? this._alertDiv : this._ariaDiv;
            // Clear then set forces re-read
            div.textContent = '';
            setTimeout(function () {
                div.textContent = text;
            }, 50);
        },

        //----------------------------------------------------------------------
        // JAWS — role="alert" injection is most reliable for JAWS
        //----------------------------------------------------------------------
        _announceJAWS: function (text, urgent) {
            // JAWS picks up role="alert" very reliably
            const div = this._alertDiv;
            div.textContent = '';
            setTimeout(function () {
                div.setAttribute('role', 'alert');
                div.textContent = text;
            }, 50);

            if (!urgent) {
                // Also update polite region for non-urgent
                const polite = this._ariaDiv;
                polite.textContent = '';
                setTimeout(function () {
                    polite.textContent = text;
                }, 80);
            }
        },

        //----------------------------------------------------------------------
        // Narrator — Prefers short structured text, polite live region
        //----------------------------------------------------------------------
        _announceNarrator: function (text) {
            const div = this._ariaDiv;
            div.textContent = '';
            // Narrator responds well to a slight delay
            setTimeout(function () {
                div.setAttribute('aria-live', 'polite');
                div.textContent = text;
            }, 100);
        },

        //----------------------------------------------------------------------
        // Generic Screen Reader — ARIA + Web Speech API fallback
        //----------------------------------------------------------------------
        _announceSR: function (text, urgent) {
            const div = urgent ? this._alertDiv : this._ariaDiv;
            div.textContent = '';
            setTimeout(function () {
                div.textContent = text;
            }, 50);

            // Web Speech API as additional fallback
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                const utt = new SpeechSynthesisUtterance(text);
                utt.rate   = SPEECH_RATE;
                utt.volume = SPEECH_VOL;
                window.speechSynthesis.speak(utt);
            }
        },

        //----------------------------------------------------------------------
        // Silence all speech
        //----------------------------------------------------------------------
        silence: function () {
            if (this._ariaDiv)  this._ariaDiv.textContent  = '';
            if (this._alertDiv) this._alertDiv.textContent = '';
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        },

        //----------------------------------------------------------------------
        // Convenience helpers
        //----------------------------------------------------------------------
        isActive: function () {
            return this._mode !== BLIND_OFF;
        },

        modeName: function () {
            return MODE_NAMES[this._mode];
        }
    };

    //=========================================================================
    // INIT on scene boot
    //=========================================================================
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);
        BlindModeManager.initialize();
        BlindModeManager.applyMode(ConfigManager.blindMode);
    };

    //=========================================================================
    // OPTIONS MENU — Add Blind Mode selector
    //=========================================================================
    // Add to options list
    const _WO_makeCommandList = Window_Options.prototype.makeCommandList;
    Window_Options.prototype.makeCommandList = function () {
        _WO_makeCommandList.call(this);
        this.addCommand('Blind Mode', 'blindMode');
    };

    // Get current value
    const _WO_getConfigValue = Window_Options.prototype.getConfigValue;
    Window_Options.prototype.getConfigValue = function (symbol) {
        if (symbol === 'blindMode') return ConfigManager.blindMode;
        return _WO_getConfigValue.call(this, symbol);
    };

    // Set value
    const _WO_setConfigValue = Window_Options.prototype.setConfigValue;
    Window_Options.prototype.setConfigValue = function (symbol, volume) {
        if (symbol === 'blindMode') {
            ConfigManager.blindMode = volume;
            BlindModeManager.applyMode(volume);
            return;
        }
        _WO_setConfigValue.call(this, symbol, volume);
    };

    // Display as a named selection (Off / NVDA / JAWS / Narrator / Screen Reader)
    const _WO_statusText = Window_Options.prototype.statusText;
    Window_Options.prototype.statusText = function (index) {
        const symbol = this.commandSymbol(index);
        if (symbol === 'blindMode') {
            return MODE_NAMES[ConfigManager.blindMode] || 'Off';
        }
        return _WO_statusText.call(this, index);
    };

    // Override isVolumeSymbol so it uses the cycle logic, not a slider
    const _WO_isVolumeSymbol = Window_Options.prototype.isVolumeSymbol;
    Window_Options.prototype.isVolumeSymbol = function (symbol) {
        if (symbol === 'blindMode') return false;
        return _WO_isVolumeSymbol.call(this, symbol);
    };

    // Cycle through modes on left/right/ok
    const _WO_processOk = Window_Options.prototype.processOk;
    Window_Options.prototype.processOk = function () {
        const symbol = this.commandSymbol(this.index());
        if (symbol === 'blindMode') {
            const next = (ConfigManager.blindMode + 1) % MODE_NAMES.length;
            this.changeValue(symbol, next);
            BlindModeManager.announce('Blind Mode set to ' + MODE_NAMES[next], true);
            return;
        }
        _WO_processOk.call(this);
    };

    const _WO_cursorRight = Window_Options.prototype.cursorRight;
    Window_Options.prototype.cursorRight = function (wrap) {
        const symbol = this.commandSymbol(this.index());
        if (symbol === 'blindMode') {
            const next = (ConfigManager.blindMode + 1) % MODE_NAMES.length;
            this.changeValue(symbol, next);
            BlindModeManager.announce('Blind Mode: ' + MODE_NAMES[next]);
            return;
        }
        _WO_cursorRight.call(this, wrap);
    };

    const _WO_cursorLeft = Window_Options.prototype.cursorLeft;
    Window_Options.prototype.cursorLeft = function (wrap) {
        const symbol = this.commandSymbol(this.index());
        if (symbol === 'blindMode') {
            const prev = (ConfigManager.blindMode + MODE_NAMES.length - 1) % MODE_NAMES.length;
            this.changeValue(symbol, prev);
            BlindModeManager.announce('Blind Mode: ' + MODE_NAMES[prev]);
            return;
        }
        _WO_cursorLeft.call(this, wrap);
    };

    //=========================================================================
    // ANNOUNCE — Menu Navigation
    //=========================================================================
    if (ANNOUNCE_MENU) {
        const _Window_Selectable_select = Window_Selectable.prototype.select;
        Window_Selectable.prototype.select = function (index) {
            _Window_Selectable_select.call(this, index);
            if (!BlindModeManager.isActive()) return;
            if (!this.active) return;
            if (index < 0) return;

            // Try to read item name
            let text = '';
            if (this.commandName && this.commandName(index)) {
                text = this.commandName(index);
            } else if (this.item && this.item()) {
                const item = this.item();
                text = item.name || '';
                if (item.description) text += '. ' + item.description;
            }

            if (text) {
                BlindModeManager.announce(text + ', item ' + (index + 1) + ' of ' + this.maxItems());
            }
        };
    }

    //=========================================================================
    // ANNOUNCE — Battle Events
    //=========================================================================
    if (ANNOUNCE_BATTLE) {

        // Attack / skill use
        const _WBL_startAction = Window_BattleLog.prototype.startAction;
        Window_BattleLog.prototype.startAction = function (subject, action, targets) {
            _WBL_startAction.call(this, subject, action, targets);
            if (!BlindModeManager.isActive()) return;

            const subName  = subject.name();
            const itemName = action.item() ? action.item().name : 'action';
            const tgtNames = targets.map(t => t.name()).join(' and ');
            BlindModeManager.announce(subName + ' uses ' + itemName + ' on ' + tgtNames + '.', true);
        };

        // Damage display
        const _WBL_displayHpDamage = Window_BattleLog.prototype.displayHpDamage;
        Window_BattleLog.prototype.displayHpDamage = function (target) {
            _WBL_displayHpDamage.call(this, target);
            if (!BlindModeManager.isActive()) return;

            const result = target.result();
            if (result.hpAffected) {
                if (result.hpDamage > 0) {
                    BlindModeManager.announce(target.name() + ' takes ' + result.hpDamage + ' damage.');
                } else if (result.hpDamage < 0) {
                    BlindModeManager.announce(target.name() + ' recovers ' + Math.abs(result.hpDamage) + ' HP.');
                }
            }
        };

        // Death
        const _WBL_displayCollapse = Window_BattleLog.prototype.displayCollapse;
        Window_BattleLog.prototype.displayCollapse = function (target) {
            _WBL_displayCollapse.call(this, target);
            if (!BlindModeManager.isActive()) return;
            BlindModeManager.announce(target.name() + ' has been defeated.', true);
        };

        // Miss
        const _WBL_displayMiss = Window_BattleLog.prototype.displayMiss;
        Window_BattleLog.prototype.displayMiss = function (target) {
            _WBL_displayMiss.call(this, target);
            if (!BlindModeManager.isActive()) return;
            BlindModeManager.announce(target.name() + ' evades the attack.');
        };

        // Critical hit
        const _WBL_displayCritical = Window_BattleLog.prototype.displayCritical;
        Window_BattleLog.prototype.displayCritical = function (target) {
            _WBL_displayCritical.call(this, target);
            if (!BlindModeManager.isActive()) return;
            BlindModeManager.announce('Critical hit!', true);
        };

        // Victory
        const _BM_processVictory = BattleManager.processVictory;
        BattleManager.processVictory = function () {
            _BM_processVictory.call(this);
            BlindModeManager.announce('Victory! Battle won.', true);
        };

        // Defeat
        const _BM_processDefeat = BattleManager.processDefeat;
        BattleManager.processDefeat = function () {
            _BM_processDefeat.call(this);
            BlindModeManager.announce('Defeat. The party has fallen.', true);
        };
    }

    //=========================================================================
    // ANNOUNCE — Map / Event Interaction
    //=========================================================================
    if (ANNOUNCE_MAP) {

        // Map transfer (room name via <location: X> notetag)
        const _GM_onMapLoaded = Game_Map.prototype.onMapLoaded;
        Game_Map.prototype.onMapLoaded = function () {
            _GM_onMapLoaded.call(this);
            if (!BlindModeManager.isActive()) return;
            const mapData = $dataMap;
            if (mapData && mapData.meta && mapData.meta['location']) {
                BlindModeManager.announce('Entered ' + mapData.meta['location'] + '.');
            } else if (mapData && mapData.displayName) {
                BlindModeManager.announce('Entered ' + mapData.displayName + '.');
            }
        };

        // Event interaction (<announce: text> notetag)
        const _GI_command101 = Game_Interpreter.prototype.command101; // Show message
        Game_Interpreter.prototype.command101 = function () {
            if (BlindModeManager.isActive()) {
                const event = $gameMap.event(this._eventId);
                if (event) {
                    const ev = $dataMap.events[this._eventId];
                    if (ev && ev.meta && ev.meta['announce']) {
                        BlindModeManager.announce(ev.meta['announce']);
                    } else if (ev && ev.name) {
                        BlindModeManager.announce('Talking to ' + ev.name + '.');
                    }
                }
            }
            return _GI_command101.call(this);
        };
    }

    //=========================================================================
    // ANNOUNCE — System Messages
    //=========================================================================

    // Level up
    const _GA_levelUp = Game_Actor.prototype.levelUp;
    Game_Actor.prototype.levelUp = function () {
        _GA_levelUp.call(this);
        if (BlindModeManager.isActive()) {
            BlindModeManager.announce(this.name() + ' is now level ' + this._level + '!', true);
        }
    };

    // Save complete
    const _SM_onSavefileOk = Scene_Save.prototype.onSavefileOk;
    Scene_Save.prototype.onSavefileOk = function () {
        _SM_onSavefileOk.call(this);
        BlindModeManager.announce('Game saved.');
    };

    // Game Over
    const _SGO_start = Scene_Gameover.prototype.start;
    Scene_Gameover.prototype.start = function () {
        _SGO_start.call(this);
        BlindModeManager.announce('Game Over.', true);
    };

    //=========================================================================
    // PLUGIN COMMANDS
    //=========================================================================
    const _GI_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _GI_pluginCommand.call(this, command, args);
        if (command === 'BlindMode') {
            const sub = args[0];
            if (sub === 'Set' && args[1] !== undefined) {
                const mode = Number(args[1]);
                if (mode >= 0 && mode <= 4) {
                    ConfigManager.blindMode = mode;
                    BlindModeManager.applyMode(mode);
                    ConfigManager.save();
                }
            } else if (sub === 'Announce') {
                const text = args.slice(1).join(' ');
                BlindModeManager.announce(text, false);
            } else if (sub === 'AnnounceUrgent') {
                const text = args.slice(1).join(' ');
                BlindModeManager.announce(text, true);
            } else if (sub === 'Silence') {
                BlindModeManager.silence();
            }
        }
    };

    //=========================================================================
    // EXPOSE for other plugins
    //=========================================================================
    window.BlindModeManager = BlindModeManager;

    console.log('[BlindMode] Accessibility plugin loaded. Press F8 to cycle modes.');

})();
