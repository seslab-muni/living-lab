import { Entity } from 'typeorm';

@Entity()
export class NewUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
