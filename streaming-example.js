import BrowserUse from "browser-use-sdk";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const client = new BrowserUse({
  apiKey: process.env.BROWSER_USE_API_KEY,
});

const TaskOutput = z.object({
  posts: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
    })
  ),
});

async function main() {
  try {
    const task = await client.tasks.create({
      task: "Search for the top 10 Hacker News posts and return the title and url.",
      schema: TaskOutput,
    });

    const stream = client.tasks.stream({
      taskId: task.id,
      schema: TaskOutput,
    });

    for await (const msg of stream) {
      switch (msg.status) {
        case "started":
          console.log(`started: ${msg.data.session.liveUrl}`);
          break;
        case "paused":
        case "stopped":
          console.log(`running: ${msg}`);
          break;

        case "finished":
          console.log(`done:`);

          for (const post of msg.parsedOutput.posts) {
            console.log(`${post.title} - ${post.url}`);
          }
          break;
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main();