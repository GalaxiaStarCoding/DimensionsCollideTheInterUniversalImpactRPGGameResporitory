//=============================================================================
// DimensionsCollide_LoadingScreen.js
// v1.0 — 32-Bit Retro Style Loading Sequence
//=============================================================================

function Scene_DC_Loading() { this.initialize.apply(this, arguments); }
Scene_DC_Loading.prototype = Object.create(Scene_Base.prototype);
Scene_DC_Loading.prototype.constructor = Scene_DC_Loading;

Scene_DC_Loading.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._timer = 0;
    this._loadDuration = 180; // 3 seconds at 60fps
};

Scene_DC_Loading.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    
    // 1. Create the Black Background
    this._bg = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    this._bg.bitmap.fillAll('black');
    this.addChild(this._bg);

    // 2. Create Scrolling Grid (Optional - if you have img/titles2/LoadingGrid.png)
    this._grid = new TilingSprite(ImageManager.loadTitle2("LoadingGrid"));
    this._grid.move(0, 0, Graphics.width, Graphics.height);
    this._grid.opacity = 60;
    this.addChild(this._grid);

    // 3. Create "NOW LOADING" Text
    this._statusText = new Sprite(new Bitmap(Graphics.width, 100));
    this._statusText.bitmap.fontSize = 32;
    this._statusText.bitmap.textColor = "#00ffcc"; // Cyber Teal
    this._statusText.bitmap.drawText("NOW LOADING...", 0, 0, Graphics.width, 100, 'center');
    this._statusText.y = Graphics.height / 2 - 50;
    this.addChild(this._statusText);

    // 4. Create Animated Sprite (Rotating Icon like Mega Man X4)
    this._loadingIcon = new Sprite(ImageManager.loadTitle2("LoadingIcon"));
    this._loadingIcon.anchor.x = 0.5;
    this._loadingIcon.anchor.y = 0.5;
    this._loadingIcon.x = Graphics.width / 2;
    this._loadingIcon.y = Graphics.height / 2 + 60;
    this.addChild(this._loadingIcon);
};

Scene_DC_Loading.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    this._timer++;

    // Animations
    this._grid.origin.x += 1;
    this._grid.origin.y += 1;
    this._loadingIcon.rotation += 0.1;
    this._statusText.opacity = 150 + Math.sin(this._timer / 10) * 105;

    // Transition to Map when finished
    if (this._timer >= this._loadDuration) {
        this.finishLoading();
    }
};

Scene_DC_Loading.prototype.finishLoading = function() {
    DataManager.setupNewGame();
    SceneManager.goto(Scene_Map);
};