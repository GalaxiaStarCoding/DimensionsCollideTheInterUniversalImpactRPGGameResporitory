//=============================================================================
// DimensionsCollide_Messages.js
//=============================================================================
/*:
 * @plugindesc v2.0 - Friend Messages System (WhatsApp + iMessage + Discord style)
 * @author DimensionsCollide Dev
 * @help
 * Place in js/plugins/ and enable in Plugin Manager.
 * Must be BELOW DimensionsCollide_TitleScreen.js in the Plugin Manager list.
 *
 * Data saved to AppData:
 *   dc_messages.json  — conversation threads
 *   dc_friends.json   — friends list + pending requests
 */

(function() {

'use strict';

//=============================================================================
// GUARD — wait until DC_Account is available from TitleScreen plugin
//=============================================================================
function dcMe() {
    return (typeof DC_Account !== 'undefined' && DC_Account.current) ? DC_Account.current : 'Me';
}
function dcMyName() {
    return (typeof DC_Account !== 'undefined' && DC_Account.name) ? DC_Account.name : dcMe();
}

//=============================================================================
// FILE I/O
//=============================================================================
function dcRead(file, fallback) {
    try {
        if (typeof nw === 'undefined') return fallback;
        var path = require('path');
        var fs   = require('fs');
        var fp   = path.join(nw.App.dataPath, file);
        if (!fs.existsSync(fp)) return fallback;
        return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch(e) { return fallback; }
}
function dcWrite(file, data) {
    try {
        if (typeof nw === 'undefined') return;
        var path = require('path');
        require('fs').writeFileSync(
            path.join(nw.App.dataPath, file),
            JSON.stringify(data, null, 2), 'utf8'
        );
    } catch(e) {}
}

//=============================================================================
// TIMESTAMP
//=============================================================================
function tsFormat(ts) {
    if (!ts) return '';
    var d    = new Date(ts);
    var now  = new Date();
    var diff = now - d;
    var m    = Math.floor(diff / 60000);
    if (m < 1)   return 'now';
    if (m < 60)  return m + 'm';
    var h = Math.floor(m / 60);
    if (h < 24)  return h + 'h';
    var days = Math.floor(h / 24);
    if (days < 7) return days + 'd';
    return (d.getMonth()+1) + '/' + d.getDate();
}
function tsLong(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
           '  ' + (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
}

//=============================================================================
// MESSAGE STORE
//=============================================================================
var MSG = {
    _d: null,
    load: function() {
        if (!this._d) this._d = dcRead('dc_messages.json', { threads: {} });
    },
    save: function() { dcWrite('dc_messages.json', this._d); },

    // Get sorted thread keys (most recent first)
    threads: function() {
        this.load();
        var keys = Object.keys(this._d.threads);
        keys.sort(function(a,b) {
            var ta = this._d.threads[a], tb = this._d.threads[b];
            var la = ta.length ? ta[ta.length-1].ts : 0;
            var lb = tb.length ? tb[tb.length-1].ts : 0;
            return lb - la;
        }.bind(this));
        return keys;
    },

    get: function(partner) {
        this.load();
        return this._d.threads[partner] || [];
    },

    send: function(to, text) {
        this.load();
        if (!this._d.threads[to]) this._d.threads[to] = [];
        this._d.threads[to].push({ from: dcMe(), text: text, ts: Date.now(), read: true });
        this.save();
    },

    markRead: function(partner) {
        this.load();
        var t = this._d.threads[partner];
        if (!t) return;
        for (var i = 0; i < t.length; i++) t[i].read = true;
        this.save();
    },

    unread: function(partner) {
        this.load();
        var t = this._d.threads[partner] || [];
        var n = 0, me = dcMe();
        for (var i = 0; i < t.length; i++)
            if (!t[i].read && t[i].from !== me) n++;
        return n;
    },

    totalUnread: function() {
        this.load();
        var keys = Object.keys(this._d.threads), n = 0;
        for (var i = 0; i < keys.length; i++) n += this.unread(keys[i]);
        return n;
    },

    deleteThread: function(partner) {
        this.load();
        delete this._d.threads[partner];
        this.save();
    }
};

//=============================================================================
// FRIENDS STORE
// friend: { username, name, status:'online'|'offline'|'away' }
// pending: { username, name, direction:'in'|'out' }
//=============================================================================
var FR = {
    _d: null,
    load: function() {
        if (!this._d) this._d = dcRead('dc_friends.json', { friends: [], pending: [] });
    },
    save: function() { dcWrite('dc_friends.json', this._d); },

    friends: function() { this.load(); return this._d.friends; },
    pending: function() { this.load(); return this._d.pending; },

    find: function(u) {
        this.load();
        for (var i = 0; i < this._d.friends.length; i++)
            if (this._d.friends[i].username.toLowerCase() === u.toLowerCase())
                return this._d.friends[i];
        return null;
    },

    // Send a friend request (outgoing)
    sendRequest: function(username, name) {
        this.load();
        if (username.toLowerCase() === dcMe().toLowerCase()) return 'self';
        if (this.find(username)) return 'already_friend';
        for (var i = 0; i < this._d.pending.length; i++)
            if (this._d.pending[i].username.toLowerCase() === username.toLowerCase())
                return 'pending';
        this._d.pending.push({ username: username, name: name || username, direction: 'out' });
        this.save();
        return 'ok';
    },

    // Accept incoming pending request
    accept: function(username) {
        this.load();
        for (var i = 0; i < this._d.pending.length; i++) {
            if (this._d.pending[i].username.toLowerCase() === username.toLowerCase() &&
                this._d.pending[i].direction === 'in') {
                var f = this._d.pending.splice(i, 1)[0];
                this._d.friends.push({ username: f.username, name: f.name, status: 'offline' });
                this.save();
                return true;
            }
        }
        return false;
    },

    // Decline / cancel request
    removePending: function(username) {
        this.load();
        this._d.pending = this._d.pending.filter(function(p) {
            return p.username.toLowerCase() !== username.toLowerCase();
        });
        this.save();
    },

    removeFriend: function(username) {
        this.load();
        this._d.friends = this._d.friends.filter(function(f) {
            return f.username.toLowerCase() !== username.toLowerCase();
        });
        this.save();
    },

    status: function(username) {
        var f = this.find(username);
        return f ? f.status : 'offline';
    },

    statusColor: function(s) {
        if (s === 'online') return '#23d160';
        if (s === 'away')   return '#ffaa00';
        return '#747f8d';
    }
};

//=============================================================================
// HTML INPUT BOX
//=============================================================================
function makeInputEl(placeholder, x, y, w, onEnter, onEscape) {
    var el = document.createElement('input');
    el.type = 'text';
    el.placeholder = placeholder;
    el.maxLength   = 100;
    el.style.cssText = [
        'position:fixed',
        'left:'  + Math.round(x) + 'px',
        'top:'   + Math.round(y) + 'px',
        'width:' + Math.round(w) + 'px',
        'height:38px',
        'font-size:16px',
        'padding:4px 10px',
        'background:#1e1f22',
        'color:#dcddde',
        'border:none',
        'border-top:2px solid #00aaff',
        'outline:none',
        'z-index:9999',
        'font-family:monospace',
        'box-sizing:border-box'
    ].join(';');
    el.addEventListener('keydown', function(e) {
        e.stopPropagation();
        if (e.key === 'Enter'  && onEnter)  onEnter(el.value);
        if (e.key === 'Escape' && onEscape) onEscape();
    }, true);
    document.body.appendChild(el);
    setTimeout(function() { el.focus(); }, 50);
    return el;
}
function removeEl(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

//=============================================================================
// DRAW HELPERS
//=============================================================================
function fillRect(b, x, y, w, h, c) { b.fillRect(x, y, w, h, c); }
function border(b, x, y, w, h, c, t) {
    t = t || 2;
    b.fillRect(x,       y,       w,  t, c);
    b.fillRect(x,       y+h-t,   w,  t, c);
    b.fillRect(x,       y,       t,  h, c);
    b.fillRect(x+w-t,   y,       t,  h, c);
}
function pill(b, x, y, w, h, c) {
    // Approximate pill/rounded rect with fillRect
    b.fillRect(x+2, y,   w-4, h,   c);
    b.fillRect(x,   y+2, w,   h-4, c);
}

//=============================================================================
// SCENE: MESSAGES HUB
//=============================================================================
// Expose globally so TitleScreen plugin can reference it
window.Scene_DC_Messages = function Scene_DC_Messages() { this.initialize.apply(this, arguments); };
Scene_DC_Messages.prototype = Object.create(Scene_Base.prototype);
Scene_DC_Messages.prototype.constructor = Scene_DC_Messages;

Scene_DC_Messages.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);

    // Nav tabs: Chat, Online, Pending, Add Friend, Back
    this._navTabs  = ['Chat', 'Online', 'Pending', 'Add Friend', 'Back'];
    this._navIndex = 0;

    // Left panel state
    this._chatIndex   = 0;    // selected thread in Chat tab
    this._onlineIndex = 0;    // selected friend in Online tab
    this._pendingIdx  = 0;    // selected pending in Pending tab

    // Right panel
    this._activePartner = null;
    this._msgScrollOffset = 0;

    // Input elements
    this._composeEl   = null;
    this._addFriendEl = null;
    this._phase       = 'nav'; // 'nav' | 'list' | 'thread' | 'composing' | 'add_friend'

    this._statusMsg   = '';
    this._statusTimer = 0;
    this._confirmDelete = null; // partner to confirm delete
};

//─────────────────────────────────────────────────────────────────────────────
// CREATE
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_Messages.prototype.create = function() {
    Scene_Base.prototype.create.call(this);

    var GW = Graphics.width;
    var GH = Graphics.height;

    // ── Full background ──────────────────────────────────────────────────
    var bgBmp = new Bitmap(GW, GH);
    bgBmp.fillRect(0, 0, GW, GH, '#1e1f22');
    this.addChild(new Sprite(bgBmp));

    // ── DISCORD NAV BAR (top, full width) ───────────────────────────────
    var NAV_H  = 44;
    this._navH = NAV_H;
    this._navBmp = new Bitmap(GW, NAV_H);
    this._navSp  = new Sprite(this._navBmp);
    this._navSp.y = 0;
    this.addChild(this._navSp);

    // ── LAYOUT ──────────────────────────────────────────────────────────
    // Left panel = WhatsApp style thread list
    // Right panel = iMessage style conversation
    var TOP    = NAV_H + 2;
    var LW     = Math.floor(GW * 0.36);
    var RX     = LW + 2;
    var RW     = GW - RX;
    var PH     = GH - TOP;

    this._TOP = TOP; this._LW = LW;
    this._RX  = RX;  this._RW = RW; this._PH = PH;

    // Left panel background (WhatsApp dark = #111b21)
    var leftBg = new Sprite(new Bitmap(LW, PH));
    leftBg.bitmap.fillRect(0, 0, LW, PH, '#111b21');
    leftBg.y = TOP;
    this.addChild(leftBg);

    // Left list bitmap
    this._leftBmp = new Bitmap(LW, PH);
    this._leftSp  = new Sprite(this._leftBmp);
    this._leftSp.y = TOP;
    this.addChild(this._leftSp);

    // Divider
    var div = new Sprite(new Bitmap(2, PH));
    div.bitmap.fillRect(0, 0, 2, PH, '#3f4248');
    div.x = LW; div.y = TOP;
    this.addChild(div);

    // Right panel background (iMessage dark = #000000)
    var rightBg = new Sprite(new Bitmap(RW, PH));
    rightBg.bitmap.fillRect(0, 0, RW, PH, '#000000');
    rightBg.x = RX; rightBg.y = TOP;
    this.addChild(rightBg);

    // Right header
    this._rHdrBmp = new Bitmap(RW, 52);
    this._rHdrSp  = new Sprite(this._rHdrBmp);
    this._rHdrSp.x = RX; this._rHdrSp.y = TOP;
    this.addChild(this._rHdrSp);

    // Right messages area
    var MSG_AREA_H = PH - 52 - 44;
    this._msgBmp = new Bitmap(RW, MSG_AREA_H);
    this._msgSp  = new Sprite(this._msgBmp);
    this._msgSp.x = RX; this._msgSp.y = TOP + 52;
    this.addChild(this._msgSp);
    this._MSG_AREA_H = MSG_AREA_H;

    // Right compose bar (bottom of right panel)
    this._cmpBmp = new Bitmap(RW, 44);
    this._cmpSp  = new Sprite(this._cmpBmp);
    this._cmpSp.x = RX; this._cmpSp.y = TOP + 52 + MSG_AREA_H;
    this.addChild(this._cmpSp);

    // Status bar (full width, bottom)
    this._statusBmp = new Bitmap(GW, 28);
    this._statusSp  = new Sprite(this._statusBmp);
    this._statusSp.y = GH - 28;
    this.addChild(this._statusSp);

    this._redraw();
};

//─────────────────────────────────────────────────────────────────────────────
// REDRAW
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_Messages.prototype._redraw = function() {
    this._drawNav();
    this._drawLeft();
    this._drawRight();
};

// ── Discord-style nav bar ──────────────────────────────────────────────────
Scene_DC_Messages.prototype._drawNav = function() {
    var b   = this._navBmp;
    var GW  = Graphics.width;
    var NAV_H = this._navH;
    b.clear();

    // Nav background — Discord dark (#2b2d31)
    b.fillRect(0, 0, GW, NAV_H, '#2b2d31');
    // Bottom border
    b.fillRect(0, NAV_H-2, GW, 2, '#1e1f22');

    var tabW   = Math.floor(GW / this._navTabs.length);
    for (var i = 0; i < this._navTabs.length; i++) {
        var label = this._navTabs[i];
        var sel   = (i === this._navIndex) && (this._phase === 'nav' || this._phase === 'list' || this._phase === 'thread');
        var x     = i * tabW;

        // Active pill highlight
        if (sel) {
            b.fillRect(x + 4, 6, tabW - 8, NAV_H - 12, '#404249');
            b.fillRect(x + 4, NAV_H - 4, tabW - 8, 3, '#5865f2'); // Discord blue underline
        }

        // Special: Back tab = red tint
        var textCol;
        if (label === 'Back') {
            textCol = sel ? '#ff6b6b' : '#a03030';
        } else {
            textCol = sel ? '#ffffff' : '#96989d';
        }

        // Unread badge on Chat tab
        if (label === 'Chat') {
            var unread = MSG.totalUnread();
            if (unread > 0) {
                b.fillRect(x + tabW - 26, 8, 20, 16, '#ed4245');
                b.fontSize = 12; b.textColor = '#ffffff';
                b.drawText(String(unread), x + tabW - 26, 9, 20, 14, 'center');
            }
        }

        // Pending badge
        if (label === 'Pending') {
            var inCount = 0;
            var pend = FR.pending();
            for (var j = 0; j < pend.length; j++)
                if (pend[j].direction === 'in') inCount++;
            if (inCount > 0) {
                b.fillRect(x + tabW - 26, 8, 20, 16, '#ed4245');
                b.fontSize = 12; b.textColor = '#ffffff';
                b.drawText(String(inCount), x + tabW - 26, 9, 20, 14, 'center');
            }
        }

        b.fontSize  = 16;
        b.textColor = textCol;
        b.drawText(label, x + 4, 10, tabW - 8, NAV_H - 20, 'center');
    }
};

// ── Left panel ─────────────────────────────────────────────────────────────
Scene_DC_Messages.prototype._drawLeft = function() {
    var b   = this._leftBmp;
    var LW  = this._LW;
    var PH  = this._PH;
    b.clear();

    var tab = this._navTabs[this._navIndex];

    if (tab === 'Chat')       this._drawChatList(b, LW, PH);
    else if (tab === 'Online') this._drawOnlineList(b, LW, PH);
    else if (tab === 'Pending') this._drawPendingList(b, LW, PH);
    else if (tab === 'Add Friend') this._drawAddFriendPanel(b, LW, PH);
    else {
        // Back or other — blank
        b.fontSize = 16; b.textColor = '#3f4248';
        b.drawText('Select a tab above', 10, 20, LW - 20, 26, 'center');
    }
};

// WhatsApp-style thread list
Scene_DC_Messages.prototype._drawChatList = function(b, LW, PH) {
    var threads = MSG.threads();
    var rowH    = 64;

    // Search bar placeholder at top
    b.fillRect(0, 0, LW, 40, '#1e2428');
    b.fontSize = 14; b.textColor = '#8696a0';
    b.drawText('\uD83D\uDD0D  Search or start new chat', 12, 12, LW - 24, 20, 'left');
    b.fillRect(0, 38, LW, 2, '#2a3942');

    if (threads.length === 0) {
        b.fontSize = 15; b.textColor = '#3f4248';
        b.drawText('No chats yet.', 0, 80, LW, 24, 'center');
        b.fontSize = 13; b.textColor = '#2a3942';
        b.drawText('Add a friend and send a message!', 0, 110, LW, 22, 'center');
        return;
    }

    var me = dcMe();
    for (var i = 0; i < threads.length; i++) {
        var partner  = threads[i];
        var thread   = MSG.get(partner);
        var last     = thread.length ? thread[thread.length-1] : null;
        var unread   = MSG.unread(partner);
        var friend   = FR.find(partner);
        var status   = FR.status(partner);
        var dispName = friend ? friend.name : partner;
        var isSel    = (i === this._chatIndex) &&
                       (this._phase === 'list' || this._phase === 'thread');
        var y        = 42 + i * rowH;

        // Row background
        b.fillRect(0, y, LW, rowH, isSel ? '#2a3942' : '#111b21');
        if (isSel) b.fillRect(0, y, 3, rowH, '#00aaff');

        // Avatar circle
        var av = status === 'online' ? '#23d160' : (status === 'away' ? '#ffaa00' : '#3f4248');
        b.fillRect(10, y+14, 34, 34, '#2a3942');
        b.fillRect(10, y+14, 34, 34, av.replace('#','') !== '3f4248' ? av : '#3a3d42');
        b.fontSize = 18; b.textColor = '#ffffff';
        b.drawText((dispName[0] || '?').toUpperCase(), 10, y+16, 34, 30, 'center');

        // Status dot
        b.fillRect(36, y+40, 10, 10, FR.statusColor(status));
        b.fillRect(35, y+39, 12, 12, FR.statusColor(status));
        b.fillRect(36, y+40, 10, 10, FR.statusColor(status));

        // Name
        b.fontSize = 17; b.textColor = isSel ? '#ffffff' : '#e9edef';
        b.drawText(dispName, 52, y+8, LW-110, 24, 'left');

        // Timestamp
        if (last) {
            b.fontSize = 12; b.textColor = unread > 0 ? '#25d366' : '#8696a0';
            b.drawText(tsFormat(last.ts), LW-60, y+10, 56, 18, 'right');
        }

        // Last message preview
        if (last) {
            var prev = (last.from === me ? 'You: ' : '') + last.text;
            if (prev.length > 30) prev = prev.slice(0, 27) + '...';
            b.fontSize = 14;
            b.textColor = unread > 0 ? '#e9edef' : '#8696a0';
            b.drawText(prev, 52, y+34, LW - 90, 20, 'left');
        }

        // Unread bubble (WhatsApp green)
        if (unread > 0) {
            b.fillRect(LW-32, y+36, 24, 18, '#25d366');
            b.fontSize = 12; b.textColor = '#111b21';
            b.drawText(String(unread), LW-32, y+38, 24, 14, 'center');
        }

        // Divider
        b.fillRect(52, y+rowH-1, LW-52, 1, '#1f2c34');
    }
};

// Online friends list
Scene_DC_Messages.prototype._drawOnlineList = function(b, LW, PH) {
    var friends = FR.friends();
    b.fontSize = 14; b.textColor = '#8696a0';
    b.drawText('FRIENDS \u2014 ' + friends.length, 12, 8, LW-24, 22, 'left');
    b.fillRect(0, 30, LW, 1, '#2a3942');

    if (friends.length === 0) {
        b.fontSize = 15; b.textColor = '#3f4248';
        b.drawText('No friends yet.', 0, 60, LW, 24, 'center');
        b.fontSize = 13; b.textColor = '#2a3942';
        b.drawText('Use Add Friend tab to add someone.', 0, 90, LW, 22, 'center');
        return;
    }

    var rowH = 54;
    for (var i = 0; i < friends.length; i++) {
        var f    = friends[i];
        var sel  = (i === this._onlineIndex) && (this._phase === 'list');
        var y    = 36 + i * rowH;

        b.fillRect(0, y, LW, rowH, sel ? '#2a3942' : '#111b21');
        if (sel) b.fillRect(0, y, 3, rowH, '#00aaff');

        // Avatar
        b.fillRect(10, y+10, 34, 34, '#2a3942');
        b.fontSize = 18; b.textColor = '#ffffff';
        b.drawText((f.name[0]||'?').toUpperCase(), 10, y+12, 34, 30, 'center');

        // Status dot
        b.fillRect(36, y+34, 10, 10, FR.statusColor(f.status));

        // Name + username
        b.fontSize = 16; b.textColor = sel ? '#ffffff' : '#e9edef';
        b.drawText(f.name, 52, y+6, LW-100, 22, 'left');
        b.fontSize = 13; b.textColor = '#8696a0';
        b.drawText('@' + f.username, 52, y+28, LW-100, 18, 'left');

        // Status
        b.fontSize = 13; b.textColor = FR.statusColor(f.status);
        b.drawText(f.status, LW-60, y+18, 56, 18, 'right');

        b.fillRect(52, y+rowH-1, LW-52, 1, '#1f2c34');
    }
};

// Pending requests
Scene_DC_Messages.prototype._drawPendingList = function(b, LW, PH) {
    var pending = FR.pending();
    var incoming = [], outgoing = [];
    for (var i = 0; i < pending.length; i++) {
        if (pending[i].direction === 'in') incoming.push(pending[i]);
        else outgoing.push(pending[i]);
    }

    b.fontSize = 14; b.textColor = '#8696a0';
    b.drawText('PENDING REQUESTS', 12, 8, LW-24, 22, 'left');
    b.fillRect(0, 30, LW, 1, '#2a3942');

    var y = 36, rowH = 60;

    if (incoming.length > 0) {
        b.fontSize = 13; b.textColor = '#00aaff';
        b.drawText('INCOMING (' + incoming.length + ')', 12, y, LW-24, 20, 'left');
        y += 24;
        for (var j = 0; j < incoming.length; j++) {
            var p   = incoming[j];
            var sel = (this._pendingIdx === j) && (this._phase === 'list');
            b.fillRect(0, y, LW, rowH, sel ? '#2a3942' : '#111b21');
            if (sel) b.fillRect(0, y, 3, rowH, '#23d160');
            b.fillRect(10, y+14, 34, 34, '#2a3942');
            b.fontSize = 18; b.textColor = '#ffffff';
            b.drawText((p.name[0]||'?').toUpperCase(), 10, y+16, 34, 30, 'center');
            b.fontSize = 16; b.textColor = '#e9edef';
            b.drawText(p.name, 52, y+4, LW-100, 22, 'left');
            b.fontSize = 13; b.textColor = '#8696a0';
            b.drawText('@' + p.username, 52, y+26, LW-100, 18, 'left');
            if (sel) {
                b.fontSize = 13; b.textColor = '#23d160';
                b.drawText('\u25b6 Enter=Accept  Del=Decline', 52, y+42, LW-60, 16, 'left');
            }
            b.fillRect(52, y+rowH-1, LW-52, 1, '#1f2c34');
            y += rowH;
        }
    }

    if (outgoing.length > 0) {
        b.fontSize = 13; b.textColor = '#8696a0';
        b.drawText('OUTGOING (' + outgoing.length + ')', 12, y, LW-24, 20, 'left');
        y += 24;
        for (var k = 0; k < outgoing.length; k++) {
            var q = outgoing[k];
            b.fillRect(0, y, LW, rowH, '#111b21');
            b.fillRect(10, y+14, 34, 34, '#2a3942');
            b.fontSize = 18; b.textColor = '#aaaaaa';
            b.drawText((q.name[0]||'?').toUpperCase(), 10, y+16, 34, 30, 'center');
            b.fontSize = 16; b.textColor = '#8696a0';
            b.drawText(q.name, 52, y+4, LW-100, 22, 'left');
            b.fontSize = 13; b.textColor = '#3f4248';
            b.drawText('Pending...', 52, y+26, LW-100, 18, 'left');
            b.fillRect(52, y+rowH-1, LW-52, 1, '#1f2c34');
            y += rowH;
        }
    }

    if (pending.length === 0) {
        b.fontSize = 15; b.textColor = '#3f4248';
        b.drawText('No pending requests.', 0, 60, LW, 24, 'center');
    }
};

// Add Friend panel
Scene_DC_Messages.prototype._drawAddFriendPanel = function(b, LW, PH) {
    b.fontSize = 20; b.textColor = '#dcddde';
    b.drawText('Add Friend', 12, 16, LW-24, 28, 'left');
    b.fillRect(0, 50, LW, 1, '#3f4248');

    b.fontSize = 14; b.textColor = '#8696a0';
    b.drawText('You can add friends with their username.', 12, 62, LW-24, 22, 'left');
    b.drawText('Friend requests are pending until accepted.', 12, 86, LW-24, 22, 'left');

    b.fontSize = 15; b.textColor = '#5865f2';
    b.drawText('\u25b6 Press Enter or OK to open the input box', 12, 124, LW-24, 24, 'left');
    b.drawText('  then type the username and press Enter', 12, 150, LW-24, 24, 'left');
};

// ── Right panel ─────────────────────────────────────────────────────────────
Scene_DC_Messages.prototype._drawRight = function() {
    this._drawRightHeader();
    this._drawMessages();
    this._drawComposebar();
};

Scene_DC_Messages.prototype._drawRightHeader = function() {
    var b  = this._rHdrBmp;
    var RW = this._RW;
    b.clear();
    b.fillRect(0, 0, RW, 52, '#1c1c1e');
    b.fillRect(0, 50, RW, 2, '#2c2c2e');

    if (!this._activePartner) {
        b.fontSize = 16; b.textColor = '#3a3a3c';
        b.drawText('No conversation selected', 0, 14, RW, 24, 'center');
        return;
    }

    var partner  = this._activePartner;
    var friend   = FR.find(partner);
    var status   = FR.status(partner);
    var dispName = friend ? friend.name : partner;

    // Avatar
    b.fillRect(10, 8, 36, 36, '#2c2c2e');
    b.fontSize = 20; b.textColor = '#ffffff';
    b.drawText((dispName[0]||'?').toUpperCase(), 10, 10, 36, 32, 'center');
    // Status dot
    b.fillRect(38, 34, 10, 10, FR.statusColor(status));

    // Name + status
    b.fontSize = 18; b.textColor = '#ffffff';
    b.drawText(dispName, 56, 6, RW-120, 26, 'left');
    b.fontSize = 13; b.textColor = FR.statusColor(status);
    b.drawText(status + '  (@' + partner + ')', 56, 30, RW-120, 18, 'left');
};

// iMessage-style bubbles
Scene_DC_Messages.prototype._drawMessages = function() {
    var b   = this._msgBmp;
    var RW  = this._RW;
    var H   = this._MSG_AREA_H;
    b.clear();
    b.fillRect(0, 0, RW, H, '#000000');

    if (!this._activePartner) {
        b.fontSize = 16; b.textColor = '#1c1c1e';
        b.drawText('Select a chat to start messaging', 0, H/2-14, RW, 28, 'center');
        return;
    }

    var thread  = MSG.get(this._activePartner);
    var me      = dcMe();
    var lineH   = 50;
    var maxShow = Math.floor((H - 10) / lineH);
    var start   = Math.max(0, thread.length - maxShow + this._msgScrollOffset);
    if (start < 0) start = 0;

    // Date separator for first message
    var lastDate = '';

    for (var i = start; i < thread.length; i++) {
        var msg    = thread[i];
        var isMe   = (msg.from === me);
        var row    = i - start;
        var y      = 6 + row * lineH;

        // Date separator
        var msgDate = new Date(msg.ts).toDateString();
        if (msgDate !== lastDate) {
            lastDate = msgDate;
            b.fontSize = 12; b.textColor = '#3a3a3c';
            b.drawText(msgDate, 0, y, RW, 16, 'center');
            y += 16;
        }

        var bubbleW  = Math.min(Math.floor(RW * 0.68), 400);
        var bubbleH  = 34;
        var padding  = 10;

        if (isMe) {
            // iMessage blue bubble — right aligned
            var bx = RW - bubbleW - 12;
            // Blue bubble (#0a84ff = iOS blue)
            pill(b, bx, y, bubbleW, bubbleH, '#0a84ff');
            b.fontSize   = 15; b.textColor = '#ffffff';
            b.drawText(msg.text, bx + padding, y + 7, bubbleW - padding*2, 22, 'left');
            // Timestamp (right side, below bubble)
            b.fontSize   = 11; b.textColor = '#3a3a3c';
            b.drawText(tsLong(msg.ts), bx, y + bubbleH + 2, bubbleW, 14, 'right');
        } else {
            // Grey bubble — left aligned
            var bx2 = 12;
            pill(b, bx2, y, bubbleW, bubbleH, '#1c1c1e');
            b.fontSize   = 15; b.textColor = '#ffffff';
            b.drawText(msg.text, bx2 + padding, y + 7, bubbleW - padding*2, 22, 'left');
            b.fontSize   = 11; b.textColor = '#3a3a3c';
            b.drawText(tsLong(msg.ts), bx2, y + bubbleH + 2, bubbleW, 14, 'left');
        }
    }
};

Scene_DC_Messages.prototype._drawComposebar = function() {
    var b  = this._cmpBmp;
    var RW = this._RW;
    b.clear();
    b.fillRect(0, 0, RW, 44, '#1c1c1e');
    b.fillRect(0, 0, RW, 1, '#2c2c2e');

    if (this._activePartner && this._phase !== 'composing') {
        b.fontSize = 14; b.textColor = '#3a3a3c';
        b.fillRect(8, 6, RW-16, 32, '#2c2c2e');
        b.drawText('Press Enter to type a message...', 16, 14, RW-24, 20, 'left');
    } else if (!this._activePartner) {
        b.fontSize = 14; b.textColor = '#2c2c2e';
        b.drawText('Open a chat to send messages', 0, 14, RW, 20, 'center');
    }
};

//─────────────────────────────────────────────────────────────────────────────
// STATUS BAR
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_Messages.prototype._showStatus = function(msg, col) {
    var b = this._statusBmp;
    b.clear();
    b.fillRect(0, 0, Graphics.width, 28, '#111111');
    b.fontSize = 14; b.textColor = col || '#23d160';
    b.drawText(msg, 0, 6, Graphics.width, 18, 'center');
    this._statusTimer = 160;
};

Scene_DC_Messages.prototype._clearStatus = function() {
    this._statusBmp.clear();
};

//─────────────────────────────────────────────────────────────────────────────
// UPDATE
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_Messages.prototype.update = function() {
    Scene_Base.prototype.update.call(this);

    if (this._statusTimer > 0) {
        this._statusTimer--;
        if (this._statusTimer === 0) this._clearStatus();
    }

    // Composing and add_friend phases handled by HTML input callbacks
    if (this._phase === 'composing' || this._phase === 'add_friend') return;

    switch (this._phase) {
        case 'nav':    this._updateNav();    break;
        case 'list':   this._updateList();   break;
        case 'thread': this._updateThread(); break;
    }
};

Scene_DC_Messages.prototype._updateNav = function() {
    if (Input.isTriggered('left')) {
        this._navIndex = (this._navIndex - 1 + this._navTabs.length) % this._navTabs.length;
        SoundManager.playCursor();
        this._drawNav();
    }
    if (Input.isTriggered('right')) {
        this._navIndex = (this._navIndex + 1) % this._navTabs.length;
        SoundManager.playCursor();
        this._drawNav();
    }
    if (Input.isTriggered('ok') || Input.isTriggered('down')) {
        var tab = this._navTabs[this._navIndex];
        if (tab === 'Back') {
            this._goBack();
            return;
        }
        if (tab === 'Add Friend') {
            this._phase = 'list';
            this._startAddFriend();
            return;
        }
        this._phase = 'list';
        SoundManager.playOk();
        this._chatIndex   = 0;
        this._onlineIndex = 0;
        this._pendingIdx  = 0;
        this._drawNav();
        this._drawLeft();
    }
    if (Input.isTriggered('cancel')) {
        this._goBack();
    }
};

Scene_DC_Messages.prototype._updateList = function() {
    var tab = this._navTabs[this._navIndex];

    if (Input.isTriggered('up')) {
        SoundManager.playCursor();
        if (tab === 'Chat')    this._chatIndex   = Math.max(0, this._chatIndex   - 1);
        if (tab === 'Online')  this._onlineIndex = Math.max(0, this._onlineIndex - 1);
        if (tab === 'Pending') this._pendingIdx  = Math.max(0, this._pendingIdx  - 1);
        this._drawLeft();
    }
    if (Input.isTriggered('down')) {
        SoundManager.playCursor();
        var maxC = Math.max(0, MSG.threads().length   - 1);
        var maxO = Math.max(0, FR.friends().length    - 1);
        var maxP = Math.max(0, FR.pending().filter(function(p){return p.direction==='in';}).length - 1);
        if (tab === 'Chat')    this._chatIndex   = Math.min(this._chatIndex   + 1, maxC);
        if (tab === 'Online')  this._onlineIndex = Math.min(this._onlineIndex + 1, maxO);
        if (tab === 'Pending') this._pendingIdx  = Math.min(this._pendingIdx  + 1, maxP);
        this._drawLeft();
    }
    if (Input.isTriggered('ok') || Input.isTriggered('right')) {
        if (tab === 'Chat') {
            var threads = MSG.threads();
            if (threads.length > 0) {
                this._activePartner = threads[this._chatIndex];
                MSG.markRead(this._activePartner);
                this._msgScrollOffset = 0;
                this._phase = 'thread';
                SoundManager.playOk();
                this._drawLeft();
                this._drawRight();
            }
        } else if (tab === 'Online') {
            var friends = FR.friends();
            if (friends.length > 0) {
                this._activePartner = friends[this._onlineIndex].username;
                MSG.markRead(this._activePartner);
                this._msgScrollOffset = 0;
                this._navIndex = 0; // switch to Chat tab
                this._phase = 'thread';
                SoundManager.playOk();
                this._drawNav();
                this._drawLeft();
                this._drawRight();
            }
        } else if (tab === 'Pending') {
            // Accept incoming request
            var inc = FR.pending().filter(function(p){return p.direction==='in';});
            if (inc.length > 0) {
                FR.accept(inc[this._pendingIdx].username);
                this._showStatus('\u2713 Friend request accepted!', '#23d160');
                this._drawLeft();
            }
        }
    }
    // Delete / decline
    if (Input.isTriggered('shift')) {
        if (tab === 'Chat') {
            var t2 = MSG.threads();
            if (t2.length > 0) {
                MSG.deleteThread(t2[this._chatIndex]);
                this._chatIndex = 0;
                this._activePartner = null;
                SoundManager.playOk();
                this._drawLeft(); this._drawRight();
            }
        } else if (tab === 'Pending') {
            var inc2 = FR.pending().filter(function(p){return p.direction==='in';});
            if (inc2.length > 0) {
                FR.removePending(inc2[this._pendingIdx].username);
                this._pendingIdx = 0;
                SoundManager.playOk();
                this._drawLeft();
            }
        } else if (tab === 'Online') {
            var fr2 = FR.friends();
            if (fr2.length > 0) {
                FR.removeFriend(fr2[this._onlineIndex].username);
                this._onlineIndex = 0;
                SoundManager.playOk();
                this._drawLeft();
            }
        }
    }
    if (Input.isTriggered('cancel') || Input.isTriggered('left')) {
        this._phase = 'nav';
        SoundManager.playCancel();
        this._drawNav();
        this._drawLeft();
    }
};

Scene_DC_Messages.prototype._updateThread = function() {
    if (Input.isTriggered('ok')) {
        this._startCompose();
    }
    if (Input.isTriggered('up')) {
        this._msgScrollOffset = Math.max(this._msgScrollOffset - 1, -MSG.get(this._activePartner).length + 1);
        this._drawMessages();
    }
    if (Input.isTriggered('down')) {
        this._msgScrollOffset = Math.min(this._msgScrollOffset + 1, 0);
        this._drawMessages();
    }
    if (Input.isTriggered('cancel') || Input.isTriggered('left')) {
        this._phase = 'list';
        SoundManager.playCancel();
        this._drawNav();
        this._drawLeft();
        this._drawRight();
    }
};

//─────────────────────────────────────────────────────────────────────────────
// COMPOSE
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_Messages.prototype._startCompose = function() {
    if (!this._activePartner) return;
    this._phase = 'composing';

    var cr   = Graphics._canvas ? Graphics._canvas.getBoundingClientRect() : {left:0,top:0};
    var iy   = cr.top  + this._TOP + this._PH - 44;
    var ix   = cr.left + this._RX + 8;
    var iw   = this._RW - 16;
    var self = this;

    this._composeEl = makeInputEl('iMessage...', ix, iy, iw,
        function(val) {
            var text = val.trim();
            if (text.length > 0) {
                MSG.send(self._activePartner, text);
                SoundManager.playOk();
            }
            removeEl(self._composeEl);
            self._composeEl = null;
            self._phase = 'thread';
            self._msgScrollOffset = 0;
            self._drawMessages();
            self._drawComposebar();
        },
        function() {
            removeEl(self._composeEl);
            self._composeEl = null;
            self._phase = 'thread';
            self._drawComposebar();
        }
    );
};

//─────────────────────────────────────────────────────────────────────────────
// ADD FRIEND
//─────────────────────────────────────────────────────────────────────────────
Scene_DC_Messages.prototype._startAddFriend = function() {
    this._phase = 'add_friend';
    var cr   = Graphics._canvas ? Graphics._canvas.getBoundingClientRect() : {left:0,top:0};
    var iy   = cr.top  + this._TOP + 180;
    var ix   = cr.left + 8;
    var iw   = this._LW - 16;
    var self = this;

    this._addFriendEl = makeInputEl('Enter username...', ix, iy, iw,
        function(val) {
            var username = val.trim();
            removeEl(self._addFriendEl);
            self._addFriendEl = null;

            if (username.length > 0) {
                var result = FR.sendRequest(username, username);
                if (result === 'ok') {
                    self._showStatus('\u2713 Friend request sent to @' + username, '#23d160');
                } else if (result === 'already_friend') {
                    self._showStatus('\u26a0 Already friends with @' + username, '#ffaa00');
                } else if (result === 'pending') {
                    self._showStatus('\u26a0 Request already pending for @' + username, '#ffaa00');
                } else if (result === 'self') {
                    self._showStatus('\u26a0 You cannot add yourself.', '#ed4245');
                }
            }

            self._phase = 'nav';
            self._drawLeft();
        },
        function() {
            removeEl(self._addFriendEl);
            self._addFriendEl = null;
            self._phase = 'nav';
            self._drawLeft();
        }
    );
};

Scene_DC_Messages.prototype._goBack = function() {
    removeEl(this._composeEl);
    removeEl(this._addFriendEl);
    SoundManager.playCancel();
    if (typeof Scene_DC_OnlineMenu !== 'undefined') {
        SceneManager.goto(Scene_DC_OnlineMenu);
    } else {
        SceneManager.pop();
    }
};

Scene_DC_Messages.prototype.terminate = function() {
    Scene_Base.prototype.terminate.call(this);
    removeEl(this._composeEl);
    removeEl(this._addFriendEl);
};

})();
