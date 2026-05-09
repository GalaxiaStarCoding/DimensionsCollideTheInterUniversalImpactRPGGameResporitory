//=============================================================================
// DimensionsCollide_SaveScreen.js
//=============================================================================
/*:
 * @plugindesc v2.0 - Custom Save/Load Screen (Freedom Planet 2 style)
 * @author DimensionsCollide Dev
 * @help
 * Place in js/plugins/ and enable in Plugin Manager.
 * Must be BELOW DimensionsCollide_TitleScreen.js in the list.
 *
 * Required img/titles2/ : MenuBG_6.png
 *
 * Modes:
 *   'newgame' - only empty slots selectable, starts fresh game
 *   'load'    - only filled slots selectable, loads save
 *   'save'    - saves to selected slot
 */

(function() {

'use strict';

//=============================================================================
// DRAW HELPER
//=============================================================================
function drawPanel(bmp, x, y, w, h, fillCol, borderCol, borderW) {
    borderW = borderW || 3;
    bmp.fillRect(x, y, w, h, fillCol);
    bmp.fillRect(x, y, w, borderW, borderCol);
    bmp.fillRect(x, y + h - borderW, w, borderW, borderCol);
    bmp.fillRect(x, y, borderW, h, borderCol);
    bmp.fillRect(x + w - borderW, y, borderW, h, borderCol);
}

//=============================================================================
// HOOK Scene_Load and Scene_Save
//=============================================================================
var _SM_goto = SceneManager.goto.bind(SceneManager);
SceneManager.goto = function(sceneClass) {
    if (sceneClass === Scene_Load) {
        Scene_DC_SaveLoad._mode = 'load';
        _SM_goto(Scene_DC_SaveLoad);
        return;
    }
    if (sceneClass === Scene_Save) {
        Scene_DC_SaveLoad._mode = 'save';
        _SM_goto(Scene_DC_SaveLoad);
        return;
    }
    _SM_goto(sceneClass);
};

var _SM_push = SceneManager.push.bind(SceneManager);
SceneManager.push = function(sceneClass) {
    if (sceneClass === Scene_Load) {
        Scene_DC_SaveLoad._mode = 'load';
        _SM_push(Scene_DC_SaveLoad);
        return;
    }
    if (sceneClass === Scene_Save) {
        Scene_DC_SaveLoad._mode = 'save';
        _SM_push(Scene_DC_SaveLoad);
        return;
    }
    _SM_push(sceneClass);
};

//=============================================================================
// SCENE: SAVE / LOAD
//=============================================================================
window.Scene_DC_SaveLoad = function Scene_DC_SaveLoad() {
    this.initialize.apply(this, arguments);
};
Scene_DC_SaveLoad.prototype = Object.create(Scene_Base.prototype);
Scene_DC_SaveLoad.prototype.constructor = Scene_DC_SaveLoad;
Scene_DC_SaveLoad._mode = 'load'; // 'newgame' | 'load' | 'save'

var MAX_SAVES      = 20;
var SLOTS_PER_PAGE = 5;

Scene_DC_SaveLoad.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._index     = 0;
    this._page      = 0;
    this._phase     = 'select'; // 'select' | 'confirm_delete'
    this._saveInfos = [];
    this._faceSp    = null;
    this._focusBtn  = 'file';   // 'file' | 'delete' | 'return'
    this._loadSaveInfos();
};

Scene_DC_SaveLoad.prototype._loadSaveInfos = function() {
    this._saveInfos = [];
    for (var i = 1; i <= MAX_SAVES; i++) {
        this._saveInfos.push(DataManager.loadSavefileInfo(i) || null);
    }
};

//─────────────────────────────────────────────────────────────────────────────
// CREATE
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_SaveLoad.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    var GW = Graphics.width;
    var GH = Graphics.height;

    // Background
    this._bg = new Sprite(ImageManager.loadTitle2('MenuBG_6'));
    this.addChild(this._bg);

    // Dark overlay
    var ov = new Sprite(new Bitmap(GW, GH));
    ov.bitmap.fillRect(0, 0, GW, GH, '#000000');
    ov.opacity = 90;
    this.addChild(ov);

    // Title bar
    var titleBmp = new Bitmap(GW, 36);
    titleBmp.fillRect(0, 0, GW, 36, '#000033');
    titleBmp.fontSize  = 20;
    titleBmp.textColor = '#00ccff';
    var mode = Scene_DC_SaveLoad._mode;
    var modeLabel = mode === 'save'    ? 'SAVE GAME' :
                    mode === 'newgame' ? 'NEW GAME  \u2014  Select an Empty File' :
                    'LOAD GAME';
    titleBmp.drawText(modeLabel, 0, 8, GW, 22, 'center');
    this.addChild(new Sprite(titleBmp));

    // Layout
    var TITLE_H    = 36;
    var PREVIEW_H  = Math.floor(GH * 0.48);
    var PREVIEW_Y  = TITLE_H;
    var PREVIEW_W  = GW - 20;
    var TAB_Y      = PREVIEW_Y + PREVIEW_H + 8;
    var TAB_H      = 52;
    var BTN_Y      = TAB_Y + TAB_H + 8;
    var BTN_H      = 42;

    this._PREVIEW_Y = PREVIEW_Y;
    this._PREVIEW_H = PREVIEW_H;
    this._PREVIEW_W = PREVIEW_W;
    this._TAB_H     = TAB_H;
    this._BTN_H     = BTN_H;

    // Preview panel
    this._previewBmp = new Bitmap(PREVIEW_W, PREVIEW_H);
    this._previewSp  = new Sprite(this._previewBmp);
    this._previewSp.x = 10;
    this._previewSp.y = PREVIEW_Y;
    this.addChild(this._previewSp);

    // Tab row
    var tabW = Math.floor((GW - 20) / SLOTS_PER_PAGE) - 4;
    this._tabBmps = [];
    this._tabSps  = [];
    this._tabW    = tabW;
    for (var t = 0; t < SLOTS_PER_PAGE; t++) {
        var tbmp = new Bitmap(tabW, TAB_H);
        var tsp  = new Sprite(tbmp);
        tsp.x = 10 + t * (tabW + 4);
        tsp.y = TAB_Y;
        this.addChild(tsp);
        this._tabBmps.push(tbmp);
        this._tabSps.push(tsp);
    }

    // Page arrows
    this._arrowLBmp = new Bitmap(30, TAB_H);
    this._arrowLSp  = new Sprite(this._arrowLBmp);
    this._arrowLSp.x = 0; this._arrowLSp.y = TAB_Y;
    this.addChild(this._arrowLSp);

    this._arrowRBmp = new Bitmap(30, TAB_H);
    this._arrowRSp  = new Sprite(this._arrowRBmp);
    this._arrowRSp.x = GW - 30; this._arrowRSp.y = TAB_Y;
    this.addChild(this._arrowRSp);

    // Delete button
    this._delBmp = new Bitmap(220, BTN_H);
    this._delSp  = new Sprite(this._delBmp);
    this._delSp.x = Math.floor(GW / 2) - 230;
    this._delSp.y = BTN_Y;
    this.addChild(this._delSp);

    // Return button
    this._retBmp = new Bitmap(220, BTN_H);
    this._retSp  = new Sprite(this._retBmp);
    this._retSp.x = Math.floor(GW / 2) + 10;
    this._retSp.y = BTN_Y;
    this.addChild(this._retSp);

    // Delete confirm overlay
    this._confirmBmp = new Bitmap(GW, 80);
    this._confirmSp  = new Sprite(this._confirmBmp);
    this._confirmSp.y = Math.floor(GH / 2) - 40;
    this._confirmSp.visible = false;
    this.addChild(this._confirmSp);

    this._redrawAll();
};

