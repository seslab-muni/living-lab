import {
  Column,
  Entity,
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

  @UpdateDateColumn({ type: 'timestamp' })
  lastEdit: Date;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;
}
