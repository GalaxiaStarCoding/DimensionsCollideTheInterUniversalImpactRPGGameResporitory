/**
 * UNIVERSAL RPG BLIND MODE & SCREEN READER ENGINE
 * Compatible with NVDA, JAWS, Narrator, VoiceOver, and Braille Displays.
 */

const BlindMode = {
    isEnabled: false,
    announcer: null,

    // --- 1. THE ENGINE SETUP ---
    init: function() {
        // Create the hidden speech bridge for screen readers
        this.announcer = document.createElement('div');
        this.announcer.id = "accessibility-announcer";
        this.announcer.setAttribute('role', 'status');
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        
        // Hide visually but keep it "audible" to screen readers
        Object.assign(this.announcer.style, {
            position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden'
        });
        document.body.appendChild(this.announcer);

        // Load saved preference
        const saved = localStorage.getItem('rpg_blind_mode');
        if (saved === 'true') {
            this.isEnabled = true;
            setTimeout(() => this.say("Blind Mode Active."), 1000);
        }

        // Add the toggle to your Options Menu automatically
        this.injectToggle();
    },

    // --- 2. THE UI INJECTION (Makes it show up in your menu) ---
    injectToggle: function() {
        // Attempt to find your options menu by common names
        const menu = document.querySelector('.options-menu, #options, .settings, #settings') || document.body;

        const toggleContainer = document.createElement('div');
        toggleContainer.id = "blind-mode-ui";
        toggleContainer.style.cssText = "padding: 10px; background: rgba(0,0,0,0.5); color: white; border: 1px solid #fff; margin: 10px; display: inline-block;";

        toggleContainer.innerHTML = `
            <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="blind-mode-checkbox" ${this.isEnabled ? 'checked' : ''} style="margin-right: 10px;">
                <span style="font-family: sans-serif; font-size: 16px;">Enable Blind Mode (Speech/Braille)</span>
            </label>
        `;

        menu.appendChild(toggleContainer);

        // Listen for clicks on the new checkbox
        document.getElementById('blind-mode-checkbox').addEventListener('change', (e) => {
            this.toggle(e.target.checked);
        });
    },

    // --- 3. THE CORE LOGIC ---
    toggle: function(active) {
        this.isEnabled = active;
        localStorage.setItem('rpg_blind_mode', active);
        
        const status = active ? "Blind Mode Enabled. Use Tab to navigate." : "Blind Mode Disabled.";
        this.say(status, "assertive");
    },

    /**
     * Call this function throughout your RPG code:
     * BlindMode.say("You found a legendary sword!");
     */
    say: function(text, priority = 'polite') {
        if (!this.isEnabled || !this.announcer) return;

        this.announcer.setAttribute('aria-live', priority);
        this.announcer.textContent = ''; // Clear to force update
        
        setTimeout(() => {
            this.announcer.textContent = text;
            console.log("Screen Reader Says: " + text);
        }, 50);
    }
};

// Launch the script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BlindMode.init());
} else {
    BlindMode.init();
}