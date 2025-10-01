import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationService } from './organization.service';
import { Organization } from './entities/organization.entity';
import { JoinRequest } from './entities/join-request.entity';
import { User } from '../user/entities/user.entity';

// Mock repositories
const mockOrgRepo = {
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockJoinRequestRepo = {};
const mockUserRepo = {};

describe('OrganizationService - Slug Generation', () => {
  let service: OrganizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepo },
        {
          provide: getRepositoryToken(JoinRequest),
          useValue: mockJoinRequestRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate slug "m-2" if "m" and "m-1" already exist', async () => {
    mockOrgRepo.findOne
      .mockResolvedValueOnce({ slug: 'm' }) // "m" exists
      .mockResolvedValueOnce({ slug: 'm-1' }) // "m-1" exists
      .mockResolvedValueOnce(null); // "m-2" free

    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 1,
      slug: 'm-2',
      name: 'M',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>) => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 1 });

    await service.create('user-1', {
      name: 'M',
      companyId: 1,
      companyName: 'Company',
    } as any);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'm-2' }),
    );
  });

  it('should normalize and remove diacritics: "Česká Firma" → "ceska-firma"', async () => {
    mockOrgRepo.findOne.mockResolvedValue(null);

    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 2,
      slug: 'ceska-firma',
      name: 'Česká Firma',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>) => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 2 });

    await service.create('user-1', {
      name: 'Česká Firma',
      companyId: 1,
      companyName: 'Company',
    } as any);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'ceska-firma' }),
    );
  });

  it('should generate slug "m-2" if "m", "m-1" and "m-6" already exist (gap case)', async () => {
    mockOrgRepo.findOne
      .mockResolvedValueOnce({ slug: 'm' }) // "m" exists
      .mockResolvedValueOnce({ slug: 'm-1' }) // "m-1" exists
      .mockResolvedValueOnce(null); // "m-2" free

    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 3,
      slug: 'm-2',
      name: 'M',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>) => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 3 });

    await service.create('user-1', {
      name: 'M',
      companyId: 1,
      companyName: 'Company',
    } as any);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'm-2' }),
    );
  });

  it('should trim and replace multiple spaces with a single dash', async () => {
    mockOrgRepo.findOne.mockResolvedValue(null);

    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 4,
      slug: 'my-org',
      name: '  My   Org  ',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>) => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 4 });

    await service.create('user-1', {
      name: '  My   Org  ',
      companyId: 1,
      companyName: 'Company',
    } as any);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-org' }),
    );
  });

  it('should strip special characters and leave only valid slug parts', async () => {
    mockOrgRepo.findOne.mockResolvedValue(null);

    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 5,
      slug: 'my-org',
      name: 'My Org!!! @#$%^&*()',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>) => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 5 });

    await service.create('user-1', {
      name: 'My Org!!! @#$%^&*()',
      companyId: 1,
      companyName: 'Company',
    } as any);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-org' }),
    );
  });

  it('should generate slug "m-10" if "m" through "m-9" already exist', async () => {
    // Simulate DB has m, m-1, m-2, ... m-9
    for (let i = 0; i <= 9; i++) {
      mockOrgRepo.findOne.mockResolvedValueOnce({
        slug: i === 0 ? 'm' : `m-${i}`,
      });
    }
    mockOrgRepo.findOne.mockResolvedValueOnce(null);

    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 6,
      slug: 'm-10',
      name: 'M',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>) => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 6 });

    await service.create('user-1', {
      name: 'M',
      companyId: 1,
      companyName: 'Company',
    } as any);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'm-10' }),
    );
  });

  it('should handle very long names without crashing', async () => {
    const longName = 'a'.repeat(300);
    const expectedSlug = 'a'.repeat(300);

    mockOrgRepo.findOne.mockResolvedValue(null);

    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 7,
      slug: expectedSlug,
      name: longName,
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>) => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 7 });

    await service.create('user-1', {
      name: longName,
      companyId: 1,
      companyName: 'Company',
    } as any);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: expectedSlug }),
    );
  });
});
