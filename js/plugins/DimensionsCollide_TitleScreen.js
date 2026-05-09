//=============================================================================
// DimensionsCollide_TitleScreen.js
//=============================================================================
/*:
 * @plugindesc v2.0 - Dimensions Collide Title Screen
 * @author DimensionsCollide Dev
 * @help
 * Place in js/plugins/ and enable in Plugin Manager.
 * Must be BELOW CustomLogo in the Plugin Manager list.
 *
 * Required audio/bgm/ : MainMenuTheme.ogg, OnlineModeTheme.ogg
 * Required audio/se/  : PressStart.ogg, FadeIn.ogg, FadeIn2.ogg
 * Required img/titles2/: Icon_PressStart.png
 *                        MenuBG_1.png (Main Menu)
 *                        MenuBG_2.png (Story Mode)
 *                        MenuBG_3.png (Online Mode)
 *                        MenuBG_4.png (Classic Games)
 */

(function() {

//=============================================================================
// AUDIO
//=============================================================================
var SE_PRESS_START = { name: 'PressStart', volume: 90, pitch: 100, pan: 0 };
var SE_FADE_1      = { name: 'FadeIn',     volume: 90, pitch: 100, pan: 0 };
var SE_FADE_2      = { name: 'FadeIn2',    volume: 90, pitch: 100, pan: 0 };
var BGM_MENU       = { name: 'MainMenuTheme',  volume: 90, pitch: 100, pan: 0 };
var BGM_ONLINE     = { name: 'OnlineModeTheme', volume: 90, pitch: 100, pan: 0 };
var BGM_SETTINGS   = { name: 'SettingsTheme',   volume: 90, pitch: 100, pan: 0 };

//=============================================================================
// BACKGROUND & ICON IMAGE NAMES (img/titles2/)
//=============================================================================
var IMG_PRESS_START_ICON = 'Icon_PressStart'; // Press Start icon
var IMG_BG_MAINMENU      = 'MenuBG_1';        // Main Menu background
var IMG_BG_STORY         = 'MenuBG_2';        // Story Mode background
var IMG_BG_ONLINE        = 'MenuBG_3';        // Online Mode background
var IMG_BG_CLASSIC       = 'MenuBG_4';        // Classic Games background
var IMG_BG_SETTINGS      = 'MenuBG_5';        // Settings background

//=============================================================================
// HELPER - load a titles2 image safely
//=============================================================================
function loadBG(name) {
    return ImageManager.loadTitle2(name);
}

//=============================================================================
// ACCOUNT SYSTEM
// Accounts saved to <AppData>/dc_accounts.json via NW.js fs.
// Each entry: { username, password }
// DC_Account.current holds the logged-in username (null if not logged in).
//=============================================================================
var DC_Account = {
    current: null,  // logged-in username
    name:    null,  // logged-in display name

    _getPath: function() {
        if (typeof nw !== 'undefined') {
            var path = require('path');
            return path.join(nw.App.dataPath, 'dc_accounts.json');
        }
        return null;
    },

    loadAll: function() {
        try {
            var fp = this._getPath();
            if (!fp) return [];
            var fs = require('fs');
            if (!fs.existsSync(fp)) return [];
            return JSON.parse(fs.readFileSync(fp, 'utf8')) || [];
        } catch(e) { return []; }
    },

    saveAll: function(list) {
        try {
            var fp = this._getPath();
            if (!fp) return;
            require('fs').writeFileSync(fp, JSON.stringify(list), 'utf8');
        } catch(e) {}
    },

    login: function(username, password) {
        var list = this.loadAll();
        for (var i = 0; i < list.length; i++) {
            if (list[i].username.toLowerCase() === username.toLowerCase() &&
                list[i].password === password) {
                this.current  = list[i].username;
                this.name     = list[i].name || list[i].username;
                return true;
            }
        }
        return false;
    },

    create: function(name, username, password) {
        if (!name     || name.length < 1)     return 'invalid';
        if (!username || username.length < 3)  return 'invalid';
        if (!password || password.length < 4)  return 'invalid';
        var list = this.loadAll();
        for (var i = 0; i < list.length; i++) {
            if (list[i].username.toLowerCase() === username.toLowerCase()) return 'taken';
        }
        list.push({ name: name, username: username, password: password });
        this.saveAll(list);
        this.current = username;
        this.name    = name;
        return 'ok';
    },

    isLoggedIn: function() { return !!this.current; },
    logout: function() { this.current = null; }
};

//=============================================================================
// HTML INPUT HELPER
// Creates a real visible <input> on top of the RPG Maker canvas.
// This is the ONLY reliable way to get free keyboard typing in NW.js/MV.
//=============================================================================
var DC_Input = {
    _box: null,

    show: function(placeholder, isPassword, x, y, w, onEnter) {
        this.hide();
        var el = document.createElement('input');
        el.type        = isPassword ? 'password' : 'text';
        el.placeholder = placeholder;
        el.maxLength   = isPassword ? 32 : 20;
        el.style.cssText = [
            'position:fixed',
            'left:'   + x + 'px',
            'top:'    + y + 'px',
            'width:'  + w + 'px',
            'height:40px',
            'font-size:20px',
            'padding:4px 10px',
            'background:#111133',
            'color:#00ffcc',
            'border:2px solid #00ffcc',
            'outline:none',
            'z-index:9999',
            'font-family:monospace'
        ].join(';');
        document.body.appendChild(el);
        el.focus();
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); if (onEnter) onEnter(el.value); }
            e.stopPropagation();
        }, true);
        this._box = el;
        return el;
    },

    getValue: function() {
        return this._box ? this._box.value : '';
    },

    hide: function() {
        if (this._box && this._box.parentNode) {
            this._box.parentNode.removeChild(this._box);
        }
        this._box = null;
    }
};

//=============================================================================
// HOOK - fires after CustomLogo finishes, replaces default title
//=============================================================================//=============================================================================
// HOOK - fires after CustomLogo finishes, replaces default title
//=============================================================================
var _Scene_Title_start = Scene_Title.prototype.start;
Scene_Title.prototype.start = function() {
    _Scene_Title_start.call(this);
    SceneManager.goto(Scene_DC_PressStart);
};

//=============================================================================
// HELPER - draw a bordered box onto a bitmap
//=============================================================================
function drawBox(bmp, x, y, w, h, fillColor, borderColor) {
    bmp.fillRect(x, y, w, h, fillColor);
    bmp.fillRect(x, y, w, 3, borderColor);
    bmp.fillRect(x, y + h - 3, w, 3, borderColor);
    bmp.fillRect(x, y, 3, h, borderColor);
    bmp.fillRect(x + w - 3, y, 3, h, borderColor);
}

//=============================================================================
// SCENE: PRESS START
//=============================================================================
function Scene_DC_PressStart() {
    this.initialize.apply(this, arguments);
}
Scene_DC_PressStart.prototype = Object.create(Scene_Base.prototype);
Scene_DC_PressStart.prototype.constructor = Scene_DC_PressStart;

Scene_DC_PressStart.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._phase = 'idle';   // idle > flash > fade
    this._timer = 0;
    this._flashTimer = 0;
};

Scene_DC_PressStart.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    // Title background
    if ($dataSystem.title1Name) {
        this._bg = new Sprite(ImageManager.loadTitle1($dataSystem.title1Name));
        this.addChild(this._bg);
    } else {
        var bgBmp = new Bitmap(Graphics.width, Graphics.height);
        bgBmp.fillRect(0, 0, Graphics.width, Graphics.height, '#000033');
        this.addChild(new Sprite(bgBmp));
    }

    // Press Start icon only — no text (img/titles2/Icon_PressStart.png)
    this._psIcon = new Sprite(loadBG(IMG_PRESS_START_ICON));
    this._psIcon.x = Math.floor(Graphics.width / 2);
    this._psIcon.y = Math.floor(Graphics.height * 0.72);
    this._psIcon.anchor.x = 0.5;
    this._psIcon.anchor.y = 0.5;
    this.addChild(this._psIcon);
    // Dummy sprite so opacity sync code still works
    this._psSprite = new Sprite(new Bitmap(1, 1));
    this.addChild(this._psSprite);

    // Black fade overlay
    var fadeBmp = new Bitmap(Graphics.width, Graphics.height);
    fadeBmp.fillRect(0, 0, Graphics.width, Graphics.height, '#000000');
    this._fadeSprite = new Sprite(fadeBmp);
    this._fadeSprite.opacity = 0;
    this.addChild(this._fadeSprite);
};

Scene_DC_PressStart.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    this._timer++;

    if (this._phase === 'idle') {
        // Slow blink
        this._psSprite.opacity = (this._timer % 60 < 30) ? 255 : 0;
        this._psIcon.opacity   = this._psSprite.opacity;
        if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
            AudioManager.playSe(SE_PRESS_START);
            this._phase = 'flash';
            this._flashTimer = 0;
        }
    }
    else if (this._phase === 'flash') {
        // Fast blink for 2 seconds
        this._flashTimer++;
        this._psSprite.opacity = (this._flashTimer % 10 < 5) ? 255 : 0;
        this._psIcon.opacity   = this._psSprite.opacity;
        if (this._flashTimer >= 120) {
            AudioManager.playSe(SE_FADE_1);
            AudioManager.playSe(SE_FADE_2);
            AudioManager.playBgm(BGM_MENU);
            this._phase = 'fade';
        }
    }
    else if (this._phase === 'fade') {
        // Fade to black then go to main menu
        this._fadeSprite.opacity += 6;
        if (this._fadeSprite.opacity >= 255) {
            SceneManager.goto(Scene_DC_MainMenu);
        }
    }
};

