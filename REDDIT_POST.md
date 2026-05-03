# Title: I built an MCP server with 35 tools for 1C:Enterprise ERP (the most used ERP in Russia)

Hey r/mcp!

I've been working on bridging AI agents with 1C:Enterprise — the dominant ERP platform in Russia used by 300,000+ organizations for accounting, warehousing, manufacturing, HR, and payroll.

The result: **INFATON MCP35** — an open-source MCP server written in BSL (1C's native language) that exposes 35 tools via JSON-RPC 2.0.

## What it does:
- **Metadata inspection**: browse config tree, read BSL source code, list subsystems
- **Document CRUD**: create/read/update/post/unpost any 1C document type
- **Catalog operations**: search, create, update reference data
- **Register queries**: accumulation, information, accounting registers
- **BSP integration**: users, access rights, print forms, attached files
- **Raw queries**: execute 1C query language directly

## How it works:
The server runs as an HTTP service inside 1C:Enterprise 8.3.25+. No external dependencies. Your MCP client connects to `http://your-1c-server/your-base/hs/mcp` and gets full access to the 1C database through the standard MCP protocol.

## Links:
- GitHub: https://github.com/infaton/MCP35
- Release with ready-to-use .cfe extension: https://github.com/infaton/MCP35/releases/tag/v1.0.0

This is part of the INFATON platform (https://infaton.ru) — an AI-powered ERP implementation toolkit. We open-sourced the MCP server because we think every 1C database should be AI-accessible.

Would love feedback from the MCP community!
