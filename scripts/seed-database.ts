import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Agent, AgentRole, AgentStatus } from '../src/database/mysql/agent.entity';
import { Group, RoutingStrategy } from '../src/database/mysql/group.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  console.log('🚀 Starting database seeding...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const agentRepository: Repository<Agent> = app.get(getRepositoryToken(Agent));
  const groupRepository: Repository<Group> = app.get(getRepositoryToken(Group));

  try {
    // 1. Create Admin Agent
    console.log('1️⃣ Creating admin agent...');
    const existingAdmin = await agentRepository.findOne({
      where: { email: 'admin@livechat.com' },
    });

    let admin: Agent;

    if (existingAdmin) {
      console.log('   ⚠️  Admin already exists!');
      admin = existingAdmin;
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      admin = agentRepository.create({
        name: 'System Admin',
        email: 'admin@livechat.com',
        password: hashedPassword,
        role: AgentRole.ADMIN,
        status: AgentStatus.ONLINE,
        acceptingChats: true,
        maxConcurrentChats: 10,
      });

      await agentRepository.save(admin);
      console.log('   ✅ Admin agent created successfully!');
      console.log('   📧 Email: admin@livechat.com');
      console.log('   🔑 Password: admin123\n');
    }

    // 2. Create Sample Agent
    console.log('2️⃣ Creating sample agent...');
    const existingAgent = await agentRepository.findOne({
      where: { email: 'agent@livechat.com' },
    });

    let agent: Agent;

    if (existingAgent) {
      console.log('   ⚠️  Sample agent already exists!');
      agent = existingAgent;
    } else {
      const hashedPassword = await bcrypt.hash('agent123', 10);

      agent = agentRepository.create({
        name: 'John Agent',
        email: 'agent@livechat.com',
        password: hashedPassword,
        role: AgentRole.AGENT,
        status: AgentStatus.ONLINE,
        acceptingChats: true,
        maxConcurrentChats: 5,
      });

      await agentRepository.save(agent);
      console.log('   ✅ Sample agent created successfully!');
      console.log('   📧 Email: agent@livechat.com');
      console.log('   🔑 Password: agent123\n');
    }

    // 3. Create Default Group
    console.log('3️⃣ Creating default group...');
    const existingGroup = await groupRepository.findOne({
      where: { name: 'Support Team' },
      relations: ['agents'],
    });

    let group: Group;

    if (existingGroup) {
      console.log('   ⚠️  Default group already exists!');
      group = existingGroup;
    } else {
      group = groupRepository.create({
        name: 'Support Team',
        description: 'Customer support department',
        routingStrategy: RoutingStrategy.LEAST_LOADED,
        isDefault: true,
      });

      await groupRepository.save(group);
      console.log('   ✅ Default group created successfully!\n');
    }

    // 4. Assign Agents to Group
    console.log('4️⃣ Assigning agents to group...');
    
    // Reload group with agents
    const groupWithAgents = await groupRepository.findOne({
      where: { id: group.id },
      relations: ['agents'],
    });

    if (!groupWithAgents) {
      throw new Error('Group not found after creation');
    }

    const agentIds = groupWithAgents.agents.map(a => a.id);
    const needsAdmin = !agentIds.includes(admin.id);
    const needsAgent = !agentIds.includes(agent.id);

    if (needsAdmin || needsAgent) {
      const agentsToAdd: Agent[] = [];
      if (needsAdmin) agentsToAdd.push(admin);
      if (needsAgent) agentsToAdd.push(agent);

      groupWithAgents.agents = [...groupWithAgents.agents, ...agentsToAdd];
      await groupRepository.save(groupWithAgents);
      console.log('   ✅ Agents assigned to group!\n');
    } else {
      console.log('   ⚠️  Agents already assigned to group!\n');
    }

    // Summary
    console.log('=' .repeat(50));
    console.log('✨ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Agents created: 2`);
    console.log(`   • Groups created: 1`);
    console.log(`   • Assignments: ${groupWithAgents.agents.length} agents in group\n`);
    console.log('🔐 Login Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@livechat.com');
    console.log('     Password: admin123\n');
    console.log('   Agent:');
    console.log('     Email: agent@livechat.com');
    console.log('     Password: agent123\n');
    console.log('🚀 Next Steps:');
    console.log('   1. Start the server: npm run start:dev');
    console.log('   2. Import Postman collection');
    console.log('   3. Login with admin credentials');
    console.log('   4. Test the APIs!\n');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();
