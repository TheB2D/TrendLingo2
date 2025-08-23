import BrowserUse from "browser-use-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new BrowserUse({
  apiKey: process.env.BROWSER_USE_API_KEY,
});

async function main() {
  try {
    const result = await client.tasks.run({
      task: "Search for the top 10 Hacker News posts and return the title and url.",
    });

    console.log(result.doneOutput);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();