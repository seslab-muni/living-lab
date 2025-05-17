export class JoinRequestDto {
  id: number;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