//=============================================================================
// SCENE: MAIN MENU
//=============================================================================
function Scene_DC_MainMenu() {
    this.initialize.apply(this, arguments);
}
Scene_DC_MainMenu.prototype = Object.create(Scene_Base.prototype);
Scene_DC_MainMenu.prototype.constructor = Scene_DC_MainMenu;

Scene_DC_MainMenu.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._index = 0;
    this._commands = [
        { name: 'Story Mode',    symbol: 'story'        },
        { name: 'Settings',      symbol: 'options'      },
        { name: 'Online Mode',   symbol: 'online'       },
        { name: 'Classic Games', symbol: 'classicgames' },
        { name: 'Quit',          symbol: 'quit'         }
    ];
};

Scene_DC_MainMenu.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    // Background (img/titles2/MenuBG_1.png)
    this._bg = new Sprite(loadBG(IMG_BG_MAINMENU));
    this.addChild(this._bg);

    // Fade in from black
    var fadeBmp = new Bitmap(Graphics.width, Graphics.height);
    fadeBmp.fillRect(0, 0, Graphics.width, Graphics.height, '#000000');
    this._fadeIn = new Sprite(fadeBmp);
    this._fadeIn.opacity = 255;
    this._fadingIn = true;

    // Menu box
    var boxW = 280;
    var boxH = 30 + this._commands.length * 52;
    var boxX = 80;
    var boxY = Math.floor(Graphics.height * 0.45);
    var boxBmp = new Bitmap(boxW, boxH);
    drawBox(boxBmp, 0, 0, boxW, boxH, '#111133', '#00ffcc');
    var boxSp = new Sprite(boxBmp);
    boxSp.x = boxX;
    boxSp.y = boxY;
    this.addChild(boxSp);

    // Menu items
    this._menuSprites = [];
    for (var i = 0; i < this._commands.length; i++) {
        var bmp = new Bitmap(boxW - 20, 46);
        bmp.fontSize = 22;
        var sp = new Sprite(bmp);
        sp.x = boxX + 10;
        sp.y = boxY + 14 + i * 50;
        this.addChild(sp);
        this._menuSprites.push(sp);
    }

    // Fade sprite on top of everything
    this.addChild(this._fadeIn);

    this._refresh();
};

