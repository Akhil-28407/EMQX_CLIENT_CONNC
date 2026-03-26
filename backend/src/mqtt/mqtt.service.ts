import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private readonly logger = new Logger('MqttService');

  // EMQX Cloud Default Connection
  private readonly brokerConfig = {
    host: 'l96965cf.ala.asia-southeast1.emqxsl.com',
    port: 8084,
    protocol: 'wss' as const,
    username: '', // <--- Set your EMQX username here for persistent logging
    password: '', // <--- Set your EMQX password here for persistent logging
    path: '/mqtt',
  };

  onModuleInit() {
    this.connectToBroker();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private connectToBroker() {
    const { protocol, host, port, path, username, password } = this.brokerConfig;
    if (!username || !password) {
      this.logger.warn(`[Senior Backend] Authentication missing. Persistent logging is DISABLED. (Add credentials in MqttService.ts to enable)`);
      return;
    }
    const url = `${protocol}://${host}:${port}${path}`;

    this.logger.log(`[Senior Backend] Persistent connection to ${url}...`);

    this.client = mqtt.connect(url, {
      clientId: `senior_backend_${Math.random().toString(16).substring(2, 8)}`,
      username: this.brokerConfig.username,
      password: this.brokerConfig.password,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    this.client.on('connect', () => {
      this.logger.log(`[Senior Backend] Successfully connected to EMQX Broker`);
      // Auto-subscribe to all demo topics for persistent logging
      this.client?.subscribe('iot/demo/#', { qos: 0 }, (err) => {
        if (!err) {
          this.logger.log(`[Senior Backend] Persistent Subscriber active for 'iot/demo/#'`);
        }
      });
    });

    this.client.on('message', (topic, payload) => {
      // PERSISTENT LOGGING: This runs even if the browser is closed.
      this.logger.log(`[REC] Topic: ${topic} | Payload: ${payload.toString()}`);
    });

    this.client.on('error', (err) => {
      this.logger.error(`[Senior Backend] Broker error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.logger.warn(`[Senior Backend] Connection closed`);
    });
  }

  // Exposed for any future REST API needs
  async publish(topic: string, body: string) {
    if (!this.client?.connected) throw new Error('Backend not connected');
    this.client.publish(topic, body);
  }
}
