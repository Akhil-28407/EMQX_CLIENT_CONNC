import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class MqttService implements OnModuleInit, OnModuleDestroy {
    private client;
    private readonly logger;
    private readonly brokerConfig;
    onModuleInit(): void;
    onModuleDestroy(): void;
    private connectToBroker;
    publish(topic: string, body: string): Promise<void>;
}
