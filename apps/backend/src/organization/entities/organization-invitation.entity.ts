import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity({ name: 'organization_invitations' })
export class OrganizationInvitation {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => Organization, (org) => org.id, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column()
  email: string;

  @Column({ unique: true })
  token: string;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
