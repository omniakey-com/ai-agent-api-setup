import {
  clients,
  operatingSystems,
  protocols,
} from "./lib/catalog.mjs";
import { renderConfig, renderDoctorCommand } from "./lib/render-config.mjs";

const visibleProtocols = protocols.filter((protocol) => protocol.id !== "gemini");
const elements = {
  form: document.querySelector("#config-form"),
  profile: document.querySelector("#profile"),
  protocolOptions: document.querySelector("#protocol-options"),
  clientOptions: document.querySelector("#client-options"),
  osControl: document.querySelector("#os-control"),
  osOptions: document.querySelector("#os-options"),
  baseUrl: document.querySelector("#base-url"),
  model: document.querySelector("#model"),
  keyEnv: document.querySelector("#key-env"),
  contextWindow: document.querySelector("#context-window"),
  maxOutput: document.querySelector("#max-output"),
  advancedControls: document.querySelector("#advanced-controls"),
  output: document.querySelector("#config-output"),
  outputStatus: document.querySelector("#output-status"),
  outputTarget: document.querySelector("#output-target"),
  error: document.querySelector("#error-message"),
  notes: document.querySelector("#config-notes"),
  doctorCommand: document.querySelector("#doctor-command"),
  compatibilityBody: document.querySelector("#compatibility-body"),
  copyButton: document.querySelector("#copy-button"),
  downloadButton: document.querySelector("#download-button"),
  copyDoctorButton: document.querySelector("#copy-doctor-button"),
  copyCliButton: document.querySelector("#copy-cli-button"),
  toast: document.querySelector("#toast"),
};

const state = {
  profiles: [],
  profile: "custom",
  protocol: "openai-responses",
  client: "codex",
  os: "posix",
  rendered: null,
};

let toastTimer;

function profileById(profileId) {
  return state.profiles.find((profile) => profile.id === profileId);
}

function clientById(clientId) {
  return clients.find((client) => client.id === clientId);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 1800);
}

async function copyText(value, message) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast(message);
}

function inputState() {
  return {
    client: state.client,
    protocol: state.protocol,
    baseUrl: elements.baseUrl.value,
    model: elements.model.value,
    keyEnv: elements.keyEnv.value,
    os: state.os,
    contextWindow: elements.contextWindow.value,
    maxOutput: elements.maxOutput.value,
  };
}

function createSegment(container, items, selectedId, onSelect) {
  container.replaceChildren();
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "segment-button";
    button.dataset.id = item.id;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(item.id === selectedId));
    button.textContent = item.name;
    button.addEventListener("click", () => onSelect(item.id));
    container.append(button);
  }
}

function renderProtocolOptions() {
  createSegment(elements.protocolOptions, visibleProtocols, state.protocol, (protocolId) => {
    state.protocol = protocolId;
    const currentClient = clientById(state.client);
    if (!currentClient.protocols.includes(protocolId)) {
      state.client = clients.find((client) => client.protocols.includes(protocolId)).id;
    }
    const profile = profileById(state.profile);
    elements.baseUrl.value = profile.endpoints[protocolId];
    refreshControls();
    renderOutput();
  });
}

function renderClientOptions() {
  elements.clientOptions.replaceChildren();
  for (const client of clients) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "client-button";
    button.dataset.id = client.id;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(client.id === state.client));
    button.title = `${client.name}: ${client.mode}`;

    const mark = document.createElement("span");
    mark.className = "client-mark";
    mark.textContent = client.mark;
    mark.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "client-name";
    name.textContent = client.name;

    const mode = document.createElement("span");
    mode.className = `mode-dot ${client.mode}`;
    mode.setAttribute("aria-label", client.mode);

    button.append(mark, name, mode);
    button.addEventListener("click", () => {
      state.client = client.id;
      if (!client.protocols.includes(state.protocol)) {
        state.protocol = client.protocols[0];
        const profile = profileById(state.profile);
        elements.baseUrl.value = profile.endpoints[state.protocol];
      }
      refreshControls();
      renderOutput();
    });
    elements.clientOptions.append(button);
  }
}

function renderOsOptions() {
  createSegment(elements.osOptions, operatingSystems, state.os, (osId) => {
    state.os = osId;
    renderOsOptions();
    renderOutput();
  });
}

function shouldShowOs() {
  return ["claude-code", "aider"].includes(state.client);
}

function shouldShowLimits() {
  return ["openclaw", "cline"].includes(state.client);
}

function refreshControls() {
  renderProtocolOptions();
  renderClientOptions();
  renderOsOptions();
  elements.osControl.hidden = !shouldShowOs();
  elements.advancedControls.hidden = !shouldShowLimits();
}

function updateUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("client", state.client);
  url.searchParams.set("protocol", state.protocol);
  url.searchParams.set("profile", state.profile);
  window.history.replaceState({}, "", url);
}

function renderNotes(notes) {
  elements.notes.replaceChildren();
  for (const note of notes) {
    const item = document.createElement("li");
    item.textContent = note;
    elements.notes.append(item);
  }
}

