---
name: ai-agent-api-setup
description: Configure, migrate, and troubleshoot custom AI API endpoints for Claude Code, Codex, OpenClaw, Hermes Agent, OpenCode, Cursor, Cline, and Aider. Use when a user needs to set a custom base URL, connect an LLM gateway or router, reference an API key safely, generate client configuration, switch providers, or test OpenAI Chat, OpenAI Responses, Anthropic Messages, or Gemini compatibility.
---

# AI Agent API Setup

Generate client-specific configuration without receiving or embedding API keys.
Use the bundled CLI for deterministic output and a read-only model-list probe.

## Workflow

1. Identify the client, protocol, base URL, model ID, operating system, and the
   environment-variable name that already holds the API key. Never request the
   key value.
2. Check `src/catalog.mjs` for supported client/protocol combinations. Do not
   silently translate Anthropic Messages into OpenAI Chat or vice versa.
3. Render the configuration:

   ```bash
   node bin/agent-api-setup.mjs render \
     --client codex \
     --protocol openai-responses \
     --base-url https://gateway.example.com/v1 \
     --model gpt-example \
     --key-env CUSTOM_API_KEY
   ```

4. Inspect the user's existing target file before changing it. Merge only the
   generated provider/model fields, preserve unrelated settings, and create a
   timestamped backup before overwriting an existing local file.
5. Test the endpoint locally after the user has exported the key:

   ```bash
   node bin/agent-api-setup.mjs doctor \
     --protocol openai-responses \
     --base-url https://gateway.example.com/v1 \
     --key-env CUSTOM_API_KEY
   ```

6. Report the changed target, backup path, selected protocol, and probe result.
   Do not print, log, or persist the key.

## Client Rules

- Configure Claude Code only against an Anthropic Messages-compatible route.
- Configure Codex custom providers only in user-level `~/.codex/config.toml`.
  Require an OpenAI Responses-compatible endpoint and use `env_key`.
- Merge OpenClaw provider and agent sections into the existing JSON/JSON5
  configuration. Preserve channels, gateway, tools, and other agents.
- Start a new Hermes session after changing its provider; existing sessions
  retain their current model.
- Use OpenCode's `{env:VARIABLE_NAME}` substitution for secrets.
- Treat Cursor and Cline as guided UI setup. Do not invent a stable config-file
  write path for them.
- Prefix an unqualified Aider model with `openai/` for a custom OpenAI-compatible
  endpoint.

## Safety

- Accept an environment-variable name, never a key, on the command line.
- Reject non-HTTP base URLs and unsafe environment-variable names.
- Keep provider protocols explicit. A successful `/models` probe verifies
  reachability and authentication, not full tool-calling compatibility.
- Refuse to overwrite a whole existing config when a narrow merge is possible.
- Do not send a paid inference request unless the user explicitly requests it.

## References

Read `references/client-contracts.md` before updating a renderer, resolving a
format discrepancy, or adding a new client. It records the upstream contracts
and the assumptions intentionally kept out of this file.
