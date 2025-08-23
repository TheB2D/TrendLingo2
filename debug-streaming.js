import BrowserUse from "browser-use-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new BrowserUse({
  apiKey: process.env.BROWSER_USE_API_KEY,
});

async function debugStreamingData() {
  try {
    console.log("Creating task...");
    const task = await client.tasks.create({
      task: "Navigate to example.com and analyze what you see on the page. Think through each step.",
    });

    console.log(`Task ID: ${task.id}`);
    console.log(`Session ID: ${task.sessionId}`);

    const stream = client.tasks.stream({
      taskId: task.id,
    });

    console.log("\n=== STREAMING DATA DEBUG ===\n");

    for await (const msg of stream) {
      console.log("=== NEW MESSAGE ===");
      console.log("Status:", msg.status);
      console.log("Full message structure:");
      console.log(JSON.stringify(msg, null, 2));
      console.log("===================\n");
      
      // Check for any reasoning/thinking fields
      if (msg.reasoning) {
        console.log("🧠 REASONING:", msg.reasoning);
      }
      if (msg.thoughts) {
        console.log("💭 THOUGHTS:", msg.thoughts);
      }
      if (msg.steps) {
        console.log("📝 STEPS:", msg.steps);
      }
      if (msg.data && msg.data.reasoning) {
        console.log("🧠 DATA.REASONING:", msg.data.reasoning);
      }
      if (msg.data && msg.data.thoughts) {
        console.log("💭 DATA.THOUGHTS:", msg.data.thoughts);
      }
      if (msg.data && msg.data.steps) {
        console.log("📝 DATA.STEPS:", msg.data.steps);
      }
      
      // Check if there are any text fields that might contain reasoning
      if (typeof msg.data === 'object' && msg.data) {
        Object.keys(msg.data).forEach(key => {
          if (typeof msg.data[key] === 'string' && msg.data[key].length > 50) {
            console.log(`📄 LONG TEXT FIELD [${key}]:`, msg.data[key].substring(0, 200) + "...");
          }
        });
      }
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

debugStreamingData();