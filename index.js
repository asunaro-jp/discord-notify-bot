// ==========================================
// 1. Renderのタイムアウトエラーを回避するためのダミーサーバー（最優先起動）
// ==========================================
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running!\n');
}).listen(process.env.PORT || 10000);

// ==========================================
// 2. ここから元のDiscord Botのプログラム
// ==========================================
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const keywords = [
  "先生",
  "始めます",
  "聞きたい"
];

async function sendSlack(text) {
  await axios.post(
    process.env.SLACK_WEBHOOK_URL,
    { text }
  );
}

client.once("ready", () => {
  console.log("Bot 起動");
});

// VC入室
client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!oldState.channel && newState.channel) {
    const user = newState.member.user.username;
    const channel = newState.channel.name;

    await sendSlack(
      `🎧 ${user} が「${channel}」に入室`
    );
  }
});

// コメント監視
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content;

  if (
    keywords.some(word =>
      content.includes(word)
    )
  ) {
    await sendSlack(
      `💬 ${message.author.username}\n${content}`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
