//=============================================================================
// DimensionsCollide_TitleScreen.js (CINEMATIC VERSION + Random Menu BGs)
//=============================================================================

(function () {
'use strict';

//=============================================================================
// 🔴 SAFETY PATCH
//=============================================================================
if (typeof DataManager.savefileExists !== "function") {
    DataManager.savefileExists = function(savefileId) {
        if (this.loadSavefileInfo) {
            return !!this.loadSavefileInfo(savefileId);
        }
        return false;
    };
}

//=============================================================================
// PARAMETERS
//=============================================================================
const p = PluginManager.parameters('DimensionsCollide_TitleScreen');

const PRESS_TEXT  = String(p['pressStartText']  || 'PRESS START');
const PRESS_COLOR = String(p['pressStartColor'] || '#00ffcc');

//=============================================================================
// AUDIO SETTINGS
//=============================================================================
const PRESS_START_SE = { name: "PressStart", volume: 90, pitch: 100, pan: 0 };
const FADE_SE        = { name: "FadeIn", volume: 90, pitch: 100, pan: 0 };

const MENU_BGM = {
    name: "MainMenuTheme",
    volume: 90,
    pitch: 100,
    pan: 0
};

//=============================================================================
// TIMING
//=============================================================================
const FLASH_DURATION = 120; // 2 seconds
const FAST_FLASH_SPEED = 10;

//=============================================================================
// COMMANDS
//=============================================================================
const COMMANDS = [
    { name: 'Start Game',  symbol: 'newGame' },
    { name: 'Continue',    symbol: 'continue' },
    { name: 'Settings',    symbol: 'options' },
    { name: 'Gallery',     symbol: 'gallery' },
    { name: 'Time Attack', symbol: 'timeattack' },
    { name: 'Quit',        symbol: 'quit' }
];

//=============================================================================
// SAVE CHECK
//=============================================================================
function hasSaveFile() {
    for (var i = 1; i <= DataManager.maxSavefiles(); i++) {
        if (DataManager.savefileExists && DataManager.savefileExists(i)) return true;
        if (DataManager.loadSavefileInfo && DataManager.loadSavefileInfo(i)) return true;
    }
    return false;
}

//=============================================================================
// HOOK TITLE
//=============================================================================
const _Scene_Title_start = Scene_Title.prototype.start;
Scene_Title.prototype.start = function () {
    _Scene_Title_start.call(this);

    if (!this._dcStarted) {
        this._dcStarted = true;
        SceneManager.goto(Scene_DC_PressStart);
    }
};

//=============================================================================
// PRESS START SCENE
//=============================================================================
function Scene_DC_PressStart() {
    this.initialize.apply(this, arguments);
}

Scene_DC_PressStart.prototype = Object.create(Scene_Base.prototype);
Scene_DC_PressStart.prototype.constructor = Scene_DC_PressStart;

Scene_DC_PressStart.prototype.initialize = function () {
    Scene_Base.prototype.initialize.call(this);
    this._timer = 0;
    this._phase = "idle";
};

Scene_DC_PressStart.prototype.create = function () {
    Scene_Base.prototype.create.call(this);

    // Background
    if ($dataSystem.title1Name) {
        this._background = new Sprite(ImageManager.loadTitle1($dataSystem.title1Name));
        this.addChild(this._background);
    }

    // Press Start Text
    const bmp = new Bitmap(Graphics.width, 50);
    bmp.fontSize = 32;
    bmp.textColor = PRESS_COLOR;
    bmp.drawText(PRESS_TEXT, 0, 0, Graphics.width, 50, 'center');

    this._text = new Sprite(bmp);
    this._text.y = Graphics.height * 0.7;
    this.addChild(this._text);

    // Fade Overlay
    this._fadeSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    this._fadeSprite.bitmap.fillAll("black");
    this._fadeSprite.opacity = 0;
    this.addChild(this._fadeSprite);
};

Scene_DC_PressStart.prototype.update = function () {
    Scene_Base.prototype.update.call(this);
    this._timer++;

    //=========================
    // IDLE
    //=========================
    if (this._phase === "idle") {
        this._text.opacity = (this._timer % 60 < 30) ? 255 : 0;

        if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
            AudioManager.playSe(PRESS_START_SE);
            this._phase = "flash";
            this._timer = 0;
        }
    }

    //=========================
    // FLASH (FAST)
    //=========================
    else if (this._phase === "flash") {
        this._text.opacity = (this._timer % FAST_FLASH_SPEED < FAST_FLASH_SPEED / 2) ? 255 : 0;

        if (this._timer >= FLASH_DURATION) {
            AudioManager.playSe(FADE_SE);
            AudioManager.playBgm(MENU_BGM); // Start main menu music
            this._phase = "fade";
            this._timer = 0;
        }
    }

    //=========================
    // FADE TO BLACK
    //=========================
    else if (this._phase === "fade") {
        this._fadeSprite.opacity += 5;

        if (this._fadeSprite.opacity >= 255) {
            SceneManager.goto(Scene_DC_MainMenu);
        }
    }
};

//=============================================================================
// MAIN MENU
//=============================================================================
function Scene_DC_MainMenu() {
    this.initialize.apply(this, arguments);
}

Scene_DC_MainMenu.prototype = Object.create(Scene_Base.prototype);
Scene_DC_MainMenu.prototype.constructor = Scene_DC_MainMenu;

Scene_DC_MainMenu.prototype.initialize = function () {
    Scene_Base.prototype.initialize.call(this);
    this._index = 0;
};

Scene_DC_MainMenu.prototype.create = function () {
    Scene_Base.prototype.create.call(this);

    // ---- Random Background ----
    const bgNames = ["MenuBG_1", "MenuBG_2", "MenuBG_3"]; // Add all your backgrounds here
    const randomIndex = Math.floor(Math.random() * bgNames.length);
    this._background = new Sprite(ImageManager.loadTitle2(bgNames[randomIndex]));
    this.addChild(this._background);

    // ---- Commands ----
    this._commands = [];
    COMMANDS.forEach((cmd, i) => {
        const bmp = new Bitmap(300, 40);
        bmp.fontSize = 24;

        const sp = new Sprite(bmp);
        sp.x = 100;
        sp.y = 120 + i * 50;

        this.addChild(sp);
        this._commands.push({ sprite: sp, cmd: cmd });
    });

    this.refresh();
};

Scene_DC_MainMenu.prototype.refresh = function () {
    this._commands.forEach((c, i) => {
        const bmp = c.sprite.bitmap;
        bmp.clear();

        const disabled = (c.cmd.symbol === 'continue') && !hasSaveFile();

        bmp.textColor = disabled ? '#666666' : (i === this._index ? '#ffffff' : '#aaaaaa');
        bmp.drawText(c.cmd.name, 0, 0, 300, 40, 'left');
    });
};

Scene_DC_MainMenu.prototype.update = function () {
    Scene_Base.prototype.update.call(this);

    if (Input.isTriggered('down')) {
        this._index = (this._index + 1) % this._commands.length;
        this.refresh();
    }

    if (Input.isTriggered('up')) {
        this._index = (this._index - 1 + this._commands.length) % this._commands.length;
        this.refresh();
    }

    if (Input.isTriggered('ok')) {
        this.select();
    }
};

Scene_DC_MainMenu.prototype.select = function () {
    const cmd = this._commands[this._index].cmd;

    if (cmd.symbol === 'continue' && !hasSaveFile()) {
        SoundManager.playBuzzer();
        return;
    }

    SoundManager.playOk();

    switch (cmd.symbol) {
        case 'newGame':
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Map);
            break;

        case 'continue':
            SceneManager.push(Scene_Load);
            break;

        case 'options':
            SceneManager.push(Scene_Options);
            break;

        case 'quit':
            if (Utils.isNwjs()) nw.App.quit();
            break;

        default:
            alert("Coming Soon!");
            break;
    }
};

})();