/*:
 * @plugindesc Basic Co-op Multiplayer + Chat for RPG Maker MV (Map-Gated)
 * @author You
 *
 * @param ServerURL
 * @text Server URL
 * @desc The URL of your Node.js multiplayer server.
 * @default http://localhost:3000
 */

(function() {
  const params = PluginManager.parameters('MultiplayerChat');
  const SERVER_URL = params['ServerURL'] || 'http://localhost:3000';

  // Load Socket.io client from server
  const script = document.createElement('script');
  script.src = SERVER_URL + '/socket.io/socket.io.js';
  document.head.appendChild(script);

  script.onload = function() {
    const socket = io(SERVER_URL);
    window.$socket = socket;
    window.$otherPlayers = {};
    window.$chatLog = [];

    // -------------------------
    // CONNECTION & JOIN
    // -------------------------

    socket.on('connect', () => {
      socket.emit('playerJoin', {
        name: $gameParty.leader()?.name() || 'Player',
        x: $gamePlayer.x,
        y: $gamePlayer.y,
        mapId: $gameMap.mapId()
      });
    });

    // Receive players already on this map (array)
    socket.on('currentPlayers', (playersArray) => {
      window.$otherPlayers = {};
      playersArray.forEach(p => {
        window.$otherPlayers[p.id] = p;
      });
    });

    // Someone joined this map
    socket.on('playerJoined', (player) => {
      window.$otherPlayers[player.id] = player;
      addChatMessage('System', player.name + ' arrived on this map!');
    });

    // -------------------------
    // MOVEMENT
    // -------------------------

    socket.on('playerMoved', (data) => {
      if (window.$otherPlayers[data.id]) {
        window.$otherPlayers[data.id].x = data.x;
        window.$otherPlayers[data.id].y = data.y;
        window.$otherPlayers[data.id].mapId = data.mapId;
      }
    });

    // -------------------------
    // DISCONNECT
    // -------------------------

    socket.on('playerLeft', (id) => {
      const name = window.$otherPlayers[id]?.name || 'Someone';
      delete window.$otherPlayers[id];
      addChatMessage('System', name + ' left this map.');
    });

    // -------------------------
    // CHAT
    // -------------------------

    socket.on('chatMessage', (data) => {
      addChatMessage(data.name, data.message);
    });

    function addChatMessage(name, message) {
      window.$chatLog.push({ name, message });
      if (window.$chatLog.length > 50) window.$chatLog.shift();
      renderChatUI();
    }

    // -------------------------
    // CHAT UI
    // -------------------------

    const chatBox = document.createElement('div');
    chatBox.id = 'chatBox';
    chatBox.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 10px;
      width: 320px;
      max-height: 150px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 13px;
      padding: 6px;
      border-radius: 6px;
      font-family: sans-serif;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(chatBox);

    const chatInput = document.createElement('input');
    chatInput.id = 'chatInput';
    chatInput.type = 'text';
    chatInput.maxLength = 100;
    chatInput.placeholder = 'Type a message and press Enter...';
    chatInput.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 10px;
      width: 300px;
      display: none;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      border: 1px solid #888;
      padding: 4px 8px;
      font-size: 13px;
      border-radius: 4px;
      z-index: 9999;
    `;
    document.body.appendChild(chatInput);

    function renderChatUI() {
      chatBox.innerHTML = window.$chatLog.map(m =>
        `<div><b style="color:#aaddff">${escapeHtml(m.name)}:</b> ${escapeHtml(m.message)}</div>`
      ).join('');
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Press T to open chat
    document.addEventListener('keydown', (e) => {
      if (chatInput.style.display !== 'none') return; // Already open
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        chatInput.style.display = 'block';
        chatInput.focus();
      }
    });

    // Enter to send, Escape to cancel
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const msg = chatInput.value.trim();
        if (msg) {
          socket.emit('chatMessage', { message: msg });
        }
        chatInput.value = '';
        chatInput.style.display = 'none';
      }
      if (e.key === 'Escape') {
        chatInput.value = '';
        chatInput.style.display = 'none';
      }
    });

    // -------------------------
    // MOVEMENT SYNC (200ms)
    // -------------------------

    setInterval(() => {
      if (typeof $gamePlayer !== 'undefined' && typeof $gameMap !== 'undefined') {
        socket.emit('playerMove', {
          x: $gamePlayer.x,
          y: $gamePlayer.y,
          mapId: $gameMap.mapId()
        });
      }
    }, 200);

  }; // end script.onload
})();
