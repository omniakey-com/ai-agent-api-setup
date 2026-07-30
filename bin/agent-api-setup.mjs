#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clients, protocols } from "../src/catalog.mjs";
import { normalizeOptions, renderConfig } from "../src/render-config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VALUE_FLAGS = new Set([
  "client",
  "protocol",
  "profile",
  "base-url",
  "model",
  "key-env",
  "os",
  "context-window",
  "max-output",
  "timeout",
]);

function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    if (key === "help") {
      flags.help = true;
      continue;
    }
    if (!VALUE_FLAGS.has(key)) {
      throw new Error(`Unknown option: --${key}`);
    }
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}.`);
    }
    flags[key] = value;
    index += 1;
  }
  return { command, flags };
}

async function readProfile(profileId) {
  const safeId = String(profileId ?? "custom").trim();
  if (!/^[a-z0-9-]+$/.test(safeId)) {
    throw new Error("Profile ID contains unsupported characters.");
  }
  const filename = safeId === "custom" ? "custom-openai-compatible.json" : `${safeId}.json`;
  try {
    const content = await readFile(resolve(ROOT, "profiles", filename), "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Unknown profile: ${safeId}`);
    }
    throw error;
  }
}

function printHelp() {
  console.log(`AI Agent API Setup

Usage:
  agent-api-setup list
  agent-api-setup profiles
  agent-api-setup render --client <id> --protocol <id> --base-url <url> --model <id>
  agent-api-setup render --client codex --profile omniakey --model gpt-5.4
  agent-api-setup doctor --protocol <id> --base-url <url> --key-env <ENV_NAME>

Render options:
  --client <id>           Client ID from "list"
  --protocol <id>         openai-chat, openai-responses, anthropic, or gemini
  --profile <id>          Optional built-in profile (custom or omniakey)
  --base-url <url>        Overrides the selected profile endpoint
  --model <id>            Model identifier
  --key-env <ENV_NAME>    Name of the environment variable holding the key
  --os <posix|windows>    Shell format for Claude Code and Aider
  --context-window <n>    Context size for clients that require model metadata
  --max-output <n>        Maximum output tokens for clients that require metadata

Doctor options:
  --protocol <id>         API protocol to probe
  --base-url <url>        Protocol base URL
  --key-env <ENV_NAME>    Read the key from this environment variable
  --timeout <ms>          Request timeout (default: 10000)

The CLI never accepts an API key as a command-line argument.`);
}

function printList() {
  for (const client of clients) {
    const protocolList = client.protocols.join(", ");
    console.log(`${client.id.padEnd(14)} ${client.mode.padEnd(9)} ${protocolList}`);
  }
}

async function printProfiles() {
  for (const profileId of ["custom", "omniakey"]) {
    const profile = await readProfile(profileId);
    console.log(`${profile.id.padEnd(12)} ${profile.name} - ${profile.description}`);
  }
}

function normalizeBaseUrl(value) {
  const normalized = String(value ?? "").trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("--base-url is required.");
  }
  const parsed = new URL(normalized);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("--base-url must use http:// or https://.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("--base-url must not contain credentials, a query string, or a fragment.");
  }
  return normalized;
}

function normalizeKeyEnv(value) {
  const normalized = String(value ?? "CUSTOM_API_KEY").trim().toUpperCase();
  if (!/^[A-Z_][A-Z0-9_]*$/.test(normalized)) {
    throw new Error("--key-env must use A-Z, 0-9, and underscores.");
  }
  return normalized;
}

async function runRender(flags) {
  if (!flags.client) {
    throw new Error("--client is required.");
  }
  const profile = await readProfile(flags.profile ?? "custom");
  const client = clients.find((item) => item.id === flags.client);
  if (!client) {
    throw new Error(`Unknown client: ${flags.client}`);
  }
  const protocol = flags.protocol ?? client.protocols[0];
  const input = {
    client: flags.client,
    protocol,
    baseUrl: flags["base-url"] ?? profile.endpoints[protocol],
    model: flags.model ?? profile.model,
    keyEnv: flags["key-env"] ?? profile.keyEnv,
    os: flags.os,
    contextWindow: flags["context-window"],
    maxOutput: flags["max-output"],
  };
  const result = renderConfig(input);
  console.log(result.content);
}

function protocolById(protocolId) {
  const protocol = protocols.find((item) => item.id === protocolId);
  if (!protocol) {
    throw new Error(`Unknown protocol: ${protocolId}`);
  }
  return protocol;
}

function joinEndpoint(baseUrl, path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function probeEndpoint(baseUrl, protocol) {
  const parsed = new URL(baseUrl);
  const pathname = parsed.pathname.replace(/\/+$/, "");
  if (protocol.id === "anthropic" && pathname.endsWith("/v1")) {
    return joinEndpoint(baseUrl, "/models");
  }
  if (protocol.id === "gemini" && pathname.endsWith("/v1beta")) {
    return joinEndpoint(baseUrl, "/models");
  }
  return joinEndpoint(baseUrl, protocol.probePath);
}

async function runDoctor(flags) {
  const protocol = protocolById(flags.protocol ?? "openai-chat");
  const baseUrl = normalizeBaseUrl(flags["base-url"]);
  const keyEnv = normalizeKeyEnv(flags["key-env"]);
  const apiKey = process.env[keyEnv];
  if (!apiKey) {
    throw new Error(`${keyEnv} is not set. Export it before running doctor.`);
  }
  const timeout = Number.parseInt(flags.timeout ?? "10000", 10);
  if (!Number.isSafeInteger(timeout) || timeout < 250 || timeout > 120000) {
    throw new Error("--timeout must be between 250 and 120000 milliseconds.");
  }

  const headers = { Accept: "application/json" };
  if (protocol.id === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (protocol.id === "gemini") {
    headers["x-goog-api-key"] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const endpoint = probeEndpoint(baseUrl, protocol);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const startedAt = performance.now();
  let response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "error",
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Probe timed out after ${timeout} ms.`);
    }
    throw new Error(`Probe failed: ${error.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  const elapsed = Math.round(performance.now() - startedAt);
  const body = await response.text();
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const detail = payload?.error?.message ?? payload?.message ?? body.slice(0, 180) ?? "Unknown error";
    throw new Error(`HTTP ${response.status} from ${endpoint}: ${detail}`);
  }

  const models = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.models)
      ? payload.models
      : [];
  console.log(`OK ${response.status} ${elapsed}ms`);
  console.log(`Endpoint: ${endpoint}`);
  if (models.length > 0) {
    console.log(`Models returned: ${models.length}`);
  }
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (flags.help || command === "help" || command === "--help") {
    printHelp();
    return;
  }
  if (command === "list") {
    printList();
    return;
  }
  if (command === "profiles") {
    await printProfiles();
    return;
  }
  if (command === "render") {
    await runRender(flags);
    return;
  }
  if (command === "doctor") {
    await runDoctor(flags);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}

export { isMainModule, joinEndpoint, normalizeKeyEnv, parseArgs, probeEndpoint };
