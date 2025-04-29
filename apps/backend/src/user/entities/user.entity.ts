import * as crypto from 'crypto';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: crypto.UUID;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @UpdateDateColumn({ type: 'timestamp' })
  lastEdit: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
