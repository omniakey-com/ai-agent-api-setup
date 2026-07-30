export const protocols = [
  {
    id: "openai-chat",
    name: "OpenAI Chat",
    detail: "/chat/completions",
    probePath: "/models",
  },
  {
    id: "openai-responses",
    name: "OpenAI Responses",
    detail: "/responses",
    probePath: "/models",
  },
  {
    id: "anthropic",
    name: "Anthropic Messages",
    detail: "/v1/messages",
    probePath: "/v1/models",
  },
  {
    id: "gemini",
    name: "Gemini",
    detail: "/models",
    probePath: "/models",
  },
];

export const clients = [
  {
    id: "claude-code",
    name: "Claude Code",
    mark: "CC",
    mode: "generated",
    target: "Shell environment",
    protocols: ["anthropic"],
    source: "https://code.claude.com/docs/en/llm-gateway",
  },
  {
    id: "codex",
    name: "Codex",
    mark: "CX",
    mode: "generated",
    target: "~/.codex/config.toml",
    protocols: ["openai-responses"],
    source: "https://developers.openai.com/codex/config-advanced#custom-model-providers",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    mark: "OC",
    mode: "generated",
    target: "~/.openclaw/openclaw.json",
    protocols: ["openai-chat", "openai-responses", "anthropic"],
    source: "https://docs.openclaw.ai/concepts/model-providers",
  },
  {
    id: "hermes",
    name: "Hermes Agent",
    mark: "HA",
    mode: "generated",
    target: "~/.hermes/config.yaml",
    protocols: ["openai-chat", "openai-responses", "anthropic"],
    source: "https://hermes-agent.nousresearch.com/user-guide/configuring-models",
  },
  {
    id: "opencode",
    name: "OpenCode",
    mark: "OP",
    mode: "generated",
    target: "opencode.json",
    protocols: ["openai-chat"],
    source: "https://opencode.ai/docs/providers/#custom-provider",
  },
  {
    id: "aider",
    name: "Aider",
    mark: "AI",
    mode: "generated",
    target: "Shell environment",
    protocols: ["openai-chat"],
    source: "https://aider.chat/docs/config/options.html",
  },
  {
    id: "cursor",
    name: "Cursor",
    mark: "CU",
    mode: "guided",
    target: "Cursor Settings",
    protocols: ["openai-chat"],
    source: "https://docs.cursor.com/settings/api-keys",
  },
  {
    id: "cline",
    name: "Cline",
    mark: "CL",
    mode: "guided",
    target: "Cline provider settings",
    protocols: ["openai-chat"],
    source: "https://docs.cline.bot/provider-config/openai-compatible",
  },
];

export const operatingSystems = [
  { id: "posix", name: "macOS / Linux" },
  { id: "windows", name: "Windows PowerShell" },
];

export function getClient(clientId) {
  return clients.find((client) => client.id === clientId);
}

export function getProtocol(protocolId) {
  return protocols.find((protocol) => protocol.id === protocolId);
}
