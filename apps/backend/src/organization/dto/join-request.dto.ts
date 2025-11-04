export class JoinRequestDto {
  id: number;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  modifiedAt?: Date;
  modifiedBy?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
