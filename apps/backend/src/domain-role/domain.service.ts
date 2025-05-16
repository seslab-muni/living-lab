import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Roles } from 'src/common/types/roles';
import { Domain, DomainType } from './entities/domain.entity';
import { UserService } from 'src/user/user.service';

type UserAssignment = {
  id: string;
  firstName: string;
  lastName: string;
  role: Roles;
};

@Injectable()
export class DomainService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Domain)
    private domainRepository: Repository<Domain>,
    private userService: UserService,
  ) {}

  async getRole(user_id: string, domain_id: string) {
    const role = await this.roleRepository.findOne({
      where: {
        userId: user_id,
        domainId: domain_id,
      },
    });
    if (role) {
      return role.name;
    }
    return null;
  }

  async create(id: string, type: DomainType, userId: string) {
    const domain = await this.domainRepository.save({ id, type });
    await this.roleRepository.save({
      userId,
      domainId: domain.id,
      name: 'Owner',
    });
  }

  async changeUserRole(domainId: string, userId: string, role: Roles) {
    const user_role = await this.roleRepository.findOne({
      where: { domainId, userId },
    });
    if (!user_role) {
      await this.roleRepository.save({ userId, domainId, name: role });
    }
    if (user_role && user_role.name != role) {
      await this.roleRepository.delete({ domainId, userId });
      await this.roleRepository.save({ userId, domainId, name: role });
    }
  }

  async getAllUsers(id: string) {
    const domain = await this.domainRepository.findOne({ where: { id } });
    if (!domain) {
      throw new NotFoundException('This domain was not found');
    }
    const users = await this.userService.getAllActive();
    const res: UserAssignment[] = [];
    for (const user of users) {
      const role = await this.roleRepository.findOne({
        where: { userId: user.id, domainId: domain.id },
      });
      if (role) {
        res.push({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: role.name,
        });
      }
    }
    return res;
  }

  async deleteDomain(id: string) {
    await this.domainRepository.delete({ id });
  }

  async getAllNotMembers(domainId: string) {
    const domain = await this.domainRepository.findOne({
      where: { id: domainId },
    });
    if (!domain) {
      throw new NotFoundException('This domain was not found');
    }
    const users = await this.userService.getAllActive();
    const res = [];
    for (const user of users) {
      const role = await this.roleRepository.findOne({
        where: { userId: user.id, domainId: domain.id },
      });
      if (!role) {
        res.push({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      }
    }
    return res;
  }

  async deleteRole(domainId: string, userId: string) {
    await this.roleRepository.delete({ domainId, userId });
  }
}
