import { RequestHandler } from "express"
import { RowDataPacket } from "mysql2"
import { z } from "zod"
import { postCommentBodySchema, postCommentSchema } from "../schemas/postComments"
import { postAPIResponseSchema, postBodySchema } from "../schemas/posts"
import { postLikesBodySchema, postLikesSchema } from "../schemas/post_likes"
import {
  commentReplyBodySchema,
  commentReplyGetSchema,
  commentReplyRequestBodySchema,
  postCommentReplySchema,
} from "../schemas/replies"
import { connection } from "../services/mysql"

type Query = {} & unknown & RowDataPacket

export const getPosts: RequestHandler = (request, response) => {
  const { userId } = request

  const q = `
  SELECT p.*, p.id as post_id, u.profile_pic, u.username
  FROM posts as p
  join relationships as r
  on p.author_id = r.followed_user_id
  join users as u
  on u.id = p.author_id
  where r.follower_user_id = (?)
`

  const newQ = `
    select 
      p.*, 
      p.id as post_id, 
      a.profile_pic, 
      a.username,
      count(c.id) as comments_amount
    from posts as p
    left join relationships as r
    on r.followed_user_id = p.author_id and r.follower_user_id = (?)
    join users as a
    on p.author_id = a.id
    left join comments as c
    on c.post_id = p.id
    where p.author_id = (?) or p.author_id = r.followed_user_id
    group by p.id
  `

  connection.query<Query[]>(newQ, [userId, userId], (error, posts) => {
    if (error) return response.status(500).json(error)
    const filteredPosts = posts.map(({ password, ...rest }) => postAPIResponseSchema.parse(rest))
    return response.status(201).json(filteredPosts)
  })
}

export const getLikedPosts: RequestHandler = (request, response) => {
  const { userId } = request
  const q = `
  select id as post_like_id, user_id, post_id
  from post_likes
  where user_id = (?);
  `

  connection.query<Query[]>(q, [userId], (error, result) => {
    if (error) return response.status(500).json(error)
    const likedPosts = z.array(postLikesSchema).parse(result)
    return response.status(200).json(likedPosts)
  })
}

export const toggleLikePost: RequestHandler = (request, response) => {
  const userId = request.userId!

  const { post_id, user_id } = postLikesBodySchema.parse({ ...request.body, user_id: +userId })

  const foundQuery = `
    select * 
    from post_likes 
    where 
      user_id = (?) and 
      post_id = (?)
  `

  connection.query<Query[]>(foundQuery, [user_id, post_id], (error, found) => {
    if (error) return response.status(500).json(error)
    const isAdding: boolean = found.length === 0

    const addingQuery = `
      insert into post_likes
      (user_id, post_id)
      values
      (?, ?);
    `

    const deletingQuery = `
      delete from post_likes where user_id = (?) and post_id = (?)
    `

    const q = isAdding ? addingQuery : deletingQuery
    const message = isAdding
      ? `Usuário ${user_id} curtiu o post ${post_id}`
      : `Usuário ${user_id} descurtiu o post ${post_id}`

    connection.query<Query[]>(q, [user_id, post_id], error => {
      if (error) return response.status(500).json(error)
      return response.status(201).json({ message })
    })
  })
}

export const createPost: RequestHandler = (request, response) => {
  const { userId: author_id } = request
  const parsedPostBody = postBodySchema.parse(request.body)

  const text_q = "insert into posts (text, author_id) values (?, ?)"
  const image_q = "insert into posts (text, author_id, image) values (?, ?, ?)"

  const q = "image" in parsedPostBody ? image_q : text_q

  connection.query(q, [parsedPostBody.text, author_id, parsedPostBody.image], error => {
    if (error) return response.status(500).json(error)
    return response.status(201).json({ message: "Post criado com sucesso!" })
  })
}

export const getPost: RequestHandler = (request, response) => {
  const { postId } = request.params

  const q = `
    select p.*, u.*, count(c.id) as comments_amount
    from posts as p 
    join users as u 
    on u.id = p.author_id 
    left join comments as c 
    on c.post_id = p.id 
    where p.id = (?)
  `

  connection.query<any[]>(q, [postId], (error, result) => {
    if (error) return response.status(500).json(error)
    
    const post = result[0]
    return response.status(201).json(post)
  })
}

export const getPostComments: RequestHandler = (request, response) => {
  const { postId } = request.params

  const q = `
    SELECT 
      c.id as comment_id, 
      c.text, 
      c.created_at, 
      c.author_id, 
      c.post_id, 
      u.name, 
      u.username, 
      u.profile_pic 
    FROM comments as c 
    join users as u 
    on u.id = c.author_id 
    where post_id = (?)
    `

  connection.query<Query[]>(q, [postId], (error, result) => {
    if (error) return response.status(500).json(error)
    const postComments = z.array(postCommentSchema).parse(result)
    return response.status(201).json(postComments)
  })
}

export const createPostComment: RequestHandler = (request, response) => {
  const { postId } = request.params
  const q = `select * from posts where id = (?)`

  connection.query<Query[]>(q, [postId], (error, result) => {
    if (error) return response.status(500).json(error)
    if (result.length === 0) return response.status(400).json({ message: "Não existe um post com esse id." })

    const { userId } = request
    const unkCommentBody = {
      ...request.body,
      post_id: Number(postId),
      author_id: Number(userId),
    }
    const { author_id, post_id, text } = postCommentBodySchema.parse(unkCommentBody)

    const q = `
    insert into
    comments (
      text, 
      post_id, 
      author_id
    )
    values
    (?, ?, ?)
  `

    connection.query(q, [text, post_id, author_id], error => {
      if (error) return response.status(500).json(error)
      return response.status(201).json({ message: "Comentário criado com sucesso!" })
    })
  })
}

export const createPostCommentReply: RequestHandler = (request, response) => {
  const userId = request.userId!
  const unkBody = commentReplyRequestBodySchema.parse(request.body)
  const { author_id, comment_id, text } = commentReplyBodySchema.parse({
    ...unkBody,
    author_id: +userId,
  })

  const q = `
    select *
    from comments
    where id = (?);
  `

  connection.query<Query[]>(q, [comment_id], (error, result) => {
    if (error) return response.status(500).json(error)
    if (result.length === 0)
      return response.status(404).json({ message: "Não existe nenhum comentário com esse id." })

    const q = `
      insert into replies (
        text,
        comment_id,
        author_id
      )
      values
      (?, ?, ?)
     `

    connection.query(q, [text, comment_id, author_id], error => {
      if (error) return response.status(500).json(error)
      return response.status(201).json({ message: "Resposta criada com sucesso!" })
    })
  })
}

export const getPostCommentReplies: RequestHandler = (request, response) => {
  const unkBody = request.body
  const { comment_id } = commentReplyGetSchema.parse(unkBody)

  const q = `
    select *
    from comments
    where id = (?);
  `

  connection.query<Query[]>(q, [comment_id], (error, result) => {
    if (error) return response.status(500).json(error)
    if (result.length === 0) {
      return response.status(404).json({ message: "Não existe nenhum comentário com esse id." })
    }

    const q = `select 
      r.id as reply_id, 
        r.text, 
        r.created_at,
        r.author_id,
        a.name,
        a.profile_pic
      from replies as r
      join users as a
      on r.author_id = a.id
      where r.comment_id = (?)
    `

    connection.query<Query[]>(q, [comment_id], (error, result) => {
      if (error) return response.status(500).json(error)
      const reply = z.array(postCommentReplySchema).parse(result)
      return response.status(201).json(reply)
    })
  })
}
