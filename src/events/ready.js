const { Permissions } = require('discord.js');
const { setPerms } = require('../helpers/setCommandPerm');
module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity('Now with slashes! /help');

		const adminCommands = ['config', 'resetdb'];
		const manageEmojisCommands = ['renameemoji', 'uploademoji', 'copysteal'];

		// Try and set role permissions to admin commands.
		client.guilds.cache.each(async guild => {
			// Add admin commands role perm
			guild.roles.cache.filter(role => role.permissions.has(Permissions.FLAGS.ADMINISTRATOR) && !role.managed).each(adminRole => {
				setPerms(adminRole, adminCommands, true);
			});
			// Add manage emojis commands role perm
			guild.roles.cache.filter(role => role.permissions.has(Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS) && !role.managed).each(manageEmojisRole => {
				setPerms(manageEmojisRole, manageEmojisCommands, true);
			});
		});
	},
};
