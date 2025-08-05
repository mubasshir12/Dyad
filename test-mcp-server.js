#!/usr/bin/env node

// Simple test MCP server for integration testing
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Handle incoming messages
rl.on("line", (line) => {
  try {
    const message = JSON.parse(line);

    if (message.method === "initialize") {
      // Send initialization response
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "test-mcp-server",
            version: "1.0.0",
          },
        },
      };
      console.log(JSON.stringify(response));
    } else if (message.method === "tools/list") {
      // Send tools list
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: [
            {
              name: "test_tool",
              description: "A simple test tool for MCP integration",
              inputSchema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    description: "Message to echo back",
                  },
                },
                required: ["message"],
              },
            },
          ],
        },
      };
      console.log(JSON.stringify(response));
    } else if (message.method === "tools/call") {
      // Handle tool execution
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [
            {
              type: "text",
              text: `Echo: ${message.params.arguments.message || "No message provided"}`,
            },
          ],
        },
      };
      console.log(JSON.stringify(response));
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
});

// Handle process termination
process.on("SIGINT", () => {
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
