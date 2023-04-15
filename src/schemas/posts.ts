import { z } from "zod"
import { userSchema } from "./users"

export const postBodySchema = z.object({
  text: z.string().max(449),
  image: z.string().url().optional(),
})

export const postSchema = z.object({
  id: z.number().positive(),
  text: z.string().max(449),
  image: z.string().url().optional(),
  author_id: z.number().positive(),
  created_at: z.date(),
  comments_amount: z.number(),
})

export const postAPIResponseSchema = postSchema
  .merge(userSchema)
  .pick({
    id: true,
    text: true,
    created_at: true,
    author_id: true,
    username: true,
    profile_pic: true,
    comments_amount: true,
  })
  .transform(({ profile_pic, text, username, comments_amount, ...rest }) => ({
    post_author_id: rest.author_id,
    post_created_at: rest.created_at,
    post_id: rest.id,
    profile_pic,
    text,
    username,
    comments_amount,
  }))

export const likedPostSchema = z.object({
  post_id: postSchema.shape.id,
  text: postSchema.shape.text,
  likes_amount: z.number(),
  comments_amount: z.number(),
  profile_pic: userSchema.shape.profile_pic,
  author_id: postSchema.shape.author_id,
  username: userSchema.shape.username,
  name: userSchema.shape.name,
})

export type IPostInput = z.input<typeof postSchema>
export type IPost = z.output<typeof postSchema>
export type IPostBody = z.infer<typeof postBodySchema>
export type ILikedPostSchema = z.infer<typeof likedPostSchema>

export type IPostAPIResponse = z.infer<typeof postAPIResponseSchema>
