import jwt, { SignOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || '';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  adminId: number;
  role: 'super_admin' | 'admin';
}

export function signToken(payload: JwtPayload): string {
  if (!SECRET) throw new Error('JWT_SECRET is not set');
  const opts: SignOptions = { expiresIn: EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, SECRET, opts);
}

export function verifyToken(token: string): JwtPayload {
  if (!SECRET) throw new Error('JWT_SECRET is not set');
  return jwt.verify(token, SECRET) as JwtPayload;
}
