import 'express';
import { RateLimitInfo } from 'express-rate-limit';

declare module 'express' {
  export interface Request {
    rateLimit?: RateLimitInfo;
  }
}
