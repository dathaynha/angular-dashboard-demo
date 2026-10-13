import { ClientKind, HttpMethod, ServiceName } from '../models';

// The mock platform: an API gateway in front of seven services and four stores.

/** The dataset ends here, so every screenshot and test sees the same numbers. */
export const NOW = Date.UTC(2026, 9, 12, 12, 0);
export const SEED = 20261012;
export const MINUTE = 60_000;
export const DAY = 1440 * MINUTE;

export type StoreId = 'postgres' | 'redis' | 'nats' | 'blob';

export const STORES: Record<StoreId, string> = {
  postgres: 'PostgreSQL',
  redis: 'Redis',
  nats: 'NATS JetStream',
  blob: 'Blob storage',
};

export const CLIENTS: { kind: ClientKind; label: string; share: number }[] = [
  { kind: 'web', label: 'Web app', share: 0.62 },
  { kind: 'mobile', label: 'Mobile app', share: 0.28 },
  { kind: 'api', label: 'Public API', share: 0.1 },
];

export interface Endpoint {
  method: HttpMethod;
  path: string;
  weight: number;
}

export interface ServiceProfile {
  share: number;
  medianMs: number;
  /** Log-normal sigma of the duration. */
  spread: number;
  serverErrorRate: number;
  clientErrorRate: number;
  /** Where each request mainly lands; the shares sum to 1. */
  stores: Partial<Record<StoreId, number>>;
  endpoints: Endpoint[];
}

export const PROFILES: Record<ServiceName, ServiceProfile> = {
  'accounts-service': {
    share: 0.18,
    medianMs: 28,
    spread: 0.5,
    serverErrorRate: 0.002,
    clientErrorRate: 0.03,
    stores: { postgres: 0.7, redis: 0.3 },
    endpoints: [
      { method: 'GET', path: '/api/accounts/me', weight: 0.4 },
      { method: 'GET', path: '/api/accounts/workspaces', weight: 0.2 },
      { method: 'GET', path: '/api/accounts/workspaces/:id/members', weight: 0.2 },
      { method: 'POST', path: '/api/accounts/sessions', weight: 0.15 },
      { method: 'PATCH', path: '/api/accounts/me', weight: 0.05 },
    ],
  },
  'messenger-service': {
    share: 0.27,
    medianMs: 42,
    spread: 0.55,
    serverErrorRate: 0.003,
    clientErrorRate: 0.025,
    stores: { postgres: 0.8, redis: 0.2 },
    endpoints: [
      { method: 'GET', path: '/api/messenger/conversations', weight: 0.3 },
      { method: 'GET', path: '/api/messenger/conversations/:id/messages', weight: 0.35 },
      { method: 'POST', path: '/api/messenger/conversations/:id/messages', weight: 0.25 },
      { method: 'PUT', path: '/api/messenger/conversations/:id/read', weight: 0.1 },
    ],
  },
  'realtime-service': {
    share: 0.14,
    medianMs: 12,
    spread: 0.6,
    serverErrorRate: 0.004,
    clientErrorRate: 0.02,
    stores: { redis: 0.6, nats: 0.4 },
    endpoints: [
      { method: 'GET', path: '/ws', weight: 0.7 },
      { method: 'POST', path: '/api/realtime/calls', weight: 0.1 },
      { method: 'POST', path: '/api/realtime/calls/:id/join', weight: 0.2 },
    ],
  },
  'file-service': {
    share: 0.08,
    medianMs: 140,
    spread: 0.7,
    serverErrorRate: 0.006,
    clientErrorRate: 0.04,
    stores: { blob: 0.7, postgres: 0.3 },
    endpoints: [
      { method: 'GET', path: '/api/files/:id', weight: 0.6 },
      { method: 'POST', path: '/api/files/uploads', weight: 0.3 },
      { method: 'DELETE', path: '/api/files/:id', weight: 0.1 },
    ],
  },
  'event-store': {
    share: 0.12,
    medianMs: 35,
    spread: 0.5,
    serverErrorRate: 0.002,
    clientErrorRate: 0.02,
    stores: { nats: 0.55, postgres: 0.45 },
    endpoints: [
      { method: 'POST', path: '/api/events', weight: 0.5 },
      { method: 'GET', path: '/api/events', weight: 0.4 },
      { method: 'POST', path: '/api/events/dlq/:id/replay', weight: 0.1 },
    ],
  },
  'notification-service': {
    share: 0.15,
    medianMs: 22,
    spread: 0.45,
    serverErrorRate: 0.002,
    clientErrorRate: 0.015,
    stores: { postgres: 0.6, nats: 0.4 },
    endpoints: [
      { method: 'GET', path: '/api/notifications', weight: 0.6 },
      { method: 'PATCH', path: '/api/notifications/:id', weight: 0.3 },
      { method: 'DELETE', path: '/api/notifications/:id', weight: 0.1 },
    ],
  },
  'chatbot-service': {
    share: 0.06,
    medianMs: 1100,
    spread: 0.6,
    serverErrorRate: 0.015,
    clientErrorRate: 0.03,
    stores: { postgres: 0.5, redis: 0.5 },
    endpoints: [
      { method: 'POST', path: '/api/chatbot/conversations/:id/messages', weight: 0.6 },
      { method: 'GET', path: '/api/chatbot/conversations', weight: 0.4 },
    ],
  },
};

/** Fixed bad moments, so the charts have a story: error bursts, a slow spell, a traffic spike. */
export interface Incident {
  start: number;
  minutes: number;
  /** Added to the error rate while it lasts. */
  errorRate: number;
  /** Multiplies latency. */
  slowdown: number;
  /** Multiplies traffic. */
  load: number;
}

export const INCIDENTS: Incident[] = [
  { start: NOW - 3 * DAY - 5 * 60 * MINUTE, minutes: 40, errorRate: 0.08, slowdown: 2.2, load: 1 },
  { start: NOW - 6 * DAY + 2 * 60 * MINUTE, minutes: 180, errorRate: 0, slowdown: 1.3, load: 1.8 },
  { start: NOW - 11 * DAY + 9 * 60 * MINUTE, minutes: 25, errorRate: 0.12, slowdown: 1.5, load: 1 },
  { start: NOW - 19 * DAY, minutes: 90, errorRate: 0.03, slowdown: 3, load: 1 },
  { start: NOW - 47 * DAY + 14 * 60 * MINUTE, minutes: 70, errorRate: 0.1, slowdown: 2, load: 1 },
  { start: NOW - 72 * DAY + 3 * 60 * MINUTE, minutes: 150, errorRate: 0.2, slowdown: 1.4, load: 1 },
];