Scene_DC_MainMenu.prototype._refresh = function() {
    for (var i = 0; i < this._commands.length; i++) {
        var bmp = this._menuSprites[i].bitmap;
        bmp.clear();
        bmp.fontSize = 22;
        if (i === this._index) {
            bmp.textColor = '#00ffcc';
            bmp.drawText('\u25b6 ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        } else {
            bmp.textColor = '#aaaaaa';
            bmp.drawText('   ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        }
    }
};

Scene_DC_MainMenu.prototype.update = function() {
    Scene_Base.prototype.update.call(this);

    // Fade in on enter
    if (this._fadingIn) {
        this._fadeIn.opacity -= 8;
        if (this._fadeIn.opacity <= 0) {
            this._fadingIn = false;
            this._fadeIn.opacity = 0;
        }
        return;
    }

    if (Input.isTriggered('down')) {
        this._index = (this._index + 1) % this._commands.length;
        SoundManager.playCursor();
        this._refresh();
    }
    if (Input.isTriggered('up')) {
        this._index = (this._index - 1 + this._commands.length) % this._commands.length;
        SoundManager.playCursor();
        this._refresh();
    }
    if (Input.isTriggered('ok')) {
        this._select();
    }
};

Scene_DC_MainMenu.prototype._select = function() {
    var sym = this._commands[this._index].symbol;
    switch (sym) {
        case 'story':
            SoundManager.playOk();
            SceneManager.goto(Scene_DC_StoryMode);
            break;
        case 'options':
            SoundManager.playOk();
            AudioManager.playBgm(BGM_SETTINGS);
            SceneManager.goto(Scene_DC_Settings);
            break;
        case 'online':
            SoundManager.playOk();
            AudioManager.playBgm(BGM_ONLINE);
            if (DC_Account.isLoggedIn()) {
                SceneManager.goto(Scene_DC_OnlineMenu);
            } else {
                SceneManager.goto(Scene_DC_Login);
            }
            break;
        case 'classicgames':
            SoundManager.playOk();
            SceneManager.goto(Scene_DC_ClassicGames);
            break;
        case 'quit':
            SoundManager.playOk();
            if (typeof nw !== 'undefined') nw.App.quit();
            break;
    }
};

//=============================================================================
// SCENE: STORY MODE SUBMENU
//=============================================================================
function Scene_DC_StoryMode() {
    this.initialize.apply(this, arguments);
}
Scene_DC_StoryMode.prototype = Object.create(Scene_Base.prototype);
Scene_DC_StoryMode.prototype.constructor = Scene_DC_StoryMode;

Scene_DC_StoryMode.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._index = 0;
    this._commands = [
        { name: 'New Game',  symbol: 'newGame'  },
        { name: 'Continue',  symbol: 'continue' },
        { name: '\u2190 Back', symbol: 'back'   }
    ];
};

Scene_DC_StoryMode.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    // Background (img/titles2/MenuBG_2.png)
    this._bg = new Sprite(loadBG(IMG_BG_STORY));
    this.addChild(this._bg);

    // Title label
    var lblBmp = new Bitmap(300, 40);
    lblBmp.fontSize = 24;
    lblBmp.textColor = '#00ffcc';
    lblBmp.drawText('STORY MODE', 0, 0, 300, 40, 'left');
    var lblSp = new Sprite(lblBmp);
    lblSp.x = 80;
    lblSp.y = Math.floor(Graphics.height * 0.40);
    this.addChild(lblSp);

    // Menu box
    var boxW = 280;
    var boxH = 30 + this._commands.length * 52;
    var boxX = 80;
    var boxY = Math.floor(Graphics.height * 0.48);
    var boxBmp = new Bitmap(boxW, boxH);
    drawBox(boxBmp, 0, 0, boxW, boxH, '#111133', '#00ffcc');
    var boxSp = new Sprite(boxBmp);
    boxSp.x = boxX;
    boxSp.y = boxY;
    this.addChild(boxSp);

    // Menu items
    this._menuSprites = [];
    for (var i = 0; i < this._commands.length; i++) {
        var bmp = new Bitmap(boxW - 20, 46);
        bmp.fontSize = 22;
        var sp = new Sprite(bmp);
        sp.x = boxX + 10;
        sp.y = boxY + 14 + i * 50;
        this.addChild(sp);
        this._menuSprites.push(sp);
    }

    this._refresh();
};

Scene_DC_StoryMode.prototype._hasSave = function() {
    for (var i = 1; i <= DataManager.maxSavefiles(); i++) {
        if (DataManager.loadSavefileInfo(i)) return true;
    }
    return false;
};

Scene_DC_StoryMode.prototype._refresh = function() {
    for (var i = 0; i < this._commands.length; i++) {
        var bmp = this._menuSprites[i].bitmap;
        bmp.clear();
        bmp.fontSize = 22;
        var sym = this._commands[i].symbol;
        var disabled = (sym === 'continue' && !this._hasSave());
        if (disabled) {
            bmp.textColor = '#555555';
            bmp.drawText('   ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        } else if (i === this._index) {
            bmp.textColor = '#00ffcc';
            bmp.drawText('\u25b6 ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        } else {
            bmp.textColor = '#aaaaaa';
            bmp.drawText('   ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        }
    }
};

Scene_DC_StoryMode.prototype.update = function() {
    Scene_Base.prototype.update.call(this);

    if (Input.isTriggered('down')) {
        this._index = (this._index + 1) % this._commands.length;
        SoundManager.playCursor();
        this._refresh();
    }
    if (Input.isTriggered('up')) {
        this._index = (this._index - 1 + this._commands.length) % this._commands.length;
        SoundManager.playCursor();
        this._refresh();
    }
    if (Input.isTriggered('ok')) {
        this._select();
    }
    if (Input.isTriggered('cancel')) {
        SoundManager.playCancel();
        SceneManager.goto(Scene_DC_MainMenu);
    }
};

Scene_DC_StoryMode.prototype._select = function() {
    var sym = this._commands[this._index].symbol;
    switch (sym) {
        case 'newGame':
            SoundManager.playOk();
            if (typeof Scene_DC_SaveLoad !== 'undefined') {
                Scene_DC_SaveLoad._mode = 'newgame';
                SceneManager.goto(Scene_DC_SaveLoad);
            } else {
                DataManager.setupNewGame();
                SceneManager.goto(Scene_DC_FadeToGame);
            }
            break;
        case 'continue':
            if (this._hasSave()) {
                SoundManager.playOk();
                if (typeof Scene_DC_SaveLoad !== 'undefined') {
                    Scene_DC_SaveLoad._mode = 'load';
                    SceneManager.goto(Scene_DC_SaveLoad);
                } else {
                    SceneManager.push(Scene_Load);
                }
            } else {
                SoundManager.playBuzzer();
            }
            break;
        case 'back':
            SoundManager.playCancel();
            SceneManager.goto(Scene_DC_MainMenu);
            break;
    }
};

//=============================================================================
// SCENE: LOGIN
//=============================================================================
function Scene_DC_Login() { this.initialize.apply(this, arguments); }
Scene_DC_Login.prototype = Object.create(Scene_Base.prototype);
Scene_DC_Login.prototype.constructor = Scene_DC_Login;

Scene_DC_Login.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._menuIndex = 0;  // 0=LogIn 1=CreateAccount 2=Back
    this._errorMsg  = '';
    this._errorTimer = 0;
};

Scene_DC_Login.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    this._bg = new Sprite(loadBG(IMG_BG_ONLINE));
    this.addChild(this._bg);

    // Title
    var titleBmp = new Bitmap(Graphics.width, 50);
    titleBmp.fontSize = 26;
    titleBmp.textColor = '#00ffcc';
    titleBmp.drawText('ONLINE MODE  -  Sign In', 0, 0, Graphics.width, 50, 'center');
    var titleSp = new Sprite(titleBmp);
    titleSp.y = 40;
    this.addChild(titleSp);

    // Labels
    var uLbl = new Bitmap(320, 28);
    uLbl.fontSize = 16; uLbl.textColor = '#aaaaaa';
    uLbl.drawText('USERNAME', 0, 0, 320, 28, 'left');
    var uLblSp = new Sprite(uLbl);
    uLblSp.x = Math.floor(Graphics.width / 2) - 160;
    uLblSp.y = 115;
    this.addChild(uLblSp);

    var pLbl = new Bitmap(320, 28);
    pLbl.fontSize = 16; pLbl.textColor = '#aaaaaa';
    pLbl.drawText('PASSWORD', 0, 0, 320, 28, 'left');
    var pLblSp = new Sprite(pLbl);
    pLblSp.x = Math.floor(Graphics.width / 2) - 160;
    pLblSp.y = 195;
    this.addChild(pLblSp);

    // Hint
    var hintBmp = new Bitmap(Graphics.width, 26);
    hintBmp.fontSize = 15; hintBmp.textColor = '#666666';
    hintBmp.drawText('Type in the boxes below, then use Arrow Keys + Enter to select a button', 0, 0, Graphics.width, 26, 'center');
    var hintSp = new Sprite(hintBmp);
    hintSp.y = 290;
    this.addChild(hintSp);

    // Buttons
    var boxW = 300;
    var boxX = Math.floor(Graphics.width / 2) - 150;
    var buttons = ['Log In', 'Create Account', '← Back'];
    this._btnSprites = [];
    for (var i = 0; i < buttons.length; i++) {
        var bmp = new Bitmap(boxW, 44);
        bmp.fontSize = 22;
        var sp = new Sprite(bmp);
        sp.x = boxX;
        sp.y = 320 + i * 52;
        this.addChild(sp);
        this._btnSprites.push(sp);
    }

    // Error message sprite
    var errBmp = new Bitmap(Graphics.width, 30);
    errBmp.fontSize = 16;
    this._errSprite = new Sprite(errBmp);
    this._errSprite.y = 280;
    this.addChild(this._errSprite);

    // HTML input boxes — both shown at once, real keyboard typing
    var cx  = Math.floor(Graphics.width / 2) - 160;
    var cr  = Graphics._canvas ? Graphics._canvas.getBoundingClientRect() : { left: 0, top: 0 };
    var px  = cr.left  + cx;
    var iw  = 320;
    this._loginEls = [];
    var yPos  = [138, 218];
    var types = ['text', 'password'];
    var hints = ['Enter username...', 'Enter password...'];
    for (var li = 0; li < 2; li++) {
        var el = document.createElement('input');
        el.type        = types[li];
        el.placeholder = hints[li];
        el.maxLength   = li === 0 ? 20 : 32;
        el.style.cssText = [
            'position:fixed',
            'left:'   + px + 'px',
            'top:'    + (cr.top + yPos[li]) + 'px',
            'width:'  + iw + 'px',
            'height:40px',
            'font-size:19px',
            'padding:4px 10px',
            'background:#111133',
            'color:#00ffcc',
            'border:2px solid #00ffcc',
            'outline:none',
            'z-index:9999',
            'font-family:monospace'
        ].join(';');
        el.addEventListener('keydown', function(e) { e.stopPropagation(); }, true);
        document.body.appendChild(el);
        this._loginEls.push(el);
    }
    this._loginEls[0].focus();

    this._refreshButtons();
};

Scene_DC_Login.prototype._refreshButtons = function() {
    var labels = ['Log In', 'Create Account', '← Back'];
    for (var i = 0; i < this._btnSprites.length; i++) {
        var bmp = this._btnSprites[i].bitmap;
        bmp.clear();
        bmp.fontSize = 22;
        if (i === this._menuIndex) {
            bmp.textColor = '#00ffcc';
            bmp.drawText('▶ ' + labels[i], 0, 2, bmp.width, 40, 'left');
        } else {
            bmp.textColor = '#888888';
            bmp.drawText('   ' + labels[i], 0, 2, bmp.width, 40, 'left');
        }
    }
};

Scene_DC_Login.prototype._showError = function(msg) {
    this._errSprite.bitmap.clear();
    this._errSprite.bitmap.fontSize = 16;
    this._errSprite.bitmap.textColor = '#ff4444';
    this._errSprite.bitmap.drawText('⚠ ' + msg, 0, 0, Graphics.width, 30, 'center');
    this._errorTimer = 180;
};

Scene_DC_Login.prototype.update = function() {
    Scene_Base.prototype.update.call(this);

    if (this._errorTimer > 0) {
        this._errorTimer--;
        if (this._errorTimer === 0) {
            this._errSprite.bitmap.clear();
        }
    }

    if (Input.isTriggered('down')) {
        this._menuIndex = (this._menuIndex + 1) % 3;
        SoundManager.playCursor();
        this._refreshButtons();
    }
    if (Input.isTriggered('up')) {
        this._menuIndex = (this._menuIndex - 1 + 3) % 3;
        SoundManager.playCursor();
        this._refreshButtons();
    }
    if (Input.isTriggered('ok')) {
        this._select();
    }
    if (Input.isTriggered('cancel')) {
        this._removeLoginEls();
        SoundManager.playCancel();
        AudioManager.playBgm(BGM_MENU);
        SceneManager.goto(Scene_DC_MainMenu);
    }
};

Scene_DC_Login.prototype._getInputs = function() {
    var user = '', pass = '';
    if (this._loginEls && this._loginEls.length === 2) {
        user = this._loginEls[0].value.trim();
        pass = this._loginEls[1].value;
    }
    return { user: user, pass: pass };
};

Scene_DC_Login.prototype._select = function() {
    if (this._menuIndex === 2) {
        this._removeLoginEls();
        SoundManager.playCancel();
        AudioManager.playBgm(BGM_MENU);
        SceneManager.goto(Scene_DC_MainMenu);
        return;
    }
    var vals = this._getInputs();
    if (this._menuIndex === 0) {
        // Log In
        if (!vals.user || !vals.pass) {
            SoundManager.playBuzzer();
            this._showError('Please enter your username and password.');
            return;
        }
        var ok = DC_Account.login(vals.user, vals.pass);
        if (ok) {
            this._removeLoginEls();
            SoundManager.playOk();
            SceneManager.goto(Scene_DC_OnlineMenu);
        } else {
            SoundManager.playBuzzer();
            this._showError('Incorrect username or password.');
        }
    } else {
        // Go to Create Account
        this._removeLoginEls();
        SoundManager.playOk();
        SceneManager.goto(Scene_DC_CreateAccount);
    }
};

Scene_DC_Login.prototype._removeLoginEls = function() {
    if (this._loginEls) {
        for (var i = 0; i < this._loginEls.length; i++) {
            if (this._loginEls[i].parentNode)
                this._loginEls[i].parentNode.removeChild(this._loginEls[i]);
        }
        this._loginEls = null;
    }
    DC_Input.hide();
};

Scene_DC_Login.prototype.terminate = function() {
    Scene_Base.prototype.terminate.call(this);
    this._removeLoginEls();
};

//=============================================================================
// SCENE: CREATE ACCOUNT
//=============================================================================
function Scene_DC_CreateAccount() { this.initialize.apply(this, arguments); }
Scene_DC_CreateAccount.prototype = Object.create(Scene_Base.prototype);
Scene_DC_CreateAccount.prototype.constructor = Scene_DC_CreateAccount;

Scene_DC_CreateAccount.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._menuIndex  = 0;  // 0=Create 1=Back
    this._errorTimer = 0;
};

Scene_DC_CreateAccount.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    this._bg = new Sprite(loadBG(IMG_BG_ONLINE));
    this.addChild(this._bg);

    // Title
    var titleBmp = new Bitmap(Graphics.width, 50);
    titleBmp.fontSize = 26;
    titleBmp.textColor = '#00ffcc';
    titleBmp.drawText('ONLINE MODE  -  Create Account', 0, 0, Graphics.width, 50, 'center');
    var titleSp = new Sprite(titleBmp);
    titleSp.y = 30;
    this.addChild(titleSp);

    // Field labels
    var labels  = ['YOUR NAME  (display name)', 'USERNAME  (min 3 chars)', 'PASSWORD  (min 4 chars)', 'CONFIRM PASSWORD'];
    var yStarts = [88, 163, 238, 313];
    for (var i = 0; i < labels.length; i++) {
        var lBmp = new Bitmap(350, 26);
        lBmp.fontSize = 15; lBmp.textColor = '#aaaaaa';
        lBmp.drawText(labels[i], 0, 0, 350, 26, 'left');
        var lSp = new Sprite(lBmp);
        lSp.x = Math.floor(Graphics.width / 2) - 160;
        lSp.y = yStarts[i];
        this.addChild(lSp);
    }

    // Hint
    var hintBmp = new Bitmap(Graphics.width, 26);
    hintBmp.fontSize = 14; hintBmp.textColor = '#666666';
    hintBmp.drawText('Fill in all three boxes, then press Create Account', 0, 0, Graphics.width, 26, 'center');
    var hintSp = new Sprite(hintBmp);
    hintSp.y = 400;
    this.addChild(hintSp);

    // Buttons
    var boxW  = 300;
    var boxX  = Math.floor(Graphics.width / 2) - 150;
    var btns  = ['Create Account', '← Back'];
    this._btnSprites = [];
    for (var j = 0; j < btns.length; j++) {
        var bmp = new Bitmap(boxW, 44);
        bmp.fontSize = 22;
        var sp = new Sprite(bmp);
        sp.x = boxX;
        sp.y = 420 + j * 52;
        this.addChild(sp);
        this._btnSprites.push(sp);
    }

    // Error sprite
    var errBmp = new Bitmap(Graphics.width, 28);
    errBmp.fontSize = 15;
    this._errSprite = new Sprite(errBmp);
    this._errSprite.y = 388;
    this.addChild(this._errSprite);

    // HTML inputs
    var cx   = Math.floor(Graphics.width / 2) - 150;
    var cr   = Graphics._canvas ? Graphics._canvas.getBoundingClientRect() : { left: 0, top: 0 };
    var px   = cr.left + cx;
    var iw   = 320;
    DC_Input.show('Username...',         false, px, cr.top + 122, iw, null);
    // Show password fields after a tick so they stack properly
    var self = this;
    setTimeout(function() {
        DC_Input.hide();
        // Show all three fields at once using separate elements
        self._createAllFields(px, cr.top, iw);
    }, 10);

    this._refreshButtons();
};

Scene_DC_CreateAccount.prototype._createAllFields = function(px, py, iw) {
    var yPos  = [110, 185, 260, 335];
    var types = ['text', 'text', 'password', 'password'];
    var hints = ['Your display name...', 'Username...', 'Password...', 'Confirm password...'];
    this._inputEls = [];
    for (var i = 0; i < 4; i++) {
        var el = document.createElement('input');
        el.type        = types[i];
        el.placeholder = hints[i];
        el.maxLength   = i <= 1 ? 24 : 32;
        el.style.cssText = [
            'position:fixed',
            'left:'   + px + 'px',
            'top:'    + (py + yPos[i]) + 'px',
            'width:'  + iw + 'px',
            'height:40px',
            'font-size:19px',
            'padding:4px 10px',
            'background:#111133',
            'color:#00ffcc',
            'border:2px solid #00ffcc',
            'outline:none',
            'z-index:9999',
            'font-family:monospace'
        ].join(';');
        el.addEventListener('keydown', function(e) { e.stopPropagation(); }, true);
        document.body.appendChild(el);
        this._inputEls.push(el);
    }
    this._inputEls[0].focus();
};

Scene_DC_CreateAccount.prototype._removeFields = function() {
    if (this._inputEls) {
        for (var i = 0; i < this._inputEls.length; i++) {
            if (this._inputEls[i].parentNode) {
                this._inputEls[i].parentNode.removeChild(this._inputEls[i]);
            }
        }
        this._inputEls = null;
    }
    DC_Input.hide();
};

Scene_DC_CreateAccount.prototype._refreshButtons = function() {
    var labels = ['Create Account', '← Back'];
    for (var i = 0; i < this._btnSprites.length; i++) {
        var bmp = this._btnSprites[i].bitmap;
        bmp.clear();
        bmp.fontSize = 22;
        if (i === this._menuIndex) {
            bmp.textColor = '#00ffcc';
            bmp.drawText('▶ ' + labels[i], 0, 2, bmp.width, 40, 'left');
        } else {
            bmp.textColor = '#888888';
            bmp.drawText('   ' + labels[i], 0, 2, bmp.width, 40, 'left');
        }
    }
};

Scene_DC_CreateAccount.prototype._showError = function(msg) {
    this._errSprite.bitmap.clear();
    this._errSprite.bitmap.fontSize = 15;
    this._errSprite.bitmap.textColor = '#ff4444';
    this._errSprite.bitmap.drawText('⚠ ' + msg, 0, 0, Graphics.width, 28, 'center');
    this._errorTimer = 200;
};

Scene_DC_CreateAccount.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    if (this._errorTimer > 0) {
        this._errorTimer--;
        if (this._errorTimer === 0) this._errSprite.bitmap.clear();
    }
    if (Input.isTriggered('down')) {
        this._menuIndex = (this._menuIndex + 1) % 2;
        SoundManager.playCursor();
        this._refreshButtons();
    }
    if (Input.isTriggered('up')) {
        this._menuIndex = (this._menuIndex - 1 + 2) % 2;
        SoundManager.playCursor();
        this._refreshButtons();
    }
    if (Input.isTriggered('ok'))     { this._select(); }
    if (Input.isTriggered('cancel')) {
        this._removeFields();
        SoundManager.playCancel();
        SceneManager.goto(Scene_DC_Login);
    }
};

