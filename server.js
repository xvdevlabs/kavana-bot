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

// Add these commands to your bot code for better admin management

// Command to list all admins
bot.command("listadmins", async (ctx) => {
  try {
    const admins = await Admin.find();
    if (admins.length === 0) {
      return ctx.reply("No admins found.");
    }
    
    let adminList = "👥 *Current Admins:*\n\n";
    admins.forEach((admin, index) => {
      adminList += `${index + 1}. Chat ID: \`${admin.chatId}\`\n`;
    });
    
    ctx.reply(adminList, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error listing admins:", error);
    ctx.reply("❌ Error listing admins");
  }
});

// Command to remove a specific admin
bot.command("removeadmin", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  if (parts.length < 2) return ctx.reply("Usage: /removeadmin <chatId>");

  const adminToRemove = Number(parts[1]);
  
  try {
    const result = await Admin.deleteOne({ chatId: adminToRemove });
    
    if (result.deletedCount > 0) {
      ctx.reply(`✅ Admin ${adminToRemove} removed successfully`);
      // Reset admin index to prevent out-of-bounds errors
      currentAdminIndex = 0;
    } else {
      ctx.reply(`❌ Admin ${adminToRemove} not found`);
    }
  } catch (error) {
    console.error("Error removing admin:", error);
    ctx.reply("❌ Error removing admin");
  }
});

// Command to clear ALL admins (use with caution!)
bot.command("clearalladmins", async (ctx) => {
  try {
    const result = await Admin.deleteMany({});
    ctx.reply(`✅ Removed ${result.deletedCount} admin(s). All admins cleared.`);
    // Reset admin index
    currentAdminIndex = 0;
  } catch (error) {
    console.error("Error clearing admins:", error);
    ctx.reply("❌ Error clearing admins");
  }
});

bot.command("clearmessages", async (ctx) => {
  try {
    const result = await Message.deleteMany({});
    ctx.reply(`✅ Removed ${result.deletedCount} message(s). All messages cleared.`);
  } catch (error) {
    console.error("Error clearing messages:", error);
    ctx.reply("❌ Error clearing messages");
  }
});

bot.command("adminhelp", async (ctx) => {
  const adminId = ctx.chat.id;
  const isAdmin = await Admin.findOne({ chatId: adminId });
  
  if (!isAdmin) {
    return ctx.reply("⚠️ This command is only available for admins.");
  }

  const helpText = `
🔧 *Admin Commands:*

📝 *Message Management:*
• \`/reply <userId> <message>\` - Reply to a user
• \`/clearmessages\` - Clear all messages (testing)

👥 *Admin Management:*
• \`/addadmin <chatId>\` - Add new admin
• \`/removeadmin <chatId>\` - Remove an admin
• \`/listadmins\` - View all admins
• \`/clearalladmins\` - Remove all admins ⚠️

ℹ️ *Information:*
• \`/adminhelp\` - Show this help menu
• \`/stats\` - View bot statistics

💡 *Tips:*
• When users message the bot, you'll receive notifications
• Use the User ID from notifications to reply
• Messages are distributed among all admins in rotation
  `;

  ctx.reply(helpText, { parse_mode: "Markdown" });
});

// Regular help command for users
bot.command("help", async (ctx) => {
  const adminId = ctx.chat.id;
  const isAdmin = await Admin.findOne({ chatId: adminId });
  
  if (isAdmin) {
    // Redirect admins to admin help
    return ctx.reply("👋 You're an admin! Use /adminhelp to see admin commands.");
  }

  const helpText = `
👋 *Welcome to Kavana Support Bot!*

📩 *How to use:*
• Simply send your message and our team will respond
• No special commands needed - just type your question or concern
• Our support team will contact you as soon as possible

🤝 *Need help?*
Just type your message and we'll be with you shortly!
  `;

  ctx.reply(helpText, { parse_mode: "Markdown" });
});

// Stats command for admins
bot.command("stats", async (ctx) => {
  const adminId = ctx.chat.id;
  const isAdmin = await Admin.findOne({ chatId: adminId });
  
  if (!isAdmin) {
    return ctx.reply("⚠️ This command is only available for admins.");
  }

  try {
    const adminCount = await Admin.countDocuments();
    const messageCount = await Message.countDocuments();
    const uniqueUsers = await Message.distinct("userId");
    
    const statsText = `
📊 *Bot Statistics:*

👥 Admins: ${adminCount}
📨 Total Messages: ${messageCount}
👤 Unique Users: ${uniqueUsers.length}
🔄 Current Admin Index: ${currentAdminIndex + 1}/${adminCount}

*Recent Activity:*
Last 24h messages: ${await Message.countDocuments({
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
})}
    `;

    ctx.reply(statsText, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error getting stats:", error);
    ctx.reply("❌ Error retrieving statistics");
  }
});

bot.on("text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  if (text.startsWith("/")) return;

  try {
    const isAdmin = await Admin.findOne({ chatId });
    if (isAdmin) return ctx.reply("⚠️ You are an admin. Use /reply <userId> <message> to respond to users.");

    const allAdmins = await Admin.find();
    if (allAdmins.length === 0) {
      console.log("No admins found to forward message to");
      return ctx.reply("⚠️ No admins available at the moment. Please try again later.");
    }

    const message = await Message.create({
      userId: chatId,
      username: ctx.from.username || ctx.from.first_name,
      text,
    });

    await ctx.reply("✅ Thank you for your message.\nOur team will contact you soon.");

    if (currentAdminIndex >= allAdmins.length) {
      currentAdminIndex = 0;
    }

    const targetAdmin = allAdmins[currentAdminIndex];
    
    try {
      await ctx.telegram.sendMessage(
        targetAdmin.chatId,
        `📩 New Message from [${message.username}]:\n${message.text}\n\nUser ID: ${message.userId}\n\nUse: /reply ${message.userId} <your message>`
      );
      console.log(`Message forwarded to admin ${targetAdmin.chatId}`);
    } catch (adminError) {
      console.error(`Failed to send message to admin ${targetAdmin.chatId}:`, adminError);
      // Try next admin if current one fails
      currentAdminIndex = (currentAdminIndex + 1) % allAdmins.length;
      if (allAdmins.length > 1) {
        const fallbackAdmin = allAdmins[currentAdminIndex];
        try {
          await ctx.telegram.sendMessage(
            fallbackAdmin.chatId,
            `📩 New Message from [${message.username}]:\n${message.text}\n\nUser ID: ${message.userId}\n\nUse: /reply ${message.userId} <your message>`
          );
          console.log(`Message forwarded to fallback admin ${fallbackAdmin.chatId}`);
        } catch (fallbackError) {
          console.error(`Failed to send message to fallback admin:`, fallbackError);
        }
      }
    }

    currentAdminIndex = (currentAdminIndex + 1) % allAdmins.length;

  } catch (error) {
    console.error("Error processing message:", error);
    
    if (error.name === 'ValidationError') {
      console.error("Database validation error:", error.message);
    } else if (error.code === 'ETELEGRAM') {
      console.error("Telegram API error:", error.message);
    }
    
    await ctx.reply("❌ Sorry, there was an error processing your message. Please try again.");
  }
});

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

bot.launch();
console.log("🤖 Bot started...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
