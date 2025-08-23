# BrowSee - Browser Use Cloud API

This project demonstrates how to use the Browser Use Cloud API with Node.js for the BrowSee browser automation platform.

## Setup

1. Get your API key from [Browser Use Cloud](https://cloud.browser-use.com/billing)
2. Replace `bu_...` with your actual API key in the example files

## Examples

### Basic Usage
```bash
npm run start
```
Runs `basic-example.js` - Simple task execution with Browser Use.

### Structured Output with Zod
```bash
npm run structured
```
Runs `structured-output-example.js` - Uses Zod schema for structured output parsing.

### Streaming Agent Updates
```bash
npm run streaming
```
Runs `streaming-example.js` - Streams real-time updates from the browser automation task.

### Webhook Verification
```bash
npm run webhook
```
Runs `webhook-example.js` - Example webhook handler with signature verification.

## Files

- `basic-example.js` - Basic Browser Use client usage
- `structured-output-example.js` - Structured output with Zod schema
- `streaming-example.js` - Real-time task streaming
- `webhook-example.js` - Webhook verification example

## Dependencies

- `browser-use-sdk` - Browser Use Cloud API client
- `zod` - Schema validation for structured outputs

## API Documentation

Full API documentation available at: https://github.com/browser-use/browser-use-node/blob/main/api.md