const { get } = require('axios');
const fs = require('fs');

const url = 'https://project-bard.onrender.com/api/bard';

module.exports = {
  config: {
    name: 'bard',
    aliases: [],
    version: '1.0.0',
    author: 'Kshitiz',
    countDown: 0,
    role: 0,
    shortDescription: {
      en: 'Talk to Bard AI (continues conversation)',
    },
    longDescription: {
      en: 'Talk to Bard AI (continues conversation)',
    },
    category: 'AI',
    guide: {
      en: '{p}bard message / onReply',
    },
  },

  async makeApiRequest(query, uid) {
    try {
      const response = await get(`${url}?query=${encodeURIComponent(query)}&uid=${uid}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendMessage(api, event, body, attachments, onReplyCallback) {
    const messageOptions = {
      body: body,
      attachment: attachments,
    };

    api.sendMessage(messageOptions, event.threadID, (err, info) => {
      if (!err) {
        onReplyCallback(info.messageID);
      } else {
        console.error('Error sending message:', err);
      }
    });
  },

  onStart: async function ({ api, event, args, usersData }) {
    try {
      const senderID = event.senderID;
      const userData = await usersData.get(senderID);
      const senderName = userData.name;
      const mentions = [{ id: senderID, tag: senderName }];
      const query = args.join(' ');

      api.setMessageReaction('🕵️', event.messageID, () => {}, true);

      const uid = event.senderID;
      const response = await this.makeApiRequest(query, uid);

      const respond = response.message;
      const imageUrls = response.imageUrls;

      const attachments = [];

      if (Array.isArray(imageUrls) && imageUrls.length > 0) {
        if (!fs.existsSync('cache')) {
          fs.mkdirSync('cache');
        }

        for (let i = 0; i < imageUrls.length; i++) {
          const url = imageUrls[i];
          const imagePath = `cache/image${i + 1}.png`;

          try {
            const imageResponse = await get(url, { responseType: 'arraybuffer' });
            fs.writeFileSync(imagePath, imageResponse.data);

            attachments.push(fs.createReadStream(imagePath));
          } catch (error) {
            console.error('Error downloading and saving image:', error);
          }
        }
      }

      this.sendMessage(api, event, senderName + ' ' + respond, attachments, (messageID) => {
        global.GoatBot.onReply.set(messageID, {
          commandName: this.config.name,
          messageID,
          author: event.senderID,
          tempFilePath: null,
        });
      });

      api.setMessageReaction('🎭', event.messageID, () => {}, true);
    } catch (error) {
      console.error('Error in onStart:', error.message);
      api.sendMessage(error.message, event.threadID, event.messageID);
    }
  },

  onReply: async function ({ api, event, Reply, args }) {
    const { author, commandName, tempFilePath } = Reply;

    try {
      const prompt = args.join(' ');
      const id = event.senderID;

      if (!prompt) {
        api.sendMessage(
          `Missing input!\n\nIf you want to reset the conversation with ${this.config.name} you can use "${this.config.name} clear"`,
          event.threadID
        );
        return;
      }

      const result = await this.makeApiRequest(prompt, id);
      this.sendMessage(api, event, result.message, [], (messageID) => {
        global.GoatBot.onReply.set(messageID, {
          commandName: 'bard',
          messageID,
          author: event.senderID,
          tempFilePath: null,
        });
      });
    } catch (error) {
      console.error('Error:', error);
      api.sendMessage('An error occurred while processing your request.', event.threadID);
    }
  },
};
