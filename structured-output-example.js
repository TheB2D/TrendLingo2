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
    const result = await client.tasks.run({
      task: "Search for the top 10 Hacker News posts and return the title and url.",
      schema: TaskOutput,
    });

    for (const post of result.parsedOutput.posts) {
      console.log(`${post.title} - ${post.url}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main();