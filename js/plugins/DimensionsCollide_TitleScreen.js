//=============================================================================
// DimensionsCollide_TitleScreen.js
// v14.0 — FULL INTEGRATION: PFP CHANGER + LOBBY CHAT + TELEPORT WARP
//=============================================================================

(function () {
    'use strict';

    //=============================================================================
    // 🔴 1. CORE ENGINE OVERRIDES
    //=============================================================================
    Scene_Title.prototype.createCommandWindow = function() {
        this._commandWindow = new Window_TitleCommand();
        this._commandWindow.hide();
        this._commandWindow.deactivate();
        this.addWindow(this._commandWindow);
    };

    Scene_Title.prototype.start = function() {
        Scene_Base.prototype.start.call(this);
        SceneManager.goto(Scene_DC_PressStart); 
    };

    const COMMANDS = [
        { name: 'Start Game',    symbol: 'newGame'       },
        { name: 'Continue',      symbol: 'continue'      },
        { name: 'Settings',      symbol: 'options'       },
        { name: 'Online Mode',   symbol: 'online'        },
        { name: 'Classic Games', symbol: 'classicgames'  },
        { name: 'Quit',          symbol: 'quit'          }
    ];

    //=============================================================================
    // 🟢 2. SCENE: PRESS START (Animated Icon)
    //=============================================================================
    function Scene_DC_PressStart() { this.initialize.apply(this, arguments); }
    Scene_DC_PressStart.prototype = Object.create(Scene_Base.prototype);
    Scene_DC_PressStart.prototype.constructor = Scene_DC_PressStart;

    Scene_DC_PressStart.prototype.initialize = function () {
        Scene_Base.prototype.initialize.call(this);
        this._timer = 0;
        this._phase = "idle";
        if ($dataSystem) AudioManager.playBgm($dataSystem.titleBgm);
    };

    Scene_DC_PressStart.prototype.create = function () {
        Scene_Base.prototype.create.call(this);
        this._background = new Sprite(ImageManager.loadTitle1($dataSystem.title1Name));
        this.addChild(this._background);
        this._text = new Sprite(ImageManager.loadTitle2("Icon_PressStart"));
        this._text.anchor.x = 0.5; this._text.anchor.y = 0.5;
        this._text.x = Graphics.width / 2;
        this._text.y = Graphics.height * 0.75; 
        this.addChild(this._text);
        this._fadeSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._fadeSprite.bitmap.fillAll("black");
        this._fadeSprite.opacity = 0;
        this.addChild(this._fadeSprite);
    };

    Scene_DC_PressStart.prototype.update = function () {
        Scene_Base.prototype.update.call(this);
        this._timer++;
        if (this._phase === "idle") {
            this._text.opacity = 160 + Math.sin(this._timer / 20) * 95;
            if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
                AudioManager.playSe({ name: "PressStart", volume: 100, pitch: 100, pan: 0 });
                this._phase = "flash"; this._timer = 0; 
            }
        } else if (this._phase === "flash") {
            this._text.opacity = (this._timer % 4 < 2) ? 255 : 0;
            if (this._timer >= 180) { 
                AudioManager.playSe({ name: "FadeIn", volume: 100, pitch: 100, pan: 0 });
                this._phase = "fade"; this._timer = 0;
            }
        } else if (this._phase === "fade") {
            this._fadeSprite.opacity += 8;
            if (this._fadeSprite.opacity >= 255) {
                AudioManager.playBgm({ name: "MainMenuTheme", volume: 90, pitch: 100, pan: 0 });
                SceneManager.goto(Scene_DC_MainMenu);
            }
        }
    };

    //=============================================================================
    // 🟢 3. SCENE: MAIN MENU
    //=============================================================================
    function Scene_DC_MainMenu() { this.initialize.apply(this, arguments); }
    Scene_DC_MainMenu.prototype = Object.create(Scene_Base.prototype);
    Scene_DC_MainMenu.prototype.constructor = Scene_DC_MainMenu;

    Scene_DC_MainMenu.prototype.initialize = function () {
        Scene_Base.prototype.initialize.call(this);
        this._index = 0;
    };

    Scene_DC_MainMenu.prototype.create = function () {
        Scene_Base.prototype.create.call(this);
        const bgList = ["MenuBG_1", "MenuBG_2", "MenuBG_3"];
        this._background = new Sprite(ImageManager.loadTitle2(bgList[Math.floor(Math.random() * bgList.length)]));
        this.addChild(this._background);
        this._menuItems = [];
        for (var i = 0; i < COMMANDS.length; i++) {
            const bmp = new Bitmap(400, 50);
            bmp.fontSize = 28;
            const sp = new Sprite(bmp);
            sp.x = 100; sp.y = 160 + i * 55;
            this.addChild(sp);
            this._menuItems.push({ sprite: sp, cmd: COMMANDS[i] });
        }
        this.refresh();
    };

    Scene_DC_MainMenu.prototype.refresh = function () {
        this._menuItems.forEach((item, i) => {
            const bmp = item.sprite.bitmap;
            bmp.clear();
            bmp.textColor = (i === this._index) ? '#ffffff' : '#888888';
            bmp.drawText(item.cmd.name, 0, 0, 400, 50, 'left');
        });
    };

    Scene_DC_MainMenu.prototype.update = function () {
        Scene_Base.prototype.update.call(this);
        if (Input.isTriggered('down')) { this._index = (this._index + 1) % this._menuItems.length; SoundManager.playCursor(); this.refresh(); }
        if (Input.isTriggered('up')) { this._index = (this._index - 1 + this._menuItems.length) % this._menuItems.length; SoundManager.playCursor(); this.refresh(); }
        if (Input.isTriggered('ok')) { this.selectOption(); }
    };

    Scene_DC_MainMenu.prototype.selectOption = function () {
        const symbol = this._menuItems[this._index].cmd.symbol;
        SoundManager.playOk();
        switch (symbol) {
            case 'newGame': DataManager.setupNewGame(); SceneManager.goto(Scene_Map); break;
            case 'continue': SceneManager.push(Scene_Load); break;
            case 'options': SceneManager.push(Scene_Options); break;
            case 'online': SceneManager.goto(Scene_DC_Login); break;
            case 'classicgames': SceneManager.goto(Scene_DC_ClassicGames); break;
            case 'quit': SceneManager.terminate(); break;
        }
    };

    //=============================================================================
    // 🟢 4. SCENE: CLASSIC GAMES (Coming Soon)
    //=============================================================================
    function Scene_DC_ClassicGames() { this.initialize.apply(this, arguments); }
    Scene_DC_ClassicGames.prototype = Object.create(Scene_Base.prototype);
    Scene_DC_ClassicGames.prototype.constructor = Scene_DC_ClassicGames;

    Scene_DC_ClassicGames.prototype.initialize = function () {
        Scene_Base.prototype.initialize.call(this);
        this._index = 0;
        this._gameList = [
            { name: "Super Mario Bros. 1", rom: "smb1",    image: "Preview_SMB1" },
            { name: "Super Mario Bros. 3", rom: "smb3",    image: "Preview_SMB3" },
            { name: "Super Mario World",   rom: "smw",     image: "Preview_SMW" },
            { name: "Sonic 3 & Knuckles",  rom: "s3k",     image: "Preview_S3K" },
            { name: "Mega Man ZX",         rom: "mmzx",    image: "Preview_MMZX" },
            { name: "Sailor Moon Arcade",  rom: "sm_arc",  image: "Preview_Sailor" },
            { name: "Pretty Cure MH (DS)", rom: "pcmh_ds", image: "Preview_PreCure" },
            { name: "Namco Museum",        rom: "namco",   image: "Preview_Namco" }
        ];
    };

    Scene_DC_ClassicGames.prototype.create = function () {
        Scene_Base.prototype.create.call(this);
        this._background = new Sprite(ImageManager.loadTitle2("MenuBG_Classic"));
        this.addChild(this._background);
        this._previewSprite = new Sprite();
        this._previewSprite.x = 460; this._previewSprite.y = 100;
        this.addChild(this._previewSprite);
        this._itemSprites = [];
        for (var i = 0; i < this._gameList.length; i++) {
            const bmp = new Bitmap(380, 50);
            bmp.fontSize = 22;
            const sp = new Sprite(bmp);
            sp.x = 50; sp.y = 80 + i * 52;
            this.addChild(sp);
            this._itemSprites.push(sp);
        }
        this.refresh();
    };

    Scene_DC_ClassicGames.prototype.refresh = function () {
        this._itemSprites.forEach((sp, i) => {
            const isSelected = (i === this._index);
            sp.bitmap.clear();
            sp.bitmap.textColor = isSelected ? "#ffff00" : "#ffffff"; 
            sp.bitmap.drawText(this._gameList[i].name, isSelected ? 30 : 10, 0, 350, 50, 'left');
            sp.opacity = isSelected ? 255 : 140;
        });
        this._previewSprite.bitmap = ImageManager.loadTitle2(this._gameList[this._index].image);
    };

    Scene_DC_ClassicGames.prototype.update = function () {
        Scene_Base.prototype.update.call(this);
        if (Input.isTriggered('down')) { this._index = (this._index + 1) % this._gameList.length; SoundManager.playCursor(); this.refresh(); }
        if (Input.isTriggered('up')) { this._index = (this._index - 1 + this._gameList.length) % this._gameList.length; SoundManager.playCursor(); this.refresh(); }
        if (Input.isTriggered('cancel')) SceneManager.goto(Scene_DC_MainMenu);
        if (Input.isTriggered('ok')) { SoundManager.playOk(); alert(this._gameList[this._index].name + " coming soon!"); }
    };

    //=============================================================================
    // 🟢 5. SCENE: LOGIN & ONLINE HUB
    //=============================================================================
    function Scene_DC_Login() { this.initialize.apply(this, arguments); }
    Scene_DC_Login.prototype = Object.create(Scene_Base.prototype);
    Scene_DC_Login.prototype.constructor = Scene_DC_Login;

    Scene_DC_Login.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        this._index = 0;
        this._subMode = "main";
        this.updateOptions();
        AudioManager.playBgm({ name: "OnlineModeTheme", volume: 90, pitch: 100, pan: 0 });
    };

    Scene_DC_Login.prototype.updateOptions = function() {
        if (this._subMode === "coop") {
            this._options = ["Host Room", "Join Room", "Back"];
        } else if (this._subMode === "profile") {
            this._options = ["Change PFP", "Back"];
        } else if (DC_Accounts._currentUser) {
            this._options = ["Multiplayer Co-Op", "Player Profile", "Logout"];
        } else {
            this._options = ["Log In", "Create Account"];
        }
    };

    Scene_DC_Login.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this._background = new Sprite(ImageManager.loadTitle2("MenuBG_Online"));
        this.addChild(this._background);
        this._pfpSprite = new Sprite();
        this.addChild(this._pfpSprite);
        this._windowLayer = new Sprite();
        this.addChild(this._windowLayer);
        this.drawMenu();
    };

    Scene_DC_Login.prototype.drawMenu = function() {
        this._windowLayer.bitmap = new Bitmap(Graphics.width, Graphics.height);
        this._windowLayer.bitmap.fontSize = 32;
        let title = "ONLINE MODE ACCESS";
        if (this._subMode === "coop") title = "CO-OP LOBBY";
        else if (this._subMode === "profile") title = "PLAYER PROFILE";
        else if (DC_Accounts._currentUser) title = "MULTIVERSAL HUB";
        this._windowLayer.bitmap.drawText(title, 0, 80, Graphics.width, 50, 'center');

        this._options.forEach((opt, i) => {
            this._windowLayer.bitmap.textColor = (i === this._index) ? "#00ffcc" : "#ffffff";
            this._windowLayer.bitmap.drawText(opt, 0, 240 + (i * 60), Graphics.width, 50, 'center');
        });

        if (DC_Accounts._currentUser) {
            this._pfpSprite.bitmap = ImageManager.loadTitle2(DC_Accounts._currentUser.pfp);
            this._pfpSprite.x = 40; this._pfpSprite.y = 40;
            this._pfpSprite.scale.x = 0.8; this._pfpSprite.scale.y = 0.8;
            this._windowLayer.bitmap.fontSize = 24;
            this._windowLayer.bitmap.textColor = "#00ffcc";
            this._windowLayer.bitmap.drawText(DC_Accounts._currentUser.name, 130, 45, 400, 30, 'left');
            this._windowLayer.bitmap.fontSize = 16;
            this._windowLayer.bitmap.textColor = "#ffffff";
            this._windowLayer.bitmap.drawText("@" + DC_Accounts._currentUser.user + " | Multiversal Traveler", 130, 75, 400, 30, 'left');
        } else { this._pfpSprite.bitmap = null; }
    };

    Scene_DC_Login.prototype.update = function() {
        Scene_Base.prototype.update.call(this);
        if (Input.isTriggered('down')) { this._index = (this._index + 1) % this._options.length; SoundManager.playCursor(); this.drawMenu(); }
        if (Input.isTriggered('up')) { this._index = (this._index - 1 + this._options.length) % this._options.length; SoundManager.playCursor(); this.drawMenu(); }
        if (Input.isTriggered('cancel')) {
            if (this._subMode !== "main") { this._subMode = "main"; this._index = 0; this.updateOptions(); this.drawMenu(); }
            else { AudioManager.playBgm({ name: "MainMenuTheme", volume: 90, pitch: 100, pan: 0 }); SceneManager.goto(Scene_DC_MainMenu); }
        }
        if (Input.isTriggered('ok')) { SoundManager.playOk(); this.handleSelection(); }
    };

    Scene_DC_Login.prototype.handleSelection = function() {
        const symbol = this._options[this._index];
        if (!DC_Accounts._currentUser) {
            if (symbol === "Log In") this.openLoginPrompt();
            else if (symbol === "Create Account") this.openRegisterPrompt();
        } else {
            if (symbol === "Multiplayer Co-Op") { this._subMode = "coop"; this._index = 0; this.updateOptions(); this.drawMenu(); }
            else if (symbol === "Player Profile") { this._subMode = "profile"; this._index = 0; this.updateOptions(); this.drawMenu(); }
            else if (symbol === "Change PFP") { this.openPfpChange(); }
            else if (symbol === "Host Room" || symbol === "Join Room") {
                const code = (symbol === "Host Room") ? Math.random().toString(36).substring(2, 8).toUpperCase() : window.prompt("Enter Code:");
                if (code) { DC_Accounts._currentRoomCode = code; SceneManager.push(Scene_DC_Lobby); }
            }
            else if (symbol === "Logout") { DC_Accounts._currentUser = null; this.updateOptions(); this.drawMenu(); }
            else if (symbol === "Back") { this._subMode = "main"; this._index = 0; this.updateOptions(); this.drawMenu(); }
        }
    };

    Scene_DC_Login.prototype.openPfpChange = function() {
        const choice = window.prompt("Change PFP: 1.Mario, 2.Sonic, 3.SailorMoon, 4.MegaMan, 5.CureBlack");
        const list = ["PFP_Mario", "PFP_Sonic", "PFP_SailorMoon", "PFP_MegaMan", "PFP_CureBlack"];
        const pfp = list[parseInt(choice) - 1];
        if (pfp) {
            DC_Accounts._currentUser.pfp = pfp;
            DC_Accounts.saveAccount(DC_Accounts._currentUser.name, DC_Accounts._currentUser.user, DC_Accounts._currentUser.pass, pfp);
            alert("PFP Updated!"); this.drawMenu();
        }
    };

    Scene_DC_Login.prototype.openLoginPrompt = function() {
        const u = window.prompt("User:"); const p = window.prompt("Pass:");
        if (DC_Accounts.attemptLogin(u, p)) { this.updateOptions(); this.drawMenu(); }
        else { alert("Login Failed."); }
    };

    Scene_DC_Login.prototype.openRegisterPrompt = function() {
        const n = window.prompt("Name:"); const u = window.prompt("User:"); const p = window.prompt("Pass:");
        const choice = window.prompt("PFP: 1.Mario, 2.Sonic, 3.SailorMoon, 4.MegaMan, 5.CureBlack");
        const list = ["PFP_Mario", "PFP_Sonic", "PFP_SailorMoon", "PFP_MegaMan", "PFP_CureBlack"];
        const pfp = list[parseInt(choice) - 1] || "PFP_Mario";
        if (n && u && p) { DC_Accounts.saveAccount(n, u, p, pfp); this.drawMenu(); }
    };

    //=============================================================================
    // 🟢 6. SCENE: WAITING ROOM (Lobby & Warp Logic)
    //=============================================================================
    function Scene_DC_Lobby() { this.initialize.apply(this, arguments); }
    Scene_DC_Lobby.prototype = Object.create(Scene_Base.prototype);
    Scene_DC_Lobby.prototype.constructor = Scene_DC_Lobby;

    Scene_DC_Lobby.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        this._chatLog = ["System: Lobby Loaded.", "System: Waiting for teammate..."];
    };

    Scene_DC_Lobby.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this._background = new Sprite(ImageManager.loadTitle2("MenuBG_Online"));
        this.addChild(this._background);
        this._windowLayer = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this.addChild(this._windowLayer);
        this.refresh();
    };

    Scene_DC_Lobby.prototype.refresh = function() {
        const b = this._windowLayer.bitmap;
        b.clear();
        b.fontSize = 24; b.textColor = "#00ffcc";
        b.drawText("ROOM CODE: " + DC_Accounts._currentRoomCode, 0, 40, Graphics.width, 40, 'center');
        b.fillRect(50, 350, 716, 200, "rgba(0,0,0,0.6)");
        b.fontSize = 18; b.textColor = "#ffffff";
        for (let i = 0; i < this._chatLog.length; i++) {
            b.drawText(this._chatLog[i], 60, 360 + (i * 25), 700, 30, 'left');
        }
        b.fontSize = 20;
        b.drawText("[Z] Chat | [X] Leave | [ENTER] Start Mission", 0, 560, Graphics.width, 40, 'center');
    };

    Scene_DC_Lobby.prototype.update = function() {
        Scene_Base.prototype.update.call(this);
        if (Input.isTriggered('ok')) this.openChat();
        if (Input.isTriggered('cancel')) SceneManager.pop();
        if (Input.isTriggered('control') || Input.isTriggered('debug')) {
            this.startMission();
        }
    };

    Scene_DC_Lobby.prototype.openChat = function() {
        const msg = window.prompt("Message:");
        if (msg) {
            this._chatLog.push(DC_Accounts._currentUser.user + ": " + msg);
            if (this._chatLog.length > 7) this._chatLog.shift();
            this.refresh();
        }
    };

    Scene_DC_Lobby.prototype.startMission = function() {
        SoundManager.playOk();
        this._chatLog.push("System: Teleporting to Mission...");
        this.refresh();
        setTimeout(() => {
            DataManager.setupNewGame();
            AudioManager.stopBgm();
            AudioManager.playSe({ name: "Teleport1", volume: 100, pitch: 120, pan: 0 });
            SceneManager.goto(Scene_Map);
        }, 1000);
    };

})();

//=============================================================================
// 🔴 7. ACCOUNT ENGINE
//=============================================================================
var DC_Accounts = {
    _currentUser: null,
    _currentRoomCode: "",
    saveAccount: function(n, u, p, pfp) {
        const data = { name: n, user: u, pass: p, pfp: pfp };
        StorageManager.save(999, JSON.stringify(data));
        this._currentUser = data;
    },
    attemptLogin: function(u, p) {
        const savedData = StorageManager.load(999);
        if (savedData) {
            const acc = JSON.parse(savedData);
            if (acc.user === u && acc.pass === p) { this._currentUser = acc; return true; }
        }
        return false;
    }
};