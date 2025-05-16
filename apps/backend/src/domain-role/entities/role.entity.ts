import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Domain } from './domain.entity';
import type { Roles } from '../../common/types/roles';
import { User } from 'src/user/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryColumn()
  userId: string;

  @PrimaryColumn()
  domainId: string;

  @Column()
  name: Roles;

  @ManyToOne(() => Domain, (d) => d.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain' })
  domain: Domain;

  @ManyToOne(() => User, (u) => u.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user' })
  user: User;
}
