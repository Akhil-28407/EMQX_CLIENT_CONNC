export type BrokerProtocol = 'mqtt' | 'mqtts' | 'ws' | 'wss';

export interface ConnectPayload {
  host: string;
  port: number;
  protocol: BrokerProtocol;
  path?: string;
  clientId?: string;
  username?: string;
  password?: string;
  clean?: boolean;
  keepalive?: number;
  rejectUnauthorized?: boolean;
}

export interface SubscribePayload {
  topic: string;
  qos?: 0 | 1 | 2;
}

export interface PublishPayload {
  topic: string;
  payload: string;
  qos?: 0 | 1 | 2;
  retain?: boolean;
}

export interface UnsubscribePayload {
  topic: string;
}

export interface SimulatorPayload {
  enabled: boolean;
  intervalMs?: number;
  baseTopic?: string;
}
