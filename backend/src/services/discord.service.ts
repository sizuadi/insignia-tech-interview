import axios from 'axios';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string; icon_url?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  tts?: boolean;
  embeds?: DiscordEmbed[];
  [key: string]: unknown;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  statusCode?: number;
}

export const validateDiscordPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Payload must be a JSON object';
  }
  const p = payload as DiscordWebhookPayload;
  if (!p.content && (!p.embeds || p.embeds.length === 0)) {
    return 'Payload must include at least "content" or one "embeds" entry';
  }
  if (p.content && typeof p.content !== 'string') {
    return '"content" must be a string';
  }
  if (p.content && p.content.length > 2000) {
    return '"content" must be 2000 characters or fewer';
  }
  if (p.embeds && (!Array.isArray(p.embeds) || p.embeds.length > 10)) {
    return '"embeds" must be an array with at most 10 items';
  }
  return null;
};

export const sendDiscordWebhook = async (
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<WebhookResult> => {
  const validationError = validateDiscordPayload(payload);
  if (validationError) {
    return { success: false, message: `Invalid payload: ${validationError}` };
  }

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    return {
      success: true,
      message: `Webhook sent successfully (HTTP ${response.status})`,
      statusCode: response.status,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const statusCode = err.response?.status;
      const errorBody = err.response?.data;
      const message =
        typeof errorBody === 'object' && errorBody !== null
          ? JSON.stringify(errorBody)
          : err.message;
      return {
        success: false,
        message: `Webhook failed (HTTP ${statusCode}): ${message}`,
        statusCode,
      };
    }
    return {
      success: false,
      message: `Webhook failed: ${(err as Error).message}`,
    };
  }
};
