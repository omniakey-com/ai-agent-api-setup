# Client Configuration Contracts

Verified against upstream documentation and repositories on 2026-07-30.

| Client | Contract used by this project | Upstream source |
|---|---|---|
| Claude Code | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, and `ANTHROPIC_MODEL` in the process environment | [LLM gateway configuration](https://code.claude.com/docs/en/llm-gateway) |
| Codex | User-level `~/.codex/config.toml`; custom `model_providers.<id>` with `base_url`, `env_key`, and `wire_api = "responses"` | [Advanced configuration](https://developers.openai.com/codex/config-advanced#custom-model-providers) and [configuration reference](https://developers.openai.com/codex/config-reference) |
| OpenClaw | `models.providers.<id>` plus `agents.defaults.model.primary`; custom API modes include `openai-completions`, `openai-responses`, and `anthropic-messages` | [Model providers](https://docs.openclaw.ai/concepts/model-providers) and [configuration examples](https://docs.openclaw.ai/gateway/configuration-examples) |
| Hermes Agent | Named entries under `providers`, the top-level `model` mapping, and API modes `chat_completions`, `responses`, or `anthropic_messages` | [Configuring models](https://hermes-agent.nousresearch.com/user-guide/configuring-models) |
| OpenCode | `opencode.json` custom provider using `@ai-sdk/openai-compatible`; secrets use `{env:VARIABLE_NAME}` | [Providers](https://opencode.ai/docs/providers/) and [Config](https://opencode.ai/docs/config/) |
| Aider | `AIDER_OPENAI_API_BASE`, `AIDER_OPENAI_API_KEY`, and `AIDER_MODEL` | [Options reference](https://aider.chat/docs/config/options.html) |
| Cursor | OpenAI key and base URL override through Cursor Settings; some Cursor-hosted features may not use the custom endpoint | [API keys](https://docs.cursor.com/settings/api-keys) |
| Cline | Select OpenAI Compatible, then enter base URL, key, and model ID in extension settings | [OpenAI Compatible](https://docs.cline.bot/provider-config/openai-compatible) |

## Intentional Boundaries

- Keep OpenAI Chat and OpenAI Responses separate. Similar URL shapes do not
  guarantee wire compatibility.
- Render strict JSON for OpenClaw. It is valid input for OpenClaw's JSON5
  configuration and is easier to parse and test.
- Generate references to environment variables. Never place a key value in a
  downloaded file, URL query string, command argument, or browser storage.
- Use `/models` for `doctor`. It is a reachability/authentication check and does
  not claim that streaming, tool calls, images, or reasoning fields work.
- Keep model context and output limits user-controlled because gateways may
  expose the same model ID with different effective limits.
