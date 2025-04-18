import { Body, Controller, Get } from '@nestjs/common';

@Controller('/')
export class WelcomeController {
  @Get()
  welcome() {
    return 'Hello World!';
  }
}