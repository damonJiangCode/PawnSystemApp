import { ValidationPipe } from '@nestjs/common';

export const strictValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
