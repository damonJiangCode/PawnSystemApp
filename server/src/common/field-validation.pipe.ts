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

// Nested arrays (e.g. tickets[0].amount) report their first inner message.
const firstMessage = (error?: ValidationError): string => {
  const constraints = error?.constraints ?? {};
  const key =
    PREFERRED.find((name) => name in constraints) ??
    Object.keys(constraints)[0];
  if (key) return constraints[key];
  const child = error?.children?.[0];
  return child ? firstMessage(child) : 'Invalid input.';
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
