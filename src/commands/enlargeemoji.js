const { SlashCommandBuilder } = require('@discordjs/builders');
const { sendErrorFeedback, verifyEmojiString } = require('../helpers/utilities');

const getEmojiUrl = (emoji) => {
	if (emoji[1]) {
		return `https://cdn.discordapp.com/emojis/${emoji[3]}.gif`;
	}
	else {
		return `https://cdn.discordapp.com/emojis/${emoji[3]}.png`;
	}
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('enlargeemoji')
		.setDescription('Pastes a custom emoji\'s url to chat.')
		.addStringOption(option =>
			option.setName('emoji')
				.setDescription('The emoji to display.')
				.setRequired(true),
		),
	async execute(interaction) {
		const stringEmoji = interaction.options.getString('emoji');
		const verifiedEmoji = verifyEmojiString(stringEmoji);

		try {
			const url = getEmojiUrl(verifiedEmoji);

			return interaction.reply({ content: `${url}` });
		}
		catch (error) {
			switch (error.message) {
			case 'Cannot read properties of null (reading \'1\')':
				await interaction.reply({ embeds: [sendErrorFeedback(interaction.commandName, 'No emoji found in `emoji`.')] });
				break;
			default:
				console.error(error);
				return await interaction.reply({ embeds: [sendErrorFeedback(interaction.commandName)] });
			}
		}

	},
};
