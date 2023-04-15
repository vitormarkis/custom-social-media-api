import { RequestHandler } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import { ENCookies, ENToken } from "../constants/secret"

import "../types/express.d.ts"

export const requireAuth: RequestHandler = (request, response, next) => {
  const accessToken = request.cookies[ENCookies.ACCESS_TOKEN]

  if (!accessToken) return response.status(401).json({ message: "Token não fornecido." })

  try {
    jwt.verify(accessToken, ENToken.JWT_SECRET_TOKEN)
    const { sub } = jwt.decode(accessToken) as JwtPayload
    request.userId = sub
    return next()
  } catch (error) {
    return response.status(401).json({ message: "Token inválido." })
  }
}
