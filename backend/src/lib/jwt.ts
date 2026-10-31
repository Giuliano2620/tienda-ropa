import "dotenv/config";
import jwt from "jsonwebtoken";

export type AuthRole = "CUSTOMER" | "ADMIN";

export interface AuthPayload {
  userId: number;
  role: AuthRole;
}

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("Falta la variable JWT_SECRET en el archivo .env");
}

const JWT_SECRET: string = secret;

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (typeof decoded === "string") {
    throw new Error("Token inválido");
  }

  return { userId: decoded.userId, role: decoded.role };
}