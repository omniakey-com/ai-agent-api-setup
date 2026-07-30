import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { resolve } from "node:path";
import { probeEndpoint } from "../bin/agent-api-setup.mjs";
import { protocols } from "../src/catalog.mjs";

const CLI = resolve("bin/agent-api-setup.mjs");

function runCli(args, env = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
  });
}

test("render selects the client's first protocol when protocol is omitted", async () => {
  const result = await runCli([
    "render",
    "--client",
    "codex",
    "--profile",
    "omniakey",
    "--model",
    "gpt-test",
  ]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /wire_api = "responses"/);
  assert.match(result.stdout, /https:\/\/api\.omniakey\.com\/v1/);
});

test("doctor probes the model endpoint with a bearer key", async (t) => {
  let requestHeaders;
  let requestUrl;
  const server = createServer((request, response) => {
    requestHeaders = request.headers;
    requestUrl = request.url;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: [{ id: "model-a" }] }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();

  const result = await runCli(
    [
      "doctor",
      "--protocol",
      "openai-chat",
      "--base-url",
      `http://127.0.0.1:${address.port}/v1`,
      "--key-env",
      "DOCTOR_TEST_KEY",
    ],
    { DOCTOR_TEST_KEY: "test-secret" },
  );

  assert.equal(result.code, 0, result.stderr);
  assert.equal(requestUrl, "/v1/models");
  assert.equal(requestHeaders.authorization, "Bearer test-secret");
  assert.match(result.stdout, /Models returned: 1/);
  assert.doesNotMatch(result.stdout, /test-secret/);
});

test("doctor fails before a request when the environment variable is missing", async () => {
  const result = await runCli([
    "doctor",
    "--protocol",
    "openai-chat",
    "--base-url",
    "https://gateway.example.com/v1",
    "--key-env",
    "DEFINITELY_MISSING_KEY",
  ]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /DEFINITELY_MISSING_KEY is not set/);
});

test("probe paths do not duplicate protocol version segments", () => {
  const anthropic = protocols.find((protocol) => protocol.id === "anthropic");
  const gemini = protocols.find((protocol) => protocol.id === "gemini");
  assert.equal(
    probeEndpoint("https://gateway.example.com/v1", anthropic),
    "https://gateway.example.com/v1/models",
  );
  assert.equal(
    probeEndpoint("https://gateway.example.com/v1beta", gemini),
    "https://gateway.example.com/v1beta/models",
  );
});
