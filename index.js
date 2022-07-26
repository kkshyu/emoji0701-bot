// index.js
const line = require("@line/bot-sdk");
var express = require("express");
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
// create LINE SDK client
const client = new line.Client(config);
// create Express app
// about Express itself: <https://expressjs.com/>
const app = express();
// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post("/callback", line.middleware(config), (req, res) => {
  Promise.all(
    req.body.events.map((event) => handleEvent(event, req.body.destination))
  )
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});
// event handler
function handleEvent(event, destination) {
  // create a echoing text message
  const pointUrl = `https://emoji0701.netlify.app?id=${destination}`;
  const message = {
    type: "image",
    originalContentUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${pointUrl}`,
    previewImageUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${pointUrl}`,
  };
  console.log({ event, destination, pointUrl, message });
  // use reply API
  return client.replyMessage(event.replyToken, message);
}
// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
