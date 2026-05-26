// ==========================================
// 1. Renderのタイムアウトエラーを回避するためのダミーサーバー
// ==========================================
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running!\n');
}).listen(process.env.PORT || 10000);

// ==========================================
// 2. ここからDiscord Botのプログラム（Slack ＆ Discord 併用型）
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

const keywords = ["先生", "始めます", "聞きたい"];

// ★【送信機能】Slack と Discordチャンネル の両方に送る関数
async function sendDoubleNotification(text) {
  // ① Slackへ送信
  try {
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await axios.post(slackUrl, { text: text });
    }
  } catch (error) {
    console.error("Slack送信エラー:", error.message);
  }

  // ② Discordの特定のチャンネルへ送信
  try {
    const channelId = process.env.CHANNEL_ID;
    if (channelId) {
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send(text);
      }
    }
  } catch (error) {
    console.error("Discordチャンネル送信エラー:", error.message);
  }
}

client.once("ready", () => {
  console.log("Bot 起動");
});

// VC入室検知
client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!oldState.channel && newState.channel) {
    const user = newState.member.user.username;
    const channel = newState.channel.name;

    // 両方に通知
    await sendDoubleNotification(`🎧 ${user} が「${channel}」に入室`);
  }
});

// コメント監視
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content;

  if (keywords.some(word => content.includes(word))) {
    // 両方に通知
    await sendDoubleNotification(`💬 ${message.author.username}\n${content}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
