import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CLAUDE_CMD = process.env.CLAUDE_CLI_PATH ?? "claude";

export type CliRequest = {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
};

export type CliResponse = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
};

type CliJsonResult = {
  type: "result";
  result: string;
  session_id: string;
  total_cost_usd: number;
  duration_ms: number;
  duration_api_ms: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  num_turns: number;
  model?: string;
  is_error?: boolean;
};

function writeTempFile(content: string, prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), "ocp-"));
  const filepath = join(dir, `${prefix}.txt`);
  writeFileSync(filepath, content, "utf-8");
  return filepath;
}

function runClaudeCli(
  systemPromptFile: string,
  userMessageFile: string,
  extraArgs: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptContent = process.platform === "win32"
      ? buildPowerShellScript(systemPromptFile, userMessageFile, extraArgs)
      : buildBashScript(systemPromptFile, userMessageFile, extraArgs);

    const shell = process.platform === "win32" ? "powershell.exe" : "bash";
    const shellArgs = process.platform === "win32"
      ? ["-NoProfile", "-NonInteractive", "-Command", scriptContent]
      : ["-c", scriptContent];

    const child = spawn(shell, shellArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5 * 60 * 1000,
      cwd: tmpdir(),
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.stdin.end();

    child.on("close", (code) => {
      if (code !== 0 && !stdout.includes('"type":"result"')) {
        reject(new Error(`claude exited ${code}: ${stderr || stdout}`));
      } else {
        resolve(stdout);
      }
    });

    child.on("error", reject);
  });
}

function buildPowerShellScript(
  sysFile: string,
  msgFile: string,
  extraArgs: string[]
): string {
  const argsStr = extraArgs.map((a) => `'${a}'`).join(", ");
  return `$sys = Get-Content -Raw '${sysFile}'; $msg = Get-Content -Raw '${msgFile}'; & ${CLAUDE_CMD} --print --no-session-persistence ${argsStr} --system-prompt $sys $msg`;
}

function buildBashScript(
  sysFile: string,
  msgFile: string,
  extraArgs: string[]
): string {
  const argsStr = extraArgs.map((a) => `'${a}'`).join(" ");
  return `${CLAUDE_CMD} --print --no-session-persistence ${argsStr} --system-prompt "$(cat '${sysFile}')" "$(cat '${msgFile}')"`;
}

export async function callClaudeCli(
  request: CliRequest
): Promise<CliResponse> {
  const model = request.model ?? "sonnet";
  const start = Date.now();

  const sysFile = writeTempFile(request.systemPrompt, "sys");
  const msgFile = writeTempFile(request.userMessage, "msg");

  try {
    const extraArgs = [
      "--output-format", "json",
      "--model", model,
    ];

    const stdout = await runClaudeCli(sysFile, msgFile, extraArgs);
    const parsed = JSON.parse(stdout.trim()) as CliJsonResult;

    if (parsed.is_error) {
      throw new Error(`Claude CLI error: ${parsed.result}`);
    }

    return {
      content: parsed.result,
      model: parsed.model ?? model,
      inputTokens: parsed.usage?.input_tokens ?? 0,
      outputTokens: parsed.usage?.output_tokens ?? 0,
      costUsd: parsed.total_cost_usd ?? 0,
      durationMs: parsed.duration_ms ?? Date.now() - start,
    };
  } finally {
    try { unlinkSync(sysFile); } catch { /* ignore */ }
    try { unlinkSync(msgFile); } catch { /* ignore */ }
  }
}

export async function callClaudeCliRaw(
  prompt: string,
  options?: { model?: string; systemPrompt?: string }
): Promise<string> {
  const sysFile = writeTempFile(
    options?.systemPrompt ?? "You are a helpful assistant.",
    "sys"
  );
  const msgFile = writeTempFile(prompt, "msg");

  try {
    const extraArgs = ["--model", options?.model ?? "sonnet"];
    const stdout = await runClaudeCli(sysFile, msgFile, extraArgs);
    return stdout.trim();
  } finally {
    try { unlinkSync(sysFile); } catch { /* ignore */ }
    try { unlinkSync(msgFile); } catch { /* ignore */ }
  }
}
