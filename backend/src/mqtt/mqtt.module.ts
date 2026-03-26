import { Module } from '@nestjs/common';
import { MqttController } from './mqtt.controller';
import { MqttGateway } from './mqtt.gateway';
import { MqttService } from './mqtt.service';

@Module({
  controllers: [MqttController],
  providers: [MqttGateway, MqttService],
  exports: [MqttService],
})
export class MqttModule {}