//─────────────────────────────────────────────────────────────────────────────
// DRAW
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_SaveLoad.prototype._redrawAll = function() {
    this._drawPreview();
    this._drawTabs();
    this._drawButtons();
    this._drawArrows();
};

Scene_DC_SaveLoad.prototype._drawPreview = function() {
    var b    = this._previewBmp;
    var w    = this._PREVIEW_W;
    var h    = this._PREVIEW_H;
    var mode = Scene_DC_SaveLoad._mode;
    b.clear();

    drawPanel(b, 0, 0, w, h, '#0a0a2e', '#00aaff', 4);
    b.fillRect(8, 8, w - 16, 2, '#004488');
    b.fillRect(8, h - 10, w - 16, 2, '#004488');

    var info = this._saveInfos[this._index];

    // Remove old face sprite
    if (this._faceSp && this._faceSp.parent) {
        this._faceSp.parent.removeChild(this._faceSp);
        this._faceSp = null;
    }

    if (!info) {
        // Empty slot
        var emptyLabel = (mode === 'newgame' || mode === 'story') ? 'START NEW GAME' : 'NEW GAME';
        var emptyColor = mode === 'newgame' ? '#00ffcc' : '#ffffff';
        var emptyHint  = mode === 'newgame' ? '\u25b6 Press Enter to start your adventure here!' :
                         'No save data';
        b.fontSize   = 44;
        b.textColor  = emptyColor;
        b.drawText(emptyLabel, 0, Math.floor(h / 2) - 30, w, 56, 'center');
        b.fontSize   = 16;
        b.textColor  = mode === 'newgame' ? '#00ffcc' : '#556677';
        b.drawText(emptyHint, 0, Math.floor(h / 2) + 30, w, 26, 'center');
        return;
    }

    // Filled slot — in newgame mode show locked
    if (mode === 'newgame') {
        b.fontSize   = 26; b.textColor = '#333344';
        b.drawText('[LOCKED]  File In Use', 0, Math.floor(h / 2) - 20, w, 34, 'center');
        b.fontSize   = 15; b.textColor = '#223333';
        b.drawText('This slot already has a save.', 0, Math.floor(h / 2) + 20, w, 24, 'center');
        b.drawText('Select an empty slot to start a new game.', 0, Math.floor(h / 2) + 44, w, 24, 'center');
        return;
    }

    // Filled slot — show info
    var faceX = 20; var faceY = this._PREVIEW_Y + 20;
    var faceW = 132; var faceH = 132;

    if (info.faces && info.faces[0]) {
        var faceName  = info.faces[0][0];
        var faceIndex = info.faces[0][1];
        var faceBmp   = new Bitmap(faceW, faceH);
        var srcBmp    = ImageManager.loadFace(faceName);
        var self      = this;
        srcBmp.addLoadListener(function() {
            var fw = Window_Base._faceWidth  || 144;
            var fh = Window_Base._faceHeight || 144;
            var sx = (faceIndex % 4) * fw;
            var sy = Math.floor(faceIndex / 4) * fh;
            faceBmp.blt(srcBmp, sx, sy, fw, fh, 0, 0, faceW, faceH);
        });
        self._faceSp   = new Sprite(faceBmp);
        self._faceSp.x = faceX;
        self._faceSp.y = faceY;
        drawPanel(self._previewBmp, faceX - 4, faceY - self._PREVIEW_Y - 4,
                  faceW + 8, faceH + 8, '#000000', '#ff4466', 3);
        self.addChild(self._faceSp);
    }

    var tx = faceW + 40; var ty = 18;
    var tw = w - tx - 16;

    var slotName = info.title || ('File ' + (this._index + 1));
    b.fontSize = 24; b.textColor = '#ffffff';
    b.drawText(slotName, tx, ty, tw, 32, 'left');

    var frames   = info.playtime || 0;
    var totalSec = Math.floor(frames / 60);
    var hours    = Math.floor(totalSec / 3600);
    var mins     = Math.floor((totalSec % 3600) / 60);
    var secs     = totalSec % 60;
    var timeStr  = hours + ':' + (mins < 10 ? '0' : '') + mins +
                   '\'' + (secs < 10 ? '0' : '') + secs;
    b.fontSize = 18; b.textColor = '#ffcc44';
    b.drawText('\u23f1 ' + timeStr, tx, ty + 38, tw, 26, 'left');

    var location = info.description || 'Unknown Location';
    b.fontSize = 16; b.textColor = '#88ccff';
    b.drawText('\u25a6 ' + location, tx, ty + 68, tw, 24, 'left');

    if (info.gold !== undefined) {
        b.fontSize = 16; b.textColor = '#ffdd44';
        b.drawText('\u2726 ' + info.gold + ' G', tx, ty + 96, tw / 2, 24, 'left');
    }

    if (info.timestamp) {
        var d  = new Date(info.timestamp);
        var ds = d.getFullYear() + '/' +
                 (d.getMonth()+1 < 10 ? '0' : '') + (d.getMonth()+1) + '/' +
                 (d.getDate() < 10 ? '0' : '') + d.getDate() + '  ' +
                 (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' +
                 (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
        b.fontSize = 14; b.textColor = '#556677';
        b.drawText(ds, tx, h - 28, tw, 22, 'left');
    }

    if (info.difficulty) {
        b.fontSize = 14; b.textColor = '#ff8844';
        b.drawText('[' + info.difficulty + ']', w - 140, ty, 130, 24, 'right');
    }
};

Scene_DC_SaveLoad.prototype._drawTabs = function() {
    var pageStart = this._page * SLOTS_PER_PAGE;
    for (var t = 0; t < SLOTS_PER_PAGE; t++) {
        var slotIdx = pageStart + t;
        if (slotIdx >= MAX_SAVES) break;
        var b       = this._tabBmps[t];
        var info    = this._saveInfos[slotIdx];
        var isSel   = (slotIdx === this._index) && (this._focusBtn === 'file');
        var mode    = Scene_DC_SaveLoad._mode;
        var locked  = (mode === 'newgame' && !!info) || (mode === 'load' && !info);
        b.clear();

        var fillC  = isSel ? '#001a44' : '#050518';
        var bordC  = isSel ? '#00aaff' : '#334455';
        drawPanel(b, 0, 0, this._tabW, this._TAB_H, fillC, bordC, isSel ? 3 : 2);

        // Play arrow badge — grey if locked
        b.fillRect(8, 14, 22, 22, locked ? '#333333' : '#cc0033');
        b.fontSize = 14; b.textColor = locked ? '#555555' : '#ffffff';
        b.drawText('\u25b6', 9, 14, 20, 20, 'left');

        b.fontSize  = isSel ? 18 : 16;
        b.textColor = locked ? '#444444' : (isSel ? '#ffffff' : '#aaaaaa');
        b.drawText('File ' + (slotIdx + 1), 36, 14, this._tabW - 44, 24, 'left');

        if (info) {
            b.fontSize = 22; b.textColor = isSel ? '#00aaff' : '#334455';
            b.drawText('\u25c6', this._tabW - 22, 12, 20, 26, 'left');
        }
    }
};

Scene_DC_SaveLoad.prototype._drawButtons = function() {
    var mode    = Scene_DC_SaveLoad._mode;
    var hasSave = !!this._saveInfos[this._index];
    var canDel  = hasSave && mode !== 'newgame';

    var db    = this._delBmp;
    var delSel = (this._focusBtn === 'delete');
    db.clear();
    drawPanel(db, 0, 0, 220, this._BTN_H,
        delSel ? '#2a0022' : '#110011',
        canDel ? (delSel ? '#ff44aa' : '#882244') : '#333333', 3);
    db.fontSize  = 20; db.textColor = canDel ? (delSel ? '#ffffff' : '#aa6688') : '#444444';
    db.drawText('[X]  Delete', 20, 10, 190, 24, 'left');

    var rb    = this._retBmp;
    var retSel = (this._focusBtn === 'return');
    rb.clear();
    drawPanel(rb, 0, 0, 220, this._BTN_H,
        retSel ? '#001a44' : '#000d22',
        retSel ? '#00aaff' : '#334466', 3);
    rb.fontSize  = 20; rb.textColor = retSel ? '#ffffff' : '#6688aa';
    rb.drawText('\u2190  Return', 20, 10, 190, 24, 'left');
};

Scene_DC_SaveLoad.prototype._drawArrows = function() {
    var pages = Math.ceil(MAX_SAVES / SLOTS_PER_PAGE);
    this._arrowLBmp.clear();
    if (this._page > 0) {
        this._arrowLBmp.fontSize = 28; this._arrowLBmp.textColor = '#00aaff';
        this._arrowLBmp.drawText('\u25c4', 2, 10, 26, 32, 'left');
    }
    this._arrowRBmp.clear();
    if (this._page < pages - 1) {
        this._arrowRBmp.fontSize = 28; this._arrowRBmp.textColor = '#00aaff';
        this._arrowRBmp.drawText('\u25ba', 2, 10, 26, 32, 'left');
    }
};

Scene_DC_SaveLoad.prototype._drawConfirm = function() {
    var b = this._confirmBmp;
    b.clear();
    drawPanel(b, 20, 0, Graphics.width - 40, 80, '#110022', '#ff44aa', 3);
    b.fontSize = 18; b.textColor = '#ffffff';
    b.drawText('Delete File ' + (this._index + 1) + '?   Enter = Confirm    Cancel = Cancel',
        30, 22, Graphics.width - 60, 36, 'left');
};

//─────────────────────────────────────────────────────────────────────────────
// UPDATE
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_SaveLoad.prototype.update = function() {
    Scene_Base.prototype.update.call(this);

    if (this._phase === 'confirm_delete') {
        if (Input.isTriggered('ok'))     { this._doDelete(); }
        if (Input.isTriggered('cancel')) {
            this._phase = 'select';
            this._confirmSp.visible = false;
            SoundManager.playCancel();
        }
        return;
    }

    if (Input.isTriggered('left')) {
        if (this._focusBtn === 'file')   { this._moveSlot(-1); }
        else if (this._focusBtn === 'return') {
            this._focusBtn = 'delete';
            SoundManager.playCursor(); this._drawButtons();
        }
    }
    if (Input.isTriggered('right')) {
        if (this._focusBtn === 'file')   { this._moveSlot(1); }
        else if (this._focusBtn === 'delete') {
            this._focusBtn = 'return';
            SoundManager.playCursor(); this._drawButtons();
        }
    }
    if (Input.isTriggered('up')) {
        if (this._focusBtn !== 'file') {
            this._focusBtn = 'file';
            SoundManager.playCursor(); this._drawTabs(); this._drawButtons();
        }
    }
    if (Input.isTriggered('down')) {
        if (this._focusBtn === 'file') {
            this._focusBtn = 'delete';
            SoundManager.playCursor(); this._drawTabs(); this._drawButtons();
        }
    }
    if (Input.isTriggered('pageup'))   { this._changePage(-1); }
    if (Input.isTriggered('pagedown')) { this._changePage(1);  }

    if (Input.isTriggered('ok')) {
        if (this._focusBtn === 'file')   { this._selectSlot(); }
        else if (this._focusBtn === 'delete') { this._startDelete(); }
        else if (this._focusBtn === 'return') { this._return(); }
    }
    if (Input.isTriggered('cancel')) { this._return(); }
};

Scene_DC_SaveLoad.prototype._moveSlot = function(dir) {
    var newIndex = this._index + dir;
    if (newIndex < 0)          newIndex = MAX_SAVES - 1;
    if (newIndex >= MAX_SAVES) newIndex = 0;
    this._index = newIndex;
    this._page  = Math.floor(this._index / SLOTS_PER_PAGE);
    SoundManager.playCursor();
    this._redrawAll();
};

Scene_DC_SaveLoad.prototype._changePage = function(dir) {
    var pages   = Math.ceil(MAX_SAVES / SLOTS_PER_PAGE);
    var newPage = this._page + dir;
    if (newPage < 0)      newPage = pages - 1;
    if (newPage >= pages) newPage = 0;
    this._page  = newPage;
    this._index = this._page * SLOTS_PER_PAGE;
    SoundManager.playCursor();
    this._redrawAll();
};

Scene_DC_SaveLoad.prototype._selectSlot = function() {
    var mode    = Scene_DC_SaveLoad._mode;
    var hasSave = !!this._saveInfos[this._index];

    if (mode === 'newgame') {
        if (hasSave) {
            // Locked — can't start new game on filled slot
            SoundManager.playBuzzer();
        } else {
            // Empty slot — start fresh
            SoundManager.playOk();
            DataManager.setupNewGame();
            DataManager.saveGame(this._index + 1, function() {});
            this._fadeToMap();
        }
        return;
    }

    if (mode === 'load' || mode === 'story') {
        if (hasSave) {
            SoundManager.playOk();
            this._loadAndFade();
        } else {
            SoundManager.playBuzzer();
        }
        return;
    }

    if (mode === 'save') {
        SoundManager.playOk();
        DataManager.saveGame(this._index + 1, function() {});
        this._loadSaveInfos();
        this._redrawAll();
    }
};

Scene_DC_SaveLoad.prototype._fadeToMap = function() {
    var self    = this;
    var overlay = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    overlay.bitmap.fillRect(0, 0, Graphics.width, Graphics.height, '#000000');
    overlay.opacity = 0;
    self.addChild(overlay);
    var timer = setInterval(function() {
        overlay.opacity += 10;
        if (overlay.opacity >= 255) {
            clearInterval(timer);
            SceneManager.goto(Scene_Map);
        }
    }, 16);
};

Scene_DC_SaveLoad.prototype._loadAndFade = function() {
    var self      = this;
    var saveIndex = this._index + 1;
    var overlay   = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    overlay.bitmap.fillRect(0, 0, Graphics.width, Graphics.height, '#000000');
    overlay.opacity = 0;
    self.addChild(overlay);
    var timer = setInterval(function() {
        overlay.opacity += 10;
        if (overlay.opacity >= 255) {
            clearInterval(timer);
            DataManager.loadGame(saveIndex, function() {});
            SceneManager.goto(Scene_Map);
        }
    }, 16);
};

Scene_DC_SaveLoad.prototype._startDelete = function() {
    var mode    = Scene_DC_SaveLoad._mode;
    var hasSave = !!this._saveInfos[this._index];
    if (!hasSave || mode === 'newgame') { SoundManager.playBuzzer(); return; }
    SoundManager.playOk();
    this._phase = 'confirm_delete';
    this._drawConfirm();
    this._confirmSp.visible = true;
};

Scene_DC_SaveLoad.prototype._doDelete = function() {
    StorageManager.remove(this._index + 1);
    this._saveInfos[this._index] = null;
    this._phase = 'select';
    this._confirmSp.visible = false;
    if (this._faceSp && this._faceSp.parent) {
        this._faceSp.parent.removeChild(this._faceSp);
        this._faceSp = null;
    }
    SoundManager.playOk();
    this._redrawAll();
};

Scene_DC_SaveLoad.prototype._return = function() {
    SoundManager.playCancel();
    if (this._faceSp && this._faceSp.parent) {
        this._faceSp.parent.removeChild(this._faceSp);
        this._faceSp = null;
    }
    var mode = Scene_DC_SaveLoad._mode;
    if (mode === 'newgame' || mode === 'load') {
        // Go back to Story Mode submenu
        if (typeof Scene_DC_StoryMode !== 'undefined') {
            SceneManager.goto(Scene_DC_StoryMode);
        } else if (typeof Scene_DC_MainMenu !== 'undefined') {
            SceneManager.goto(Scene_DC_MainMenu);
        } else {
            SceneManager.pop();
        }
    } else {
        SceneManager.pop();
    }
};

//=============================================================================
// PATCH DataManager to store difficulty in save info
//=============================================================================
var _makeSavefileInfo = DataManager.makeSavefileInfo;
DataManager.makeSavefileInfo = function() {
    var info = _makeSavefileInfo.call(this);
    try {
        var diff   = localStorage.getItem('dc_difficulty');
        var labels = ['Super Easy','Easy','Normal','Mild','Hard','Super Hard','Hardcore'];
        if (diff !== null) info.difficulty = labels[parseInt(diff)] || 'Normal';
    } catch(e) {}
    return info;
};

})();
