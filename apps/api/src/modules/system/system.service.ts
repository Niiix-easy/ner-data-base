import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  async triggerUpdate(authorizationHeader: string) {
    // 1. Hardcoded secret guard para o ZimaOS Updater.
    // Em produção real, o token deveria vir do JWT do usuário,
    // Mas para updates de sistema, um header de Admin Key é mais adequado.
    const secret = process.env.STUDIO_SESSION_SECRET;

    if (!authorizationHeader || authorizationHeader !== `Bearer ${secret}`) {
        throw new UnauthorizedException('Invalid update authorization token.');
    }

    this.logger.log('Update triggered via API locally on ZimaOS');

    // Dispara a atualização em background (fire and forget)
    // Usamos timeout para retornar o HTTP 200 pro caller antes do Docker reiniciar esta própria API.
    setTimeout(async () => {
      try {
        // Assume que a API container tem o /var/run/docker.sock mapeado,
        // ou o ZimaOS usa algum handler no host.
        // Como fallback para o ambiente atual, usamos bash no path mapeado se aplicável:
        const { stdout, stderr } = await execAsync('cd /app && ./update_zimaos.sh');
        this.logger.log(`Update output: ${stdout}`);
        if (stderr) {
          this.logger.warn(`Update stderr (non-fatal): ${stderr}`);
        }
      } catch (error) {
         this.logger.error(`Update failed: ${error.message}`);
      }
    }, 1000);

    return {
        success: true,
        message: 'System update initiated in the background. The API will restart shortly.'
    };
  }
}
