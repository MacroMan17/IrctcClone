const { MongoClient } = require('mongodb');

async function initializeReplicaSet() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/admin', {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const adminDb = client.db('admin');
    try {
      const result = await adminDb.command({ replSetInitiate: {} });
      console.log('✓ Replica set initialized successfully');
    } catch (e) {
      if (e.codeName === 'AlreadyInitialized') {
        console.log('✓ Replica set already initialized');
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initializeReplicaSet().then(() => process.exit(0));