function renderOutput() {
  try {
    const result = renderConfig(inputState());
    state.rendered = result;
    elements.output.textContent = result.content;
    elements.outputTarget.textContent = result.filename;
    elements.outputStatus.textContent = result.mode;
    elements.outputStatus.className = `status-badge ${result.mode}`;
    elements.doctorCommand.textContent = renderDoctorCommand(inputState());
    renderNotes(result.notes);
    elements.error.hidden = true;
    elements.copyButton.disabled = false;
    elements.downloadButton.disabled = false;
    updateUrl();
  } catch (error) {
    state.rendered = null;
    elements.error.textContent = error.message;
    elements.error.hidden = false;
    elements.copyButton.disabled = true;
    elements.downloadButton.disabled = true;
  }
}

function downloadConfig() {
  if (!state.rendered) return;
  const filenameByClient = {
    codex: "config.toml",
    openclaw: "openclaw.json",
    hermes: "config.yaml",
    opencode: "opencode.json",
    "claude-code": state.os === "windows" ? "claude-code.ps1" : "claude-code.sh",
    aider: state.os === "windows" ? "aider.ps1" : "aider.sh",
    cursor: "cursor-setup.txt",
    cline: "cline-setup.txt",
  };
  const blob = new Blob([`${state.rendered.content}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameByClient[state.client] ?? "agent-api-config.txt";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Downloaded");
}

function renderMatrix() {
  elements.compatibilityBody.replaceChildren();
  for (const client of clients) {
    const row = document.createElement("tr");
    const clientCell = document.createElement("td");
    const clientLabel = document.createElement("div");
    clientLabel.className = "matrix-client";
    const mark = document.createElement("span");
    mark.className = "client-mark";
    mark.textContent = client.mark;
    mark.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.textContent = client.name;
    clientLabel.append(mark, name);
    clientCell.append(clientLabel);
    row.append(clientCell);

    for (const protocolId of ["openai-chat", "openai-responses", "anthropic"]) {
      const cell = document.createElement("td");
      const supported = client.protocols.includes(protocolId);
      cell.textContent = supported ? "Yes" : "-";
      cell.className = supported ? "compat-yes" : "compat-no";
      row.append(cell);
    }

    const modeCell = document.createElement("td");
    modeCell.className = "mode-label";
    modeCell.textContent = client.mode;
    row.append(modeCell);

    const sourceCell = document.createElement("td");
    const sourceLink = document.createElement("a");
    sourceLink.className = "source-link";
    sourceLink.href = client.source;
    sourceLink.target = "_blank";
    sourceLink.rel = "noreferrer";
    sourceLink.textContent = "Docs";
    sourceCell.append(sourceLink);
    row.append(sourceCell);
    elements.compatibilityBody.append(row);
  }
}

function applyProfile(profileId) {
  const profile = profileById(profileId);
  state.profile = profile.id;
  elements.profile.value = profile.id;
  elements.baseUrl.value = profile.endpoints[state.protocol];
  elements.model.value = profile.model;
  elements.keyEnv.value = profile.keyEnv;
  renderOutput();
}

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const requestedProfile = params.get("profile");
  const requestedClient = params.get("client");
  const requestedProtocol = params.get("protocol");

  if (profileById(requestedProfile)) state.profile = requestedProfile;
  if (clientById(requestedClient)) state.client = requestedClient;
  const client = clientById(state.client);
  if (visibleProtocols.some((protocol) => protocol.id === requestedProtocol)) {
    state.protocol = requestedProtocol;
  }
  if (!client.protocols.includes(state.protocol)) {
    state.protocol = client.protocols[0];
  }
}

async function init() {
  const response = await fetch("./profiles.json");
  if (!response.ok) throw new Error(`Failed to load profiles: HTTP ${response.status}`);
  state.profiles = await response.json();
  readInitialState();

  for (const profile of state.profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    elements.profile.append(option);
  }

  const profile = profileById(state.profile);
  elements.profile.value = profile.id;
  elements.baseUrl.value = profile.endpoints[state.protocol];
  elements.model.value = profile.model;
  elements.keyEnv.value = profile.keyEnv;

  refreshControls();
  renderMatrix();
  renderOutput();

  elements.profile.addEventListener("change", () => applyProfile(elements.profile.value));
  elements.form.addEventListener("input", renderOutput);
  elements.copyButton.addEventListener("click", () => {
    if (state.rendered) copyText(state.rendered.content, "Configuration copied");
  });
  elements.downloadButton.addEventListener("click", downloadConfig);
  elements.copyDoctorButton.addEventListener("click", () =>
    copyText(elements.doctorCommand.textContent, "Test command copied"),
  );
  elements.copyCliButton.addEventListener("click", () =>
    copyText("npx github:omniakey-com/ai-agent-api-setup list", "CLI command copied"),
  );

}

init().catch((error) => {
  elements.error.textContent = error.message;
  elements.error.hidden = false;
});