Scene_DC_CreateAccount.prototype._select = function() {
    if (this._menuIndex === 1) {
        this._removeFields();
        SoundManager.playCancel();
        SceneManager.goto(Scene_DC_Login);
        return;
    }
    // Gather values
    var name = '', user = '', pass = '', conf = '';
    if (this._inputEls && this._inputEls.length === 4) {
        name = this._inputEls[0].value.trim();
        user = this._inputEls[1].value.trim();
        pass = this._inputEls[2].value;
        conf = this._inputEls[3].value;
    }
    if (name.length < 1)  { SoundManager.playBuzzer(); this._showError('Please enter your name.'); return; }
    if (user.length < 3)  { SoundManager.playBuzzer(); this._showError('Username must be at least 3 characters.'); return; }
    if (pass.length < 4)  { SoundManager.playBuzzer(); this._showError('Password must be at least 4 characters.'); return; }
    if (pass !== conf)    { SoundManager.playBuzzer(); this._showError('Passwords do not match!'); return; }
    var result = DC_Account.create(name, user, pass);
    if (result === 'taken')   { SoundManager.playBuzzer(); this._showError('That username is already taken.'); return; }
    if (result === 'invalid') { SoundManager.playBuzzer(); this._showError('Invalid username or password.'); return; }
    // Success!
    this._removeFields();
    SoundManager.playOk();
    SceneManager.goto(Scene_DC_OnlineMenu);
};

Scene_DC_CreateAccount.prototype.terminate = function() {
    Scene_Base.prototype.terminate.call(this);
    this._removeFields();
};

//=============================================================================
// SCENE: ONLINE MODE MENU
//=============================================================================
function Scene_DC_OnlineMenu() {
    this.initialize.apply(this, arguments);
}
Scene_DC_OnlineMenu.prototype = Object.create(Scene_Base.prototype);
Scene_DC_OnlineMenu.prototype.constructor = Scene_DC_OnlineMenu;

Scene_DC_OnlineMenu.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._index = 0;
    this._commands = [
        { name: 'Multiplayer',     symbol: 'multiplayer' },
        { name: 'Friend Messages', symbol: 'messages'    },
        { name: 'Profile Picture', symbol: 'pfp'         },
        { name: '← Back',     symbol: 'back'        }
    ];
};

Scene_DC_OnlineMenu.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    this._bg = new Sprite(loadBG(IMG_BG_ONLINE));
    this.addChild(this._bg);

    // Show logged-in username
    var userBmp = new Bitmap(Graphics.width, 32);
    userBmp.fontSize = 17; userBmp.textColor = '#00ffcc';
    var displayName = DC_Account.name || DC_Account.current || '';
    userBmp.drawText('Hi, ' + displayName + '!  (@' + (DC_Account.current || '') + ')', 0, 0, Graphics.width, 32, 'right');
    var userSp = new Sprite(userBmp);
    userSp.y = 8;
    this.addChild(userSp);

    var lblBmp = new Bitmap(300, 40);
    lblBmp.fontSize = 24; lblBmp.textColor = '#00ffcc';
    lblBmp.drawText('ONLINE MODE', 0, 0, 300, 40, 'left');
    var lblSp = new Sprite(lblBmp);
    lblSp.x = 80;
    lblSp.y = Math.floor(Graphics.height * 0.28);
    this.addChild(lblSp);

    var boxW = 280;
    var boxH = 30 + this._commands.length * 52;
    var boxX = 80;
    var boxY = Math.floor(Graphics.height * 0.36);
    var boxBmp = new Bitmap(boxW, boxH);
    drawBox(boxBmp, 0, 0, boxW, boxH, '#111133', '#00ffcc');
    var boxSp = new Sprite(boxBmp);
    boxSp.x = boxX; boxSp.y = boxY;
    this.addChild(boxSp);

    this._menuSprites = [];
    for (var i = 0; i < this._commands.length; i++) {
        var bmp = new Bitmap(boxW - 20, 46);
        bmp.fontSize = 22;
        var sp = new Sprite(bmp);
        sp.x = boxX + 10;
        sp.y = boxY + 14 + i * 50;
        this.addChild(sp);
        this._menuSprites.push(sp);
    }

    this._refresh();
};

