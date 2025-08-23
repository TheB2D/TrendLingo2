import BrowserUse from "browser-use-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new BrowserUse({
  apiKey: process.env.BROWSER_USE_API_KEY,
});

async function debugNYTimesTask() {
  try {
    console.log("Creating NYTimes task...");
    const task = await client.tasks.create({
      task: `Open a browser.
Go to https://www.nytimes.com/.
Use the search bar to look for "artificial intelligence".
Click on the first article result.
Copy the article's title and first paragraph.
Paste that text into a notes app (or local text file).`,
    });

    console.log(`✅ Task created!`);
    console.log(`Task ID: ${task.id}`);
    console.log(`Session ID: ${task.sessionId}`);

    // Get initial session info
    console.log("\n🔍 Initial session info...");
    let session = await client.sessions.retrieve(task.sessionId);
    console.log("Session status:", session.status);
    console.log("Live URL:", session.liveUrl);
    console.log("Tasks count:", session.tasks?.length || 0);

    const stream = client.tasks.stream({
      taskId: task.id,
    });

    console.log("\n=== STREAMING NYTIMES TASK ===\n");

    let messageCount = 0;
    for await (const msg of stream) {
      messageCount++;
      console.log(`=== MESSAGE ${messageCount} ===`);
      console.log("Event:", msg.event);
      console.log("Status:", msg.status);
      
      if (msg.data) {
        console.log("Session status:", msg.data.session?.status);
        console.log("Live URL:", msg.data.session?.liveUrl);
        console.log("Task status:", msg.data.status);
        console.log("Steps count:", msg.data.steps?.length || 0);
        
        // Show steps if they exist
        if (msg.data.steps && msg.data.steps.length > 0) {
          console.log("\n🧠 AGENT STEPS:");
          msg.data.steps.forEach((step, idx) => {
            console.log(`\nStep ${step.number}:`);
            console.log(`  Memory: ${step.memory}`);
            console.log(`  Evaluation: ${step.evaluationPreviousGoal}`);
            console.log(`  Next Goal: ${step.nextGoal}`);
            console.log(`  URL: ${step.url}`);
            console.log(`  Actions: ${step.actions?.length || 0} actions`);
            if (step.screenshotUrl) {
              console.log(`  Screenshot: ${step.screenshotUrl}`);
            }
          });
        } else {
          console.log("⚠️  No steps found in this message");
        }
      }
      
      console.log("===================\n");
      
      // Stop after the task is finished
      if (msg.data?.status === 'finished' || msg.data?.status === 'stopped') {
        console.log("🏁 Task completed, stopping stream");
        break;
      }
    }

    // Final session check
    console.log("\n🔍 Final session check...");
    session = await client.sessions.retrieve(task.sessionId);
    console.log("Final session status:", session.status);
    console.log("Final tasks count:", session.tasks?.length || 0);
    
    if (session.tasks && session.tasks.length > 0) {
      const latestTask = session.tasks[session.tasks.length - 1];
      console.log("Latest task steps count:", latestTask.steps?.length || 0);
      console.log("Latest task status:", latestTask.status);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

debugNYTimesTask();