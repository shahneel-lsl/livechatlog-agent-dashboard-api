import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

async function clearConversations() {
  console.log('🔌 Connecting to database...');
  
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'livechatlog_database',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Get count before deletion
    const beforeCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM conversations'
    );
    console.log(`📊 Current conversations in database: ${beforeCount[0].count}`);

    if (beforeCount[0].count === 0) {
      console.log('✨ Database is already empty. Nothing to delete.');
      return;
    }

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete ALL conversations!');
    console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Deleting all conversations...');
    
    // Delete all conversations
    await dataSource.query('DELETE FROM conversations');
    
    // Reset auto-increment
    await dataSource.query('ALTER TABLE conversations AUTO_INCREMENT = 1');

    console.log('✅ All conversations deleted successfully!');
    console.log('🔄 Auto-increment reset to 1');

    // Verify deletion
    const afterCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM conversations'
    );
    console.log(`📊 Conversations remaining: ${afterCount[0].count}`);

  } catch (error) {
    console.error('❌ Error clearing conversations:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
clearConversations()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
