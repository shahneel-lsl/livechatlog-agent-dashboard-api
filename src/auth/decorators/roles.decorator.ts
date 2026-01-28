import { SetMetadata } from '@nestjs/common';
import { AgentRole } from '../../database/mysql/agent.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AgentRole[]) => SetMetadata(ROLES_KEY, roles);
