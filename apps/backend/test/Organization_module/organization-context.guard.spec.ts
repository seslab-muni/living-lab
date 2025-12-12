import { OrganizationContextGuard } from '../../src/organization/guards/organization-context.guard';
import { OrganizationService } from '../../src/organization/organization.service';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

describe('OrganizationContextGuard', () => {
  let guard: OrganizationContextGuard;
  let organizationService: jest.Mocked<OrganizationService>;

  const mockOrgService = {
    findIdBySlug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationContextGuard,
        {
          provide: OrganizationService,
          useValue: mockOrgService,
        },
      ],
    }).compile();

    guard = module.get<OrganizationContextGuard>(OrganizationContextGuard);
    organizationService = module.get(OrganizationService);
  });

  const createMockContext = (params: Record<string, string> = {}) => {
    const request = {
      params,
    } as unknown as Request;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should pass if no idOrSlug param is present', async () => {
    const context = createMockContext({});
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should resolve numeric id directly', async () => {
    const context = createMockContext({ idOrSlug: '123' });
    const request = context.switchToHttp().getRequest<Request>();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.domainId).toBe('123');
    expect(request.params.idOrSlug).toBe('123');
    expect(request.params.domainId).toBe('123');
    expect(mockOrgService.findIdBySlug).not.toHaveBeenCalled();
  });

  it('should resolve slug to id via service', async () => {
    const context = createMockContext({ idOrSlug: 'my-org' });
    const request = context.switchToHttp().getRequest<Request>();
    organizationService.findIdBySlug.mockResolvedValue(456);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockOrgService.findIdBySlug).toHaveBeenCalledWith('my-org');
    expect(request.domainId).toBe('456');
    expect(request.params.domainId).toBe('456');
  });

  it('should throw NotFoundException if slug not found', async () => {
    const context = createMockContext({ idOrSlug: 'unknown-org' });
    organizationService.findIdBySlug.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    expect(mockOrgService.findIdBySlug).toHaveBeenCalledWith('unknown-org');
  });

  it('should handle domainId param if present (legacy support)', async () => {
    const context = createMockContext({ domainId: '789' });
    const request = context.switchToHttp().getRequest<Request>();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.domainId).toBe('789');
  });
});
