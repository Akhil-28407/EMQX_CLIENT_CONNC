import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MqttModule } from './mqtt/mqtt.module';

@Module({
  imports: [MqttModule],
  controllers: [AppController],
})
export class AppModule {}
