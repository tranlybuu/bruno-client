# Bruno Client (Tranlybuu Fork)

An open-source IDE for exploring and testing APIs, fork of the original Bruno client.

This repository features local enhancements, including a built-in **Model Context Protocol (MCP)** server for AI-assisted API testing and execution.

---

## 📌 Original Repository
The upstream repository is located at [usebruno/bruno](https://github.com/usebruno/bruno).

---

## 🚀 Installation & Local Development

Follow these steps to run the application locally from this repository:

### 1. Clone the Repository
```bash
git clone https://github.com/tranlybuu/bruno-client.git
cd bruno
```

### 2. Install Dependencies
Make sure you are using **Node.js v22.x** (or the latest LTS version):
```bash
# Optional: use node version manager
nvm use

# Install dependencies
npm install --legacy-peer-deps
```

### 3. Setup Workspace
Initialize the packages and build the local packages:
```bash
npm run setup
```

### 4. Run the Application
Start the Electron client and dev servers concurrently:
```bash
npm run dev
```

---

## 🤖 Model Context Protocol (MCP) Configuration

This fork contains a built-in MCP server that enables AI assistants (such as Cursor, Claude Desktop, etc.) to discover, inspect, and execute your Bruno collections and API requests directly.

### CLI Command to Run MCP
```bash
node packages/bruno-cli/bin/bru.js mcp
```

### Client Configuration

#### 1. Claude Desktop
Add the following configuration to your Claude Desktop config file (located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "bruno": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/YOUR/BRUNO/FOLDER/DIR",
        "mcp"
      ]
    }
  }
}
```
> [!IMPORTANT]
> Replace `/ABSOLUTE/PATH/TO/YOUR/BRUNO/FOLDER/DIR` with the absolute path to your cloned `bruno` directory.

#### 2. Cursor
To configure Cursor:
1. Open **Cursor Settings** -> **Features** -> **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in the details:
   - **Name**: `bruno`
   - **Type**: `command`
   - **Command**: `node /ABSOLUTE/PATH/TO/YOUR/BRUNO/FOLDER/DIR mcp`