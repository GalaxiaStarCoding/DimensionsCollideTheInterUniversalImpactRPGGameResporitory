//=============================================================================
// DC_MultiEmulator.js
// v1.0 — The Core Engine for Dimensions Collide Classic Games
//=============================================================================

var DC_MultiEmulator = DC_MultiEmulator || {};

(function() {
    'use strict';

    // 🔴 1. CORE SETTINGS
    // This maps your 'core' name to the actual EmulatorJS system name
    const CORE_MAP = {
        "nes": "nes",
        "snes": "snes",
        "genesis": "segaMD",
        "gba": "gba",
        "nds": "nds",
        "mame": "arcade"
    };

    // 🟢 2. START THE EMULATOR
    DC_MultiEmulator.start = function(romName, coreType) {
        const system = CORE_MAP[coreType] || "nes";
        const romPath = "Roms/" + romName; // Path to your folder
        
        console.log("Bridge: Booting " + romName + " on core " + system);

        this.createOverlay(romPath, system);
    };

    // 🟢 3. CREATE THE WINDOW OVERLAY
    DC_MultiEmulator.createOverlay = function(romPath, system) {
        // Create a div container that sits on top of the game
        this._container = document.createElement('div');
        this._container.id = 'dc-emulator-container';
        this._container.style.position = 'absolute';
        this._container.style.top = '0';
        this._container.style.left = '0';
        this._container.style.width = '100%';
        this._container.style.height = '100%';
        this._container.style.backgroundColor = 'black';
        this._container.style.zIndex = '1000';

        // Add a "Close" button (ESC key will also work later)
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = "❌ CLOSE GAME";
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '10px';
        closeBtn.style.right = '10px';
        closeBtn.style.zIndex = '1001';
        closeBtn.onclick = () => this.stop();
        this._container.appendChild(closeBtn);

        // Create the Iframe to load the emulator
        // We use EmulatorJS (a common open-source web emulator bridge)
        const frame = document.createElement('iframe');
        frame.id = 'emulator-frame';
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.border = 'none';
        
        // This URL points to a web-based loader. 
        // NOTE: For offline use, you'd download the EmulatorJS files to your project.
        frame.src = `https://emulatorjs.org/emu.html?system=${system}&rom=${romPath}`;
        
        this._container.appendChild(frame);
        document.body.appendChild(this._container);

        // Pause the RPG Maker engine music while playing
        AudioManager.stopBgm();
        AudioManager.stopSe();
    };

    // 🔴 4. STOP THE EMULATOR
    DC_MultiEmulator.stop = function() {
        if (this._container) {
            document.body.removeChild(this._container);
            this._container = null;
            
            // Restart the Main Menu music when returning
            AudioManager.playBgm({ name: "MainMenuTheme", volume: 90, pitch: 100, pan: 0 });
        }
    };

})();