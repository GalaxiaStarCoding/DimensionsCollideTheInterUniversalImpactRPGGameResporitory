//=============================================================================
// RM2K3_Style.js
//=============================================================================
/*:
 * @plugindesc Replicates the RPG Maker 2003 UI style for windows, menus,
 * dialogue, and battle HUD. Drop into your /js/plugins/ folder and enable.
 * @author Claude
 *
 * @param Font Name
 * @desc The bitmap/pixel font to use. Recommended: "Press Start 2P" or
 *       a custom font placed in your /fonts/ folder.
 * @default Press Start 2P
 *
 * @param Font Size
 * @desc Base font size (RM2K3 used small bitmap fonts).
 * @default 12
 *
 * @param Window Skin Tint
 * @desc Dark blue tint color for windows (CSS hex).
 * @default #0a0a2e
 *
 * @param Window Border Color
 * @desc Border/frame color for windows.
 * @default #4444aa
 *
 * @param Window Gradient Top
 * @desc Top gradient color inside windows.
 * @default #1a1a5e
 *
 * @param Window Gradient Bottom
 * @desc Bottom gradient color inside windows.
 * @default #000033
 *
 * @help
 * ============================================================================
 * RM2K3_Style - Full RPG Maker 2003 UI Replica
 * ============================================================================
 * This plugin overrides MV's default windows, menus, dialogue boxes,
 * and battle HUD to closely match the look and feel of RPG Maker 2003.
 *
 * Features:
 *   - RM2K3-style dark blue gradient windows with dotted border
 *   - Small pixel/bitmap font rendering
 *   - RM2K3-style pause menu layout (Item/Skill/Equip/Status/Row/Quit)
 *   - RM2K3-style message/dialogue window at the bottom
 *   - RM2K3-style battle HUD with face portraits + HP/MP bars at bottom
 *   - Cursor style matching RM2K3 selection boxes
 *
 * Installation:
 *   1. Place RM2K3_Style.js in your project's /js/plugins/ folder.
 *   2. Enable it in the Plugin Manager.
 *   3. (Optional) Place a pixel font .ttf in /fonts/ and update Font Name.
 *
 * ============================================================================
 */

