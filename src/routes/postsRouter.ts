import express from "express"
import * as PostsControllers from "../controllers/posts"

const postsRouter = express.Router()

postsRouter.get("/", PostsControllers.getPosts)
postsRouter.get("/liked-posts", PostsControllers.getLikedPosts)
postsRouter.post("/liked-posts", PostsControllers.toggleLikePost)
postsRouter.get("/:postId", PostsControllers.getPost)
postsRouter.post("/", PostsControllers.createPost)

postsRouter.get("/:postId/comments", PostsControllers.getPostComments)
postsRouter.post("/:postId/comments", PostsControllers.createPostComment)

postsRouter.post("/:postId/comments/replies", PostsControllers.getPostCommentReplies)
postsRouter.post("/:postId/comments/replies/create", PostsControllers.createPostCommentReply)

export default postsRouter
