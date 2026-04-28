//=============================================================================
// FileSelector.js
//=============================================================================

/*:
 * @plugindesc File/Folder Selector Plugin for RPG Maker MV - Freedom Planet 2 Style
 * @author Your Name
 *
 * @param New Game Folder Path
 * @desc Default path for new game folders (relative to game root)
 * @default ./saves/
 *
 * @param Show File Details
 * @desc Show file details like character level, playtime, etc
 * @type boolean
 * @default true
 *
 * @help
 * This plugin adds a file/folder selector window similar to Freedom Planet 2
 * 
 * Usage:
 * - Call FileSelector.showNewGameSelector() for Start Game
 * - Call FileSelector.showContinueSelector() for Continue Game
 *
 * =============================================================================
 */

(function() {
    'use strict';
    
    const pluginName = 'FileSelector';
    const parameters = PluginManager.parameters(pluginName);
    const DEFAULT_FOLDER_PATH = parameters['New Game Folder Path'] || './saves/';
    const SHOW_FILE_DETAILS = parameters['Show File Details'] === 'true';

    // =========================================================================
    // Window_FileSelector
    // =========================================================================
    function Window_FileSelector() {
        this.initialize.apply(this, arguments);
    }

    Window_FileSelector.prototype = Object.create(Window_Selectable.prototype);
    Window_FileSelector.prototype.constructor = Window_FileSelector;

    Window_FileSelector.prototype.initialize = function(x, y, width, height, mode) {
        this._mode = mode; // 'new' or 'continue'
        this._items = [];
        this._selectedIndex = 0;
        this._folderPath = DEFAULT_FOLDER_PATH;
        
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this.loadFileList();
        this.activate();
        this.select(0);
    };

    Window_FileSelector.prototype.loadFileList = function() {
        this._items = [];
        
        if (this._mode === 'new') {
            // For new game, we could load existing save slots or folder suggestions
            // In a real implementation, you'd check the file system
            for (let i = 0; i < 3; i++) {
                this._items.push({
                    name: 'Slot ' + (i + 1),
                    type: 'slot',
                    id: i,
                    playtime: 0,
                    level: 0,
                    character: 'Player',
                    lastSaved: null
                });
            }
        } else if (this._mode === 'continue') {
            // For continue, load actual save files
            // This would normally read from the save directory
            if (StorageManager.isLocalMode()) {
                const fs = require('fs');
                const path = require('path');
                const savePath = this.getSavePath();
                
                try {
                    if (fs.existsSync(savePath)) {
                        const files = fs.readdirSync(savePath);
                        files.forEach((file, index) => {
                            if (file.endsWith('.json')) {
                                const filePath = path.join(savePath, file);
                                try {
                                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                                    this._items.push({
                                        name: data.characterName || 'Unknown',
                                        type: 'save',
                                        path: filePath,
                                        playtime: data.playtime || 0,
                                        level: data.level || 1,
                                        character: data.characterName || 'Player',
                                        lastSaved: fs.statSync(filePath).mtime
                                    });
                                } catch(e) {
                                    console.log('Error loading save file:', file);
                                }
                            }
                        });
                    }
                } catch(e) {
                    console.log('Error reading save directory:', e);
                }
            }
        }
    };

    Window_FileSelector.prototype.getSavePath = function() {
        if (StorageManager.isLocalMode()) {
            const path = require('path');
            return path.join(path.dirname(process.mainModule.filename), 'saves');
        }
        return DEFAULT_FOLDER_PATH;
    };

    Window_FileSelector.prototype.maxItems = function() {
        return this._items.length;
    };

    Window_FileSelector.prototype.itemHeight = function() {
        return 80;
    };

    Window_FileSelector.prototype.drawItem = function(index) {
        const item = this._items[index];
        const rect = this.itemRectForText(index);
        const x = rect.x;
        const y = rect.y;
        const width = rect.width;
        const height = rect.height;

        // Draw selection highlight
        if (this.isCurrentItemEnabled()) {
            this.changePaintOpacity(true);
        } else {
            this.changePaintOpacity(false);
        }

        // Draw item frame/border (Freedom Planet 2 style)
        this.drawFileFrame(x, y, width, height, index === this._index);

        // Draw play icon
        if (item.type === 'save') {
            this.drawText('▶', x + 20, y + 10, 30, 'left');
        }

        // Draw file name
        this.drawText(item.name, x + 60, y + 15, width - 100, 'left');

        // Draw file details if enabled
        if (SHOW_FILE_DETAILS && item.type === 'save') {
            this.drawText('Level: ' + item.level, x + 60, y + 40, 100, 'left');
            
            // Draw playtime
            const hours = Math.floor(item.playtime / 3600);
            const minutes = Math.floor((item.playtime % 3600) / 60);
            const playtimeStr = hours + 'h ' + minutes + 'm';
            this.drawText(playtimeStr, x + 200, y + 40, 100, 'left');
        }

        this.changePaintOpacity(true);
    };

    Window_FileSelector.prototype.drawFileFrame = function(x, y, width, height, isSelected) {
        const lineColor = isSelected ? '#00FFFF' : '#FF6600';
        const ctx = this.contents.context;
        
        // Simple cyan/orange frame
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 5, y + 5, width - 10, height - 10);
    };

    Window_FileSelector.prototype.currentItem = function() {
        return this._items[this._index];
    };

    Window_FileSelector.prototype.isCurrentItemEnabled = function() {
        return this._items.length > 0;
    };

    // =========================================================================
    // Scene_FileSelector
    // =========================================================================
    function Scene_FileSelector() {
        this.initialize.apply(this, arguments);
    }

    Scene_FileSelector.prototype = Object.create(Scene_Base.prototype);
    Scene_FileSelector.prototype.constructor = Scene_FileSelector;

    Scene_FileSelector.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        this._mode = 'new'; // 'new' or 'continue'
    };

    Scene_FileSelector.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.createFileWindow();
        this.createInfoWindow();
        this.createActionWindow();
    };

    Scene_FileSelector.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
        this.addChild(this._backgroundSprite);
    };

    Scene_FileSelector.prototype.createFileWindow = function() {
        const x = Graphics.boxWidth / 4;
        const y = Graphics.boxHeight / 4;
        const width = Graphics.boxWidth / 2;
        const height = Graphics.boxHeight / 2;
        
        this._fileWindow = new Window_FileSelector(x, y, width, height, this._mode);
        this._fileWindow.setBackgroundType(0);
        this._fileWindow.setHandler('ok', this.onFileOk.bind(this));
        this._fileWindow.setHandler('cancel', this.onFileCancel.bind(this));
        this.addWindow(this._fileWindow);
    };

    Scene_FileSelector.prototype.createInfoWindow = function() {
        const x = 10;
        const y = 10;
        const width = Graphics.boxWidth / 3;
        const height = 120;
        
        this._infoWindow = new Window_Base(x, y, width, height);
        this._infoWindow.setBackgroundType(0);
        this.drawInfoContent();
        this.addWindow(this._infoWindow);
    };

    Scene_FileSelector.prototype.drawInfoContent = function() {
        const item = this._fileWindow.currentItem();
        if (!item) return;

        const x = 20;
        const y = 20;
        
        this._infoWindow.contents.clear();
        this._infoWindow.drawText('FILE SELECTOR', x, y, 200);
        
        if (item.type === 'save') {
            this._infoWindow.drawText('Character: ' + item.character, x, y + 40, 200);
            this._infoWindow.drawText('Level: ' + item.level, x, y + 70, 100);
        }
    };

    Scene_FileSelector.prototype.createActionWindow = function() {
        const x = Graphics.boxWidth / 4;
        const y = Graphics.boxHeight - 100;
        const width = Graphics.boxWidth / 2;
        const height = 80;
        
        this._actionWindow = new Window_Base(x, y, width, height);
        this._actionWindow.setBackgroundType(0);
        this.drawActionContent();
        this.addWindow(this._actionWindow);
    };

    Scene_FileSelector.prototype.drawActionContent = function() {
        this._actionWindow.contents.clear();
        
        if (this._mode === 'new') {
            this._actionWindow.drawText('Select a slot to start your adventure!', 20, 10);
            this._actionWindow.drawText('[OK] Confirm  [Cancel] Back', 20, 50);
        } else {
            this._actionWindow.drawText('Select a save file to continue!', 20, 10);
            this._actionWindow.drawText('[OK] Load  [Cancel] Back', 20, 50);
        }
    };

    Scene_FileSelector.prototype.onFileOk = function() {
        const item = this._fileWindow.currentItem();
        
        if (this._mode === 'new') {
            // Start new game with selected slot
            SceneManager.goto(Scene_Map);
            $gameSystem._currentSlot = item.id;
        } else {
            // Load save file
            if (item.type === 'save') {
                DataManager.loadGameWithPath(item.path);
                SceneManager.goto(Scene_Map);
            }
        }
    };

    Scene_FileSelector.prototype.onFileCancel = function() {
        SceneManager.pop();
    };

    // =========================================================================
    // FileSelector Global Functions
    // =========================================================================
    window.FileSelector = {};

    FileSelector.showNewGameSelector = function() {
        const scene = new Scene_FileSelector();
        scene._mode = 'new';
        SceneManager.push(scene);
    };

    FileSelector.showContinueSelector = function() {
        const scene = new Scene_FileSelector();
        scene._mode = 'continue';
        SceneManager.push(scene);
    };

    // =========================================================================
    // Override DataManager for custom save loading
    // =========================================================================
    const _DataManager_loadGameWithPath = DataManager.loadGameWithPath || function() {};
    DataManager.loadGameWithPath = function(path) {
        if (StorageManager.isLocalMode()) {
            const fs = require('fs');
            try {
                const data = JSON.parse(fs.readFileSync(path, 'utf8'));
                this._mapId = data.mapId || 0;
                this._x = data.x || 0;
                this._y = data.y || 0;
                // Load other game data as needed
                return true;
            } catch(e) {
                console.error('Error loading save file:', e);
                return false;
            }
        }
        return false;
    };

    // =========================================================================
    // Plugin Commands
    // =========================================================================
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        
        if (command === 'ShowNewGameSelector') {
            FileSelector.showNewGameSelector();
        } else if (command === 'ShowContinueSelector') {
            FileSelector.showContinueSelector();
        }
    };

})();