Scene_DC_OnlineMenu.prototype._refresh = function() {
    for (var i = 0; i < this._commands.length; i++) {
        var bmp = this._menuSprites[i].bitmap;
        bmp.clear(); bmp.fontSize = 22;
        if (i === this._index) {
            bmp.textColor = '#00ffcc';
            bmp.drawText('▶ ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        } else {
            bmp.textColor = '#aaaaaa';
            bmp.drawText('   ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        }
    }
};

Scene_DC_OnlineMenu.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    if (Input.isTriggered('down')) {
        this._index = (this._index + 1) % this._commands.length;
        SoundManager.playCursor(); this._refresh();
    }
    if (Input.isTriggered('up')) {
        this._index = (this._index - 1 + this._commands.length) % this._commands.length;
        SoundManager.playCursor(); this._refresh();
    }
    if (Input.isTriggered('ok')) {
        var sym = this._commands[this._index].symbol;
        if (sym === 'back') {
            SoundManager.playCancel();
            AudioManager.playBgm(BGM_MENU);
            SceneManager.goto(Scene_DC_MainMenu);
        } else if (sym === 'multiplayer') {
            SoundManager.playOk();
            SceneManager.goto(Scene_DC_Multiplayer);
        } else if (sym === 'messages') {
            SoundManager.playOk();
            // Lazy reference — Messages plugin must be loaded below TitleScreen
            if (typeof Scene_DC_Messages !== 'undefined') {
                SceneManager.goto(Scene_DC_Messages);
            } else {
                SoundManager.playBuzzer();
                alert('DimensionsCollide_Messages.js is not loaded! Make sure it is enabled in the Plugin Manager below DimensionsCollide_TitleScreen.js');
            }
        } else {
            SoundManager.playBuzzer();
        }
    }
    if (Input.isTriggered('cancel')) {
        SoundManager.playCancel();
        AudioManager.playBgm(BGM_MENU);
        SceneManager.goto(Scene_DC_MainMenu);
    }
};

//=============================================================================
// SCENE: CLASSIC GAMES (stub — full version coming next)
//=============================================================================
function Scene_DC_ClassicGames() {
    this.initialize.apply(this, arguments);
}
Scene_DC_ClassicGames.prototype = Object.create(Scene_Base.prototype);
Scene_DC_ClassicGames.prototype.constructor = Scene_DC_ClassicGames;

Scene_DC_ClassicGames.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
};

Scene_DC_ClassicGames.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    // Background (img/titles2/MenuBG_4.png)
    this._bg = new Sprite(loadBG(IMG_BG_CLASSIC));
    this.addChild(this._bg);

    var lblBmp = new Bitmap(Graphics.width, 50);
    lblBmp.fontSize = 26;
    lblBmp.textColor = '#00ffcc';
    lblBmp.drawText('CLASSIC GAMES  -  Coming Soon', 0, 0, Graphics.width, 50, 'center');
    var lblSp = new Sprite(lblBmp);
    lblSp.y = Math.floor(Graphics.height * 0.45);
    this.addChild(lblSp);

    var hintBmp = new Bitmap(Graphics.width, 30);
    hintBmp.fontSize = 18;
    hintBmp.textColor = '#888888';
    hintBmp.drawText('Press Cancel to go back', 0, 0, Graphics.width, 30, 'center');
    var hintSp = new Sprite(hintBmp);
    hintSp.y = Math.floor(Graphics.height * 0.55);
    this.addChild(hintSp);
};

Scene_DC_ClassicGames.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    if (Input.isTriggered('cancel') || Input.isTriggered('ok')) {
        SoundManager.playCancel();
        SceneManager.goto(Scene_DC_MainMenu);
    }
};

//=============================================================================
// SCENE: FADE TO GAME
// Fades to black then starts the map — used by New Game
//=============================================================================
function Scene_DC_FadeToGame() { this.initialize.apply(this, arguments); }
Scene_DC_FadeToGame.prototype = Object.create(Scene_Base.prototype);
Scene_DC_FadeToGame.prototype.constructor = Scene_DC_FadeToGame;

Scene_DC_FadeToGame.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._timer = 0;
};

Scene_DC_FadeToGame.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    var bmp = new Bitmap(Graphics.width, Graphics.height);
    bmp.fillRect(0, 0, Graphics.width, Graphics.height, '#000000');
    this._overlay = new Sprite(bmp);
    this._overlay.opacity = 0;
    this.addChild(this._overlay);
};

Scene_DC_FadeToGame.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    this._timer++;
    this._overlay.opacity = Math.min(255, this._timer * 6);
    if (this._overlay.opacity >= 255) {
        SceneManager.goto(Scene_Map);
    }
};

//=============================================================================
// SCENE: MULTIPLAYER  —  Host Room / Join Room / Back
//=============================================================================
function Scene_DC_Multiplayer() { this.initialize.apply(this, arguments); }
Scene_DC_Multiplayer.prototype = Object.create(Scene_Base.prototype);
Scene_DC_Multiplayer.prototype.constructor = Scene_DC_Multiplayer;

Scene_DC_Multiplayer.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._index = 0;
    this._commands = [
        { name: 'Host Room', symbol: 'host' },
        { name: 'Join Room', symbol: 'join' },
        { name: '\u2190 Back', symbol: 'back' }
    ];
};

Scene_DC_Multiplayer.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    this._bg = new Sprite(loadBG(IMG_BG_ONLINE));
    this.addChild(this._bg);

    var titleBmp = new Bitmap(Graphics.width, 50);
    titleBmp.fontSize = 26; titleBmp.textColor = '#00ffcc';
    titleBmp.drawText('MULTIPLAYER', 0, 0, Graphics.width, 50, 'center');
    var titleSp = new Sprite(titleBmp);
    titleSp.y = 50;
    this.addChild(titleSp);

    var descBmp = new Bitmap(Graphics.width, 30);
    descBmp.fontSize = 16; descBmp.textColor = '#888888';
    descBmp.drawText('Play the full game with up to 8 friends over LAN', 0, 0, Graphics.width, 30, 'center');
    var descSp = new Sprite(descBmp);
    descSp.y = 90;
    this.addChild(descSp);

    var boxW = 280; var boxH = 30 + this._commands.length * 52;
    var boxX = Math.floor((Graphics.width - boxW) / 2);
    var boxY = Math.floor(Graphics.height * 0.42);
    var boxBmp = new Bitmap(boxW, boxH);
    drawBox(boxBmp, 0, 0, boxW, boxH, '#111133', '#00ffcc');
    var boxSp = new Sprite(boxBmp);
    boxSp.x = boxX; boxSp.y = boxY;
    this.addChild(boxSp);

    this._menuSprites = [];
    for (var i = 0; i < this._commands.length; i++) {
        var bmp = new Bitmap(boxW - 20, 46);
        bmp.fontSize = 22;
        var sp = new Sprite(bmp);
        sp.x = boxX + 10;
        sp.y = boxY + 14 + i * 50;
        this.addChild(sp);
        this._menuSprites.push(sp);
    }
    this._refresh();
};

Scene_DC_Multiplayer.prototype._refresh = function() {
    for (var i = 0; i < this._commands.length; i++) {
        var bmp = this._menuSprites[i].bitmap;
        bmp.clear(); bmp.fontSize = 22;
        if (i === this._index) {
            bmp.textColor = '#00ffcc';
            bmp.drawText('\u25b6 ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        } else {
            bmp.textColor = '#aaaaaa';
            bmp.drawText('   ' + this._commands[i].name, 0, 2, bmp.width, 42, 'left');
        }
    }
};

Scene_DC_Multiplayer.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    if (Input.isTriggered('down')) {
        this._index = (this._index + 1) % this._commands.length;
        SoundManager.playCursor(); this._refresh();
    }
    if (Input.isTriggered('up')) {
        this._index = (this._index - 1 + this._commands.length) % this._commands.length;
        SoundManager.playCursor(); this._refresh();
    }
    if (Input.isTriggered('ok')) {
        var sym = this._commands[this._index].symbol;
        if (sym === 'host') {
            SoundManager.playOk();
            SceneManager.goto(Scene_DC_HostRoom);
        } else if (sym === 'join') {
            SoundManager.playOk();
            SceneManager.goto(Scene_DC_JoinRoom);
        } else {
            SoundManager.playCancel();
            SceneManager.goto(Scene_DC_OnlineMenu);
        }
    }
    if (Input.isTriggered('cancel')) {
        SoundManager.playCancel();
        SceneManager.goto(Scene_DC_OnlineMenu);
    }
};

//=============================================================================
// SCENE: HOST ROOM — waiting room with room code and chat
//=============================================================================
function Scene_DC_HostRoom() { this.initialize.apply(this, arguments); }
Scene_DC_HostRoom.prototype = Object.create(Scene_Base.prototype);
Scene_DC_HostRoom.prototype.constructor = Scene_DC_HostRoom;

