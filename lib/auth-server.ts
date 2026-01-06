import { compare, hash } from 'bcryptjs'
import { sign, verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-prod'

export async function hashPassword(password: string): Promise<string> {
    return hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash)
}

export function signToken(payload: any): string {
    return sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): any {
    try {
        return verify(token, JWT_SECRET)
    } catch (e) {
        return null
    }
}
