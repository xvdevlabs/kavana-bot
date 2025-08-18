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
  try {
    await Admin.create({ chatId: newAdminId });
    ctx.reply(`✅ Admin ${newAdminId} added`);
  } catch (error) {
    console.error("Error adding admin:", error);
    ctx.reply("❌ Error adding admin");
  }
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

  try {
    await ctx.telegram.sendMessage(userId, `💬 Support: ${replyMsg}`);
    ctx.reply("✅ Reply sent!");
  } catch (error) {
    console.error("Error sending reply:", error);
    ctx.reply("❌ Error sending reply");
  }
});

bot.on("text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  if (text.startsWith("/")) return;

  try {
    const isAdmin = await Admin.findOne({ chatId });
    if (isAdmin) return ctx.reply("⚠️ You are an admin. Use /reply <userId> <message> to respond to users.");

    const message = await Message.create({
      userId: chatId,
      username: ctx.from.username || ctx.from.first_name,
      text,
    });

    ctx.reply("✅ Thank you for your message.\nOur team will contact you soon.");

    const allAdmins = await Admin.find();
    if (allAdmins.length === 0) {
      console.log("No admins found to forward message to");
      return;
    }

    const targetAdmin = allAdmins[currentAdminIndex];
    
    await ctx.telegram.sendMessage(
      targetAdmin.chatId,
      `📩 New Message from [${message.username}]:\n${message.text}\n\nUser ID: ${message.userId}\n\nUse: /reply ${message.userId} <your message>`
    );

    console.log(`Message forwarded to admin ${targetAdmin.chatId}`);

    currentAdminIndex = (currentAdminIndex + 1) % allAdmins.length;

  } catch (error) {
    console.error("Error processing message:", error);
    ctx.reply("❌ Sorry, there was an error processing your message. Please try again.");
  }
});

bot.launch();
console.log("🤖 Bot started...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
