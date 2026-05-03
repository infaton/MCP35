# INFATON MCP35: 35 Tools to Connect AI Agents with 1C:Enterprise ERP

> **TL;DR**: We open-sourced an MCP server that gives AI assistants full access to 1C:Enterprise ERP — the most widely used ERP in Russia (300,000+ organizations). 35 tools, pure BSL, JSON-RPC 2.0. [GitHub repo](https://github.com/infaton/MCP35).

---

## The Problem

1C:Enterprise is the backbone of Russian business automation — accounting, warehousing, manufacturing, HR, payroll. But it's a closed ecosystem with its own language (BSL), its own IDE, and virtually zero AI integration.

Until now, connecting an AI agent to a 1C database meant building custom REST APIs for every single operation. Want to read a document? Write an API. Query a register? Another API. Check metadata? Yet another one.

## The Solution: Model Context Protocol

We built **INFATON MCP35** — a native BSL HTTP service that implements the [Model Context Protocol](https://modelcontextprotocol.io/) specification (JSON-RPC 2.0). One deployment gives your AI assistant **35 tools** to work with any 1C database.

## What Can It Do?

### Metadata & Structure (6 tools)
| Tool | Description |
|------|-------------|
| `get_metadata_tree` | Full configuration metadata tree |
| `get_metadata_details` | Detailed object metadata |
| `get_object_module` | BSL source code of any module |
| `list_subsystems` | Subsystem hierarchy |
| `list_common_modules` | Common modules catalog |
| `list_enums` | Enumerations and values |

### Reference Data (6 tools)
| Tool | Description |
|------|-------------|
| `list_catalogs` | All catalogs in config |
| `get_catalog_items` | Read catalog items with filters |
| `get_catalog_item` | Single item by ID |
| `create_catalog_item` | Create new item |
| `update_catalog_item` | Update existing |
| `search_catalog` | Full-text search |

### Documents (7 tools)
| Tool | Description |
|------|-------------|
| `list_documents` | All document types |
| `get_documents` | Query with filters/date range |
| `get_document` | Single document |
| `create_document` | Create new |
| `update_document` | Modify existing |
| `post_document` | Post (conduct) |
| `unpost_document` | Unpost |

### Registers (5 tools)
Accumulation, information, and accounting registers — read balances, turnovers, movements, slices.

### BSP Integration (6 tools)
Built-in Subsystem Library: users, access rights, print forms, attached files, additional properties.

### Queries & Utils (5 tools)
`execute_query` (raw 1C query language), scheduled jobs, event log, data locks, version info.

## Architecture

```
AI Client (Claude/GPT/local LLM)
        ↓ JSON-RPC 2.0
  INFATON MCP Server (BSL HTTP Service)
        ↓ COM/Native API
    1C:Enterprise Database
```

The server runs as an HTTP service inside 1C:Enterprise 8.3.25+. No external dependencies, no Node.js, no Python — pure BSL.

## Quick Start

1. Download `INFATON_MCP.cfe` from [Releases](https://github.com/infaton/MCP35/releases)
2. Load the extension in 1C Configurator
3. Publish the HTTP service
4. Point your MCP client to `http://your-1c-server/your-base/hs/mcp`

## Why Open Source?

MCP35 is the **1C-side** component of the [INFATON platform](https://infaton.ru) — an AI-powered ERP implementation toolkit featuring:

- **Automatic survey cycle** with 3 discovery engines
- **Digital twins** of ERP consultants in 3 modes: Advisor, Autopilot, or Both
- **Airgapped mode** for classified environments with local LLMs only
- **Problem tracing** (INFATON SA-8 methodology)

We open-sourced the MCP server because we believe every 1C database should be AI-accessible. The platform adds the intelligence layer on top.

## Links

- **GitHub**: [github.com/infaton/MCP35](https://github.com/infaton/MCP35)
- **Website**: [infaton.ru](https://infaton.ru)
- **Build instructions**: [HOW_TO_BUILD_CFE.md](https://github.com/infaton/MCP35/blob/master/HOW_TO_BUILD_CFE.md)

---

*Tags: #mcp #1c #erp #ai #opensource #bsl #json-rpc #digital-twin*
