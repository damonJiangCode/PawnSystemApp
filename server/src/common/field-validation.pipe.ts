import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

// When several rules fail (e.g. "abc" fails isNumber, min and max), the
// presence/type message explains the problem best.
const PREFERRED = [
  'whitelistValidation',
  'isNotEmpty',
  'isString',
  'isNumber',
  'isInt',
  'isBoolean',
];

const firstMessage = (error?: ValidationError) => {
  const constraints = error?.constraints ?? {};
  const key =
    PREFERRED.find((name) => name in constraints) ??
    Object.keys(constraints)[0];
  return key ? constraints[key] : 'Invalid input.';
};

// Same rules as strictValidationPipe, but a failure is reported as
// { field, message } for the first invalid property so forms can focus it.
export const fieldValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: ([error]) =>
    new BadRequestException({
      field: error?.property,
      message: firstMessage(error),
    }),
});
