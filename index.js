require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");
const axios = require("axios");

// =========================
// BOT CONFIG
// =========================
const botConfig = {
  presence: {
    status: "online",
    activities: [
      {
        name: "Releasing Website soon!",
        type: 0,
      },
    ],
  },
};

// =========================
// DISCORD CLIENT
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// =========================
// STORAGE
// =========================
const userEmails = new Map();
const inboxWatchers = new Map();

// =========================
// MESSAGE HANDLER
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // CREATE EMAIL
  if (message.content === ".create1") {
    try {
      await message.reply("📩 Check your DMs!");

      const domainRes = await axios.get("https://api.mail.tm/domains");
      const domain = domainRes.data["hydra:member"][0].domain;

      const username = Math.random().toString(36).substring(2, 10);
      const password = Math.random().toString(36).substring(2, 12);
      const address = `${username}@${domain}`;

      await axios.post("https://api.mail.tm/accounts", {
        address,
        password,
      });

      const tokenRes = await axios.post("https://api.mail.tm/token", {
        address,
        password,
      });

      const token = tokenRes.data.token;

      userEmails.set(message.author.id, {
        address,
        password,
        token,
        seen: new Set(),
      });

      await message.author.send(
        `📧 **Temp Email Created**\n\nEmail: ${address}\nPassword: ${password}\n\nUse:\n.autoinbox\n.stopinbox`
      );
    } catch (err) {
      console.error(err);
      message.reply("❌ Error creating email.");
    }
  }

  // AUTO INBOX
  if (message.content === ".autoinbox") {
    const data = userEmails.get(message.author.id);

    if (!data) {
      return message.reply("❌ Create an email first using `.create1`.");
    }

    if (inboxWatchers.has(message.author.id)) {
      return message.reply("⚠️ Already running.");
    }

    message.reply("📡 Auto inbox started!");

    const interval = setInterval(async () => {
      try {
        const res = await axios.get("https://api.mail.tm/messages", {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });

        const messages = res.data["hydra:member"];

        for (const msg of messages) {
          if (!data.seen.has(msg.id)) {
            data.seen.add(msg.id);

            const full = await axios.get(
              `https://api.mail.tm/messages/${msg.id}`,
              {
                headers: {
                  Authorization: `Bearer ${data.token}`,
                },
              }
            );

            const content = full.data;

            await message.author.send(
              `📨 **New Email!**\n\nFrom: ${content.from.address}\nSubject: ${content.subject}\n\n${content.text || "No text"}`
            );
          }
        }
      } catch (err) {
        console.error("Inbox error:", err.message);
      }
    }, 7000);

    inboxWatchers.set(message.author.id, interval);
  }

  // STOP INBOX
  if (message.content === ".stopinbox") {
    const watcher = inboxWatchers.get(message.author.id);

    if (!watcher) {
      return message.reply("❌ Not running.");
    }

    clearInterval(watcher);
    inboxWatchers.delete(message.author.id);

    message.reply("🛑 Stopped.");
  }
});

// =========================
// READY EVENT
// =========================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: botConfig.presence.status,
    activities: botConfig.presence.activities,
  });
});

// =========================
// LOGIN
// =========================
client.login(process.env.DISCORD_TOKEN);