#!/usr/bin/env node

const crypto = require('crypto');
const { Command } = require('commander');
const axios = require('axios');

const program = new Command();
program.version('1.0.0').description('Neer-Data-Base CLI');

const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_URL || 'http://localhost:3001';

require('dotenv').config();

// CLI automatically bypasses the simple auth if we set the local internal header
const getHeaders = () => {
  const secret = process.env.STUDIO_SESSION_SECRET;
  if (!secret) {
    console.error('Error: STUDIO_SESSION_SECRET is not set in the environment or .env file.');
    process.exit(1);
  }

  const expectedToken = crypto.createHmac('sha256', secret).update('authenticated').digest('hex');
  return {
    headers: {
      'Cookie': `neer-data-base_admin_auth=${expectedToken}`,
      'X-Neer-Data-Base-Internal': 'true'
    }
  };
};

program
  .command('project <action>')
  .description('Manage projects (actions: migrate)')
  .option('--github <url>', 'GitHub repository URL')
  .option('--lovable <id>', 'Lovable project ID')
  .option('--name <name>', 'Project name')
  .action(async (action, options) => {
    if (action === 'migrate') {
      if (options.github) {
        if (!options.name) {
          console.error("Error: --name is required when migrating from GitHub.");
          process.exit(1);
        }
        try {
          console.log(`Migrating GitHub project ${options.name}...`);
          const res = await axios.post(`${CONTROL_PLANE_URL}/migrate/github`, {
            repoUrl: options.github,
            projectName: options.name
          }, getHeaders());
          console.log('Success:', res.data);
        } catch (err) {
          console.error('Migration failed:', err.response?.data || err.message);
        }
      } else if (options.lovable) {
        if (!options.name) {
          console.error("Error: --name is required when migrating from Lovable.");
          process.exit(1);
        }
        try {
          console.log(`Migrating Lovable project ${options.name}...`);
          const res = await axios.post(`${CONTROL_PLANE_URL}/migrate/lovable`, {
            projectId: options.lovable,
            projectName: options.name
          }, getHeaders());
          console.log('Success:', res.data);
        } catch (err) {
          console.error('Migration failed:', err.response?.data || err.message);
        }
      } else {
        console.error('Please specify a source: --github or --lovable');
      }
    } else {
      console.log(`Unknown action: ${action}`);
    }
  });

program.parse(process.argv);
