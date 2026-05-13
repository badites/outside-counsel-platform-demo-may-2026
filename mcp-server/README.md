# Counsel Directory MCP Server

An MCP (Model Context Protocol) server that exposes SCG's Outside Counsel Directory as tools for Claude.

## Tools

| Tool | Description |
|------|-------------|
| `search_firms` | Search firms by name, practice area, jurisdiction, type, or min NPS |
| `search_lawyers` | Search lawyers by name, firm, practice area, jurisdiction, role, or min NPS |
| `get_firm_profile` | Full firm profile: rankings, NPS, ratings, engagements, cost benchmarks |
| `get_lawyer_profile` | Full lawyer profile: career history, rankings, NPS, ratings, engagements |
| `compare_firms` | Side-by-side comparison of 2-5 firms |
| `find_alumni` | Find who left a firm and where they went |
| `get_recommendations` | Personalized recommendations by practice area and jurisdiction |

## Resources

| URI | Description |
|-----|-------------|
| `directory://practice-areas` | List of all practice areas |
| `directory://jurisdictions` | List of all jurisdictions |
| `directory://firms` | List of all active firms |

## Setup

```bash
cd mcp-server
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "counsel-directory": {
      "command": "node",
      "args": ["<path-to-project>/mcp-server/dist/index.js"]
    }
  }
}
```

## Usage with Claude Code

```bash
claude mcp add counsel-directory node <path-to-project>/mcp-server/dist/index.js
```

## Development

```bash
npm run dev
```

## Testing

Use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```
