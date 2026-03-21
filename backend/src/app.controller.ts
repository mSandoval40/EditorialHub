import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      ok: true,
      message: 'EditorialHub backend activo',
    };
  }
}