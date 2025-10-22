import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'organization' })
export class Organization {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;
  @Column()
  creatorId: string;

  @ManyToOne(() => User, (user) => user.createdOrganizations, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'creatorId' })
  creator: User;
  @Column({ type: 'int' })
  companyId: number;

  @Column()
  companyName: string;
  @Column({ default: false })
  isPrivate: boolean;
  @UpdateDateColumn({ type: 'timestamp' })
  lastEdit: Date;
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
  @ManyToMany(() => User, (user) => user.organizations)
  @JoinTable({
    name: 'user_organizations',
    joinColumn: { name: 'organizationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  members: User[];
}

export default Organization;
