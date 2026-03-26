"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttService = void 0;
const common_1 = require("@nestjs/common");
const mqtt = __importStar(require("mqtt"));
let MqttService = class MqttService {
    client = null;
    logger = new common_1.Logger('MqttService');
    brokerConfig = {
        host: 'l96965cf.ala.asia-southeast1.emqxsl.com',
        port: 8084,
        protocol: 'wss',
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
    connectToBroker() {
        const { protocol, host, port, path } = this.brokerConfig;
        const url = `${protocol}://${host}:${port}${path}`;
        this.logger.log(`[Senior Backend] Persistent connection to ${url}...`);
        this.client = mqtt.connect(url, {
            clientId: `senior_backend_${Math.random().toString(16).substring(2, 8)}`,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
        });
        this.client.on('connect', () => {
            this.logger.log(`[Senior Backend] Successfully connected to EMQX Broker`);
            this.client?.subscribe('iot/demo/#', { qos: 0 }, (err) => {
                if (!err) {
                    this.logger.log(`[Senior Backend] Persistent Subscriber active for 'iot/demo/#'`);
                }
            });
        });
        this.client.on('message', (topic, payload) => {
            this.logger.log(`[REC] Topic: ${topic} | Payload: ${payload.toString()}`);
        });
        this.client.on('error', (err) => {
            this.logger.error(`[Senior Backend] Broker error: ${err.message}`);
        });
        this.client.on('close', () => {
            this.logger.warn(`[Senior Backend] Connection closed`);
        });
    }
    async publish(topic, body) {
        if (!this.client?.connected)
            throw new Error('Backend not connected');
        this.client.publish(topic, body);
    }
};
exports.MqttService = MqttService;
exports.MqttService = MqttService = __decorate([
    (0, common_1.Injectable)()
], MqttService);
//# sourceMappingURL=mqtt.service.js.map