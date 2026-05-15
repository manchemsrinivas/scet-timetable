const { MongoClient } = require('mongodb');
const dns = require('dns');

// Force using Google DNS to resolve SRV records
dns.setServers(['8.8.8.8', '1.1.1.1']);

const SOURCE_URI = 'mongodb://127.0.0.1:27017';
const TARGET_URI = 'mongodb+srv://master123:master123@cluster0.cjxmwws.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const SOURCE_DB = 'scet_timetable';
const TARGET_DB = 'scet_timetable';

async function migrate() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    console.log('Connecting to Source (Local)...');
    await sourceClient.connect();
    console.log('Connected to Source.');

    console.log('Connecting to Target (Atlas via Google DNS)...');
    await targetClient.connect();
    console.log('Connected to Target.');

    const sourceDb = sourceClient.db(SOURCE_DB);
    const targetDb = targetClient.db(TARGET_DB);

    const collections = await sourceDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections to migrate.`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      if (collectionName.startsWith('system.')) continue;

      console.log(`Migrating collection: ${collectionName}...`);
      
      const sourceCol = sourceDb.collection(collectionName);
      const targetCol = targetDb.collection(collectionName);

      const documents = await sourceCol.find({}).toArray();
      
      if (documents.length > 0) {
        await targetCol.deleteMany({});
        await targetCol.insertMany(documents);
        console.log(`  - Migrated ${documents.length} documents.`);
      } else {
        console.log(`  - Collection is empty, skipping.`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();
