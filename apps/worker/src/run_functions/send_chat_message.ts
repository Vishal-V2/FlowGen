import { ExecutionEnvironment, PhaseEnvironment } from "../schema/environment";

// Only official webhook hosts are allowed, so a workflow cannot be used to
// make the worker send requests to arbitrary or internal addresses (SSRF).
const PLATFORMS = {
  Discord: {
    hosts: ["discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com"],
    pathPrefix: "/api/webhooks/",
    maxLength: 2000,
    payload: (text: string) => ({ content: text }),
  },
  Slack: {
    hosts: ["hooks.slack.com"],
    pathPrefix: "/services/",
    maxLength: 3900,
    payload: (text: string) => ({ text }),
  },
} as const;

type Platform = keyof typeof PLATFORMS;

const REQUEST_TIMEOUT_MS = 10_000;

function formatData(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function buildText(message: string, data: string | undefined, maxLength: number) {
  const base = message.trim();
  if (!data || !data.trim()) {
    return base.length > maxLength ? base.slice(0, maxLength - 1) + "…" : base;
  }

  const open = "\n```\n";
  const close = "\n```";
  const truncatedNote = "\n… (truncated)";
  const body = formatData(data);
  const room = maxLength - base.length - open.length - close.length;

  if (room <= truncatedNote.length) {
    return base.slice(0, maxLength);
  }
  if (body.length <= room) {
    return base + open + body + close;
  }
  const cut = room - truncatedNote.length;
  return base + open + body.slice(0, cut) + truncatedNote + close;
}

function maskUrl(url: URL) {
  return `${url.protocol}//${url.host}/…`;
}

export const SendChatMessageExecutor = async (
  environmentio: PhaseEnvironment,
  environmentFn: ExecutionEnvironment
) => {
  try {
    const platformName = environmentio.inputs["Platform"] as Platform;
    const platform = PLATFORMS[platformName];
    if (!platform) {
      environmentFn.log.ERROR("Select a platform: Discord or Slack.");
      return false;
    }

    const rawUrl = environmentio.inputs["Webhook URL"]?.trim();
    if (!rawUrl) {
      environmentFn.log.ERROR("Webhook URL is required.");
      return false;
    }

    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      environmentFn.log.ERROR("Webhook URL is not a valid URL.");
      return false;
    }

    // The webhook URL is a secret. Phase inputs are stored and shown in the
    // run history, so replace it with a masked version.
    environmentio.inputs["Webhook URL"] = maskUrl(url);

    if (
      url.protocol !== "https:" ||
      !(platform.hosts as readonly string[]).includes(url.hostname) ||
      !url.pathname.startsWith(platform.pathPrefix)
    ) {
      environmentFn.log.ERROR(
        `This is not a ${platformName} webhook URL. Expected https://${platform.hosts[0]}${platform.pathPrefix}…`
      );
      return false;
    }

    const message = environmentio.inputs["Message"];
    if (!message || !message.trim()) {
      environmentFn.log.ERROR("Message is required.");
      return false;
    }

    const text = buildText(message, environmentio.inputs["Data"], platform.maxLength);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(platform.payload(text)),
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      environmentFn.log.ERROR(
        `${platformName} rejected the message (HTTP ${response.status})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }

    environmentFn.log.INFO(`Message sent to ${platformName} (${text.length} characters).`);
    return true;
  } catch (err: any) {
    const reason =
      err?.name === "TimeoutError"
        ? `no response within ${REQUEST_TIMEOUT_MS / 1000}s`
        : err?.message;
    environmentFn.log.ERROR(`Failed to send message: ${reason}`);
    return false;
  }
};
