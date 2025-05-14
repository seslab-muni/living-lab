import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'organization' })
export class Organization {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;
  @Column()
  ownerId: string;

  @ManyToOne(() => User, (user) => user.ownedOrganizations, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'ownerId' })
  owner: User;
  @Column({ type: 'int' })
  companyId: number;

  @Column()
  companyName: string;
  @UpdateDateColumn({ type: 'timestamp' })
  lastEdit: Date;
  @ManyToMany(() => User, (user) => user.organizations)
  @JoinTable({
    name: 'user_organizations',
    joinColumn: { name: 'organizationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  members: User[];
}

export default Organization;
