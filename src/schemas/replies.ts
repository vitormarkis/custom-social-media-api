import { z } from "zod"
import { userSchema } from "./users"

/**
 * GENERAL
 */
export const commentReplySchema = z.object({
  reply_id: z.number(),
  text: z.string().max(249),
  created_at: z.date(),
  author_id: z.number().positive(),
  comment_id: z.number().positive(),
})

export const postCommentReplySchema = z.object({
  reply_id: commentReplySchema.shape.reply_id,
  text: commentReplySchema.shape.text,
  created_at: commentReplySchema.shape.created_at,
  author_id: commentReplySchema.shape.author_id,
  name: userSchema.shape.name,
  profile_pic: userSchema.shape.profile_pic,
})

/**
 * BODY
 */
export const commentReplyBodySchema = z.object({
  text: commentReplySchema.shape.text,
  author_id: commentReplySchema.shape.author_id,
  comment_id: commentReplySchema.shape.comment_id,
})

export const commentReplyRequestBodySchema = commentReplyBodySchema.pick({
  text: true,
  comment_id: true,
})

export const commentReplyGetSchema = commentReplySchema.pick({
  comment_id: true,
})
