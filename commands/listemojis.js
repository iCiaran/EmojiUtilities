const {SlashCommandBuilder} = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listemojis')
        .setDescription('Displays all usable emotes to chat.'),
    async execute(interaction) {

        const emojisList = [...interaction.guild.emojis.cache.map(emoji => emoji.toString()).values()]
        let chunkSize = 27;
        let chunks = []
        for (let i = 0, j = emojisList.length; i < j; i += chunkSize) {
            let chunk = emojisList.slice(i, i + chunkSize).join(' ');
            chunks.push(chunk)
        }

        return interaction.reply(chunks[0]).then(() => {
            chunks.shift()
            try {
                for (const chunk of chunks) {
                    interaction.channel.send(chunk)
                }
                interaction.channel.send(`This server has a total of ${emojisList.length} emojis.`)
            } catch (err) {
                console.log(err)
            }
        })
    },
};
