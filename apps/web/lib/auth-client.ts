"use client"

import { createAuthClient } from "better-auth/react"

function clientBaseUrl() {
  // Immer zuerst die tatsächliche Origin (localhost vs 127.0.0.1 sind für den Browser
  // verschiedene Origins — sonst CORS bei /api/auth/*, wenn .env/Build 127.0.0.1 nutzt
  // und der Nutzer localhost öffnet).
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }
  return "http://localhost:3000"
}

export const authClient = createAuthClient({
  baseURL: clientBaseUrl(),
})
