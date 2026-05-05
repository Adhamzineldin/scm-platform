import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as os from 'os';

@Injectable()
export class EurekaService implements OnModuleDestroy {
  private readonly logger = new Logger(EurekaService.name);
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private readonly appName: string;
  private readonly port: number;
  private readonly eurekaHost: string;
  private readonly hostname: string;
  private readonly instanceId: string;

  constructor(private readonly configService: ConfigService) {
    this.appName = this.configService.get<string>('EUREKA_APP_NAME', 'document-gen-service');

    this.port = parseInt(this.configService.get<string>('PORT', '3050'), 10);

    this.eurekaHost = this.configService.get<string>(
      'EUREKA_SERVER',
      `http://${this.configService.get<string>('EUREKA_HOST', 'localhost')}:${this.configService.get<string>('EUREKA_PORT', '8761')}`,
    );

    // Prefer explicit hostname (e.g. the ECS Service Connect DNS name) over the
    // OS hostname, which on Fargate may resolve to the SC proxy (169.254.172.2).
    this.hostname = this.configService.get<string>('EUREKA_INSTANCE_HOSTNAME', os.hostname());
    this.instanceId = `${this.hostname}:${this.appName}:${this.port}`;
  }

  async register(): Promise<void> {
    const ip = this.getIpAddress();
    const hostName = this.hostname; // SC DNS name when EUREKA_INSTANCE_HOSTNAME is set
    const vipAddress = this.appName.toLowerCase();
    const registrationBody = {
      instance: {
        instanceId: this.instanceId,
        hostName,
        app: this.appName.toUpperCase(),
        ipAddr: ip,
        vipAddress,
        secureVipAddress: vipAddress,
        status: 'UP',
        port: { $: this.port, '@enabled': 'true' },
        securePort: { $: 443, '@enabled': 'false' },
        countryId: 1,
        dataCenterInfo: {
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: 'MyOwn',
        },
        leaseInfo: {
          renewalIntervalInSecs: 30,
          durationInSecs: 90,
        },
        healthCheckUrl: `http://${hostName}:${this.port}/api/health`,
        statusPageUrl: `http://${hostName}:${this.port}/api/health`,
        homePageUrl: `http://${hostName}:${this.port}/`,
        metadata: {
          'management.port': `${this.port}`,
        },
      },
    };

    try {
      await axios.post(
          `${this.eurekaHost}/eureka/apps/${this.appName.toUpperCase()}`,
          registrationBody,
          { headers: { 'Content-Type': 'application/json' } },
      );
      this.logger.log(`Registered with Eureka as ${this.appName.toUpperCase()}`);
      this.startHeartbeat();
    } catch (error) {
      this.logger.warn(`Failed to register with Eureka: ${(error as Error).message}`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      axios
          .put(`${this.eurekaHost}/eureka/apps/${this.appName.toUpperCase()}/${this.instanceId}`)
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
      await axios.delete(`${this.eurekaHost}/eureka/apps/${this.appName.toUpperCase()}/${this.instanceId}`);
      this.logger.log('Deregistered from Eureka');
    } catch {
      this.logger.warn('Failed to deregister from Eureka');
    }
  }

  private getIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] ?? []) {
        if (iface.family === 'IPv4' && !iface.internal &&
            !iface.address.startsWith('169.254.')) { // skip ECS SC proxy link-local
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }
}