import test from "node:test";
import assert from "node:assert/strict";
import { clients } from "../src/catalog.mjs";
import { normalizeOptions, renderConfig, renderDoctorCommand } from "../src/render-config.mjs";

const baseInput = {
  baseUrl: "https://gateway.example.com/v1/",
  model: "example/model",
  keyEnv: "TEST_API_KEY",
  os: "posix",
  contextWindow: 200000,
  maxOutput: 32000,
};

test("renders every advertised client and protocol combination", () => {
  for (const client of clients) {
    for (const protocol of client.protocols) {
      const result = renderConfig({ ...baseInput, client: client.id, protocol });
      assert.equal(result.client.id, client.id);
      assert.equal(result.mode, client.mode);
      assert.ok(result.content.length > 20);
      assert.ok(!result.content.includes("sk-test"));
      assert.equal(result.options.baseUrl, "https://gateway.example.com/v1");
    }
  }
});

test("Codex uses a custom Responses provider without embedding a key", () => {
  const result = renderConfig({
    ...baseInput,
    client: "codex",
    protocol: "openai-responses",
    model: "gpt-example",
  });
  assert.match(result.content, /wire_api = "responses"/);
  assert.match(result.content, /env_key = "TEST_API_KEY"/);
  assert.doesNotMatch(result.content, /api_key\s*=/i);
});

test("OpenClaw renders environment expansion and protocol mode", () => {
  const result = renderConfig({
    ...baseInput,
    client: "openclaw",
    protocol: "anthropic",
  });
  const parsed = JSON.parse(result.content);
  assert.equal(parsed.models.providers["custom-api"].api, "anthropic-messages");
  assert.equal(parsed.models.providers["custom-api"].apiKey, "${TEST_API_KEY}");
  assert.equal(parsed.models.providers["custom-api"].models[0].contextWindow, 200000);
});

test("OpenCode uses documented environment substitution", () => {
  const result = renderConfig({
    ...baseInput,
    client: "opencode",
    protocol: "openai-chat",
  });
  const parsed = JSON.parse(result.content);
  assert.equal(parsed.provider["custom-api"].options.apiKey, "{env:TEST_API_KEY}");
  assert.equal(parsed.provider["custom-api"].npm, "@ai-sdk/openai-compatible");
});

test("rejects unsupported client and protocol combinations", () => {
  assert.throws(
    () =>
      normalizeOptions({
        ...baseInput,
        client: "codex",
        protocol: "openai-chat",
      }),
    /does not support OpenAI Chat/,
  );
});

test("rejects unsafe environment-variable names and URL schemes", () => {
  assert.throws(
    () =>
      normalizeOptions({
        ...baseInput,
        client: "aider",
        protocol: "openai-chat",
        keyEnv: "KEY; echo leaked",
      }),
    /must use A-Z/,
  );
  assert.throws(
    () =>
      normalizeOptions({
        ...baseInput,
        client: "aider",
        protocol: "openai-chat",
        baseUrl: "file:///tmp/api",
      }),
    /must use http/,
  );
  assert.throws(
    () =>
      normalizeOptions({
        ...baseInput,
        client: "aider",
        protocol: "openai-chat",
        baseUrl: "https://gateway.example.com/v1?key=secret",
      }),
    /must not contain credentials/,
  );
});

test("doctor command contains only an environment-variable name", () => {
  const command = renderDoctorCommand({
    ...baseInput,
    client: "codex",
    protocol: "openai-responses",
  });
  assert.match(command, /--key-env TEST_API_KEY/);
  assert.doesNotMatch(command, /sk-/);
});
