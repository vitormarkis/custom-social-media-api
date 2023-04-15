import { z } from "zod"

export const userSchema = z.object({
  id: z.number().positive(),
  name: z.string().regex(/ /),
  username: z.string().min(4).max(45),
  email: z.string().email(),
  password: z.string().min(6).max(45),
  profile_pic: z.string().url().nullable(),
  cover_pic: z.string().url(),
  city: z.string(),
  website: z.string().url(),
}) 

export const registerCredentialsSchema = userSchema.pick({
  name: true,
  username: true,
  email: true,
  password: true,
})

export const loginCredentialsSchema = userSchema.pick({
  username: true,
  password: true,
})

export const userLikedPosts = z.obje

/**
 * Types
 */

export type TUser = z.infer<typeof userSchema>
export type IUser = Omit<TUser, "password">
export type TLoginCredentials = z.infer<typeof loginCredentialsSchema>
