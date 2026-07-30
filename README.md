<p align="center">
  <img src="site/assets/omniakey-mark.svg" width="72" height="72" alt="AI Agent API Setup mark">
</p>

<h1 align="center">AI Agent API Setup</h1>

<p align="center">
  Configure and test custom AI APIs across Claude Code, Codex, OpenClaw,
  Hermes Agent, OpenCode, Cursor, Cline, and Aider.
</p>

<p align="center">
  <a href="https://omniakey-com.github.io/ai-agent-api-setup/"><strong>Open the config generator</strong></a>
  · <a href="README.zh-CN.md">中文</a>
  · <a href="https://github.com/omniakey-com/ai-agent-api-setup/actions/workflows/ci.yml">CI</a>
  · <a href="LICENSE">MIT</a>
</p>

![AI Agent API Setup configurator](site/assets/og.png)

Generate a client-ready file, shell snippet, or verified setup guide from a
base URL and model ID. The browser never asks for an API key. Every generated
configuration references an environment variable instead.

## Supported Clients

| Client | OpenAI Chat | OpenAI Responses | Anthropic Messages | Output |
|---|:---:|:---:|:---:|---|
| Claude Code | - | - | Yes | Shell environment |
| Codex | - | Yes | - | `~/.codex/config.toml` |
| OpenClaw | Yes | Yes | Yes | `~/.openclaw/openclaw.json` |
| Hermes Agent | Yes | Yes | Yes | `~/.hermes/config.yaml` |
| OpenCode | Yes | - | - | `opencode.json` |
| Aider | Yes | - | - | Shell environment |
| Cursor | Yes | - | - | Verified UI steps |
| Cline | Yes | - | - | Verified UI steps |

Gemini model-list probing is also available from the CLI. Client contracts and
source links are recorded in [references/client-contracts.md](references/client-contracts.md).

## Web Configurator

Use the hosted tool at:

<https://omniakey-com.github.io/ai-agent-api-setup/>

The page is static, makes no API calls, stores no form values, and puts no
secrets in the URL. Client, protocol, and public profile selections are
shareable as URL parameters.

## CLI

Run directly from GitHub with Node.js 20 or newer:

```bash
npx github:omniakey-com/ai-agent-api-setup list
```

Render a Codex provider:

```bash
npx github:omniakey-com/ai-agent-api-setup render \
  --client codex \
  --protocol openai-responses \
  --base-url https://gateway.example.com/v1 \
  --model gpt-example \
  --key-env CUSTOM_API_KEY
```

Probe authentication and model listing after exporting the key locally:

```bash
read -s CUSTOM_API_KEY
export CUSTOM_API_KEY
npx github:omniakey-com/ai-agent-api-setup doctor \
  --protocol openai-responses \
  --base-url https://gateway.example.com/v1 \
  --key-env CUSTOM_API_KEY
```

The hidden prompt keeps the key out of shell history. The CLI deliberately has
no `--api-key` option, keeping secrets out of process lists.

## Agent Skill

The root [SKILL.md](SKILL.md) provides a reusable workflow for coding agents.
For Codex, clone it into the personal skills directory:

```bash
git clone https://github.com/omniakey-com/ai-agent-api-setup.git \
  ~/.codex/skills/ai-agent-api-setup
```

Then ask:

```text
Use $ai-agent-api-setup to connect Codex to my Responses-compatible gateway.
```

## Profiles

The generic profile is the default. Provider profiles are plain JSON and may
define a public base URL, model placeholder, and API-key environment-variable
name. OmniAKey is included as one optional example; the generator does not
prefer or require it.

## Development

```bash
npm test
npm run build
python3 -m http.server 4173 --directory _site
```

The project uses no runtime package dependencies. CI tests every advertised
client/protocol combination and builds the static GitHub Pages artifact.

## Security

Read [SECURITY.md](SECURITY.md). Never put a real key in an issue, screenshot,
downloaded config, or command argument.

## License

[MIT](LICENSE)
