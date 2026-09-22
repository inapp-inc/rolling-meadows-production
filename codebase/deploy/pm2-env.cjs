"use strict";

const fs = require("fs");
const path = require("path");

const APP_NAME = "case-management-app";
const PLACEHOLDER_JWT = "change-me-use-openssl-rand-hex-32";

const PROCESS_OVERLAY_KEYS = [
  "HOST",
  "APP_PORT",
  "APP_BASE_PATH",
  "DATABASE_URL",
  "PUBLIC_HOST",
  "PUBLIC_SCHEME",
];

function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }
  const env = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeBasePath(value, fallback) {
  const raw = String(value || fallback || "").trim();
  if (!raw) return "";
  const withLeading = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeading.replace(/\/+$/, "") || withLeading;
}

function normalizeHost(host) {
  return String(host || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

function applyBareMetalDefaults(root, raw = {}) {
  let env = { ...raw };
  const appPort = String(env.APP_PORT || "4510");
  env.NODE_ENV = env.NODE_ENV || "production";
  env.TRUST_PROXY = env.TRUST_PROXY || "1";
  env.HOST = env.HOST || "127.0.0.1";
  env.APP_PORT = appPort;
  env.APP_BASE_PATH = normalizeBasePath(env.APP_BASE_PATH, "/case-management");

  const brandingDir = path.join(root, "branding");
  const staticDir = path.join(root, "web", "dist");
  env.STATIC_DIR = env.STATIC_DIR || staticDir;
  env.BRANDING_DIR = env.BRANDING_DIR || brandingDir;
  env.PYTHONUNBUFFERED = "1";
  env.TRUST_PROXY = env.TRUST_PROXY || "1";

  const pgUser = env.POSTGRES_USER || "case_management";
  const pgPass = env.POSTGRES_PASSWORD || "";
  const pgHost = env.POSTGRES_HOST || "127.0.0.1";
  const pgPort = env.POSTGRES_PORT || "5432";
  const pgDb = env.POSTGRES_DB || "case_management";
  if (!env.DATABASE_URL || env.DATABASE_URL.includes("@postgres:")) {
    env.DATABASE_URL =
      env.DATABASE_URL ||
      `postgresql+asyncpg://${pgUser}:${pgPass}@${pgHost}:${pgPort}/${pgDb}`;
  }

  env.VITE_API_BASE_URL = env.VITE_API_BASE_URL || `${env.APP_BASE_PATH}/api`;
  env.VITE_BASE_PATH = env.VITE_BASE_PATH || env.APP_BASE_PATH;

  const host = normalizeHost(env.PUBLIC_HOST);
  if (host) {
    const scheme =
      String(env.PUBLIC_SCHEME || "https").trim().toLowerCase() === "http"
        ? "http"
        : "https";
    env.PUBLIC_HOST = host;
    env.PUBLIC_URL =
      env.PUBLIC_URL || `${scheme}://${host}${env.APP_BASE_PATH}`;
    env.CORS_ORIGINS = env.CORS_ORIGINS || `${scheme}://${host}`;
  }

  return env;
}

function overlayProcessEnv(env, processEnv = process.env) {
  const next = { ...env };
  for (const key of PROCESS_OVERLAY_KEYS) {
    if (processEnv[key]) next[key] = processEnv[key];
  }
  return next;
}

function assertProductionSecrets(env) {
  if (!env.JWT_SECRET || env.JWT_SECRET === PLACEHOLDER_JWT) {
    throw new Error("set JWT_SECRET in deploy/.env before starting PM2");
  }
  if (!env.POSTGRES_PASSWORD || env.POSTGRES_PASSWORD === "change-me-postgres-password") {
    throw new Error("set POSTGRES_PASSWORD in deploy/.env before starting PM2");
  }
}

function appSpec({ root, logDir, env }) {
  const apiDir = path.join(root, "api");
  const python = path.join(apiDir, ".venv", "bin", "python");
  return {
    name: APP_NAME,
    cwd: apiDir,
    script: python,
    args: `-m uvicorn app.main:app --host ${env.HOST || "127.0.0.1"} --port ${env.APP_PORT || "4510"}`,
    interpreter: "none",
    instances: 1,
    exec_mode: "fork",
    watch: false,
    autorestart: true,
    max_memory_restart: "768M",
    kill_timeout: 8000,
    exp_backoff_restart_delay: 200,
    time: true,
    merge_logs: true,
    error_file: path.join(logDir, `${APP_NAME}-error.log`),
    out_file: path.join(logDir, `${APP_NAME}-out.log`),
    env,
  };
}

function loadRawEnv({ root, env, envFile } = {}) {
  if (env) return { ...env };
  const file = envFile || path.join(root, "deploy", ".env");
  if (!fs.existsSync(file)) {
    throw new Error(`missing ${file} — copy deploy/.env.example and set secrets`);
  }
  return parseEnvFile(file);
}

function buildPm2Apps(options = {}) {
  const root = options.root || path.resolve(__dirname, "..");
  const logDir = options.logDir || path.join(root, "logs");
  const raw = overlayProcessEnv(loadRawEnv({ root, env: options.env, envFile: options.envFile }));
  const env = applyBareMetalDefaults(root, raw);
  if (options.requireSecrets !== false) {
    assertProductionSecrets(env);
  }
  if (options.ensureDirs !== false) {
    fs.mkdirSync(logDir, { recursive: true });
    fs.mkdirSync(path.join(root, "branding"), { recursive: true });
    fs.mkdirSync(path.join(root, "web", "dist"), { recursive: true });
    fs.mkdirSync(path.join(root, "api", "seed-data"), { recursive: true });
  }

  return {
    apps: [
      appSpec({
        root,
        logDir,
        env,
      }),
    ],
  };
}

module.exports = {
  APP_NAME,
  parseEnvFile,
  applyBareMetalDefaults,
  assertProductionSecrets,
  overlayProcessEnv,
  buildPm2Apps,
};
