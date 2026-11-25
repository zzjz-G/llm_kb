import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  studentId: string;
  role: string;
  name: string;
}

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: number;

  constructor(private configService: ConfigService) {
    this.secret = this.configService.get<string>('JWT_SECRET') || 'lab_inventory_management_secret_key_2024';
    this.expiresIn = 7 * 24 * 60 * 60;
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verify(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch {
      return null;
    }
  }
}
