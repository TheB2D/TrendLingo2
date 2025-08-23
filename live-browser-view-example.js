import BrowserUse from "browser-use-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new BrowserUse({
  apiKey: process.env.BROWSER_USE_API_KEY,
});

async function getLiveBrowserView() {
  try {
    const task = await client.tasks.create({
      task: "Navigate to Google and search for 'browser automation'. Take your time to show the process.",
    });

    console.log(`Task created with ID: ${task.id}`);

    const stream = client.tasks.stream({
      taskId: task.id,
    });

    console.log("\nStreaming task progress...");
    
    for await (const msg of stream) {
      switch (msg.status) {
        case "started":
          console.log(`\n🚀 Task started!`);
          console.log(`📺 Live Browser View URL: ${msg.data.session.liveUrl}`);
          console.log("You can open this URL in your browser to watch the automation in real-time!");
          break;
          
        case "paused":
          console.log("⏸️  Task paused");
          break;
          
        case "stopped":
          console.log("⏹️  Task stopped");
          break;
          
        case "running":
          if (msg.data && msg.data.session && msg.data.session.liveUrl) {
            console.log(`🔄 Task running - Live URL: ${msg.data.session.liveUrl}`);
          }
          break;

        case "finished":
          console.log(`✅ Task completed!`);
          if (msg.data && msg.data.session) {
            if (msg.data.session.recordingUrl) {
              console.log(`🎬 Recording URL: ${msg.data.session.recordingUrl}`);
            }
          }
          break;
          
        case "failed":
          console.log(`❌ Task failed: ${msg.error || 'Unknown error'}`);
          break;
          
        default:
          console.log(`Status: ${msg.status}`);
      }
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

// Function to get live browser view URL from existing session ID
async function getLiveBrowserViewBySessionId(sessionId) {
  try {
    const session = await client.sessions.retrieve(sessionId);
    
    console.log(`Session ID: ${session.id}`);
    console.log(`Session Status: ${session.status}`);
    console.log(`Started At: ${session.startedAt}`);
    
    if (session.liveUrl) {
      console.log(`📺 Live Browser View URL: ${session.liveUrl}`);
      return session.liveUrl;
    } else {
      console.log("Live browser URL not available. Session might not be active.");
      return null;
    }
    
    if (session.recordUrl) {
      console.log(`🎬 Recording URL: ${session.recordUrl}`);
    }
    
    if (session.publicShareUrl) {
      console.log(`🌐 Public Share URL: ${session.publicShareUrl}`);
    }
    
  } catch (error) {
    console.error("Error getting session:", error.message);
    return null;
  }
}

// Function to create a task and immediately return the live URL
async function createTaskAndGetLiveUrl(taskDescription) {
  try {
    const task = await client.tasks.create({
      task: taskDescription,
    });

    console.log(`Task created with ID: ${task.id}`);

    const stream = client.tasks.stream({
      taskId: task.id,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for live URL'));
      }, 10000);

      stream.then(async (streamIterator) => {
        try {
          for await (const msg of streamIterator) {
            if (msg.status === "started" && msg.data && msg.data.session && msg.data.session.liveUrl) {
              clearTimeout(timeout);
              resolve({
                taskId: task.id,
                liveUrl: msg.data.session.liveUrl,
                sessionId: msg.data.session.id
              });
              break;
            }
          }
        } catch (streamError) {
          clearTimeout(timeout);
          reject(streamError);
        }
      }).catch(reject);
    });

  } catch (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
}

// Export functions for use in other modules
export { getLiveBrowserView, getLiveBrowserViewBySessionId, createTaskAndGetLiveUrl };

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if a session ID was provided as command line argument
  const sessionId = process.argv[2];
  
  if (sessionId) {
    console.log(`Getting live browser view for session: ${sessionId}`);
    getLiveBrowserViewBySessionId(sessionId);
  } else {
    console.log("Creating new task to demonstrate live browser view...");
    getLiveBrowserView();
  }
}