Scene_DC_HostRoom.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._roomCode   = this._generateCode();
    this._players    = [{ name: DC_Account.name || DC_Account.current, ready: false }];
    this._chatLog    = ['System: Room created! Share your code with friends.'];
    this._chatInput  = null;
    this._redrawTimer = 0;
};

Scene_DC_HostRoom.prototype._generateCode = function() {
    var code = '';
    for (var i = 0; i < 4; i++) code += Math.floor(Math.random() * 10);
    return code;
};

Scene_DC_HostRoom.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    this._bg = new Sprite(loadBG(IMG_BG_ONLINE));
    this.addChild(this._bg);

    // ── Room code banner ───────────────────────────────────────────────────
    var codeBannerBmp = new Bitmap(Graphics.width, 56);
    codeBannerBmp.fillRect(0, 0, Graphics.width, 56, '#0a0a2a');
    codeBannerBmp.fontSize = 14; codeBannerBmp.textColor = '#888888';
    codeBannerBmp.drawText('ROOM CODE  -  Share this with friends to join', 0, 4, Graphics.width, 20, 'center');
    codeBannerBmp.fontSize = 30; codeBannerBmp.textColor = '#00ffcc';
    codeBannerBmp.drawText(this._roomCode, 0, 22, Graphics.width, 34, 'center');
    var codeSp = new Sprite(codeBannerBmp);
    codeSp.y = 0;
    this.addChild(codeSp);

    // ── Player list panel (left) ───────────────────────────────────────────
    var panelW = Math.floor(Graphics.width * 0.42);
    var panelH = Graphics.height - 120;
    var panelBmp = new Bitmap(panelW, panelH);
    panelBmp.fillRect(0, 0, panelW, panelH, '#0d0d2a');
    drawBox(panelBmp, 0, 0, panelW, panelH, '#0d0d2a', '#334455');
    this._panelSp = new Sprite(panelBmp);
    this._panelSp.x = 10; this._panelSp.y = 62;
    this.addChild(this._panelSp);

    // Player list content — redrawn each update
    this._playersBmp = new Bitmap(panelW - 10, panelH - 10);
    this._playersSp  = new Sprite(this._playersBmp);
    this._playersSp.x = 14; this._playersSp.y = 66;
    this.addChild(this._playersSp);

    // ── Chat panel (right) ─────────────────────────────────────────────────
    var chatX  = panelW + 20;
    var chatW  = Graphics.width - chatX - 10;
    var chatH  = Graphics.height - 180;
    var chatBmp = new Bitmap(chatW, chatH);
    chatBmp.fillRect(0, 0, chatW, chatH, '#0d0d2a');
    drawBox(chatBmp, 0, 0, chatW, chatH, '#0d0d2a', '#334455');
    var chatSp = new Sprite(chatBmp);
    chatSp.x = chatX; chatSp.y = 62;
    this.addChild(chatSp);

    // Chat log content — redrawn each update
    this._chatBmp = new Bitmap(chatW - 10, chatH - 10);
    this._chatSp  = new Sprite(this._chatBmp);
    this._chatSp.x = chatX + 4; this._chatSp.y = 66;
    this.addChild(this._chatSp);

    // Store layout values for redraws
    this._chatX = chatX; this._chatW = chatW; this._chatH = chatH;
    this._panelW = panelW; this._panelH = panelH;

    // ── Bottom bar ─────────────────────────────────────────────────────────
    this._bottomBmp = new Bitmap(Graphics.width, 56);
    this._bottomSp  = new Sprite(this._bottomBmp);
    this._bottomSp.y = Graphics.height - 58;
    this.addChild(this._bottomSp);

    // ── Chat input box ─────────────────────────────────────────────────────
    var cr  = Graphics._canvas ? Graphics._canvas.getBoundingClientRect() : { left: 0, top: 0 };
    var self = this;
    this._chatEl = document.createElement('input');
    this._chatEl.type        = 'text';
    this._chatEl.placeholder = 'Type a message and press Enter...';
    this._chatEl.maxLength   = 80;
    this._chatEl.style.cssText = [
        'position:fixed',
        'left:'   + (cr.left + chatX) + 'px',
        'top:'    + (cr.top  + Graphics.height - 54) + 'px',
        'width:'  + (chatW - 4) + 'px',
        'height:36px',
        'font-size:16px',
        'padding:4px 10px',
        'background:#111133',
        'color:#ffffff',
        'border:2px solid #334455',
        'outline:none',
        'z-index:9999',
        'font-family:monospace'
    ].join(';');
    this._chatEl.addEventListener('keydown', function(e) {
        e.stopPropagation();
        if (e.key === 'Enter') {
            var msg = self._chatEl.value.trim();
            if (msg.length > 0) {
                var sender = DC_Account.name || DC_Account.current || 'Host';
                self._chatLog.push(sender + ': ' + msg);
                if (self._chatLog.length > 14) self._chatLog.shift();
                self._chatEl.value = '';
                self._redraw();
            }
        }
    }, true);
    document.body.appendChild(this._chatEl);

    this._redraw();
    this._drawBottom();
};

Scene_DC_HostRoom.prototype._redraw = function() {
    // Players list
    var pb = this._playersBmp;
    pb.clear();
    pb.fontSize = 16; pb.textColor = '#00ffcc';
    pb.drawText('PLAYERS  (' + this._players.length + '/8)', 0, 0, pb.width, 24, 'left');
    pb.fontSize = 14; pb.textColor = '#555577';
    pb.drawText('Min 2 to start', 0, 22, pb.width, 20, 'left');
    for (var i = 0; i < this._players.length; i++) {
        var pl = this._players[i];
        pb.fontSize = 18;
        pb.textColor = pl.ready ? '#00ff88' : '#cccccc';
        pb.drawText((pl.ready ? '\u2713 ' : '\u25a1 ') + pl.name + (i === 0 ? '  [HOST]' : ''), 0, 52 + i * 34, pb.width, 30, 'left');
    }
    // Ready status hint
    var canStart = this._players.length >= 2;
    pb.fontSize = 15;
    pb.textColor = canStart ? '#00ffcc' : '#555555';
    pb.drawText(canStart ? '\u25b6 Enter = Start Game' : 'Waiting for players...', 0, this._panelH - 50, pb.width, 26, 'left');

    // Chat log
    var cb = this._chatBmp;
    cb.clear();
    cb.fontSize = 15; cb.textColor = '#00ffcc';
    cb.drawText('CHAT', 0, 0, cb.width, 22, 'left');
    for (var j = 0; j < this._chatLog.length; j++) {
        cb.fontSize = 14;
        cb.textColor = this._chatLog[j].indexOf('System:') === 0 ? '#888844' : '#cccccc';
        cb.drawText(this._chatLog[j], 0, 26 + j * 22, cb.width, 20, 'left');
    }
};

Scene_DC_HostRoom.prototype._drawBottom = function() {
    var bb = this._bottomBmp;
    bb.clear();
    bb.fillRect(0, 0, Graphics.width, 56, '#0a0a2a');
    bb.fontSize = 14; bb.textColor = '#555577';
    bb.drawText('Enter = Start Game (need 2+)   |   Cancel = Leave Room   |   Type in box to chat', 0, 18, Graphics.width, 22, 'center');
};

Scene_DC_HostRoom.prototype.update = function() {
    Scene_Base.prototype.update.call(this);

    if (Input.isTriggered('ok')) {
        if (this._players.length >= 2) {
            this._cleanup();
            SoundManager.playOk();
            DataManager.setupNewGame();
            SceneManager.goto(Scene_DC_FadeToGame);
        } else {
            SoundManager.playBuzzer();
        }
    }
    if (Input.isTriggered('cancel')) {
        this._cleanup();
        SoundManager.playCancel();
        SceneManager.goto(Scene_DC_Multiplayer);
    }
};

Scene_DC_HostRoom.prototype._cleanup = function() {
    if (this._chatEl && this._chatEl.parentNode)
        this._chatEl.parentNode.removeChild(this._chatEl);
    this._chatEl = null;
};

Scene_DC_HostRoom.prototype.terminate = function() {
    Scene_Base.prototype.terminate.call(this);
    this._cleanup();
};

//=============================================================================
// SCENE: JOIN ROOM — enter a 4-digit code to join a host's room
//=============================================================================
function Scene_DC_JoinRoom() { this.initialize.apply(this, arguments); }
Scene_DC_JoinRoom.prototype = Object.create(Scene_Base.prototype);
Scene_DC_JoinRoom.prototype.constructor = Scene_DC_JoinRoom;

Scene_DC_JoinRoom.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._errorTimer = 0;
};

