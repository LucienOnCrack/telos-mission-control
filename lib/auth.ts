import { NextRequest } from "next/server"
import { supabaseAdmin } from "./supabase"

/**
 * Authentication and Authorization Helpers
 * 
 * Note: This is a basic implementation. You should integrate with your
 * actual authentication system (e.g., Supabase Auth, NextAuth, etc.)
 */

export interface AuthUser {
  id: string
  email: string
  role: "admin" | "user"
  isPaying: boolean
}

/**
 * Get authenticated user from request
 * This should be replaced with your actual auth implementation
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)

    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return null
    }

    // Get user role and payment status from your database
    // This is a placeholder - implement according to your schema
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("role, is_paying")
      .eq("user_id", user.id)
      .single()

    return {
      id: user.id,
      email: user.email || "",
      role: profile?.role || "user",
      isPaying: profile?.is_paying || false,
    }
  } catch (error) {
    console.error("Error getting auth user:", error)
    return null
  }
}

/**
 * Require authentication
 * Throws error if user is not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request)
  
  if (!user) {
    throw new Error("Authentication required")
  }

  return user
}

/**
 * Require paying user
 * Throws error if user is not authenticated or not paying
 */
export async function requirePayingUser(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request)

  if (!user.isPaying) {
    throw new Error("Active subscription required")
  }

  return user
}

/**
 * Require admin role
 * Throws error if user is not admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request)

  if (user.role !== "admin") {
    throw new Error("Admin access required")
  }

  return user
}

/**
 * Simple rate limiting helper
 * In production, use a proper rate limiting solution like Upstash
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: maxRequests - record.count }
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Use IP address as fallback
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown"
  return `ip:${ip}`
}



