// --- TypeScript Types for Slack Events ---

export interface SlackAuthorization {
  enterprise_id: string | null;
  team_id: string;
  user_id: string;
  is_bot: boolean;
  is_enterprise_install: boolean;
}

export interface SlackBlock {
  [key: string]: unknown;
}

export interface SlackBaseEvent {
  user: string;
  type: string;
  ts: string;
  team: string;
  channel: string;
  event_ts: string;
  text?: string;
  blocks?: SlackBlock[];
  client_msg_id?: string;
}

export interface SlackMessageEvent extends SlackBaseEvent {
  type: "message";
  channel_type?: "im" | "channel" | "group";
  subtype?: string;
  bot_id?: string;
}

export interface SlackAppMentionEvent extends SlackBaseEvent {
  type: "app_mention";
}

export interface SlackEventCallback {
  token: string;
  team_id: string;
  context_team_id?: string;
  context_enterprise_id?: string | null;
  api_app_id: string;
  event: SlackMessageEvent | SlackAppMentionEvent;
  type: "event_callback";
  event_id: string;
  event_time: number;
  authorizations: SlackAuthorization[];
  is_ext_shared_channel: boolean;
  event_context: string;
}

export interface SlackUrlVerification {
  type: "url_verification";
  challenge: string;
  token: string;
}

export type SlackWebhookPayload = SlackEventCallback | SlackUrlVerification;
