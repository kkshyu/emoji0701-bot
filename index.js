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
  if (event.message.text === "code") {
    await axios.post(
      `https://emoji0701.hasura.app/v1/graphql`,
      {
        query: `
          mutation INSERT_MEMBER($memberId: String!) {
            insert_member_one(
              object: { id: $memberId }
              on_conflict: { constraint: member_pkey, update_columns: [] }
            ) {
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
  } else if (event.message.text === "check") {
    const {
      data: { data, errors },
    } = await axios.post(
      `https://emoji0701.hasura.app/v1/graphql`,
      {
        query: `
          query GET_MEMBER_POINTS($memberId: String!) {
            order(
              where: {
                order_member_points: {
                  member_point: { member_id: { _eq: $memberId } }
                }
              }
            ) {
              title
              order_member_points_aggregate {
                aggregate {
                  sum {
                    points
                  }
                }
              }
            }
            member_point(
              where: { member_id: { _eq: $memberId } }
              order_by: [{ ended_at: asc }]
            ) {
              id
              ended_at
              points
              order_member_points_aggregate {
                aggregate {
                  sum {
                    points
                  }
                }
              }
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
    console.log({ data });
    const orders =
      data?.order?.map((v) => ({
        title: v.title,
        usedPoints:
          v.order_member_points_aggregate?.aggregate?.sum?.points || 0,
        createdAt: dayjs(v.createdAt),
      })) || [];
    const memberPoints =
      data?.member_point?.map((v) => ({
        id: v.id,
        endedAt: v.ended_at,
        points: v.points,
        usedPoints:
          v.order_member_points_aggregate?.aggregate?.sum?.points || 0,
      })) || [];
    const currentPoints = memberPoints
      .filter((memberPoint) => dayjs(memberPoint.endedAt) >= dayjs())
      .reduce(
        (accum, memberPoint) =>
          accum + memberPoint.points - memberPoint.usedPoints,
        0
      );
    await client.replyMessage(event.replyToken, [
      {
        type: "text",
        text: `目前點數：${currentPoints}`,
      },
      {
        type: "text",
        text: [
          `點數紀錄：`,
          `-----------------`,
          ...memberPoints.map(
            (memberPoint) =>
              `${memberPoint.point} 點：${dayjs(memberPoint.endedAt).format(
                "YYYY/MM/DD"
              )} 到期，已使用 ${memberPoint.usedPoints} 點`
          ),
        ].join("\n"),
      },
      {
        type: "text",
        text: [
          `使用紀錄：`,
          `-----------------`,
          ...orders.map(
            (order) =>
              `${order.title} 於 ${dayjs(order.createdAt).format(
                "YYYY/MM/DD"
              )} 使用 ${order.usedPoints} 點`
          ),
        ].join("\n"),
      },
    ]);
  } else {
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `目前僅支援以下指令：check, code`,
    });
  }
}
// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
