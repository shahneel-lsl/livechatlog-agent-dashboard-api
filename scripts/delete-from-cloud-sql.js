// Quick script to delete all conversations from Cloud SQL
const mysql = require('mysql2/promise');

async function deleteAllConversations() {
  console.log('🔌 Connecting to Cloud SQL database...');
  
  const connection = await mysql.createConnection({
    host: '127.0.0.1', // Using localhost - will use Cloud SQL Proxy if available
    port: 3306,
    user: 'root',
    password: '', // Add password if needed
    database: 'livechatlog_database',
    connectTimeout: 60000, // 60 seconds timeout
  });

  try {
    console.log('✅ Connected to database');

    // Get count before deletion
    const [beforeRows] = await connection.query('SELECT COUNT(*) as count FROM conversations');
    const beforeCount = beforeRows[0].count;
    console.log(`📊 Current conversations in database: ${beforeCount}`);

    if (beforeCount === 0) {
      console.log('✨ Database is already empty. Nothing to delete.');
      return;
    }

    console.log('\n⚠️  Deleting ALL conversations in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Deleting all conversations...');
    
    // Delete all conversations
    await connection.query('DELETE FROM conversations');
    
    // Reset auto-increment
    await connection.query('ALTER TABLE conversations AUTO_INCREMENT = 1');

    console.log('✅ All conversations deleted successfully!');
    console.log('🔄 Auto-increment reset to 1');

    // Verify deletion
    const [afterRows] = await connection.query('SELECT COUNT(*) as count FROM conversations');
    const afterCount = afterRows[0].count;
    console.log(`📊 Conversations remaining: ${afterCount}`);
    console.log(`✨ Successfully deleted ${beforeCount} conversations!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
deleteAllConversations()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
