import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

async function clearFirebaseConversations() {
  console.log('🔥 Initializing Firebase Admin SDK...');
  
  try {
    // Initialize Firebase Admin SDK
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    const database = app.database();
    console.log('✅ Firebase connected successfully');

    // Get conversations reference
    const conversationsRef = database.ref('conversations');
    const queueRef = database.ref('queue/conversations');

    // Get count before deletion
    console.log('\n📊 Checking current data...');
    const conversationsSnapshot = await conversationsRef.once('value');
    const conversationsCount = conversationsSnapshot.numChildren();
    
    const queueSnapshot = await queueRef.once('value');
    const queueCount = queueSnapshot.numChildren();

    console.log(`📊 Total conversations in Firebase: ${conversationsCount}`);
    console.log(`📊 Total queue items in Firebase: ${queueCount}`);

    if (conversationsCount === 0 && queueCount === 0) {
      console.log('✨ Firebase is already empty. Nothing to delete.');
      await app.delete();
      return;
    }

    console.log('\n⚠️  WARNING: This will permanently delete ALL conversations from Firebase!');
    console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Deleting all conversations from Firebase...');
    
    // Delete conversations
    if (conversationsCount > 0) {
      await conversationsRef.remove();
      console.log('✅ All conversations deleted from Firebase');
    }

    // Delete queue items
    if (queueCount > 0) {
      await queueRef.remove();
      console.log('✅ All queue items deleted from Firebase');
    }

    // Verify deletion
    const afterConversations = await database.ref('conversations').once('value');
    const afterQueue = await database.ref('queue/conversations').once('value');
    
    console.log(`\n📊 Conversations remaining: ${afterConversations.numChildren()}`);
    console.log(`📊 Queue items remaining: ${afterQueue.numChildren()}`);

    console.log('\n✨ Firebase cleanup completed successfully!');

    // Close Firebase connection
    await app.delete();
    console.log('🔌 Firebase connection closed');

  } catch (error) {
    console.error('❌ Error clearing Firebase conversations:', error);
    throw error;
  }
}

// Run the script
clearFirebaseConversations()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
