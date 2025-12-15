import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

export enum InvitationStatus {
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  REVOKED = 'Revoked',
}

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

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ nullable: true })
  createdBy?: string;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  modifiedAt?: Date;

  @Column({ nullable: true })
  modifiedBy?: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
