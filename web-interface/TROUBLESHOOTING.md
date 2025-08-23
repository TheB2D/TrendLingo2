# Troubleshooting Agent Thoughts

## Step-by-Step Debugging

### Step 1: Check if Live Browser View is Showing
After sending a message like "go to ny times and search up chicken":

1. **Look for the "Show Live Browser" button** in the top right header
2. **Click it** if it's not already active (blue background)
3. The right panel should appear with the browser view

### Step 2: Check if Agent Thoughts Toggle is Available
In the live browser view header, look for:
- **Brain icon 🧠** next to the refresh and external link icons
- **Click the brain icon** to toggle agent thoughts on/off

### Step 3: Check Browser Console
Open browser dev tools (F12) and look for:
```
Session changed effect triggered
Current session: [object]
Latest task from effect: [object]
AgentThoughts received steps: [array]
```

### Step 4: Check Debug Panel
The yellow debug panel should show:
- Session ID
- Task count
- Steps count
- Raw step data in JSON

### Step 5: Manual Check
Try this exact sequence:
1. Type: "go to ny times and search up chicken"
2. Press Enter
3. Wait for "✅ Browser automation started!" message
4. Click "View Live" button in the chat message
5. Look for brain icon 🧠 in the live browser header
6. Click the brain icon to show agent thoughts

## Common Issues

### Issue: No "Show Live Browser" button
**Solution**: The task might not have created a session. Check chat for error messages.

### Issue: Brain icon missing
**Solution**: The live browser view isn't loading properly. Check browser console for errors.

### Issue: Agent thoughts panel empty
**Solution**: Steps data isn't being received. Check the debug panel for session data.

### Issue: Nothing happening after clicking brain icon
**Solution**: The showAgentThoughts state might not be working. Check console logs.

## Debug Commands

Run these in browser console to check state:
```javascript
// Check if session exists
console.log('Current session:', window.sessionStorage.getItem('app-state'));

// Check Zustand store
console.log('Store state:', useAppStore.getState());
```