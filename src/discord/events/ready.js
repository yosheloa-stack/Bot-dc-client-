'use strict';

const { ActivityType, Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[discord] Conectado como ${client.user.tag}`);
    client.user.setPresence({
      status: 'online',
      activities: [{ name: 'saldos serem ceifados 🗡️', type: ActivityType.Watching }],
    });
  },
};
