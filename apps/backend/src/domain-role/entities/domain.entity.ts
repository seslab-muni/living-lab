import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Role } from './role.entity';

export type DomainType = 'Facility' | 'Organization' | 'Project';

@Entity({ name: 'domains' })
export class Domain {
  @PrimaryColumn()
  id: string;

  @Column()
  type: DomainType;

  @OneToMany(() => Role, (role) => role.domain)
  roles: Role[];
}
