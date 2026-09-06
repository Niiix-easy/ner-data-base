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
const port = process.env.PORT || 3001;

app.use(express.json());

// Simplistic Authentication Middleware for internal endpoints suited for local ZimaOS execution
app.use((req, res, next) => {
  if (req.path === "/health") return next();

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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
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

app.listen(port, () => {
  console.log(`Control plane running on port ${port}`);
});
