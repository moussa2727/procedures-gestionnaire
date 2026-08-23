import { SetMetadata } from '@nestjs/common';
import { THROTTLE_KEY, ThrottleOptions } from '../guards/throttle.guard';

export const Throttle = (options: ThrottleOptions) =>
  SetMetadata(THROTTLE_KEY, options);
