const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sentVideos = [];

module.exports = {
  config: {
    name: "mxm",
    version: "1.0",
    role: 0,
    author: "𝗞𝘀𝗵𝗶𝘁𝗶𝘇",
    shortDescription: "Send a random meme video",
    longDescription: "Send a random meme video",
    category: "𝗙𝗕𝗚𝗥𝗢𝗨𝗣",
    dependencies: {
      axios: "",
    },
  },
  onStart: async function ({ api, event }) {
    try {
      const triggerMessageID = event.messageID;
      const loadingMessage = await api.sendMessage(
        "𝗣𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴 𝘆𝗼𝘂𝗿 𝗿𝗲𝗾𝘂𝗲𝘀𝘁..|| ✅",
        event.threadID
      );

      const groupIds = ["1544123312616479"];
      const accessToken = "EAAD6V7os0gcBO9DIFAgFuzpJ9Kui6ManYepBHe93mrJQig1l3gyRd1E090eoZAUcMojUfsbaxYxH1AiPHZAmwvwvD64zoZAxhzTCaNOv12nmdcz1yQFfsFnti6Mhy1fCyZCQ6poYZC2ZCkdWuZAeZApn58587WLcNy549imTVZBWZB4ScZAi7HfYYJX0tO0sdLj0QZDZD";
      const apiVersion = "v18.0";

      for (const groupId of groupIds) {
        const groupUrl = `https://graph.facebook.com/${apiVersion}/${groupId}/feed?access_token=${accessToken}&fields=attachments{url,type},source`;
        const response = await axios.get(groupUrl);
        const posts = response.data.data || [];
        const videos = posts
          .filter((post) => post.source && typeof post.source === "string")
          .map((post) => post.source);

        if (videos.length === 0) {
          await api.sendMessage(
            `No video links found in the group ${groupId}.`,
            event.threadID,
            loadingMessage.messageID
          );
        } else {
          const unsentVideos = videos.filter(video => !sentVideos.includes(video));

          if (unsentVideos.length === 0) {
            await api.sendMessage(
              `All videos from the group ${groupId} have been sent before.`,
              event.threadID,
              loadingMessage.messageID
            );
          } else {
            const randomVideo =
              unsentVideos[Math.floor(Math.random() * unsentVideos.length)] + "&dl=1";

            const tempDir = path.join(os.tmpdir(), "fb_videos");
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir);
            }

            const randomFileName = `video_${Date.now()}.mp4`;

            const filePath = path.join(tempDir, randomFileName);

            const videoResponse = await axios({
              method: "GET",
              url: randomVideo,
              responseType: "stream",
            });

            videoResponse.data.pipe(fs.createWriteStream(filePath));

            videoResponse.data.on("end", async () => {
              if (fs.existsSync(filePath)) {
                await api.sendMessage(
                  {
                    body: `𝗥𝗮𝗻𝗱𝗼𝗺  𝘃𝗶𝗱𝗲𝗼 💐`,
                    attachment: fs.createReadStream(filePath),
                  },
                  event.threadID,
                  triggerMessageID
                );

                sentVideos.push(randomVideo);
              } else {
                console.error("File does not exist:", filePath);

                await api.sendMessage(
                  "An error occurred while fetching the video. Please try again later.",
                  event.threadID,
                  loadingMessage.messageID
                );
              }
            });

            videoResponse.data.on("error", async (err) => {
              console.error("Error during video download:", err);

              await api.sendMessage(
                "An error occurred while fetching the video. Please try again later.",
                event.threadID,
                loadingMessage.messageID
              );
            });
          }
        }
      }
    } catch (error) {
      console.error("[ERROR]", error);

      await api.sendMessage(
        "An error occurred while fetching the video links.",
        event.threadID
      );
    }
  },
};