import { RequestHandler } from "express"
import { RowDataPacket } from "mysql2"
import { userWhoLikeThePostSchema } from "../schemas/post_likes"
import { relationShipToggleSchema } from "../schemas/relationships"
import { connection } from "../services/mysql"
import { z } from "zod"
import { likedPostSchema } from "../schemas/posts"

type Query = {} & unknown & RowDataPacket

export const getUsers: RequestHandler = (request, response) => {
  const { userId } = request

  const q = "select * from users where id = ?"
  connection.query<Query[]>(q, [userId], (error, result) => {
    if (error) return response.status(500).json(error)
    if (result.length === 0) return response.status(404).json({ message: "Usuário não encontrado." })
    const { password, ...user } = result[0]
    return response.json(user)
  })
}

export const getAllUsers: RequestHandler = (request, response) => {
  const q = "select * from users"
  connection.query<Query[]>(q, [], (error, usersWithPassword) => {
    if (error) return response.status(500).json(error)
    const users = usersWithPassword.map(({ password, ...rest }) => rest)
    return response.json(users)
  })
}

export const getLikedPosts: RequestHandler = (request, response) => {
  try {
    const userId = request.userId! 
    const q = `
      select 
      pl.id as liked_post_id, 
        a.username as author_username, 
        a.profile_pic as author_profile_pic,
        p.text as post_text,
        count(c.id) as comments_amount
      from posts as p
      join post_likes as pl
      on p.id = pl.post_id
      join users as aT
      on p.author_id = a.id
      left join comments as c
      on c.post_id = p.id
      where pl.user_id = (?)
      group by p.id;
    `
    const newQ = `
      SELECT 
        p.id as post_id,
        p.text,
        COUNT(distinct pl.id) AS likes_amount,
        COUNT(distinct c.id) AS comments_amount,
        a.profile_pic,
        p.author_id,
        a.username,
        a.name
      FROM posts AS p
      JOIN users AS a ON p.author_id = a.id
      LEFT JOIN post_likes AS pl ON p.id = pl.post_id
      LEFT JOIN comments AS c ON c.post_id = p.id
      WHERE pl.post_id IN ( select post_id from post_likes where user_id = (?) )
      GROUP BY p.id;
    `
    
    connection.query<Query[]>(newQ, [userId], (_, result) => {
      const likedPosts = z.array(likedPostSchema).parse(result)
      return response.json(likedPosts)
    })
  } catch (error) {
    return response.status(500).json(error)
  }
}

export const getUsersWhoLikeThePost: RequestHandler = (request, response) => {
  const { postId } = request.params

  const q = `
    select 
    u.id as user_id,
      u.profile_pic,
      u.name,
      pl.created_at
    from users as u
    join post_likes as pl
    on u.id = pl.user_id
    where pl.post_id = (?);
  `
  
  try {
    connection.query<Query[]>(q, [postId], (_, result) => {
      const usersWhoLikeThePost = z.array(userWhoLikeThePostSchema).parse(result)
      return response.json(usersWhoLikeThePost)
    })
  } catch (error) {
    return response.status(500).json(error)
  }
}

export const getRelationships: RequestHandler = (request, response) => {
  const { userId } = request

  const q = `
  select id as relationship_id, followed_user_id 
  from relationships as r 
  where follower_user_id = (?)
  `

  connection.query<Query[]>(q, [userId], (error, relationships) => {
    if (error) return response.status(500).json(error)
    return response.json(relationships)
  })
}

export const toggleRelationship: RequestHandler = (request, response) => {
  const { followed_user_id } = relationShipToggleSchema.parse(request.body)
  const { userId } = request

  const q = "select * from relationships where follower_user_id = (?) AND followed_user_id = (?)"

  connection.query<Query[]>(q, [userId, followed_user_id], (error, found) => {
    if (error) return response.status(500).json(error)
    const isAdding = found.length === 0

    const addQ = "insert into relationships (follower_user_id, followed_user_id) values (?, ?);"

    const deleteQ = "delete from relationships where follower_user_id = (?) AND followed_user_id = (?);"

    const q = isAdding ? addQ : deleteQ

    connection.query<Query[]>(q, [userId, followed_user_id], error => {
      if (error) return response.json(error)
      return response.send("Toggle do usuário " + userId + " no usuário " + followed_user_id)
    })
  })
}
