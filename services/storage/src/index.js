const express = require('express');
const Minio = require('minio');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3002;

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

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD
});

// Configure multer to store files on disk in a temporary directory
// to avoid buffering large files entirely in RAM (memoryStorage)
const upload = multer({ dest: '/tmp/neer-data-base_uploads/' });

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// List all buckets
app.get('/buckets', async (req, res) => {
  try {
    const buckets = await minioClient.listBuckets();
    res.json(buckets);
  } catch (err) {
    console.error('Error listing buckets:', err);
    res.status(500).json({ error: 'Failed to list buckets' });
  }
});

// Create a new bucket
app.post('/buckets/:name', async (req, res) => {
  try {
    const bucketName = req.params.name.toLowerCase();
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      res.status(201).json({ message: `Bucket ${bucketName} created successfully` });
    } else {
      res.status(400).json({ error: `Bucket ${bucketName} already exists` });
    }
  } catch (err) {
    console.error('Error creating bucket:', err);
    res.status(500).json({ error: 'Failed to create bucket' });
  }
});

// List objects in a bucket
app.get('/buckets/:name/objects', async (req, res) => {
  const bucketName = req.params.name;
  try {
    const objects = [];
    const stream = minioClient.listObjects(bucketName, '', true);

    stream.on('data', function(obj) {
       objects.push(obj);
    });

    stream.on('end', function() {
       res.json(objects);
    });

    stream.on('error', function(err) {
       console.error('Error listing objects stream:', err);
       res.status(500).json({ error: 'Failed to list objects in bucket' });
    });
  } catch (err) {
    console.error('Error initiating objects stream:', err);
    res.status(500).json({ error: 'Failed to list objects' });
  }
});

// Upload an object to a bucket
app.post('/buckets/:name/objects', upload.single('file'), async (req, res) => {
  const bucketName = req.params.name;
  if (!req.file) {
     return res.status(400).json({ error: 'No file provided' });
  }

  try {
    const metaData = {
        'Content-Type': req.file.mimetype,
    };

    // Upload the file from the temporary disk location to MinIO
    await minioClient.fPutObject(bucketName, req.file.originalname, req.file.path, metaData);

    // Cleanup temporary file
    const fs = require('fs');
    fs.unlink(req.file.path, (err) => {
       if (err) console.error("Error deleting temp file:", err);
    });

    res.status(201).json({ message: 'File uploaded successfully', filename: req.file.originalname });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Delete an object from a bucket
app.delete('/buckets/:name/objects/:objectName', async (req, res) => {
  const bucketName = req.params.name;
  const objectName = req.params.objectName;

  try {
    await minioClient.removeObject(bucketName, objectName);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(port, () => {
  console.log(`Storage wrapper running on port ${port}`);
});
