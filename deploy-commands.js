import { REST, Routes } from "discord.js";

process.env.DISCORD_TOKEN
const CLIENT_ID = "1502361030662029392";
const GUILD_ID = "1500191996743123036";

const commands = [
  {
    name: "tempemail",
    description: "Generate a temporary email",
  },
  {
    name: "ping",
    description: "Replies with Pong!",
  },
  {
    name: "mailcreate",
    description: "Create a temporary email (expires in 30 minutes)",
  },
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🚀 Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Commands registered successfully!");
  } catch (error) {
    console.error(error);
  }
})();