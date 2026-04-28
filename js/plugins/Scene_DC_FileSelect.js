//=============================================================================
// FILE SELECT SCENE (FREEDOM PLANET STYLE UI)
//=============================================================================
function Scene_DC_FileSelect() {
    this.initialize.apply(this, arguments);
}

Scene_DC_FileSelect.prototype = Object.create(Scene_Base.prototype);
Scene_DC_FileSelect.prototype.constructor = Scene_DC_FileSelect;

Scene_DC_FileSelect.prototype.initialize = function () {
    Scene_Base.prototype.initialize.call(this);
    this._index = 0;
    this._mode = "files"; // files, delete, return
    this._slots = [];
};

Scene_DC_FileSelect.prototype.create = function () {
    Scene_Base.prototype.create.call(this);

    // Background
    if ($dataSystem.title1Name) {
        this.addChild(new Sprite(ImageManager.loadTitle1($dataSystem.title1Name)));
    }

    // Title Box
    this._title = new Sprite(new Bitmap(Graphics.width, 80));
    this._title.bitmap.fontSize = 40;
    this._title.bitmap.drawText("NEW GAME", 0, 0, Graphics.width, 80, "center");
    this.addChild(this._title);

    // FILE SLOTS
    for (let i = 0; i < 3; i++) {
        const bmp = new Bitmap(500, 50);
        bmp.fontSize = 24;

        const sp = new Sprite(bmp);
        sp.x = Graphics.width / 2 - 250;
        sp.y = 150 + i * 70;

        this.addChild(sp);
        this._slots.push(sp);
    }

    // Cursor Arrow ▶
    this._cursor = new Sprite(new Bitmap(50, 50));
    this._cursor.bitmap.fontSize = 30;
    this._cursor.bitmap.drawText("▶", 0, 0, 50, 50, "center");
    this.addChild(this._cursor);

    // Delete Button
    this._delete = new Sprite(new Bitmap(300, 40));
    this._delete.y = Graphics.height - 120;
    this._delete.bitmap.fontSize = 24;
    this.addChild(this._delete);

    // Return Button
    this._return = new Sprite(new Bitmap(300, 40));
    this._return.y = Graphics.height - 70;
    this._return.bitmap.fontSize = 24;
    this.addChild(this._return);

    this.refresh();
};

Scene_DC_FileSelect.prototype.refresh = function () {

    // Draw Slots
    for (let i = 0; i < this._slots.length; i++) {
        const bmp = this._slots[i].bitmap;
        bmp.clear();

        const save = DataManager.loadSavefileInfo(i + 1);

        if (save) {
            bmp.textColor = "#00ffff";
            bmp.drawText("File " + (i + 1) + "  |  Continue", 0, 0, 500, 40, "left");
        } else {
            bmp.textColor = "#aaaaaa";
            bmp.drawText("File " + (i + 1) + "  |  New Game", 0, 0, 500, 40, "left");
        }
    }

    // Delete Button
    this._delete.bitmap.clear();
    this._delete.bitmap.textColor = (this._mode === "delete") ? "#ffffff" : "#888888";
    this._delete.bitmap.drawText("Delete", 0, 0, 300, 40, "center");

    // Return Button
    this._return.bitmap.clear();
    this._return.bitmap.textColor = (this._mode === "return") ? "#ffffff" : "#888888";
    this._return.bitmap.drawText("Return", 0, 0, 300, 40, "center");

    // Cursor Position
    if (this._mode === "files") {
        const target = this._slots[this._index];
        this._cursor.x = target.x - 60;
        this._cursor.y = target.y;
    } else if (this._mode === "delete") {
        this._cursor.x = Graphics.width / 2 - 200;
        this._cursor.y = this._delete.y;
    } else {
        this._cursor.x = Graphics.width / 2 - 200;
        this._cursor.y = this._return.y;
    }
};

Scene_DC_FileSelect.prototype.update = function () {
    Scene_Base.prototype.update.call(this);

    if (Input.isTriggered('down')) {
        SoundManager.playCursor();

        if (this._mode === "files") {
            this._index++;
            if (this._index >= this._slots.length) {
                this._mode = "delete";
            }
        } else if (this._mode === "delete") {
            this._mode = "return";
        } else {
            this._mode = "files";
            this._index = 0;
        }

        this.refresh();
    }

    if (Input.isTriggered('up')) {
        SoundManager.playCursor();

        if (this._mode === "files") {
            this._index--;
            if (this._index < 0) {
                this._mode = "return";
            }
        } else if (this._mode === "return") {
            this._mode = "delete";
        } else {
            this._mode = "files";
            this._index = this._slots.length - 1;
        }

        this.refresh();
    }

    if (Input.isTriggered('cancel')) {
        SceneManager.goto(Scene_DC_MainMenu);
    }

    if (Input.isTriggered('ok')) {
        this.select();
    }
};

Scene_DC_FileSelect.prototype.select = function () {

    if (this._mode === "files") {
        const saveId = this._index + 1;
        const save = DataManager.loadSavefileInfo(saveId);

        if (save) {
            DataManager.loadGame(saveId);
            SceneManager.goto(Scene_Map);
        } else {
            DataManager.setupNewGame();
            DataManager.saveGame(saveId);
            SceneManager.goto(Scene_Map);
        }
    }

    else if (this._mode === "delete") {
        const saveId = this._index + 1;
        const save = DataManager.loadSavefileInfo(saveId);

        if (!save) {
            SoundManager.playBuzzer();
            return;
        }

        DataManager.deleteSavefile(saveId);
        SoundManager.playOk();
        this.refresh();
    }

    else if (this._mode === "return") {
        SceneManager.goto(Scene_DC_MainMenu);
    }
};