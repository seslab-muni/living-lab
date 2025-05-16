import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Welcome') // Group name in Swagger UI
@Controller('/')
export class WelcomeController {
  @Get()
  @ApiOperation({ summary: 'Welcome endpoint' })
  @ApiResponse({ status: 200, description: 'Returns Hello World!' })
  welcome() {
    return 'Hello World!';
  }
}
