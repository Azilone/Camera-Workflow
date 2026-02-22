import { Action, ActionPanel, Detail, Icon, LaunchType, Toast, environment, open, showToast } from "@raycast/api";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { useEffect, useMemo, useState } from "react";

export type ConversionPreset = "google-photos" | "high-quality" | "max-compression" | "custom";

export type ConversionFormValues = {
  source: string;
  destination: string;
  preset: ConversionPreset;
  dryRun: boolean;
  jobs: string;
  photoFormat: "avif" | "webp";
  photoQualityAvif: string;
  photoQualityWebp: string;
  videoCodec: "h265" | "h264" | "av1";
  videoCrf: string;
};

export type LastRunRecord = {
  timestamp: string;
  source: string;
  destination: string;
  dryRun: boolean;
  args: string[];
  status: "success" | "failure";
  logPath?: string;
  summary: string[];
};

type Props = {
  values: ConversionFormValues;
  mediaConverterPath: string;
  runtimePath?: string;
  allowPathFallback?: boolean;
  onCompleted?: (record: LastRunRecord) => Promise<void>;
};

function buildArgs(values: ConversionFormValues): string[] {
  return [
    ...(values.dryRun ? ["--dry-run"] : []),
    `--photo-format=${values.photoFormat}`,
    `--photo-quality-avif=${values.photoQualityAvif}`,
    `--photo-quality-webp=${values.photoQualityWebp}`,
    `--video-codec=${values.videoCodec}`,
    `--video-crf=${values.videoCrf}`,
    `--jobs=${values.jobs || "2"}`,
    values.source,
    values.destination,
  ];
}

function parseSummary(logLines: string[]): string[] {
  const wanted = [
    "Files processed:",
    "Files skipped",
    "Files verified",
    "Total time:",
    "Original size:",
    "Compressed size:",
    "Space saved:",
    "Converted files in:",
    "Detailed logs:",
  ];

  const summary: string[] = [];
  for (const line of logLines) {
    const normalized = line.replace(/^\[[^\]]+\]\s*/, "").trim();
    if (wanted.some((w) => normalized.includes(w))) {
      summary.push(normalized.replace(/^[-–•\s]+/, ""));
    }
  }

  return Array.from(new Set(summary));
}

function markdownForState(lines: string[], status: "running" | "success" | "failure", summary: string[]) {
  const statusLabel = status === "running" ? "🟡 In Progress" : status === "success" ? "🟢 Completed" : "🔴 Failed";

  return `# Backup Preparation Run\n\n**Status:** ${statusLabel}\n\n## Live Process Output\n\n\`\`\`\n${lines.slice(-240).join("\n")}\n\`\`\`\n\n## Backup Report\n${summary.length ? summary.map((line) => `- ${line}`).join("\n") : "- Waiting for report metrics..."}`;
}

export default function ConversionRunView({ values, mediaConverterPath, runtimePath, allowPathFallback, onCompleted }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<"running" | "success" | "failure">("running");
  const [summary, setSummary] = useState<string[]>([]);
  const [logPath, setLogPath] = useState<string | undefined>();

  const args = useMemo(() => buildArgs(values), [values]);

  useEffect(() => {
    let canceled = false;
    let finalized = false;
    let usedPathFallback = false;
    let activeChild: ChildProcessWithoutNullStreams | null = null;
    const capturedLines: string[] = [];
    let capturedLogPath: string | undefined;
    const canFallbackToPath = Boolean(
      allowPathFallback &&
        environment.isDevelopment &&
        process.env.CAMERA_WORKFLOW_ALLOW_PATH_FALLBACK === "1",
    );

    const pushLine = (line: string) => {
      if (canceled) return;
      capturedLines.push(line);
      setLines((prev) => [...prev, line]);

      if (line.includes("Detailed logs:")) {
        const path = line.split("Detailed logs:")[1]?.trim();
        if (path) {
          capturedLogPath = path;
          setLogPath(path);
        }
      }
    };

    const finalize = async (success: boolean, failureMessage?: string) => {
      if (canceled || finalized) return;
      finalized = true;

      const finalSummary = parseSummary(capturedLines);
      if (!success && failureMessage) {
        finalSummary.push(failureMessage);
      }

      setStatus(success ? "success" : "failure");
      setSummary(finalSummary);

      await showToast({
        style: success ? Toast.Style.Success : Toast.Style.Failure,
        title: success ? "Backup preparation completed" : "Backup preparation failed",
        message: success ? "Prepared library is ready" : failureMessage || "See log output for details",
      });

      if (!onCompleted) return;
      await onCompleted({
        timestamp: new Date().toISOString(),
        source: values.source,
        destination: values.destination,
        dryRun: values.dryRun,
        args,
        status: success ? "success" : "failure",
        logPath: capturedLogPath,
        summary: finalSummary,
      });
    };

    const spawnCommand = (command: string): ChildProcessWithoutNullStreams => {
      const childProcess = spawn(command, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PATH: runtimePath || process.env.PATH,
        },
      });
      childProcess.stdout.setEncoding("utf8");
      childProcess.stderr.setEncoding("utf8");

      childProcess.stdout.on("data", (chunk: string) => {
        chunk
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .filter(Boolean)
          .forEach(pushLine);
      });

      childProcess.stderr.on("data", (chunk: string) => {
        chunk
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .filter(Boolean)
          .forEach((line) => pushLine(`[stderr] ${line}`));
      });

      childProcess.on("error", (error: NodeJS.ErrnoException) => {
        if (!usedPathFallback && canFallbackToPath) {
          usedPathFallback = true;
          pushLine("[stderr] Embedded binary not available, retrying with PATH fallback.");
          activeChild = spawnCommand("media-converter");
          return;
        }

        void finalize(false, `Failed to launch converter: ${error.message}`);
      });

      childProcess.on("close", (code) => {
        if (usedPathFallback && command !== "media-converter") {
          return;
        }
        if (code === 0) {
          void finalize(true);
          return;
        }
        void finalize(false, `Exit code ${code ?? "unknown"}`);
      });

      return childProcess;
    };

    activeChild = spawnCommand(mediaConverterPath);

    return () => {
      canceled = true;
      if (activeChild && !activeChild.killed) activeChild.kill("SIGTERM");
    };
  }, []);

  return (
    <Detail
      markdown={markdownForState(lines, status, summary)}
      actions={
        <ActionPanel>
          {logPath ? <Action title="Open Log File" icon={Icon.Document} onAction={() => open(logPath, LaunchType.UserInitiated)} /> : null}
          <Action
            title="Open Prepared Library"
            icon={Icon.Folder}
            onAction={() => open(values.destination, LaunchType.UserInitiated)}
          />
        </ActionPanel>
      }
    />
  );
}
