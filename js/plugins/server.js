const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('playerJoin', (data) => {
    const roomId = `map_${data.mapId}`;

    players[socket.id] = {
      id: socket.id,
      name: data.name,
      x: data.x,
      y: data.y,
      mapId: data.mapId
    };

    socket.join(roomId);

    // Send only players on THIS map to the newcomer
    const playersOnMap = Object.values(players).filter(
      p => p.mapId === data.mapId && p.id !== socket.id
    );
    socket.emit('currentPlayers', playersOnMap);

    // Tell others on this map someone arrived
    socket.to(roomId).emit('playerJoined', players[socket.id]);
  });

  socket.on('playerMove', (data) => {
    const player = players[socket.id];
    if (!player) return;

    const oldMapId = player.mapId;
    const newMapId = data.mapId;

    // Player changed maps
    if (oldMapId !== newMapId) {
      const oldRoom = `map_${oldMapId}`;
      const newRoom = `map_${newMapId}`;

      // Tell old map this player left
      socket.to(oldRoom).emit('playerLeft', socket.id);

      // Leave old room, join new room
      socket.leave(oldRoom);
      socket.join(newRoom);

      // Update stored map
      player.mapId = newMapId;

      // Tell new map this player arrived
      const playersOnNewMap = Object.values(players).filter(
        p => p.mapId === newMapId && p.id !== socket.id
      );
      socket.emit('currentPlayers', playersOnNewMap);
      socket.to(newRoom).emit('playerJoined', player);
    }

    // Update position and broadcast to current map only
    player.x = data.x;
    player.y = data.y;
    socket.to(`map_${newMapId}`).emit('playerMoved', {
      id: socket.id,
      x: data.x,
      y: data.y,
      mapId: newMapId
    });
  });

  socket.on('chatMessage', (data) => {
    const player = players[socket.id];
    if (!player) return;

    // Chat is map-gated — only players on the same map see it
    io.to(`map_${player.mapId}`).emit('chatMessage', {
      id: socket.id,
      name: player.name,
      message: data.message
    });
  });

  socket.on('disconnect', () => {
    const player = players[socket.id];
    if (player) {
      socket.to(`map_${player.mapId}`).emit('playerLeft', socket.id);
      delete players[socket.id];
    }
    console.log('Player disconnected:', socket.id);
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
