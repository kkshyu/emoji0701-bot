// index.js
const line = require("@line/bot-sdk");
const { default: axios } = require("axios");
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
async function handleEvent(event, destination) {
  const graphqlRes = await axios.post(
    `https://emoji0701.hasura.app/v1/graphql`,
    {
      query: `mutation INSERT_MEMBER($memberId: String!) {
        insert_member_one(object: {id: $memberId}, on_conflict: {constraint: member_pkey, update_columns:[]}) {
          id
        }
      }
      `,
      variables: { memberId: destination },
    },
    {
      headers: {
        "content-type": "application/json",
        "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
      },
    }
  );
  const pointUrl = `https://emoji0701.netlify.app?id=${destination}`;
  await client.replyMessage(event.replyToken, [
    {
      type: "text",
      text: `專屬連結：${pointUrl}`,
    },
    {
      type: "image",
      originalContentUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${pointUrl}`,
      previewImageUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${pointUrl}`,
    },
  ]);
}
// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
