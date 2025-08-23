# Live Browser View Functionality

This project now includes functionality to get the live browser view URL from browser-use sessions, allowing you to watch browser automation in real-time.

## Features

- ✅ Retrieve live browser view URL from active sessions
- ✅ Get session information including status, timestamps, and URLs
- ✅ Monitor session progress and status changes
- ✅ Support for both new tasks and existing session IDs

## Usage

### 1. Session Info Example

The `session-info-example.js` provides the most reliable way to get live browser view URLs:

```bash
# Create a new task and get session info
npm run session-info

# Get info for an existing session
npm run session-info <session-id>
```

### 2. Live Browser View Example

The `live-browser-view-example.js` demonstrates streaming task progress:

```bash
# Stream task progress and get live URL
npm run live-view

# Get live URL for existing session
npm run live-view <session-id>
```

## API Methods

### Getting Session Information

```javascript
import BrowserUse from "browser-use-sdk";

const client = new BrowserUse({
  apiKey: process.env.BROWSER_USE_API_KEY,
});

// Get session details
const session = await client.sessions.retrieve(sessionId);

console.log(`Live Browser URL: ${session.liveUrl}`);
console.log(`Session Status: ${session.status}`);
console.log(`Recording URL: ${session.recordUrl}`);
```

### Session Response Structure

```javascript
{
  id: "session-uuid",
  status: "active" | "stopped",
  liveUrl: "https://live.anchorbrowser.io?sessionId=...",
  startedAt: "2023-11-07T05:31:56Z",
  finishedAt: "2023-11-07T05:31:56Z" | null,
  recordUrl: "recording-url" | null,
  publicShareUrl: "share-url" | null,
  tasks: [
    {
      id: "task-uuid",
      sessionId: "session-uuid",
      task: "task description",
      status: "started" | "paused" | "finished" | "stopped",
      startedAt: "timestamp",
      finishedAt: "timestamp" | null,
      // ... other task fields
    }
  ]
}
```

## Functions Available

### From `session-info-example.js`:

- `createTaskAndGetSessionInfo()` - Creates a new task and retrieves session info
- `getSessionInfo(sessionId)` - Retrieves session info for existing session

### From `live-browser-view-example.js`:

- `getLiveBrowserView()` - Creates task and streams progress to get live URL
- `getLiveBrowserViewBySessionId(sessionId)` - Gets live URL for existing session
- `createTaskAndGetLiveUrl(taskDescription)` - Quick function to get live URL

## Example Output

```
📊 Session Details:
- Session ID: 54ea1752-3c73-4e6f-a97d-52f28ec12e01
- Status: active
- Started At: 2025-08-23T16:19:22.804084
- 📺 Live Browser View URL: https://live.anchorbrowser.io?sessionId=0143295d-bc20-44aa-9f3e-ef8f15fc0c4e
  ↳ You can open this URL in your browser to watch the automation in real-time!

📋 Tasks (1):
  1. Task ID: 07ab2d13-27fc-4955-9933-04f0d860991d
     Status: finished
     Task: Navigate to example.com and take a screenshot
```

## Important Notes

- The `liveUrl` is only available when the session status is "active"
- The `recordUrl` becomes available after the session is completed
- Sessions with status "stopped" will not have live URLs but may have recording URLs
- The live browser view URL allows real-time monitoring of browser automation

## Integration

You can import and use these functions in your own code:

```javascript
import { getSessionInfo } from './session-info-example.js';
import { getLiveBrowserViewBySessionId } from './live-browser-view-example.js';

// Use in your application
const session = await getSessionInfo('your-session-id');
if (session?.liveUrl) {
  console.log(`Watch live: ${session.liveUrl}`);
}
```