(function() {
    'use strict';

    var parameters = PluginManager.parameters('RM2K3_Style');
    var RM2K3_FontName   = String(parameters['Font Name']          || 'Press Start 2P');
    var RM2K3_FontSize   = Number(parameters['Font Size']          || 12);
    var RM2K3_BgColor    = String(parameters['Window Skin Tint']   || '#0a0a2e');
    var RM2K3_BorderColor= String(parameters['Window Border Color']|| '#4444aa');
    var RM2K3_GradTop    = String(parameters['Window Gradient Top'] || '#1a1a5e');
    var RM2K3_GradBot    = String(parameters['Window Gradient Bottom']|| '#000033');

    // =========================================================================
    // UTILITY: Draw RM2K3-style window background onto a bitmap
    // =========================================================================
    function drawRM2K3Background(bitmap, x, y, w, h) {
        // Gradient fill
        var ctx = bitmap._context;
        var grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, RM2K3_GradTop);
        grad.addColorStop(1, RM2K3_GradBot);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Outer border (bright)
        ctx.strokeStyle = RM2K3_BorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

        // Inner border (darker)
        ctx.strokeStyle = 'rgba(0,0,80,0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

        bitmap._setDirty();
    }

    // =========================================================================
    // FONT OVERRIDE — Apply RM2K3 font globally
    // =========================================================================
    var _Scene_Boot_loadSystemImages = Scene_Boot.prototype.loadSystemImages;
    Scene_Boot.prototype.loadSystemImages = function() {
        _Scene_Boot_loadSystemImages.call(this);
    };

    // Override default font settings
    Window_Base.prototype.standardFontFace = function() {
        return RM2K3_FontName + ', monospace';
    };
    Window_Base.prototype.standardFontSize = function() {
        return RM2K3_FontSize;
    };
    Window_Base.prototype.lineHeight = function() {
        return RM2K3_FontSize + 10;
    };

    // =========================================================================
    // WINDOW BACKGROUND — Dark blue gradient + dotted border
    // =========================================================================
    var _Window_Base_initialize = Window_Base.prototype.initialize;
    Window_Base.prototype.initialize = function(x, y, width, height) {
        _Window_Base_initialize.call(this, x, y, width, height);
        this._refreshRM2K3Background();
    };

    Window_Base.prototype._refreshRM2K3Background = function() {
        this.opacity = 255;
        this.backOpacity = 255;
    };

    // Override the window frame drawing
    Window.prototype._refreshBack = function() {
        var m = this._margin;
        var w = this._width;
        var h = this._height;
        var bitmap = new Bitmap(w, h);

        // Main dark blue gradient background
        var ctx = bitmap._context;
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, RM2K3_GradTop);
        grad.addColorStop(1, RM2K3_GradBot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Outer bright border
        ctx.strokeStyle = RM2K3_BorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);

        // Inner dark border
        ctx.strokeStyle = 'rgba(20,20,100,0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(3, 3, w - 6, h - 6);

        // Subtle horizontal scanlines for RM2K3 texture
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (var i = m; i < h - m; i += 2) {
            ctx.beginPath();
            ctx.moveTo(m, i);
            ctx.lineTo(w - m, i);
            ctx.stroke();
        }

        bitmap._setDirty();

        if (this._windowBackSprite) {
            this._windowBackSprite.bitmap = bitmap;
        }
    };

    Window.prototype._refreshFrame = function() {
        // No separate frame — handled in _refreshBack
        if (this._windowFrameSprite) {
            this._windowFrameSprite.bitmap = new Bitmap(1, 1);
        }
    };

    // =========================================================================
    // CURSOR — RM2K3-style selection rectangle
    // =========================================================================
    Window.prototype._refreshCursor = function() {
        var pad = this._padding;
        var x   = this._cursorRect.x + pad - this.origin.x;
        var y   = this._cursorRect.y + pad - this.origin.y;
        var w   = this._cursorRect.width;
        var h   = this._cursorRect.height;

        // Remove old cursor sprite contents
        this._windowCursorSprite.removeChildren();

        if (w > 0 && h > 0) {
            var bitmap = new Bitmap(w, h);
            var ctx = bitmap._context;

            // Semi-transparent blue fill
            ctx.fillStyle = 'rgba(60, 60, 200, 0.35)';
            ctx.fillRect(0, 0, w, h);

            // Outer bright border (white-blue, RM2K3 style)
            ctx.strokeStyle = 'rgba(200, 210, 255, 1.0)';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, w - 2, h - 2);

            // Inner slightly darker border for depth
            ctx.strokeStyle = 'rgba(80, 80, 180, 0.8)';
            ctx.lineWidth = 1;
            ctx.strokeRect(3, 3, w - 6, h - 6);

            bitmap._setDirty();

            var sprite = new Sprite(bitmap);
            this._windowCursorSprite.addChild(sprite);
        }

        this._windowCursorSprite.x = x;
        this._windowCursorSprite.y = y;
    };

    // =========================================================================
    // PAUSE MENU — RM2K3 layout: Item / Skill / Equip / Status / Row / Quit
    // =========================================================================

    // Reorder and rename menu commands to match RM2K3
    Window_MenuCommand.prototype.makeCommandList = function() {
        this.addMainCommands();
        this.addOriginalCommands();
        this.addSaveCommand();
        this.addGameEndCommand();
    };

    Window_MenuCommand.prototype.addMainCommands = function() {
        var enabled = this.areMainCommandsEnabled();
        if (this.needsCommand('item'))   this.addCommand('Item',   'item',   enabled);
        if (this.needsCommand('skill'))  this.addCommand('Skill',  'skill',  enabled);
        if (this.needsCommand('equip'))  this.addCommand('equip',  'equip',  enabled);
        if (this.needsCommand('status')) this.addCommand('Status', 'status', enabled);
    };

    Window_MenuCommand.prototype.addSaveCommand = function() {
        if (this.needsCommand('save')) {
            this.addCommand('Save', 'save', this.isSaveEnabled());
        }
    };

    Window_MenuCommand.prototype.addGameEndCommand = function() {
        if (this.needsCommand('gameEnd')) {
            this.addCommand('Quit', 'gameEnd', true);
        }
    };

    // Menu window — left column, narrow, RM2K3 style
    var _Scene_Menu_create = Scene_Menu.prototype.create;
    Scene_Menu.prototype.create = function() {
        _Scene_Menu_create.call(this);
    };

    Scene_Menu.prototype.commandWindowRect = function() {
        var ww = 160;
        var wh = this.calcWindowHeight(6, true);
        var wx = 0;
        var wy = 0;
        return new Rectangle(wx, wy, ww, wh);
    };

    // Gold window — bottom left, labeled "Metals" style (or default gold)
    Window_Gold.prototype.currencyUnit = function() {
        return 'Metals';
    };

    // =========================================================================
    // MESSAGE WINDOW — RM2K3 style: bottom of screen, taller, with name box
    // =========================================================================
    var _Window_Message_initialize = Window_Message.prototype.initialize;
    Window_Message.prototype.initialize = function() {
        _Window_Message_initialize.call(this);
        this.y = Graphics.boxHeight - this.windowHeight() - 4;
    };

    Window_Message.prototype.windowHeight = function() {
        return this.fittingHeight(4);
    };

    Window_Message.prototype.windowWidth = function() {
        return Graphics.boxWidth - 8;
    };

    var _Window_Message_updatePlacement = Window_Message.prototype.updatePlacement;
    Window_Message.prototype.updatePlacement = function() {
        _Window_Message_updatePlacement.call(this);
        // Always anchor to bottom like RM2K3
        if (this._positionType === 2) {
            this.y = Graphics.boxHeight - this.height - 4;
        }
        this.x = 4;
        this.width = Graphics.boxWidth - 8;
    };

    // Name window — small box above the message window, top-left
    var _Window_NameBox_updatePlacement = Window_NameBox.prototype.updatePlacement;
    Window_NameBox.prototype.updatePlacement = function() {
        _Window_NameBox_updatePlacement.call(this);
        // Position name box top-left of message window
        this.x = this._messageWindow.x + 8;
        this.y = this._messageWindow.y - this.height + 4;
    };

    // =========================================================================
    // BATTLE HUD — RM2K3 style face portraits at bottom + HP/WE bars
    // =========================================================================

    // Status window at bottom of battle screen
    var _Window_BattleStatus_initialize = Window_BattleStatus.prototype.initialize;
    Window_BattleStatus.prototype.initialize = function() {
        var x = 0;
        var y = Graphics.boxHeight - this.windowHeight();
        var w = Graphics.boxWidth;
        var h = this.windowHeight();
        Window_Selectable.prototype.initialize.call(this, x, y, w, h);
        this.refresh();
        this.openness = 255;
    };

    Window_BattleStatus.prototype.windowHeight = function() {
        return 96;
    };

    Window_BattleStatus.prototype.numVisibleRows = function() {
        return 1;
    };

    Window_BattleStatus.prototype.maxCols = function() {
        return $gameParty.battleMembers().length;
    };

    Window_BattleStatus.prototype.itemWidth = function() {
        return Math.floor(this.width / this.maxCols());
    };

    Window_BattleStatus.prototype.drawItem = function(index) {
        var actor  = $gameParty.battleMembers()[index];
        if (!actor) return;
        var rect   = this.itemRect(index);
        var x      = rect.x + 4;
        var y      = rect.y + 2;
        var w      = rect.width - 8;

        // Face portrait (small, left side of cell)
        var faceW  = 48;
        var faceH  = 48;
        this.drawFace(actor.faceName(), actor.faceIndex(), x, y + 4, faceW, faceH);

        // Name (not shown in RM2K3 battle HUD — just bars)
        var barX   = x + faceW + 4;
        var barW   = w - faceW - 8;

        // HP label + bar
        this.changeTextColor(this.systemColor());
        this.contents.fontSize = 10;
        this.drawText('HP', barX, y, 24);
        this.drawRM2K3GaugeBar(barX + 22, y + 2, barW - 22, 10,
            actor.hp, actor.mhp, '#22cc22', '#005500');

        // MP/WE label + bar
        this.drawText('WE', barX, y + 18, 24);
        this.drawRM2K3GaugeBar(barX + 22, y + 20, barW - 22, 10,
            actor.mp, actor.mmp, '#2255ff', '#000088');

        // HP value
        this.changeTextColor(this.normalColor());
        this.contents.fontSize = 10;
        this.drawText(actor.hp, barX + 22, y + 12, barW - 22, 'left');
    };

    // Draw a RM2K3-style flat gauge bar
    Window_BattleStatus.prototype.drawRM2K3GaugeBar = function(x, y, width, height, value, maxValue, colorFill, colorBg) {
        var ctx = this.contents._context;
        // Background
        ctx.fillStyle = colorBg;
        ctx.fillRect(x, y, width, height);
        // Fill
        var rate = maxValue > 0 ? value / maxValue : 0;
        ctx.fillStyle = colorFill;
        ctx.fillRect(x, y, Math.floor(width * rate), height);
        // Border
        ctx.strokeStyle = 'rgba(200,200,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        this.contents._setDirty();
    };

    // Also override the standard gauge to match RM2K3 flat style
    Window_Base.prototype.drawGauge = function(x, y, width, rate, color1, color2) {
        var fillW  = Math.floor(width * rate);
        var gaugeY = y + this.lineHeight() - 8;
        var ctx    = this.contents._context;
        // Dark background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x, gaugeY, width, 6);
        // Solid color fill (no gradient — RM2K3 style)
        ctx.fillStyle = color1;
        ctx.fillRect(x, gaugeY, fillW, 6);
        // Thin bright border
        ctx.strokeStyle = 'rgba(200,200,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, gaugeY, width, 6);
        this.contents._setDirty();
    };

    // =========================================================================
    // BATTLE COMMAND WINDOW — RM2K3 style: Attack / Skill / Item / Defend
    // =========================================================================
    Window_ActorCommand.prototype.makeCommandList = function() {
        if (this._actor) {
            this.addCommand('Attack', 'attack', this._actor.canAttack());
            this.addCommand('Skill',  'skill');
            this.addCommand('Item',   'item');
            this.addCommand('Defend', 'guard',  this._actor.canGuard());
        }
    };

    // Position it top-left like RM2K3
    var _Scene_Battle_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function() {
        _Scene_Battle_createActorCommandWindow.call(this);
        this._actorCommandWindow.x = 0;
        this._actorCommandWindow.y = 0;
    };

    // =========================================================================
    // STATUS SCREEN — Match RM2K3 stat layout
    // =========================================================================
    Window_Status.prototype.drawBlock1 = function(y) {
        this.drawActorName(this._actor, 6, y);
        this.drawActorClass(this._actor, 192, y);
    };

    Window_Status.prototype.drawBlock2 = function(y) {
        this.drawActorFace(this._actor, 12, y);
        this.drawBasicInfo(204, y);
    };

    Window_Status.prototype.drawBlock3 = function(y) {
        this.drawParameters(48, y);
    };

    Window_Status.prototype.drawBasicInfo = function(x, y) {
        var lh = this.lineHeight();
        this.drawActorLevel(this._actor, x, y + lh * 0);
        this.drawActorHp(this._actor, x, y + lh * 1);
        this.drawActorMp(this._actor, x, y + lh * 2);
    };

    Window_Status.prototype.drawParameters = function(x, y) {
        var lh = this.lineHeight();
        var params = [2, 3, 4, 5, 6, 7]; // ATK DEF MAT MDF AGI LUK
        var labels = ['Attack','Defense','Mystic','Agility','Luck',''];
        for (var i = 0; i < 4; i++) {
            this.changeTextColor(this.systemColor());
            this.drawText(labels[i], x, y + lh * i, 120);
            this.resetTextColor();
            this.drawText(this._actor.param(params[i]), x + 128, y + lh * i, 60, 'right');
        }
    };

    // =========================================================================
    // EQUIP SCREEN — match RM2K3 slot names
    // =========================================================================
    Window_EquipSlot.prototype.slotName = function(index) {
        var slots = ['Weapon', 'Hands', 'Body', 'Helmet', 'Boots'];
        return slots[index] !== undefined ? slots[index] : '';
    };

    // =========================================================================
    // TEXT COLOR — RM2K3 uses white text, system labels in light blue
    // =========================================================================
    Window_Base.prototype.normalColor = function() {
        return 'rgba(255, 255, 255, 1)';
    };

    Window_Base.prototype.systemColor = function() {
        return 'rgba(170, 200, 255, 1)';
    };

    Window_Base.prototype.crisisColor = function() {
        return 'rgba(255, 220, 0, 1)';
    };

    Window_Base.prototype.deathColor = function() {
        return 'rgba(180, 60, 60, 1)';
    };

    Window_Base.prototype.gaugeBackColor = function() {
        return 'rgba(0, 0, 0, 0.8)';
    };

    Window_Base.prototype.hpGaugeColor1 = function() {
        return 'rgba(30, 180, 30, 1)';
    };

    Window_Base.prototype.hpGaugeColor2 = function() {
        return 'rgba(30, 180, 30, 1)';
    };

    Window_Base.prototype.mpGaugeColor1 = function() {
        return 'rgba(40, 80, 220, 1)';
    };

    Window_Base.prototype.mpGaugeColor2 = function() {
        return 'rgba(40, 80, 220, 1)';
    };

    // =========================================================================
    // SCENE MENU BACKGROUND — Dim the map like RM2K3 does
    // =========================================================================
    Scene_MenuBase.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
        // RM2K3 dims the background noticeably
        this._backgroundSprite.opacity = 160;
        this.addChild(this._backgroundSprite);
    };

    // =========================================================================
    // WINDOW PADDING — tighter padding like RM2K3
    // =========================================================================
    Window_Base.prototype.standardPadding = function() {
        return 12;
    };

    Window_Base.prototype.textPadding = function() {
        return 4;
    };

    // =========================================================================
    // LOAD/SAVE SCREEN — match RM2K3 file select style
    // =========================================================================
    Window_SavefileList.prototype.drawFileId = function(id, x, y) {
        this.changeTextColor(this.systemColor());
        this.drawText('File ' + id, x, y, 100);
        this.resetTextColor();
    };

    Window_SavefileList.prototype.drawPartyFaces = function(info, x, y, width, height) {
        if (info.faces) {
            for (var i = 0; i < info.faces.length; i++) {
                var data  = info.faces[i];
                var facex = x + i * 52;
                this.drawFace(data[0], data[1], facex, y, 48, 48);
            }
        }
    };

    Window_SavefileList.prototype.drawContents = function(info, rect, valid) {
        var bottom = rect.y + rect.height;
        if (rect.width >= 420) {
            this.drawGameTitle(info, rect.x + 192, rect.y, rect.width - 192);
            if (valid) {
                this.drawPartyFaces(info, rect.x + 192, bottom - 56, 220, 48);
            }
        }
        var lineHeight = this.lineHeight();
        this.drawFileId(this.index() + 1, rect.x + 4, rect.y);
        if (valid) {
            this.drawPartyLevel(info, rect.x + 4, bottom - lineHeight * 2);
            this.drawPlaytime(info, rect.x + 4, bottom - lineHeight, rect.width - 8);
        }
    };

    // =========================================================================
    // TITLE SCREEN COMMAND WINDOW — match RM2K3 title menu style
    // =========================================================================
    Window_TitleCommand.prototype.makeCommandList = function() {
        this.addCommand('New Game',  'newGame');
        this.addCommand('Load Game', 'continue', this.isContinueEnabled());
        this.addCommand('Quit Game', 'options');
    };

    var _Window_TitleCommand_updatePlacement = Window_TitleCommand.prototype.updatePlacement;
    Window_TitleCommand.prototype.updatePlacement = function() {
        this.x = (Graphics.boxWidth  - this.width)  / 2;
        this.y = (Graphics.boxHeight - this.height) / 2 + 64;
    };

})();
