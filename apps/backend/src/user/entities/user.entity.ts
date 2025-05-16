
import { Role } from 'src/domain-role/entities/role.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @ManyToMany(() => Organization, (org) => org.id)
  organizations: Organization[];

  @UpdateDateColumn({ type: 'timestamp' })
  lastEdit: Date;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;
  
  @OneToMany(() => Role, (r) => r.user)
  roles: Role[];
}
