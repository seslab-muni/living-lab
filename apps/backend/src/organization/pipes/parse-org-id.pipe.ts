import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseOrgIdPipe implements PipeTransform<string, number | string> {
  transform(value: string): number | string {
    if (!value) {
      throw new BadRequestException('Organization identifier is required');
    }

    if (!Number.isNaN(Number(value))) {
      return Number(value);
    }

    return value.trim();
  }
}
