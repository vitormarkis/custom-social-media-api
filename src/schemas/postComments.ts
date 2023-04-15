import { z } from "zod"
import { postSchema } from "./posts"
import { userSchema } from "./users"

/**
 * GENERAL
 */
export const commentSchema = z.object({
  comment_id: z.number(),
  text: z.string(),
  created_at: z.date(),
  author_id: z.number().positive(),
})

export const postCommentSchema = z.object({
  comment_id: commentSchema.shape.comment_id,
  text: commentSchema.shape.text,
  created_at: commentSchema.shape.created_at,
  author_id: commentSchema.shape.author_id,
  name: userSchema.shape.name,
  username: userSchema.shape.username,
  profile_pic: userSchema.shape.profile_pic,
  post_id: postSchema.shape.id,
})

/**
 * BODY
 */
export const postCommentBodySchema = z.object({
  text: commentSchema.shape.text,
  author_id: userSchema.shape.id,
  post_id: postSchema.shape.id,
})
