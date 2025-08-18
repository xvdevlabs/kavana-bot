require("dotenv").config();
const { Telegraf } = require("telegraf");
const connectToDB = require("./database/db");
const Admin = require("./models/Admin");
const Message = require("./models/Message");

const bot = new Telegraf(process.env.BOT_TOKEN);


connectToDB();

const BATCH_SIZE = 10;
let currentAdminIndex = 0;

bot.start((ctx) => {
  ctx.reply(
    "👋 Welcome to *Kavana Support Bot*!\n\nHow can we help you today?",
    { parse_mode: "Markdown" }
  );
});

bot.command("addadmin", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  if (parts.length < 2) return ctx.reply("Usage: /addadmin <chatId>");

  const newAdminId = Number(parts[1]);
  await Admin.create({ chatId: newAdminId });
  ctx.reply(`✅ Admin ${newAdminId} added`);
});

bot.command("reply", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  if (parts.length < 3)
    return ctx.reply("Usage: /reply <userId> <message>");

  const adminId = ctx.chat.id;
  const isAdmin = await Admin.findOne({ chatId: adminId });
  if (!isAdmin) return ctx.reply("⚠️ Only admins can reply to users.");

  const userId = Number(parts[1]);
  const replyMsg = parts.slice(2).join(" ");

  await ctx.telegram.sendMessage(userId, `💬 Support: ${replyMsg}`);
  ctx.reply("✅ Reply sent!");
});

bot.on("text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  if (text.startsWith("/")) return;

  const isAdmin = await Admin.findOne({ chatId });
  if (isAdmin) return ctx.reply("⚠️ You are an admin. Use /reply or /addadmin.");

  await Message.create({
    userId: chatId,
    username: ctx.from.username || ctx.from.first_name,
    text,
  });

  ctx.reply("✅ Thank you for your message.\nOur team will contact you soon.");

  const totalMessages = await Message.countDocuments();
  if (totalMessages >= BATCH_SIZE) {
    const batch = await Message.find().sort({ createdAt: 1 }).limit(BATCH_SIZE);
    const allAdmins = await Admin.find();
    if (allAdmins.length === 0) return;

    const targetAdmin = allAdmins[currentAdminIndex];
    const batchText = batch
      .map((m, i) => `${i + 1}. [${m.username}] ${m.text} (id:${m.userId})`)
      .join("\n");

    await ctx.telegram.sendMessage(
      targetAdmin.chatId,
      `📩 New Support Batch:\n\n${batchText}`
    );

    const ids = batch.map((m) => m._id);
    await Message.deleteMany({ _id: { $in: ids } });

    currentAdminIndex = (currentAdminIndex + 1) % allAdmins.length;
  }
});

bot.launch();
console.log("🤖 Bot started...");
