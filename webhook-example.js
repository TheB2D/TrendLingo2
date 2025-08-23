import {
  verifyWebhookEventSignature,
} from "browser-use-sdk/lib/webhooks";

const SECRET_KEY = "your-webhook-secret-key"; // Replace with your actual webhook secret

export async function handleWebhook(req) {
  try {
    const signature = req.headers["x-browser-use-signature"];
    const timestamp = req.headers["x-browser-use-timestamp"];
    const body = await req.text();

    const event = await verifyWebhookEventSignature(
      {
        body,
        signature,
        timestamp,
      },
      {
        secret: SECRET_KEY,
      }
    );

    if (!event.ok) {
      console.log("Webhook signature verification failed");
      return { status: 400, body: "Invalid signature" };
    }

    switch (event.event.type) {
      case "agent.task.status_update":
        console.log("Agent task status update:", event.event.data);
        break;
      case "test":
        console.log("Test webhook received");
        break;
      default:
        console.log("Unknown webhook event type:", event.event.type);
        break;
    }

    return { status: 200, body: "OK" };
  } catch (error) {
    console.error("Webhook error:", error);
    return { status: 500, body: "Internal server error" };
  }
}

// Example usage with Express.js
// import express from 'express';
// 
// const app = express();
// 
// app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   const result = await handleWebhook(req);
//   res.status(result.status).send(result.body);
// });
// 
// app.listen(3000, () => {
//   console.log('Webhook server listening on port 3000');
// });