import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import axios from 'axios';
import * as os from 'os';

@Injectable()
export class EurekaService implements OnModuleDestroy {
  private readonly logger = new Logger(EurekaService.name);
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private readonly appName =
    process.env.EUREKA_APP_NAME ?? 'document-gen-service';
  private readonly port = parseInt(process.env.PORT ?? '3050', 10);
  private readonly eurekaHost =
    process.env.EUREKA_SERVER ?? 'http://localhost:8761';
  private readonly hostname = os.hostname();
  private readonly instanceId = `${this.hostname}:${this.appName}:${this.port}`;

  async register(): Promise<void> {
    const registrationBody = {
      instance: {
        instanceId: this.instanceId,
        hostName: this.hostname,
        app: this.appName.toUpperCase(),
        ipAddr: this.getIpAddress(),
        status: 'UP',
        port: { $: this.port, '@enabled': true },
        dataCenterInfo: {
          '@class':
            'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: 'MyOwn',
        },
        healthCheckUrl: `http://${this.hostname}:${this.port}/api/health`,
        statusPageUrl: `http://${this.hostname}:${this.port}/api/health`,
        homePageUrl: `http://${this.hostname}:${this.port}/`,
      },
    };

    try {
      await axios.post(
        `${this.eurekaHost}/eureka/apps/${this.appName.toUpperCase()}`,
        registrationBody,
        { headers: { 'Content-Type': 'application/json' } },
      );
      this.logger.log(
        `Registered with Eureka as ${this.appName.toUpperCase()}`,
      );
      this.startHeartbeat();
    } catch (error) {
      this.logger.warn(
        `Failed to register with Eureka (service will still work standalone): ${(error as Error).message}`,
      );
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      axios
        .put(
          `${this.eurekaHost}/eureka/apps/${this.appName.toUpperCase()}/${this.instanceId}`,
        )
        .catch(() => {
          this.logger.warn('Eureka heartbeat failed');
        });
    }, 30_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    try {
      await axios.delete(
        `${this.eurekaHost}/eureka/apps/${this.appName.toUpperCase()}/${this.instanceId}`,
      );
      this.logger.log('Deregistered from Eureka');
    } catch {
      this.logger.warn('Failed to deregister from Eureka');
    }
  }

  private getIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] ?? []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }
}
