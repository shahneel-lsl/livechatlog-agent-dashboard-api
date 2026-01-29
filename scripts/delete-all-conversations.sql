USE livechatlog_database;

SELECT COUNT(*) as 'Before Delete Count' FROM conversations;

DELETE FROM conversations;

ALTER TABLE conversations AUTO_INCREMENT = 1;

SELECT COUNT(*) as 'After Delete Count' FROM conversations;
