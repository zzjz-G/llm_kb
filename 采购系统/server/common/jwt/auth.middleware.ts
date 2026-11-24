import { Injectable, NestMiddleware, SetMetadata, UnauthorizedException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from './jwt.service';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const customHeader = req.headers['x-lab-auth-token'];
  if (customHeader && typeof customHeader === 'string') {
    return customHeader;
  }
  return null;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    const payload = this.jwtService.verify(token);
    if (!payload) {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  }
}

@Injectable()
export class OptionalAuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = extractToken(req);
    if (token) {
      const payload = this.jwtService.verify(token);
      if (payload) {
        (req as AuthenticatedRequest).user = payload;
      }
    }
    next();
  }
}

export const ROLES_KEY = 'roles';
export const Roles = (roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
