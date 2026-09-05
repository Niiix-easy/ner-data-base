import { Controller, Post, Headers } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('api/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post('update')
  async triggerUpdate(@Headers('authorization') authHeader: string) {
    return this.systemService.triggerUpdate(authHeader);
  }
}
