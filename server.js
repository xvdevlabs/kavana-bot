require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const connectToDB = require("./database/db");
const Admin = require("./models/Admin");
const Message = require("./models/Message");


const token = process.env.TOKEN;
const bot = new TelegramBot(process.env.TOKEN, {
    polling: true
});

connectToDB();

const BATCH_SIZE = 10;

let currentAdminIndex = 0;

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    const isAdmin = await Admin.findOne({ chatId });

    if (isAdmin) {

        const TelegramBot = require("node-telegram-bot-api");

        const token = "YOUR_BOT_TOKEN";
        const bot = new TelegramBot(token, { polling: true });

        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            bot.sendMessage(chatId, "👋 Welcome to *Kavana Support Bot*!\n\nHow can we help you today?", {
                parse_mode: "Markdown"
            });
        });

        bot.on("message", (msg) => {
            const chatId = msg.chat.id;

            if (msg.text.startsWith("/start")) return;

            bot.sendMessage(chatId, "✅ Thank you for your message.\nOur team will contact you as soon as possible.");
        });

        if (msg.text.startsWith("/addadmin")) {
            const parts = msg.text.split(" ");
            if (parts.length < 2) {
                return bot.sendMessage(chatId, "Usage: /addadmin <chatId>");
            }
            const newAdminId = Number(parts[1]);
            await Admin.create({ chatId: newAdminId });
            return bot.sendMessage(chatId, `✅ Admin ${newAdminId} added`);
        }

        if (msg.text.startsWith("/reply")) {
            const parts = msg.text.split(" ");
            const userId = Number(parts[1]);
            const replyMsg = parts.slice(2).join(" ");
            bot.sendMessage(userId, `💬 Support: ${replyMsg}`);
            return bot.sendMessage(chatId, "✅ Reply sent!");
        }

        return;
    }


    await Message.create({
        userId: chatId,
        username: msg.from.username || msg.from.first_name,
        text: msg.text
    });

    const totalMessages = await Message.countDocuments();

    if (totalMessages >= BATCH_SIZE) {
        const batch = await Message.find().sort({ createdAt: 1 }).limit(BATCH_SIZE);
        const allAdmins = await Admin.find();

        if (allAdmins.length === 0) return;

        const targetAdmin = allAdmins[currentAdminIndex];
        let batchText = batch
            .map((m, i) => `${i + 1}. [${m.username}] ${m.text} (id:${m.userId})`)
            .join("\n");

        await bot.sendMessage(targetAdmin.chatId, `📩 New Support Batch:\n\n${batchText}`);

        const ids = batch.map((m) => m._id);
        await Message.deleteMany({ _id: { $in: ids } });

        currentAdminIndex = (currentAdminIndex + 1) % allAdmins.length;
    }
});


