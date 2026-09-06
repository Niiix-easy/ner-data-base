import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { UsageLimitGuard } from '../system/usage.guard';

@Controller('projects')
export class ProjectsController {

  @UseGuards(UsageLimitGuard)
  @Post()
  async createProject(@Body() body: any) {
    // Logic to create project
    return { success: true, message: 'Project created successfully' };
  }
}
