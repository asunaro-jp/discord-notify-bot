// ==========================================
// 1. Renderスリープ対策用 ダミーHTTPサーバー
// ==========================================
const http = require("http");

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
  })
  .listen(process.env.PORT || 10000, () => {
    console.log("HTTP Server 起動");
  });

// ==========================================
// 2. Discord Bot本体
// ==========================================
const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const axios = require("axios");

// ==========================================
// Discord Client
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ==========================================
// キーワード監視
// ==========================================
const keywords = [
  "先生",
  "始めます",
  "聞きたい"
];

// ==========================================
// Slack + Discord 通知関数
// ==========================================
async function sendDoubleNotification(text) {

  // --------------------------
  // ① Slack通知
  // --------------------------
  try {
    const slackUrl = process.env.SLACK_WEBHOOK_URL;

    if (slackUrl) {
      await axios.post(slackUrl, {
        text: text
      });

      console.log("Slack通知成功");
    }

  } catch (error) {
    console.error("Slack送信エラー:", error.message);
  }

  // --------------------------
  // ② Discord通知
  // --------------------------
  try {
    const channelId = process.env.CHANNEL_ID;

    if (channelId) {
      const channel = await client.channels.fetch(channelId);

      if (channel) {
        await channel.send(text);

        console.log("Discord通知成功");
      }
    }

  } catch (error) {
    console.error("Discord送信エラー:", error.message);
  }
}

// ==========================================
// 起動完了
// ==========================================
client.once("clientReady", () => {
  console.log(`Bot 起動: ${client.user.tag}`);
});

// ==========================================
// 接続ログ
// ==========================================
client.on("disconnect", () => {
  console.log("Discord切断");
});

client.on("reconnecting", () => {
  console.log("Discord再接続中");
});

client.on("error", error => {
  console.error("Discordエラー:", error);
});

// ==========================================
// VC入室検知
// ==========================================
client.on("voiceStateUpdate", async (oldState, newState) => {

  // 入室時のみ
  if (!oldState.channel && newState.channel) {

    const user = newState.member.user.username;
    const channel = newState.channel.name;

    console.log(`${user} が ${channel} に入室`);

    await sendDoubleNotification(
      `🎧 ${user} が「${channel}」に入室`
    );
  }
});

// ==========================================
// メッセージ監視
// ==========================================
client.on("messageCreate", async (message) => {

  // Bot自身は除外
  if (message.author.bot) return;

  const content = message.content;

  // キーワード判定
  if (keywords.some(word => content.includes(word))) {

    console.log(`キーワード検知: ${message.author.username}`);

    await sendDoubleNotification(
      `💬 ${message.author.username}\n${content}`
    );
  }
});

// ==========================================
// ログイン
// ==========================================
client.login(process.env.DISCORD_TOKEN);
