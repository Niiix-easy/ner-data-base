const express = require('express');
const { Pool } = require('pg');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const format = require('pg-format');

const app = express();
const port = process.env.CONTROL_PLANE_PORT || 3001;

app.use(express.json());

// Simplistic Authentication Middleware for internal endpoints suited for local ZimaOS execution
app.use((req, res, next) => {
  if (req.path === "/health" || req.path === "/auth/signup" || req.path === "/auth/login") return next();

  // Extract cookies manually (no cookie-parser to keep dependencies low)
  const cookies = req.headers.cookie;
  if (!cookies) return res.status(401).json({ error: 'Unauthorized - No cookies provided' });

  const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('neer-data-base_admin_auth='));
  if (!tokenCookie) return res.status(401).json({ error: 'Unauthorized - Missing auth cookie' });

  const token = tokenCookie.split('=')[1];

  if (!process.env.STUDIO_SESSION_SECRET) {
    console.error('CRITICAL: STUDIO_SESSION_SECRET is missing!');
    return res.status(500).json({ error: 'Internal Server Error' });
  }

    const expectedToken = crypto.createHmac('sha256', process.env.STUDIO_SESSION_SECRET).update('authenticated').digest('hex');
    if (token !== expectedToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  
    next();
  });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  // Initialize system tables
  const initDb = async () => {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS public.users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS public.api_keys (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            key_value VARCHAR(255) UNIQUE NOT NULL,
            user_id INTEGER REFERENCES public.users(id),
            environment VARCHAR(50) DEFAULT 'production',
            tags TEXT[] DEFAULT '{}',
            rotation_interval_days INTEGER,
            next_rotation_at TIMESTAMP WITH TIME ZONE,
            rpm_limit INTEGER DEFAULT 100,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE,
            revoked_at TIMESTAMP WITH TIME ZONE,
            last_expiry_notification_at TIMESTAMP WITH TIME ZONE
          );
  
          CREATE TABLE IF NOT EXISTS public.api_key_usage_logs (
            id SERIAL PRIMARY KEY,
            api_key_id INTEGER REFERENCES public.api_keys(id),
            method VARCHAR(10),
            path TEXT,
            status_code INTEGER,
            ip_address VARCHAR(45),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
  
          CREATE TABLE IF NOT EXISTS public.api_key_activity_logs (
            id SERIAL PRIMARY KEY,
            api_key_id INTEGER REFERENCES public.api_keys(id),
            event_type VARCHAR(50) NOT NULL,
            event_details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS public.api_key_webhooks (
            id SERIAL PRIMARY KEY,
            api_key_id INTEGER REFERENCES public.api_keys(id),
            url TEXT NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            shared_secret TEXT,
            retries INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
            id SERIAL PRIMARY KEY,
            webhook_id INTEGER REFERENCES public.api_key_webhooks(id),
            payload JSONB,
            response_status INTEGER,
            latency_ms INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
            id SERIAL PRIMARY KEY,
            webhook_id INTEGER REFERENCES public.api_key_webhooks(id),
            payload JSONB,
            retry_count INTEGER DEFAULT 0,
            next_retry_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS public.webhook_scheduled (
            id SERIAL PRIMARY KEY,
            webhook_id INTEGER REFERENCES public.api_key_webhooks(id),
            payload JSONB,
            scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
            processed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS public.api_key_alerts_sent (
            id SERIAL PRIMARY KEY,
            api_key_id INTEGER REFERENCES public.api_keys(id),
            threshold INTEGER,
            sent_at DATE DEFAULT CURRENT_DATE
          );
        `);

        // Migration: Add columns if they don't exist
        const tableInfo = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'api_keys'
        `);
        const columns = tableInfo.rows.map(r => r.column_name);
        
        if (!columns.includes('user_id')) {
          await client.query('ALTER TABLE public.api_keys ADD COLUMN user_id INTEGER REFERENCES public.users(id)');
        }
        if (!columns.includes('environment')) {
          await client.query("ALTER TABLE public.api_keys ADD COLUMN environment VARCHAR(50) DEFAULT 'production'");
        }
        if (!columns.includes('tags')) {
          await client.query('ALTER TABLE public.api_keys ADD COLUMN tags TEXT[] DEFAULT \'{}\'');
        }
        if (!columns.includes('rotation_interval_days')) {
          await client.query('ALTER TABLE public.api_keys ADD COLUMN rotation_interval_days INTEGER');
        }
        if (!columns.includes('next_rotation_at')) {
          await client.query('ALTER TABLE public.api_keys ADD COLUMN next_rotation_at TIMESTAMP WITH TIME ZONE');
        }
        if (!columns.includes('last_expiry_notification_at')) {
          await client.query('ALTER TABLE public.api_keys ADD COLUMN last_expiry_notification_at TIMESTAMP WITH TIME ZONE');
        }
        if (!columns.includes('daily_usage_limit')) {
          await client.query('ALTER TABLE public.api_keys ADD COLUMN daily_usage_limit INTEGER');
        }
        if (!columns.includes('alias')) {
          await client.query('ALTER TABLE public.api_keys ADD COLUMN alias VARCHAR(255)');
        }

        const webhookTableInfo = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'api_key_webhooks'
        `);
        const webhookColumns = webhookTableInfo.rows.map(r => r.column_name);
        if (!webhookColumns.includes('retries')) {
          await client.query('ALTER TABLE public.api_key_webhooks ADD COLUMN retries INTEGER DEFAULT 0');
        }
        if (!webhookColumns.includes('shared_secret')) {
          await client.query('ALTER TABLE public.api_key_webhooks ADD COLUMN shared_secret TEXT');
        }

        console.log('System tables initialized successfully');
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Failed to initialize system tables:', err);
    }
  };
  initDb();

  const sendEmailNotification = async (userId, subject, message) => {
    try {
      let email = process.env.STUDIO_ADMIN_EMAIL; // Fallback
      if (userId) {
        const userRes = await pool.query('SELECT email FROM public.users WHERE id = $1', [userId]);
        if (userRes.rowCount > 0) {
          email = userRes.rows[0].email;
        }
      }

      if (!email) {
        console.log(`[Notification Muted] No email found for user ${userId}. Message: ${subject}`);
        return;
      }

      console.log(`
[SIMULATED EMAIL]
To: ${email}
Subject: ${subject}
Message: ${message}
------------------
      `);
      
      // In a real app, you'd use nodemailer or an API like SendGrid/SES here.
    } catch (err) {
      console.error('Error sending email notification:', err);
    }
  };

  const logActivity = async (apiKeyId, eventType, details = {}) => {
    try {
      await pool.query(
        'INSERT INTO public.api_key_activity_logs (api_key_id, event_type, event_details) VALUES ($1, $2, $3)',
        [apiKeyId, eventType, details]
      );

      // Trigger webhooks
      const webhooks = await pool.query('SELECT * FROM public.api_key_webhooks WHERE api_key_id = $1 AND event_type = $2', [apiKeyId, eventType]);
      for (const webhook of webhooks.rows) {
          const payload = { eventType, details, apiKeyId };
          const startTime = Date.now();
          let status = null;
          
          const headers = {};
          if (webhook.shared_secret) {
              headers['X-Webhook-Signature'] = crypto.createHmac('sha256', webhook.shared_secret).update(JSON.stringify(payload)).digest('hex');
          }

          try {
            const res = await axios.post(webhook.url, payload, { headers });
            status = res.status;
          } catch (err) {
            status = err.response?.status || 500;
            // Queue for retry
            await pool.query(
              'INSERT INTO public.webhook_retry_queue (webhook_id, payload, retry_count, next_retry_at) VALUES ($1, $2, $3, $4)',
              [webhook.id, payload, 0, new Date(Date.now() + 60000)] // Initial retry in 1 minute
            );
          }
          const latency = Date.now() - startTime;
          await pool.query(
            'INSERT INTO public.webhook_delivery_logs (webhook_id, payload, response_status, latency_ms) VALUES ($1, $2, $3, $4)',
            [webhook.id, payload, status, latency]
          );
      }
    } catch (err) {
      console.error('Error logging API key activity:', err);
    }
  };

  // Background job for retries
  setInterval(async () => {
    try {
      const items = await pool.query('SELECT * FROM public.webhook_retry_queue WHERE next_retry_at <= CURRENT_TIMESTAMP');
      for (const item of items.rows) {
          const webhook = await pool.query('SELECT * FROM public.api_key_webhooks WHERE id = $1', [item.webhook_id]);
          if (webhook.rowCount === 0) {
              await pool.query('DELETE FROM public.webhook_retry_queue WHERE id = $1', [item.id]);
              continue;
          }
          const wh = webhook.rows[0];
          try {
              await axios.post(wh.url, item.payload);
              await pool.query('DELETE FROM public.webhook_retry_queue WHERE id = $1', [item.id]);
          } catch (err) {
              const nextRetry = new Date(Date.now() + Math.pow(2, item.retry_count + 1) * 60000);
              await pool.query('UPDATE public.webhook_retry_queue SET retry_count = retry_count + 1, next_retry_at = $1 WHERE id = $2', [nextRetry, item.id]);
          }
      }
    } catch (err) {
      console.error('Error in webhook retry job:', err);
    }
  }, 30000);
  
  // Background job to revoke expired keys and notify soon-to-expire keys
  setInterval(async () => {
    try {
      // 1. Revoke expired keys
      const expiredResult = await pool.query(`
        UPDATE public.api_keys 
        SET revoked_at = CURRENT_TIMESTAMP 
        WHERE expires_at IS NOT NULL 
        AND expires_at < CURRENT_TIMESTAMP 
        AND revoked_at IS NULL
        RETURNING id, name, user_id
      `);
      
      for (const key of expiredResult.rows) {
        console.log(`Auto-revoked expired API key: ${key.name}`);
        await logActivity(key.id, 'REVOKED', { reason: 'Expired', name: key.name });
        await sendEmailNotification(
          key.user_id, 
          `API Key Revoked: ${key.name}`, 
          `Sua chave de API "${key.name}" no Ner-Data-Base foi revogada automaticamente porque expirou.`
        );
      }

      // 2. Notify about keys expiring in 7 days
      const soonExpiring = await pool.query(`
        SELECT id, name, user_id, expires_at
        FROM public.api_keys
        WHERE expires_at IS NOT NULL
        AND expires_at > CURRENT_TIMESTAMP
        AND expires_at < CURRENT_TIMESTAMP + INTERVAL '7 days'
        AND revoked_at IS NULL
        AND (last_expiry_notification_at IS NULL OR last_expiry_notification_at < CURRENT_TIMESTAMP - INTERVAL '1 day')
      `);

      for (const key of soonExpiring.rows) {
        await sendEmailNotification(
          key.user_id,
          `API Key Expiring Soon: ${key.name}`,
          `Sua chave de API "${key.name}" no Ner-Data-Base expira em ${new Date(key.expires_at).toLocaleString()}. Considere rotacioná-la para evitar interrupções.`
        );
        // Mark as notified today so we don't spam
        await pool.query('UPDATE public.api_keys SET last_expiry_notification_at = CURRENT_TIMESTAMP WHERE id = $1', [key.id]);
      }

      // 3. Auto-rotation for keys
      const keysToRotate = await pool.query(`
        SELECT * FROM public.api_keys
        WHERE rotation_interval_days IS NOT NULL
        AND next_rotation_at < CURRENT_TIMESTAMP
        AND revoked_at IS NULL
      `);

      for (const key of keysToRotate.rows) {
        console.log(`Auto-rotating API key: ${key.name}`);
        const newKeyValue = `nk_${crypto.randomBytes(24).toString('hex')}`;
        const nextRotationAt = new Date();
        nextRotationAt.setDate(nextRotationAt.getDate() + key.rotation_interval_days);

        await pool.query(`
          UPDATE public.api_keys 
          SET key_value = $1, 
              next_rotation_at = $2,
              created_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [newKeyValue, nextRotationAt, key.id]);

        await logActivity(key.id, 'ROTATED', { reason: 'Auto-rotation', name: key.name });
        await sendEmailNotification(
          key.user_id,
          `API Key Auto-Rotated: ${key.name}`,
          `Sua chave de API "${key.name}" no Ner-Data-Base foi rotacionada automaticamente como configurado. O valor antigo é agora inválido. Por favor, atualize suas credenciais.`
        );
      }

      // 4. Daily Usage Limit Notification
      const keysWithLimit = await pool.query(`
          SELECT k.*, COUNT(l.id) as daily_usage
          FROM public.api_keys k
          LEFT JOIN public.api_key_usage_logs l ON k.id = l.api_key_id AND l.created_at > CURRENT_DATE
          WHERE k.daily_usage_limit IS NOT NULL
          AND k.revoked_at IS NULL
          GROUP BY k.id
      `);

      for (const key of keysWithLimit.rows) {
          const usagePercent = (key.daily_usage / key.daily_usage_limit) * 100;
          const thresholds = [50, 75, 90];
          
          for (const threshold of thresholds) {
              if (usagePercent >= threshold) {
                  const checkAlert = await pool.query('SELECT 1 FROM public.api_key_alerts_sent WHERE api_key_id = $1 AND threshold = $2 AND sent_at = CURRENT_DATE', [key.id, threshold]);
                  if (checkAlert.rowCount === 0) {
                      await sendEmailNotification(
                          key.user_id,
                          `API Key Alert: ${key.name} (${threshold}%)`,
                          `Sua chave de API "${key.name}" atingiu ${threshold}% do limite diário de ${key.daily_usage_limit} requisições.`
                      );
                      await pool.query('INSERT INTO public.api_key_alerts_sent (api_key_id, threshold) VALUES ($1, $2)', [key.id, threshold]);
                  }
              }
          }
      }

    } catch (err) {
      console.error('Error in background job:', err);
    }
  }, 60000); // Check every minute
  
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/auth/signup', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    try {
      const hash = crypto.createHmac('sha256', process.env.STUDIO_SESSION_SECRET).update(password).digest('hex');
      const result = await pool.query(
        'INSERT INTO public.users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, hash, name]
      );
      
      const authHeaderToken = crypto.createHmac('sha256', process.env.STUDIO_SESSION_SECRET).update('authenticated').digest('hex');
      res.cookie('neer-data-base_admin_auth', authHeaderToken, { httpOnly: true, path: '/' });
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(400).json({ error: 'User already exists' });
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const hash = crypto.createHmac('sha256', process.env.STUDIO_SESSION_SECRET).update(password).digest('hex');
      const result = await pool.query(
        'SELECT * FROM public.users WHERE email = $1 AND password_hash = $2',
        [email, hash]
      );

      const authHeaderToken = crypto.createHmac('sha256', process.env.STUDIO_SESSION_SECRET).update('authenticated').digest('hex');

      if (result.rowCount === 0) {
        if (email === process.env.STUDIO_ADMIN_EMAIL && password === process.env.STUDIO_ADMIN_PASSWORD) {
          res.cookie('neer-data-base_admin_auth', authHeaderToken, { httpOnly: true, path: '/' });
          return res.json({ success: true, user: { id: 0, email, name: 'Admin' } });
        }
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      res.cookie('neer-data-base_admin_auth', authHeaderToken, { httpOnly: true, path: '/' });
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/auth/me', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, email, name FROM public.users LIMIT 1');
      if (result.rowCount > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'No user found' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  const executeSqlFiles = async (client, dirPath, schemaName) => {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const sqlContent = fs.readFileSync(path.join(dirPath, file), 'utf8');
        console.log(`Executing ${file} in schema ${schemaName}`);
        await client.query(`SET search_path TO ${schemaName}`);
        await client.query(sqlContent);
        await client.query(`SET search_path TO public`);
      }
    }
  };
  
  const simulateMigration = async (projectName, source, tempDir) => {
    console.log(`Starting migration from ${source} for project: ${projectName}`);
    const schemaName = `project_${projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
  
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        console.log(`Creating schema: ${schemaName}`);
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
  
        if (tempDir) {
          const migrationsPath = path.join(tempDir, 'supabase', 'migrations');
          await executeSqlFiles(client, migrationsPath, schemaName);
        } else {
           await client.query(`
            CREATE TABLE IF NOT EXISTS ${schemaName}.users (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `);
        }
  
        // Grant permissions to the generated schema for PostgREST to see it
        await client.query(`GRANT USAGE ON SCHEMA ${schemaName} TO anon, authenticated;`);
        await client.query(`GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO anon, authenticated;`);
        await client.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} TO anon, authenticated;`);
        await client.query(`GRANT ALL ON ALL ROUTINES IN SCHEMA ${schemaName} TO anon, authenticated;`);
  
        await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ALL ON TABLES TO anon, authenticated;`);
        await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ALL ON SEQUENCES TO anon, authenticated;`);
        await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ALL ON ROUTINES TO anon, authenticated;`);
  
        await client.query('COMMIT');
        console.log(`Migration completed and permissions granted for schema: ${schemaName}`);
  
        // We must notify PostgREST to reload its schema cache.
        // Easiest way locally is NOTIFY pgrst. (Depends on PostgREST config, but standard).
        await client.query('NOTIFY pgrst, \'reload schema\'');
  
        return { success: true, schema: schemaName };
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration transaction failed:', e);
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`Database connection error during migration:`, err);
      throw err;
    }
  };

app.post('/migrate/github', async (req, res) => {
  const { repoUrl, projectName } = req.body;
  if (!repoUrl || !projectName) {
    return res.status(400).json({ error: 'repoUrl and projectName are required' });
  }

  const tempDir = path.join('/tmp', 'repos', `${projectName}-${Date.now()}`);

  try {
    console.log(`Cloning repository from ${repoUrl} to ${tempDir}...`);
    fs.mkdirSync(tempDir, { recursive: true });

    await git.clone({
      fs,
      http,
      dir: tempDir,
      url: repoUrl,
      singleBranch: true,
      depth: 1
    });

    const result = await simulateMigration(projectName, 'GitHub', tempDir);
    fs.rmSync(tempDir, { recursive: true, force: true });
    res.status(200).json({ message: 'GitHub project migrated successfully', ...result });
  } catch (error) {
    console.error('GitHub migration error:', error);
    res.status(500).json({ error: 'Failed to migrate GitHub project', details: error.message });
  }
});

app.post('/migrate/lovable', async (req, res) => {
  const { projectId, projectName } = req.body;
  if (!projectId || !projectName) {
    return res.status(400).json({ error: 'projectId and projectName are required' });
  }

  try {
    console.log(`Fetching Lovable project ${projectId} (Mocked)...`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = await simulateMigration(projectName, 'Lovable', null);
    res.status(200).json({ message: 'Lovable project migrated successfully', ...result });
  } catch (error) {
    console.error('Lovable migration error:', error);
    res.status(500).json({ error: 'Failed to migrate Lovable project', details: error.message });
  }
});

app.get('/db/tables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name;
    `);
    res.json({ tables: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

app.get('/db/tables/:schema/:name/data', async (req, res) => {
  const { schema, name } = req.params;
  try {
    const query = format('SELECT * FROM %I.%I LIMIT 100', schema, name);
    const result = await pool.query(query);
    res.json({ rows: result.rows, columns: result.fields.map(f => f.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

app.post('/db/tables/:schema/:name/data', async (req, res) => {
  const { schema, name } = req.params;
  const data = req.body;

  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No data provided for insert' });
  }

  try {
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Create placeholders ($1, $2, etc)
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const queryStr = format('INSERT INTO %I.%I (%I) VALUES (%s) RETURNING *', schema, name, columns, placeholders);

    const result = await pool.query(queryStr, values);
    res.status(201).json({ message: 'Row created successfully', row: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert row', details: err.message });
  }
});

app.put('/db/tables/:schema/:name/data', async (req, res) => {
  const { schema, name } = req.params;
  const { filter, data } = req.body;

  if (!filter || Object.keys(filter).length === 0) {
    return res.status(400).json({ error: 'Filter condition required for update' });
  }

  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No data provided for update' });
  }

  try {
    const dataKeys = Object.keys(data);
    const filterKeys = Object.keys(filter);

    const values = [...Object.values(data), ...Object.values(filter)];

    let paramIndex = 1;
    const setStatements = dataKeys.map(k => format('%I = $%s', k, paramIndex++)).join(', ');
    const whereStatements = filterKeys.map(k => format('%I = $%s', k, paramIndex++)).join(' AND ');

    const queryStr = format('UPDATE %I.%I SET %s WHERE %s RETURNING *', schema, name, setStatements, whereStatements);

    const result = await pool.query(queryStr, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No rows matched the filter condition' });
    }

    res.json({ message: 'Row updated successfully', row: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update row', details: err.message });
  }
});

app.delete('/db/tables/:schema/:name/data', async (req, res) => {
  const { schema, name } = req.params;
  const filter = req.body;

  if (!filter || Object.keys(filter).length === 0) {
    return res.status(400).json({ error: 'Filter condition required for delete' });
  }

  try {
    const filterKeys = Object.keys(filter);
    const values = Object.values(filter);

    let paramIndex = 1;
    const whereStatements = filterKeys.map(k => format('%I = $%s', k, paramIndex++)).join(' AND ');

    const queryStr = format('DELETE FROM %I.%I WHERE %s RETURNING *', schema, name, whereStatements);

    const result = await pool.query(queryStr, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No rows matched the filter condition' });
    }

    res.json({ message: 'Row deleted successfully', row: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete row', details: err.message });
  }
});

app.post('/project/pause', async (req, res) => {
  // Mock pausing a project
  console.log('Project pause requested');
  setTimeout(() => {
    res.json({ message: 'Project paused successfully', status: 'paused' });
  }, 1000);
});

app.post('/project/resume', async (req, res) => {
  // Mock resuming a project
  console.log('Project resume requested');
  setTimeout(() => {
    res.json({ message: 'Project resumed successfully', status: 'active' });
  }, 1000);
});

app.post('/project/backup', async (req, res) => {
  console.log('Project backup requested');
  res.json({ message: 'Backup generated successfully', downloadUrl: '#' });
});

app.post('/project/upgrade', async (req, res) => {
  console.log('Project upgrade requested');
  res.json({ message: 'Upgrade process initiated', status: 'pending' });
});

app.post('/db/query', async (req, res) => {
  const { query } = req.body;
  try {
    const result = await pool.query(query);
    res.json({ rows: result.rows || [], fields: result.fields || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        k.id, k.name, k.key_value, k.created_at, k.expires_at, k.revoked_at, k.environment, k.tags, k.user_id,
        k.rotation_interval_days, k.next_rotation_at, k.rpm_limit,
        COUNT(l.id)::int as usage_count
      FROM public.api_keys k
      LEFT JOIN public.api_key_usage_logs l ON k.id = l.api_key_id
      GROUP BY k.id
      ORDER BY k.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api-keys', async (req, res) => {
  const { name, expiresAt, environment, tags, userId, rotationIntervalDays, rpmLimit, dailyUsageLimit, alias } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const keyValue = `nk_${crypto.randomBytes(24).toString('hex')}`;
    let nextRotationAt = null;
    if (rotationIntervalDays) {
      nextRotationAt = new Date();
      nextRotationAt.setDate(nextRotationAt.getDate() + parseInt(rotationIntervalDays));
    }

    const result = await pool.query(
      'INSERT INTO public.api_keys (name, alias, key_value, expires_at, environment, tags, user_id, rotation_interval_days, next_rotation_at, rpm_limit, daily_usage_limit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [name, alias || null, keyValue, expiresAt || null, environment || 'production', tags || [], userId || null, rotationIntervalDays || null, nextRotationAt, rpmLimit || 100, dailyUsageLimit || null]
    );
    const newKey = result.rows[0];
    await logActivity(newKey.id, 'CREATED', { name: newKey.name, environment: newKey.environment, tags: newKey.tags, rpmLimit: newKey.rpm_limit, dailyUsageLimit: newKey.daily_usage_limit, alias: newKey.alias });
    res.status(201).json({ ...newKey, usage_count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api-keys/:id/rotate', async (req, res) => {
  const { id } = req.params;
  try {
    const newKeyValue = `nk_${crypto.randomBytes(24).toString('hex')}`;
    const result = await pool.query(
      'UPDATE public.api_keys SET key_value = $1, created_at = CURRENT_TIMESTAMP WHERE id = $2 AND revoked_at IS NULL RETURNING *',
      [newKeyValue, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'API key not found or revoked' });
    }

    const updatedKey = result.rows[0];
    await logActivity(updatedKey.id, 'ROTATED', { name: updatedKey.name });
    res.json(updatedKey);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/:id/logs', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM public.api_key_usage_logs WHERE api_key_id = $1 ORDER BY created_at DESC LIMIT 50',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/:id/hourly-stats', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      WITH hours AS (
        SELECT generate_series(
          date_trunc('hour', CURRENT_TIMESTAMP - INTERVAL '7 days'),
          date_trunc('hour', CURRENT_TIMESTAMP),
          INTERVAL '1 hour'
        ) AS hour
      )
      SELECT 
        h.hour,
        COUNT(l.id)::int as count
      FROM hours h
      LEFT JOIN public.api_key_usage_logs l ON date_trunc('hour', l.created_at) = h.hour AND l.api_key_id = $1
      GROUP BY h.hour
      ORDER BY h.hour ASC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api-keys/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE public.api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount > 0) {
      const key = result.rows[0];
      await logActivity(id, 'REVOKED', { name: key.name });
      await sendEmailNotification(
        key.user_id,
        `API Key Revoked: ${key.name}`,
        `Sua chave de API "${key.name}" no Ner-Data-Base foi revogada manualmente.`
      );
    }
    res.json({ message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/activity', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, k.name as key_name
      FROM public.api_key_activity_logs a
      JOIN public.api_keys k ON a.api_key_id = k.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/webhooks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*, k.name as key_name 
      FROM public.api_key_webhooks w
      JOIN public.api_keys k ON w.api_key_id = k.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/:id/webhooks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.api_key_webhooks WHERE api_key_id = $1', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api-keys/:id/webhooks', async (req, res) => {
  const { url, eventType, sharedSecret } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO public.api_key_webhooks (api_key_id, url, event_type, shared_secret) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, url, eventType, sharedSecret]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/webhooks/:webhookId/logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.webhook_delivery_logs WHERE webhook_id = $1 ORDER BY created_at DESC', [req.params.webhookId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api-keys/webhooks/:webhookId/retry', async (req, res) => {
  try {
    const webhook = await pool.query('SELECT * FROM public.api_key_webhooks WHERE id = $1', [req.params.webhookId]);
    if (webhook.rowCount === 0) return res.status(404).json({ error: 'Webhook not found' });

    const wh = webhook.rows[0];
    await pool.query('UPDATE public.api_key_webhooks SET retries = retries + 1 WHERE id = $1', [wh.id]);
    
    // Simulate webhook delivery
    const headers = {};
    if (wh.shared_secret) {
        const crypto = require('crypto');
        headers['X-Webhook-Signature'] = crypto.createHmac('sha256', wh.shared_secret).update(JSON.stringify({ eventType: wh.event_type, apiKeyId: wh.api_key_id, retried: true })).digest('hex');
    }
    const response = await axios.post(wh.url, { eventType: wh.event_type, apiKeyId: wh.api_key_id, retried: true }, { headers });
    res.json({ message: 'Webhook retry triggered', status: response.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api-keys/:id/webhooks/test', async (req, res) => {
  const { url, eventType } = req.body;
  try {
    const mockPayload = { eventType, apiKeyId: req.params.id, test: true };
    const response = await axios.post(url, mockPayload);
    res.json({ status: response.status, headers: response.headers, body: response.data });
  } catch (err) {
    res.status(500).json({ error: err.message, status: err.response?.status, headers: err.response?.headers, body: err.response?.data });
  }
});

app.put('/api-keys/:id/rpm-limit', async (req, res) => {
  const { rpmLimit } = req.body;
  try {
    await pool.query('UPDATE public.api_keys SET rpm_limit = $1 WHERE id = $2', [rpmLimit, req.params.id]);
    res.json({ message: 'RPM limit updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api-keys/webhooks/:webhookId', async (req, res) => {
  try {
    await pool.query('DELETE FROM public.api_key_webhooks WHERE id = $1', [req.params.webhookId]);
    res.json({ message: 'Webhook deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/system/metrics', async (req, res) => {
  try {
    const os = require('os');
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / totalMem) * 100;

    res.json({
      cpu: Math.min(100, Math.max(0, cpuUsage)),
      memory: Math.min(100, Math.max(0, memUsage)),
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/project/usage-metrics', async (req, res) => {
  try {
    // 1. Database Rows (approximate)
    const rowsRes = await pool.query(`
      SELECT SUM(n_live_tup) as total_rows 
      FROM pg_stat_user_tables
    `);
    
    // 2. API Requests
    const requestsRes = await pool.query(`
      SELECT COUNT(*) as total_requests 
      FROM public.api_key_usage_logs
    `);

    // 3. Tables Count
    const tablesRes = await pool.query(`
      SELECT COUNT(*) as total_tables
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    `);
    
    res.json({
      database_rows: parseInt(rowsRes.rows[0].total_rows || 0),
      api_requests: parseInt(requestsRes.rows[0].total_requests || 0),
      storage_bytes: 1240000000, // Mocked 1.24 GB
      buckets_count: 4, // Mocked
      tables_count: parseInt(tablesRes.rows[0].total_tables || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/usage-stats', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH days AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      key_names AS (
        SELECT id, name FROM public.api_keys
      ),
      daily_usage AS (
        SELECT 
          d.day,
          k.name,
          COUNT(l.id) as count
        FROM days d
        CROSS JOIN key_names k
        LEFT JOIN public.api_key_usage_logs l ON date_trunc('day', l.created_at)::date = d.day AND l.api_key_id = k.id
        GROUP BY d.day, k.name
      )
      SELECT 
        day::text as date,
        json_object_agg(name, count) as stats
      FROM daily_usage
      GROUP BY day
      ORDER BY day ASC
    `);
    
    // Transform data for Recharts (array of {date: string, [keyName]: number})
    const formattedData = result.rows.map(row => ({
      date: row.date,
      ...row.stats
    }));
    
    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/webhooks/stats', async (req, res) => {
  try {
    const totalRes = await pool.query('SELECT COUNT(*) as total FROM public.webhook_delivery_logs');
    const successRes = await pool.query('SELECT COUNT(*) as success FROM public.webhook_delivery_logs WHERE response_status >= 200 AND response_status < 300');
    const pendingRes = await pool.query('SELECT COUNT(*) as pending FROM public.webhook_delivery_logs WHERE response_status >= 400');
    
    const total = parseInt(totalRes.rows[0].total);
    const success = parseInt(successRes.rows[0].success);
    const pending = parseInt(pendingRes.rows[0].pending);
    
    res.json({
        successRate: total > 0 ? Math.round((success / total) * 100) : 0,
        totalDelivered: success,
        pendingRetries: pending
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api-keys/webhooks/retry-all', async (req, res) => {
  try {
    const failedWebhooks = await pool.query(`
        SELECT DISTINCT w.* FROM public.api_key_webhooks w
        JOIN public.webhook_delivery_logs l ON w.id = l.webhook_id
        WHERE l.response_status >= 400
    `);
    
    for (const wh of failedWebhooks.rows) {
        await pool.query('UPDATE public.api_key_webhooks SET retries = retries + 1 WHERE id = $1', [wh.id]);
        await axios.post(wh.url, { eventType: wh.event_type, apiKeyId: wh.api_key_id, retried: true }).catch(console.error);
    }
    res.json({ message: 'All failed webhooks re-attempted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/webhooks/hourly-stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date_trunc('hour', created_at) AS hour,
             SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100 AS success_rate
      FROM public.webhook_delivery_logs
      WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY 1 ORDER BY 1 ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api-keys/webhooks/schedule', async (req, res) => {
  const { webhookId, payload, scheduledAt } = req.body;
  try {
    await pool.query(
      'INSERT INTO public.webhook_scheduled (webhook_id, payload, scheduled_at) VALUES ($1, $2, $3)',
      [webhookId, payload, scheduledAt]
    );
    res.status(201).json({ message: 'Webhook scheduled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Background job for scheduled webhooks
setInterval(async () => {
    try {
      const items = await pool.query('SELECT s.*, w.url, w.shared_secret FROM public.webhook_scheduled s JOIN public.api_key_webhooks w ON s.webhook_id = w.id WHERE s.scheduled_at <= CURRENT_TIMESTAMP AND s.processed = FALSE');
      for (const item of items.rows) {
          const headers = {};
          if (item.shared_secret) {
              headers['X-Webhook-Signature'] = crypto.createHmac('sha256', item.shared_secret).update(JSON.stringify(item.payload)).digest('hex');
          }
          await axios.post(item.url, item.payload, { headers }).catch(console.error);
          await pool.query('UPDATE public.webhook_scheduled SET processed = TRUE WHERE id = $1', [item.id]);
      }
    } catch (err) {
      console.error('Error in scheduled webhook job:', err);
    }
}, 60000);

app.get('/api-keys/top-rpm', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT k.name, COUNT(l.id) as rpm
      FROM public.api_keys k
      LEFT JOIN public.api_key_usage_logs l ON k.id = l.api_key_id
      WHERE l.created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'
      GROUP BY k.id
      ORDER BY rpm DESC
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/requests-distribution-24h', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT k.name, COUNT(l.id)::int as count
      FROM public.api_keys k
      LEFT JOIN public.api_key_usage_logs l ON k.id = l.api_key_id
      WHERE l.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY k.id
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api-keys/:id/tags', async (req, res) => {
  const { tags } = req.body;
  try {
    await pool.query('UPDATE public.api_keys SET tags = $1 WHERE id = $2', [tags, req.params.id]);
    res.json({ message: 'Tags updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api-keys/alerts-recent', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, k.name 
      FROM public.api_key_alerts_sent a
      JOIN public.api_keys k ON a.api_key_id = k.id
      WHERE a.sent_at = CURRENT_DATE
      ORDER BY a.id DESC
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Control plane running on port ${port}`);
});
