require('dotenv').config();
import { Client, GatewayIntentBits, Partials } from "discord.js";
import axios from "axios";

// =========================
// YOUR CONFIG
// =========================
export const botConfig = {
    presence: {
        status: "Do Not Disturb",
        activities: [
            {
                name: "Bot Website Realeasing Soon",
                type: 0,
            },
        ],
    },
};

// =========================
// DISCORD CLIENT
// =========================
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel],
});

// Store user emails
const userEmails = new Map();

// =========================
// CREATE TEMP EMAIL
// =========================
async function createTempEmail() {
    const domainRes = await axios.get("https://api.mail.tm/domains");
    const domain = domainRes.data["hydra:member"][0].domain;

    const email = `user${Math.floor(Math.random() * 100000)}@${domain}`;
    const password = "password123";

    await axios.post("https://api.mail.tm/accounts", {
        address: email,
        password: password,
    });

    const tokenRes = await axios.post("https://api.mail.tm/token", {
        address: email,
        password: password,
    });

    return {
        email,
        token: tokenRes.data.token,
    };
}

// =========================
// CHECK INBOX
// =========================
async function checkInbox(userId) {
    const data = userEmails.get(userId);
    if (!data) return;

    try {
        const res = await axios.get("https://api.mail.tm/messages", {
            headers: {
                Authorization: `Bearer ${data.token}`,
            },
        });

        const messages = res.data["hydra:member"];

        for (const msg of messages) {
            if (!data.seen.includes(msg.id)) {
                data.seen.push(msg.id);

                const msgDetail = await axios.get(
                    `https://api.mail.tm/messages/${msg.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${data.token}`,
                        },
                    }
                );

                const user = await client.users.fetch(userId);

                await user.send(
                    `📩 **New Email Received**\n\n` +
                    `**From:** ${msg.from.address}\n` +
                    `**Subject:** ${msg.subject}\n\n` +
                    `${msgDetail.data.text || "No content"}`
                );
            }
        }
    } catch (err) {
        console.error("Inbox error:", err.message);
    }
}

// =========================
// BOT READY
// =========================
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence(botConfig.presence);

    setInterval(() => {
        for (const userId of userEmails.keys()) {
            checkInbox(userId);
        }
    }, 10000);
});

// =========================
// SLASH COMMAND HANDLER
// =========================
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // TEMP EMAIL
    if (interaction.commandName === "tempemail") {
        await interaction.reply({
            content: "📨 Check your DMs for your temporary email!",
            ephemeral: true,
        });

        try {
            const data = await createTempEmail();

            userEmails.set(interaction.user.id, {
                ...data,
                seen: [],
            });

            await interaction.user.send(
                `📧 **Your Temporary Email:**\n\n${data.email}\n\n` +
                `Use it anywhere. I'll notify you here when emails arrive.`
            );
        } catch (err) {
            console.error(err);
            await interaction.user.send("❌ Failed to create temp email.");
        }
    }

    // PING
    if (interaction.commandName === "ping") {
        console.log("Ping command triggered");

        try {
            await interaction.reply("🏓 Pong!");
        } catch (err) {
            console.error("Ping error:", err);
        }
    }
});

// =========================
// LOGIN (MUST BE OUTSIDE EVERYTHING)
// =========================
process.env.DISCORD_TOKEN