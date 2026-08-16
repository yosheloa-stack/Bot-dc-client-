'use strict';

const { PermissionFlagsBits } = require('discord.js');

function isAdmin(interaction, config) {
  if (!interaction.inGuild()) return false;
  const member = interaction.member;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (config.discord.adminRoleId && member.roles?.cache?.has(config.discord.adminRoleId)) return true;
  return false;
}

module.exports = { isAdmin };