Scene_DC_JoinRoom.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    this._bg = new Sprite(loadBG(IMG_BG_ONLINE));
    this.addChild(this._bg);

    var titleBmp = new Bitmap(Graphics.width, 50);
    titleBmp.fontSize = 26; titleBmp.textColor = '#00ffcc';
    titleBmp.drawText('JOIN ROOM', 0, 0, Graphics.width, 50, 'center');
    var titleSp = new Sprite(titleBmp);
    titleSp.y = 60;
    this.addChild(titleSp);

    var descBmp = new Bitmap(Graphics.width, 30);
    descBmp.fontSize = 17; descBmp.textColor = '#888888';
    descBmp.drawText('Enter the 4-digit room code from your host', 0, 0, Graphics.width, 30, 'center');
    var descSp = new Sprite(descBmp);
    descSp.y = 110;
    this.addChild(descSp);

    var lblBmp = new Bitmap(Graphics.width, 26);
    lblBmp.fontSize = 15; lblBmp.textColor = '#aaaaaa';
    lblBmp.drawText('ROOM CODE', 0, 0, Graphics.width, 26, 'center');
    var lblSp = new Sprite(lblBmp);
    lblSp.y = 162;
    this.addChild(lblSp);

    // Error sprite
    var errBmp = new Bitmap(Graphics.width, 28);
    errBmp.fontSize = 15;
    this._errSprite = new Sprite(errBmp);
    this._errSprite.y = 310;
    this.addChild(this._errSprite);

    var hintBmp = new Bitmap(Graphics.width, 26);
    hintBmp.fontSize = 15; hintBmp.textColor = '#555555';
    hintBmp.drawText('Type the 4-digit code, then press Enter to join', 0, 0, Graphics.width, 26, 'center');
    var hintSp = new Sprite(hintBmp);
    hintSp.y = 345;
    this.addChild(hintSp);

    var backBmp = new Bitmap(Graphics.width, 26);
    backBmp.fontSize = 15; backBmp.textColor = '#aaaaaa';
    backBmp.drawText('\u25b6 Cancel = Back', 0, 0, Graphics.width, 26, 'center');
    var backSp = new Sprite(backBmp);
    backSp.y = 380;
    this.addChild(backSp);

    // Code input box
    var iw  = 200;
    var cr  = Graphics._canvas ? Graphics._canvas.getBoundingClientRect() : { left: 0, top: 0 };
    var ix  = cr.left + Math.floor((Graphics.width - iw) / 2);
    var self = this;
    this._codeEl = document.createElement('input');
    this._codeEl.type        = 'text';
    this._codeEl.placeholder = '0000';
    this._codeEl.maxLength   = 4;
    this._codeEl.style.cssText = [
        'position:fixed',
        'left:'   + ix + 'px',
        'top:'    + (cr.top + 186) + 'px',
        'width:'  + iw + 'px',
        'height:52px',
        'font-size:30px',
        'text-align:center',
        'letter-spacing:12px',
        'padding:4px 10px',
        'background:#111133',
        'color:#00ffcc',
        'border:2px solid #00ffcc',
        'outline:none',
        'z-index:9999',
        'font-family:monospace'
    ].join(';');
    this._codeEl.addEventListener('keydown', function(e) {
        e.stopPropagation();
        if (e.key === 'Enter') { self._tryJoin(); }
        // Only allow digits
        if (e.key.length === 1 && (e.key < '0' || e.key > '9')) e.preventDefault();
    }, true);
    document.body.appendChild(this._codeEl);
    this._codeEl.focus();
};

Scene_DC_JoinRoom.prototype._tryJoin = function() {
    var code = this._codeEl.value.trim();
    if (code.length !== 4) {
        this._showError('Please enter the full 4-digit code.');
        return;
    }
    // LAN note: in a real network implementation you would broadcast a UDP
    // packet here to find the host with this code on the local network.
    // For now, any valid 4-digit code is accepted and shows a "connected" message.
    this._showSuccess('Code accepted! Connecting... (LAN required)');
};

Scene_DC_JoinRoom.prototype._showError = function(msg) {
    this._errSprite.bitmap.clear();
    this._errSprite.bitmap.fontSize = 15;
    this._errSprite.bitmap.textColor = '#ff4444';
    this._errSprite.bitmap.drawText('\u26a0 ' + msg, 0, 0, Graphics.width, 28, 'center');
    this._errorTimer = 180;
    SoundManager.playBuzzer();
};

Scene_DC_JoinRoom.prototype._showSuccess = function(msg) {
    this._errSprite.bitmap.clear();
    this._errSprite.bitmap.fontSize = 15;
    this._errSprite.bitmap.textColor = '#00ff88';
    this._errSprite.bitmap.drawText('\u2713 ' + msg, 0, 0, Graphics.width, 28, 'center');
    SoundManager.playOk();
};

Scene_DC_JoinRoom.prototype._cleanup = function() {
    if (this._codeEl && this._codeEl.parentNode)
        this._codeEl.parentNode.removeChild(this._codeEl);
    this._codeEl = null;
};

Scene_DC_JoinRoom.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    if (this._errorTimer > 0) {
        this._errorTimer--;
        if (this._errorTimer === 0) this._errSprite.bitmap.clear();
    }
    if (Input.isTriggered('cancel')) {
        this._cleanup();
        SoundManager.playCancel();
        SceneManager.goto(Scene_DC_Multiplayer);
    }
};

Scene_DC_JoinRoom.prototype.terminate = function() {
    Scene_Base.prototype.terminate.call(this);
    this._cleanup();
};

//=============================================================================
// SCENE: CUSTOM SETTINGS  (Mega Man: Sequel Wars style)
// ─────────────────────────────────────────────────────────────────────────────
// Layout: option name on the left, current value on the right, ▶ cursor.
// Left/Right arrows cycle values. Cancel or Back saves and exits.
// Settings are saved to ConfigManager so they persist like normal MV options.
//=============================================================================

// Difficulty save key — stored in localStorage via ConfigManager extension
var DC_DIFFICULTY_KEY = 'dc_difficulty';

var DC_Settings = {
    // Load difficulty from localStorage (default Normal)
    loadDifficulty: function() {
        try {
            var v = localStorage.getItem(DC_DIFFICULTY_KEY);
            return (v !== null) ? parseInt(v) : 2; // 2 = Normal
        } catch(e) { return 2; }
    },
    saveDifficulty: function(idx) {
        try { localStorage.setItem(DC_DIFFICULTY_KEY, String(idx)); } catch(e) {}
    }
};

function Scene_DC_Settings() { this.initialize.apply(this, arguments); }
Scene_DC_Settings.prototype = Object.create(Scene_Base.prototype);
Scene_DC_Settings.prototype.constructor = Scene_DC_Settings;

Scene_DC_Settings.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._index = 0;

    // Difficulty options
    this._diffOpts = [
        'Super Easy', 'Easy', 'Normal', 'Mild', 'Hard', 'Super Hard', 'Hardcore'
    ];
    this._diffDescriptions = [
        'For those who just want to enjoy the story.',
        'A relaxed experience with forgiving enemies.',
        'The standard experience. Recommended for most.',
        'A slight step up. Stay on your toes.',
        'Enemies hit harder and patterns are faster.',
        'Only for seasoned players. Brutal difficulty.',
        'Maximum challenge. No mercy. Good luck.'
    ];
    this._diffIdx = DC_Settings.loadDifficulty();

    // BGM/SE volumes — read from AudioManager
    this._bgmVol = AudioManager.bgmVolume;
    this._bgsVol = AudioManager.bgsVolume;
    this._meVol  = AudioManager.meVolume;
    this._seVol  = AudioManager.seVolume;

    // Toggle options — read from ConfigManager
    this._alwaysDash  = ConfigManager['alwaysDash']       || false;
    this._cmdRemember = ConfigManager['commandRemember']  || false;
    this._blindMode   = ConfigManager['blindMode']        || false;
    this._screenReaderOpts = ['Off', 'NVDA', 'JAWS', 'Narrator', 'VoiceOver'];
    var savedSR = ConfigManager['screenReader'] || 'Off';
    this._srIdx = this._screenReaderOpts.indexOf(savedSR);
    if (this._srIdx < 0) this._srIdx = 0;
    // If blind mode is on but no reader selected, default to NVDA
    if (this._blindMode && this._srIdx === 0) this._srIdx = 1;

    // Build option rows
    // Each row: { label, type, key }
    // type: 'volume' | 'toggle' | 'difficulty'
    this._rows = [
        { label: 'DIFFICULTY',           type: 'difficulty' },
        { label: 'BGM VOLUME',           type: 'volume',  key: 'bgm'  },
        { label: 'BGS VOLUME',           type: 'volume',  key: 'bgs'  },
        { label: 'ME VOLUME',            type: 'volume',  key: 'me'   },
        { label: 'SE VOLUME',            type: 'volume',  key: 'se'   },
        { label: 'ALWAYS DASH',          type: 'toggle',  key: 'alwaysDash'      },
        { label: 'COMMAND REMEMBER',     type: 'toggle',  key: 'commandRemember' },
        { label: 'BLIND MODE',           type: 'screenreader'                       },
        { label: 'BACK',                 type: 'back'   }
    ];

    this._prevBgm = AudioManager.saveBgm();
};

