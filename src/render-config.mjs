import { getClient, getProtocol } from "./catalog.mjs";

const OPENCLAW_API_MODES = {
  "openai-chat": "openai-completions",
  "openai-responses": "openai-responses",
  anthropic: "anthropic-messages",
};

const HERMES_API_MODES = {
  "openai-chat": "chat_completions",
  "openai-responses": "responses",
  anthropic: "anthropic_messages",
};

function requireText(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function normalizeBaseUrl(value) {
  const normalized = requireText(value, "Base URL").replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Base URL must be a valid http:// or https:// URL.");
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("Base URL must use http:// or https://.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Base URL must not contain credentials, a query string, or a fragment.");
  }
  return normalized;
}

function normalizeEnvName(value) {
  const normalized = requireText(value, "API key environment variable").toUpperCase();
  if (!/^[A-Z_][A-Z0-9_]*$/.test(normalized)) {
    throw new Error("API key environment variable must use A-Z, 0-9, and underscores.");
  }
  return normalized;
}

function normalizeInteger(value, fallback, label) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function asJson(value) {
  return JSON.stringify(value);
}

function asYaml(value) {
  return JSON.stringify(value);
}

function asPosix(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function asPowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function shellAssignment(name, value, os) {
  if (os === "windows") {
    return `$env:${name} = ${asPowerShell(value)}`;
  }
  return `export ${name}=${asPosix(value)}`;
}

function shellReference(destination, source, os) {
  if (os === "windows") {
    return `$env:${destination} = $env:${source}`;
  }
  return `export ${destination}="$${source}"`;
}

function renderClaudeCode(options) {
  return {
    filename: options.os === "windows" ? "PowerShell session" : "Shell session",
    language: options.os === "windows" ? "powershell" : "bash",
    content: [
      "# Set the source key variable separately; keep the real key out of this file.",
      shellAssignment("ANTHROPIC_BASE_URL", options.baseUrl, options.os),
      shellReference("ANTHROPIC_AUTH_TOKEN", options.keyEnv, options.os),
      shellAssignment("ANTHROPIC_MODEL", options.model, options.os),
      "claude",
    ].join("\n"),
    notes: [
      `Set ${options.keyEnv} before running this snippet.`,
      "Use an Anthropic Messages-compatible endpoint; an OpenAI-only gateway will not work here.",
    ],
  };
}

function renderCodex(options) {
  return {
    filename: "~/.codex/config.toml",
    language: "toml",
    content: [
      `model = ${asJson(options.model)}`,
      'model_provider = "custom-api"',
      "",
      "[model_providers.custom-api]",
      'name = "Custom API"',
      `base_url = ${asJson(options.baseUrl)}`,
      `env_key = ${asJson(options.keyEnv)}`,
      'wire_api = "responses"',
    ].join("\n"),
    notes: [
      "Merge this into the user-level config; project config cannot override model providers.",
      "The endpoint must implement the OpenAI Responses API.",
    ],
  };
}

function renderOpenClaw(options) {
  const providerId = "custom-api";
  const modelRef = `${providerId}/${options.model}`;
  const content = {
    models: {
      mode: "merge",
      providers: {
        [providerId]: {
          baseUrl: options.baseUrl,
          apiKey: `\${${options.keyEnv}}`,
          api: OPENCLAW_API_MODES[options.protocol],
          models: [
            {
              id: options.model,
              name: options.model,
              contextWindow: options.contextWindow,
              maxTokens: options.maxOutput,
            },
          ],
        },
      },
    },
    agents: {
      defaults: {
        model: { primary: modelRef },
      },
    },
  };
  return {
    filename: "~/.openclaw/openclaw.json",
    language: "json",
    content: JSON.stringify(content, null, 2),
    notes: [
      `Expose ${options.keyEnv} to the OpenClaw gateway process.`,
      "Merge the generated models and agents sections with existing channel and gateway settings.",
    ],
  };
}

function renderHermes(options) {
  const providerId = "custom-api";
  return {
    filename: "~/.hermes/config.yaml",
    language: "yaml",
    content: [
      "providers:",
      `  ${providerId}:`,
      `    api: ${asYaml(options.baseUrl)}`,
      `    api_key: ${asYaml(`\${${options.keyEnv}}`)}`,
      "    models:",
      `      - ${asYaml(options.model)}`,
      "model:",
      `  provider: ${asYaml(providerId)}`,
      `  default: ${asYaml(options.model)}`,
      `  base_url: ${asYaml(options.baseUrl)}`,
      `  api_mode: ${asYaml(HERMES_API_MODES[options.protocol])}`,
    ].join("\n"),
    notes: [
      `Expose ${options.keyEnv} before starting Hermes.`,
      "Start a new Hermes session after updating the file; existing sessions keep their current model.",
    ],
  };
}

function renderOpenCode(options) {
  const providerId = "custom-api";
  const content = {
    $schema: "https://opencode.ai/config.json",
    model: `${providerId}/${options.model}`,
    provider: {
      [providerId]: {
        npm: "@ai-sdk/openai-compatible",
        name: "Custom API",
        options: {
          baseURL: options.baseUrl,
          apiKey: `{env:${options.keyEnv}}`,
        },
        models: {
          [options.model]: { name: options.model },
        },
      },
    },
  };
  return {
    filename: "opencode.json",
    language: "json",
    content: JSON.stringify(content, null, 2),
    notes: [
      `OpenCode resolves {env:${options.keyEnv}} when it loads the config.`,
      "Place the file in the project root, or merge it into your global OpenCode config.",
    ],
  };
}

function renderAider(options) {
  const model = options.model.includes("/") ? options.model : `openai/${options.model}`;
  return {
    filename: options.os === "windows" ? "PowerShell session" : "Shell session",
    language: options.os === "windows" ? "powershell" : "bash",
    content: [
      "# Set the source key variable separately; keep the real key out of this file.",
      shellAssignment("AIDER_OPENAI_API_BASE", options.baseUrl, options.os),
      shellReference("AIDER_OPENAI_API_KEY", options.keyEnv, options.os),
      shellAssignment("AIDER_MODEL", model, options.os),
      "aider",
    ].join("\n"),
    notes: [
      `Set ${options.keyEnv} before running this snippet.`,
      "Aider routes custom OpenAI-compatible model IDs through LiteLLM's openai/ prefix.",
    ],
  };
}

function renderCursor(options) {
  return {
    filename: "Cursor Settings",
    language: "text",
    content: [
      "1. Open Cursor Settings, then Models / API Keys.",
      "2. Enable your own OpenAI API key.",
      `3. Set Override OpenAI Base URL to: ${options.baseUrl}`,
      `4. Add or select the model ID: ${options.model}`,
      "5. Paste the API key locally in Cursor, then verify the model.",
    ].join("\n"),
    notes: [
      "Cursor owns this credential in its settings UI; the web configurator never receives it.",
      "Some Cursor features use Cursor-hosted models and may ignore a custom endpoint.",
    ],
  };
}

function renderCline(options) {
  return {
    filename: "Cline provider settings",
    language: "text",
    content: [
      "1. Open Cline, then select the settings icon.",
      '2. Set API Provider to "OpenAI Compatible".',
      `3. Set Base URL to: ${options.baseUrl}`,
      `4. Set Model ID to: ${options.model}`,
      "5. Paste the API key locally in Cline and select Verify.",
      `6. Suggested context window: ${options.contextWindow}; max output: ${options.maxOutput}.`,
    ].join("\n"),
    notes: [
      "Cline stores the key in its extension settings; the generated guide does not contain it.",
    ],
  };
}

const RENDERERS = {
  "claude-code": renderClaudeCode,
  codex: renderCodex,
  openclaw: renderOpenClaw,
  hermes: renderHermes,
  opencode: renderOpenCode,
  aider: renderAider,
  cursor: renderCursor,
  cline: renderCline,
};

export function normalizeOptions(input) {
  const client = getClient(input.client);
  if (!client) {
    throw new Error(`Unknown client: ${input.client}`);
  }
  const protocol = getProtocol(input.protocol);
  if (!protocol) {
    throw new Error(`Unknown protocol: ${input.protocol}`);
  }
  if (!client.protocols.includes(protocol.id)) {
    throw new Error(`${client.name} does not support ${protocol.name} in this generator.`);
  }
  const os = input.os === "windows" ? "windows" : "posix";
  return {
    client: client.id,
    protocol: protocol.id,
    baseUrl: normalizeBaseUrl(input.baseUrl),
    model: requireText(input.model, "Model ID"),
    keyEnv: normalizeEnvName(input.keyEnv),
    os,
    contextWindow: normalizeInteger(input.contextWindow, 128000, "Context window"),
    maxOutput: normalizeInteger(input.maxOutput, 16384, "Max output tokens"),
  };
}

export function renderConfig(input) {
  const options = normalizeOptions(input);
  const client = getClient(options.client);
  const rendered = RENDERERS[options.client](options);
  return {
    ...rendered,
    client,
    options,
    mode: client.mode,
  };
}

export function renderDoctorCommand(input) {
  const options = normalizeOptions(input);
  const command = [
    "agent-api-setup doctor",
    `--protocol ${options.protocol}`,
    `--base-url ${asPosix(options.baseUrl)}`,
    `--key-env ${options.keyEnv}`,
  ];
  return command.join(" ");
}
