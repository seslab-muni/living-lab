import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationService } from '../../src/organization/organization.service';
import { Organization } from '../../src/organization/entities/organization.entity';
import { JoinRequest } from '../../src/organization/entities/join-request.entity';
import { User } from '../../src/user/entities/user.entity';
import { CreateOrganizationDto } from '../../src/organization/dto/create-organization.dto';

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};

const mockOrgRepo = {
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

const mockJoinRequestRepo = {};
const mockUserRepo = {};

describe('OrganizationService - Slug Generation (based on companyName, QueryBuilder version)', () => {
  let service: OrganizationService;

  beforeEach(async () => {
    jest.clearAllMocks();

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

  afterEach(() => jest.clearAllMocks());

  it('should return base slug when no duplicates exist', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([]);

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>): Organization => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 1 });
    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 1,
      slug: 'm',
      name: 'irrelevant',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    await service.create('user-1', {
      name: 'irrelevant',
      companyId: 1,
      companyName: 'M',
    } as CreateOrganizationDto);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'm' }),
    );
  });

  it('should append "-1" when one duplicate exists', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([{ slug: 'm' }]);

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>): Organization => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 2 });
    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 2,
      slug: 'm-1',
      name: 'irrelevant',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    await service.create('user-1', {
      name: 'irrelevant',
      companyId: 1,
      companyName: 'M',
    } as CreateOrganizationDto);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'm-1' }),
    );
  });

  it('should append next available number if gaps exist (m, m-1, m-6 → m-7)', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([
      { slug: 'm' },
      { slug: 'm-1' },
      { slug: 'm-6' },
    ]);

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>): Organization => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 3 });
    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 3,
      slug: 'm-7',
      name: 'irrelevant',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    await service.create('user-1', {
      name: 'irrelevant',
      companyId: 1,
      companyName: 'M',
    } as CreateOrganizationDto);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'm-7' }),
    );
  });

  it('should normalize and remove diacritics ("Česká Firma" → "ceska-firma")', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([]);

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>): Organization => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 4 });
    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 4,
      slug: 'ceska-firma',
      name: 'irrelevant',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    await service.create('user-1', {
      name: 'irrelevant',
      companyId: 1,
      companyName: 'Česká Firma',
    } as CreateOrganizationDto);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'ceska-firma' }),
    );
  });

  it('should trim and replace multiple spaces with a single dash', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([]);

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>): Organization => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 5 });
    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 5,
      slug: 'my-org',
      name: 'irrelevant',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    await service.create('user-1', {
      name: 'irrelevant',
      companyId: 1,
      companyName: '  My   Org  ',
    } as CreateOrganizationDto);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-org' }),
    );
  });

  it('should strip special characters and leave only valid slug parts', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([]);

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>): Organization => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 6 });
    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 6,
      slug: 'my-org',
      name: 'irrelevant',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    await service.create('user-1', {
      name: 'irrelevant',
      companyId: 1,
      companyName: 'My Org!!! @#$%^&*()',
    } as CreateOrganizationDto);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-org' }),
    );
  });

  it('should generate slug "m-10" if "m" through "m-9" already exist', async () => {
    const slugs = [{ slug: 'm' }];
    for (let i = 1; i <= 9; i++) slugs.push({ slug: `m-${i}` });
    mockQueryBuilder.getMany.mockResolvedValue(slugs);

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>): Organization => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 7 });
    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 7,
      slug: 'm-10',
      name: 'irrelevant',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    await service.create('user-1', {
      name: 'irrelevant',
      companyId: 1,
      companyName: 'M',
    } as CreateOrganizationDto);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'm-10' }),
    );
  });

  it('should handle very long company names without crashing', async () => {
    const longName = 'a'.repeat(300);
    const expectedSlug = 'a'.repeat(300);

    mockQueryBuilder.getMany.mockResolvedValue([]);

    mockOrgRepo.create.mockImplementation(
      (dto: Partial<Organization>): Organization => dto as Organization,
    );
    mockOrgRepo.save.mockResolvedValue({ id: 8 });
    mockOrgRepo.findOneOrFail.mockResolvedValue({
      id: 8,
      slug: expectedSlug,
      name: 'irrelevant',
      owner: { id: 'user-1', firstName: 'Test', lastName: 'Owner' },
      members: [],
    });

    await service.create('user-1', {
      name: 'irrelevant',
      companyId: 1,
      companyName: longName,
    } as CreateOrganizationDto);

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: expectedSlug }),
    );
  });
});