Scene_DC_Settings.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    // Background
    this._bg = new Sprite(loadBG(IMG_BG_SETTINGS));
    this.addChild(this._bg);

    // Dark scanline overlay (solid dark strip across whole screen)
    var ov = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    ov.bitmap.fillRect(0, 0, Graphics.width, Graphics.height, '#000000');
    ov.opacity = 110;
    this.addChild(ov);

    // Title bar at top
    var titleBmp = new Bitmap(Graphics.width, 42);
    titleBmp.fillRect(0, 0, Graphics.width, 42, '#000033');
    titleBmp.fontSize = 22;
    titleBmp.textColor = '#ffaa00';
    titleBmp.drawText('SETTINGS', 20, 6, Graphics.width - 40, 30, 'left');
    titleBmp.fontSize = 15;
    titleBmp.textColor = '#888888';
    titleBmp.drawText('Left / Right to change   |   Cancel to save & exit', 20, 6, Graphics.width - 20, 30, 'right');
    var titleSp = new Sprite(titleBmp);
    titleSp.y = 0;
    this.addChild(titleSp);

    // Description bar at bottom
    this._descBmp = new Bitmap(Graphics.width, 48);
    this._descSp  = new Sprite(this._descBmp);
    this._descSp.y = Graphics.height - 50;
    this.addChild(this._descSp);

    // Row sprites — each row has a label sprite and a value sprite
    this._rowBmps  = [];
    this._valBmps  = [];
    var rowH   = 44;
    var startY = 52;
    var lw     = Math.floor(Graphics.width * 0.54);
    var vw     = Math.floor(Graphics.width * 0.38);
    var vx     = Math.floor(Graphics.width * 0.58);

    for (var i = 0; i < this._rows.length; i++) {
        // Row background (redrawn on selection change)
        var rowBmp = new Bitmap(Graphics.width, rowH);
        var rowSp  = new Sprite(rowBmp);
        rowSp.y    = startY + i * rowH;
        this.addChild(rowSp);
        this._rowBmps.push(rowBmp);

        // Value display (right side)
        var valBmp = new Bitmap(vw, rowH);
        var valSp  = new Sprite(valBmp);
        valSp.x    = vx;
        valSp.y    = startY + i * rowH;
        this.addChild(valSp);
        this._valBmps.push(valBmp);
    }

    this._lw = lw; this._vw = vw; this._vx = vx;
    this._rowH = rowH; this._startY = startY;

    this._redrawAll();
};

Scene_DC_Settings.prototype._getVolume = function(key) {
    if (key === 'bgm') return this._bgmVol;
    if (key === 'bgs') return this._bgsVol;
    if (key === 'me')  return this._meVol;
    return this._seVol;
};

Scene_DC_Settings.prototype._setVolume = function(key, val) {
    val = Math.max(0, Math.min(100, val));
    if (key === 'bgm') { this._bgmVol = val; AudioManager.bgmVolume = val; }
    if (key === 'bgs') { this._bgsVol = val; AudioManager.bgsVolume = val; }
    if (key === 'me')  { this._meVol  = val; AudioManager.meVolume  = val; }
    if (key === 'se')  { this._seVol  = val; AudioManager.seVolume  = val; }
};

Scene_DC_Settings.prototype._getToggle = function(key) {
    if (key === 'alwaysDash')      return this._alwaysDash;
    if (key === 'commandRemember') return this._cmdRemember;
    if (key === 'blindMode')       return this._blindMode;
    return false;
};

Scene_DC_Settings.prototype._setToggle = function(key, val) {
    if (key === 'alwaysDash')      this._alwaysDash  = val;
    if (key === 'commandRemember') this._cmdRemember = val;
    if (key === 'blindMode')       this._blindMode   = val;
};

Scene_DC_Settings.prototype._getValueText = function(row) {
    if (row.type === 'difficulty') {
        return this._diffOpts[this._diffIdx];
    }
    if (row.type === 'volume') {
        var v = this._getVolume(row.key);
        return v + '%';
    }
    if (row.type === 'toggle') {
        return this._getToggle(row.key) ? 'ON' : 'OFF';
    }
    if (row.type === 'screenreader') {
        return this._screenReaderOpts[this._srIdx];
    }
    return '';
};

Scene_DC_Settings.prototype._redrawAll = function() {
    for (var i = 0; i < this._rows.length; i++) {
        this._redrawRow(i);
    }
    this._redrawDesc();
};

Scene_DC_Settings.prototype._redrawRow = function(i) {
    var row  = this._rows[i];
    var rb   = this._rowBmps[i];
    var vb   = this._valBmps[i];
    var sel  = (i === this._index);
    var h    = this._rowH;
    var lw   = this._lw;

    rb.clear();
    vb.clear();

    // Row background
    if (sel) {
        rb.fillRect(0, 0, Graphics.width, h, '#001a33');
        rb.fillRect(0, 0, Graphics.width, 2, '#ffaa00');
        rb.fillRect(0, h - 2, Graphics.width, 2, '#ffaa00');
    }

    // Cursor
    rb.fontSize   = 20;
    rb.textColor  = sel ? '#ffaa00' : '#888888';
    rb.drawText(sel ? '▶' : ' ', 8, 10, 20, h - 10, 'left');

    // Label
    rb.fontSize   = 20;
    rb.textColor  = sel ? '#ffffff' : '#aaaaaa';
    rb.drawText(row.label, 30, 10, lw - 30, h - 10, 'left');

    if (row.type === 'back') return;

    // Value
    var valText = this._getValueText(row);
    vb.fontSize  = 20;
    vb.textColor = sel ? '#ffaa00' : '#888866';
    vb.drawText(valText, 0, 10, this._vw, h - 10, 'left');

    // Volume bar
    if (row.type === 'volume') {
        var vol    = this._getVolume(row.key);
        var barW   = Math.floor(this._vw * 0.55);
        var barX   = Math.floor(this._vw * 0.44);
        var barY   = Math.floor(h * 0.55);
        var barH   = 8;
        var fillW  = Math.floor(barW * vol / 100);
        vb.fillRect(barX, barY, barW, barH, '#333333');
        vb.fillRect(barX, barY, fillW, barH, sel ? '#ffaa00' : '#886600');
    }
};

Scene_DC_Settings.prototype._redrawDesc = function() {
    var db = this._descBmp;
    db.clear();
    db.fillRect(0, 0, Graphics.width, 48, '#000022');
    db.fillRect(0, 0, Graphics.width, 2, '#334455');

    var row = this._rows[this._index];
    db.fontSize = 15; db.textColor = '#aaaaaa';

    if (row.type === 'difficulty') {
        db.drawText(this._diffDescriptions[this._diffIdx], 20, 14, Graphics.width - 40, 22, 'left');
    } else if (row.type === 'volume') {
        db.drawText('Adjust ' + row.label + ' with Left / Right arrows.', 20, 14, Graphics.width - 40, 22, 'left');
    } else if (row.type === 'toggle') {
        db.drawText('Press Left or Right to toggle ' + row.label + '.', 20, 14, Graphics.width - 40, 22, 'left');
    } else if (row.type === 'screenreader') {
        var srDescs = [
            'Blind Mode off. Standard visual gameplay.',
            'NVDA: Free open-source screen reader for Windows.',
            'JAWS: Professional screen reader for Windows.',
            'Narrator: Built-in Windows screen reader.',
            'VoiceOver: Built-in screen reader for Mac and iOS.'
        ];
        db.drawText(srDescs[this._srIdx], 20, 14, Graphics.width - 40, 22, 'left');
    } else if (row.type === 'back') {
        db.drawText('Save all settings and return to the main menu.', 20, 14, Graphics.width - 40, 22, 'left');
    }
};

Scene_DC_Settings.prototype._nudge = function(dir) {
    var row = this._rows[this._index];
    if (row.type === 'difficulty') {
        this._diffIdx = (this._diffIdx + dir + this._diffOpts.length) % this._diffOpts.length;
    } else if (row.type === 'volume') {
        this._setVolume(row.key, this._getVolume(row.key) + dir * 10);
    } else if (row.type === 'toggle') {
        this._setToggle(row.key, !this._getToggle(row.key));
    } else if (row.type === 'screenreader') {
        this._srIdx = (this._srIdx + dir + this._screenReaderOpts.length) % this._screenReaderOpts.length;
        // Blind mode is ON whenever a reader is selected (not Off)
        this._blindMode = (this._srIdx !== 0);
    }
    SoundManager.playCursor();
    this._redrawRow(this._index);
    this._redrawDesc();
};

Scene_DC_Settings.prototype._save = function() {
    ConfigManager['alwaysDash']      = this._alwaysDash;
    ConfigManager['commandRemember'] = this._cmdRemember;
    ConfigManager['blindMode']       = this._blindMode;
    ConfigManager['screenReader']    = this._screenReaderOpts[this._srIdx];
    ConfigManager.save();
    DC_Settings.saveDifficulty(this._diffIdx);
};

Scene_DC_Settings.prototype._exit = function() {
    this._save();
    SoundManager.playCancel();
    AudioManager.playBgm(BGM_MENU);
    SceneManager.goto(Scene_DC_MainMenu);
};

Scene_DC_Settings.prototype.update = function() {
    Scene_Base.prototype.update.call(this);

    if (Input.isTriggered('up')) {
        this._index = (this._index - 1 + this._rows.length) % this._rows.length;
        SoundManager.playCursor();
        this._redrawAll();
    }
    if (Input.isTriggered('down')) {
        this._index = (this._index + 1) % this._rows.length;
        SoundManager.playCursor();
        this._redrawAll();
    }
    if (Input.isTriggered('left'))  { this._nudge(-1); }
    if (Input.isTriggered('right')) { this._nudge(1);  }
    if (Input.isTriggered('ok')) {
        var row = this._rows[this._index];
        if (row.type === 'back') {
            this._exit();
        } else if (row.type === 'toggle') {
            this._nudge(1);
        } else if (row.type === 'screenreader') {
            this._nudge(1);
        } else if (row.type === 'difficulty') {
            this._nudge(1);
        }
    }
    if (Input.isTriggered('cancel')) {
        this._exit();
    }
};

})();
