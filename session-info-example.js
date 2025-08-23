import BrowserUse from "browser-use-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new BrowserUse({
  apiKey: process.env.BROWSER_USE_API_KEY,
});

// Function to create a task and get its session info
async function createTaskAndGetSessionInfo() {
  try {
    console.log("Creating a new task...");
    const task = await client.tasks.create({
      task: "Navigate to example.com and take a screenshot",
    });

    console.log(`✅ Task created successfully!`);
    console.log(`Task ID: ${task.id}`);
    console.log(`Session ID: ${task.sessionId}`);

    // Wait a moment for the session to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get session information
    console.log("\n🔍 Retrieving session information...");
    const session = await client.sessions.retrieve(task.sessionId);
    
    console.log(`\n📊 Session Details:`);
    console.log(`- Session ID: ${session.id}`);
    console.log(`- Status: ${session.status}`);
    console.log(`- Started At: ${session.startedAt}`);
    
    if (session.liveUrl) {
      console.log(`- 📺 Live Browser View URL: ${session.liveUrl}`);
      console.log("  ↳ You can open this URL in your browser to watch the automation in real-time!");
    } else {
      console.log("- Live browser URL: Not available (session might not be active yet)");
    }
    
    if (session.recordUrl) {
      console.log(`- 🎬 Recording URL: ${session.recordUrl}`);
    }
    
    if (session.publicShareUrl) {
      console.log(`- 🌐 Public Share URL: ${session.publicShareUrl}`);
    }

    // Monitor session status for a bit
    console.log("\n⏳ Monitoring session status...");
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const updatedSession = await client.sessions.retrieve(task.sessionId);
        console.log(`Status check ${i + 1}: ${updatedSession.status}`);
        
        if (updatedSession.status === 'stopped') {
          if (updatedSession.recordUrl) {
            console.log(`🎬 Final Recording URL: ${updatedSession.recordUrl}`);
          }
          break;
        }
      } catch (error) {
        console.log(`Status check ${i + 1}: Error - ${error.message}`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Function to get session info by session ID
async function getSessionInfo(sessionId) {
  try {
    console.log(`🔍 Retrieving session information for: ${sessionId}`);
    const session = await client.sessions.retrieve(sessionId);
    
    console.log(`\n📊 Session Details:`);
    console.log(`- Session ID: ${session.id}`);
    console.log(`- Status: ${session.status}`);
    console.log(`- Started At: ${session.startedAt}`);
    
    if (session.finishedAt) {
      console.log(`- Finished At: ${session.finishedAt}`);
    }
    
    if (session.liveUrl) {
      console.log(`- 📺 Live Browser View URL: ${session.liveUrl}`);
      console.log("  ↳ You can open this URL in your browser to watch the automation in real-time!");
    } else {
      console.log("- Live browser URL: Not available");
    }
    
    if (session.recordUrl) {
      console.log(`- 🎬 Recording URL: ${session.recordUrl}`);
    }
    
    if (session.publicShareUrl) {
      console.log(`- 🌐 Public Share URL: ${session.publicShareUrl}`);
    }

    if (session.tasks && session.tasks.length > 0) {
      console.log(`\n📋 Tasks (${session.tasks.length}):`);
      session.tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. Task ID: ${task.id}`);
        console.log(`     Status: ${task.status}`);
        console.log(`     Task: ${task.task.substring(0, 100)}${task.task.length > 100 ? '...' : ''}`);
      });
    }
    
    return session;

  } catch (error) {
    console.error("❌ Error retrieving session:", error.message);
    return null;
  }
}

// Export functions for use in other modules
export { createTaskAndGetSessionInfo, getSessionInfo };

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const sessionId = process.argv[2];
  
  if (sessionId) {
    console.log(`Getting session info for: ${sessionId}`);
    getSessionInfo(sessionId);
  } else {
    console.log("Creating new task and getting session info...");
    createTaskAndGetSessionInfo();
  }
}