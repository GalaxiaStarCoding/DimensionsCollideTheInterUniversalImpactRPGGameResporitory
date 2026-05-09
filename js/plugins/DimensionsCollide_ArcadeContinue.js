//=============================================================================
// DimensionsCollide_ArcadeContinue.js
// v2.3 — Arcade Sync: Music plays DURING Countdown
//=============================================================================

function Scene_DC_Continue() { this.initialize.apply(this, arguments); }
Scene_DC_Continue.prototype = Object.create(Scene_Base.prototype);
Scene_DC_Continue.prototype.constructor = Scene_DC_Continue;

Scene_DC_Continue.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._timer = 1200; // 20 Seconds
    this._attempts = $gameVariables.value(10) || 3; 
    this._canInput = true;
    this._index = 0; 
    this._options = ["YES", "START OVER", "NO"];
};

// 🟢 This function runs as soon as the scene is shown on screen
Scene_DC_Continue.prototype.start = function() {
    Scene_Base.prototype.start.call(this);
    this.playContinueMusic();
};

Scene_DC_Continue.prototype.playContinueMusic = function() {
    AudioManager.stopBgm();
    AudioManager.stopBgs();
    
    // Looks at Database -> System -> Game Over BGM
    if ($dataSystem && $dataSystem.gameoverBgm) {
        AudioManager.playBgm($dataSystem.gameoverBgm);
    }
};

Scene_DC_Continue.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    
    // Background
    this._bg = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    this._bg.bitmap.fillAll('black');
    this.addChild(this._bg);

    // Title
    this._titleText = new Sprite(new Bitmap(Graphics.width, 100));
    this._titleText.bitmap.fontSize = 48;
    this._titleText.bitmap.textColor = "#ffff00";
    this._titleText.bitmap.drawText("CONTINUE?", 0, 0, Graphics.width, 100, 'center');
    this._titleText.y = 80;
    this.addChild(this._titleText);

    // Big Countdown
    this._countText = new Sprite(new Bitmap(Graphics.width, 200));
    this._countText.bitmap.fontSize = 140;
    this._countText.y = 150;
    this.addChild(this._countText);

    // Menu Options
    this._windowLayer = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    this.addChild(this._windowLayer);

    this.refresh();
};

Scene_DC_Continue.prototype.refresh = function() {
    const b = this._windowLayer.bitmap;
    b.clear();
    
    const bCount = this._countText.bitmap;
    bCount.clear();
    const seconds = Math.ceil(this._timer / 60);
    bCount.textColor = seconds <= 5 ? "#ff0000" : "#ffffff";
    bCount.drawText(seconds, 0, 0, Graphics.width, 200, 'center');

    b.fontSize = 32;
    this._options.forEach((opt, i) => {
        b.textColor = (i === this._index) ? "#00ffcc" : "#888888";
        b.drawText(opt, 0, 380 + (i * 60), Graphics.width, 50, 'center');
    });

    b.fontSize = 20;
    b.textColor = "#ffffff";
    b.drawText("ATTEMPTS LEFT: " + this._attempts, 0, 560, Graphics.width, 40, 'center');
};

Scene_DC_Continue.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    
    if (this._timer > 0 && this._canInput) {
        this._timer--;
        if (this._timer % 60 === 0) {
            this.refresh();
            // Ticking sound when low on time
            if (this._timer <= 300) SoundManager.playCursor(); 
        }

        if (Input.isTriggered('down')) { this._index = (this._index + 1) % 3; SoundManager.playCursor(); this.refresh(); }
        if (Input.isTriggered('up')) { this._index = (this._index - 1 + 3) % 3; SoundManager.playCursor(); this.refresh(); }
        
        if (Input.isTriggered('ok')) {
            this.processSelection();
        }
    } else if (this._canInput) {
        this.processNo(); // Automatically end if time runs out
    }
};

Scene_DC_Continue.prototype.processSelection = function() {
    const choice = this._options[this._index];
    if (choice === "YES") this.processYes();
    if (choice === "START OVER") this.processStartOver();
    if (choice === "NO") this.processNo();
};

Scene_DC_Continue.prototype.processYes = function() {
    if (this._attempts > 0) {
        this._canInput = false;
        this._attempts--;
        $gameVariables.setValue(10, this._attempts);
        SoundManager.playOk();
        SceneManager.goto(Scene_Map);
        $gameParty.reviveBattleMembers();
    } else {
        SoundManager.playBuzzer();
    }
};

Scene_DC_Continue.prototype.processStartOver = function() {
    SoundManager.playOk();
    SceneManager.goto(Scene_Load); 
};

Scene_DC_Continue.prototype.processNo = function() {
    this._canInput = false;
    AudioManager.stopBgm(); // Stop music when giving up
    SoundManager.playCancel();
    this.startFadeOut(60, false);
    setTimeout(() => {
        SceneManager.goto(Scene_Title);
    }, 1000);
};

// Override the default Game Over behavior
Scene_Gameover.prototype.gotoTitle = function() {
    SceneManager.goto(Scene_DC_Continue);
};