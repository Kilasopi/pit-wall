const { Client, GatewayIntentBits } = require('discord.js');

function createDiscordNotifier(token, channelId) {
    if (!token) return { notifyDriver: async() => {}, notifyChannel: async () => {} };

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    const ready = client.login(token).then(() => new Promise((resolve) => client.once('ready', resolve)));

    return {
        async notifyDriver(discordUserId, message) {
            if (!discordUserId) return;
            try {
                await ready;
                const user = await client.users.fetch(discordUserId);
                await user.send(message);
            } catch (err) {
                console.error(`Failed to DM Discord user ${discordUserId}: `, err.message);
            }
        },
        async notifyChannel(message, discordUserId) {
            if (!channelId) return;

            try {
                await ready;
                const channel = await client.channels.fetch(channelId);
                const mention = discordUserId ? `<@${discordUserId}> ` : '';
                await channel.send(`${mention}${message}`);
            } catch (err) {
                console.error('Failed to post to Discord channel: ', err.message);
            }
        },
    };
}

module.exports = { createDiscordNotifier };