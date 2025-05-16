import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Facility } from './entities/facility.entity';
import { Repository } from 'typeorm';
import { DomainService } from 'src/domain-role/domain.service';
import { FacilityDto } from './dto/facility.dto';

@Injectable()
export class FacilityService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepository: Repository<Facility>,
    private domainService: DomainService,
  ) {}

  async getAll() {
    return await this.facilityRepository.find();
  }

  async create(facility_info: FacilityDto, userId: string) {
    const already_exists = await this.facilityRepository.findOne({
      where: { name: facility_info.name },
    });
    if (already_exists) {
      throw new ConflictException('Facility already exists');
    }

    const new_facility = await this.facilityRepository.save({
      name: facility_info.name,
    });
    await this.domainService.create(new_facility.id, 'Facility', userId);
  }

  async delete(id: string) {
    if (!id) {
      throw new NotFoundException("This facility doesn't exist.");
    }
    await this.domainService.deleteDomain(id);
    await this.facilityRepository.delete({ id });
  }
}
