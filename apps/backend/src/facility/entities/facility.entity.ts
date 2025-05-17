import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Facility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}
