import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DefineRoles } from 'src/common/decorators/roles.decorator';
import { FacilityService } from './facility.service';
import { FacilityDto } from './dto/facility.dto';
import { RequestUser } from 'src/common/types/request-user';
import { RolesGuard } from 'src/domain-role/guards/access-control.guard';

@ApiTags('Facilities')
@Controller('facilities')
export class FacilityController {
  constructor(private facilityService: FacilityService) {}

  @Get()
  @ApiOperation({ summary: 'All facilitites data' })
  @ApiResponse({
    status: 200,
    description: 'All facilitities data returned successfully',
  })
  async allFacilities() {
    return await this.facilityService.getAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a facility' })
  @ApiResponse({
    status: 200,
    description: 'Facility was succesfully created.',
  })
  async createFacility(
    @Body() body: FacilityDto,
    @Req() req: { user: RequestUser },
  ) {
    return await this.facilityService.create(body, req.user?.id);
  }

  @Put('/:domainId/delete')
  @DefineRoles('Owner', 'Admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a facility' })
  @ApiResponse({
    status: 200,
    description: 'Facility was successfully deleted.',
  })
  async delete(@Param() param: { domainId: string }) {
    await this.facilityService.delete(param.domainId);
  }

  @Get('/:domainId')
  @DefineRoles('Owner', 'Admin', 'Manager', 'Moderator', 'Viewer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get facility details' })
  @ApiResponse({
    status: 200,
    description: 'Facility details were provided.',
  })
  async getDetails(@Param() param: { domainId: string }) {
    const facility = await this.facilityService.getDetails(param.domainId);
    return { facility };
  }
}
