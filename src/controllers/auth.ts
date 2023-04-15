import bcrypt from "bcryptjs"
import { RequestHandler } from "express"
import jwt from "jsonwebtoken"
import { RowDataPacket } from "mysql2"
import { ENCookies, ENToken } from "../constants/secret"
import { loginCredentialsSchema, registerCredentialsSchema, TUser } from "../schemas/users"
import { connection } from "../services/mysql"
import cookies from "cookie"

interface IRefreshToken {
  id: number
  user_id: number
  expires_in: number
}

interface LoginQuery extends RowDataPacket, TUser {}

export const register: RequestHandler = (request, response) => {
  const credentials = registerCredentialsSchema.parse(request.body)

  const q = "select * from users where username = ?"

  connection.query<[]>(q, [credentials.username], (error, result) => {
    if (error) return response.status(500).json(error)
    if (result.length > 0)
      return response.status(409).json({ message: "Um usuário com esse username já existe." })

    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(credentials.password, salt)

    const q = "insert into users (name, username, email, password) values (?, ?, ?, ?)"

    const payload = [credentials.name, credentials.username, credentials.email, hashedPassword]

    connection.query(q, payload, (error, result) => {
      if (error) return response.status(500).json(error)
      return response.status(201).json({ message: "Usuário registrado com sucesso!", payload: result })
    })
  })
}

export const login: RequestHandler = (request, response) => {
  const credentials = loginCredentialsSchema.parse(request.body)
  const q = "select * from users where username = ?"

  connection.query<LoginQuery[]>(q, [credentials.username], async (error, data) => {
    const loginUser: LoginQuery = data[0]

    if (error) return response.status(500).json(error)
    if (data.length === 0) return response.status(404).json({ message: "Usuário não encontrado." })

    const match = bcrypt.compareSync(credentials.password, loginUser.password)
    if (!match) return response.status(400).json({ message: "Usuário ou senha incorretos." })

    const { password, ...returnedUser } = loginUser

    const refreshToken = jwt.sign({}, ENToken.JWT_REFRESH_SECRET_TOKEN, {
      subject: String(loginUser.id),
      expiresIn: "10m",
    })

    const accessToken = jwt.sign({ refreshToken }, ENToken.JWT_SECRET_TOKEN, {
      subject: String(loginUser.id),
      expiresIn: "15s",
    })

    return response
      .setHeader("Access-Control-Allow-Credentials", "true")
      .cookie(ENCookies.ACCESS_TOKEN, accessToken, {
        httpOnly: true,
      })
      .cookie(ENCookies.REFRESH_TOKEN, refreshToken, {
        httpOnly: true,
      })
      .status(200)
      .json({
        message: "Usuário logado!",
        user: returnedUser,
        refreshToken,
        accessToken,
      })
  })
}

export const logout: RequestHandler = (request, response) => {
  return response
    .setHeader("Access-Control-Allow-Credentials", "true")
    .clearCookie(ENCookies.ACCESS_TOKEN)
    .clearCookie(ENCookies.REFRESH_TOKEN)
    .status(200)
    .json({ message: "Usuário deslogado." })
}

export const refreshTokenHandler: RequestHandler = async (request, response) => {
  const { refreshToken } = request.body
  if (!refreshToken) return response.status(409).json({ message: "Nenhum refresh token foi fornecido." })

  const refreshTokenPayload = jwt.decode(refreshToken)

  if (!refreshTokenPayload)
    return response.status(500).json({ message: "O refresh token provido não fornece nenhum payload." })

  if (!(typeof refreshTokenPayload.sub === "string"))
    return response.status(500).json({ message: "O subject do refresh token não é um id de um usuário!" })

  try {
    jwt.verify(refreshToken, ENToken.JWT_REFRESH_SECRET_TOKEN)
    const accessToken = jwt.sign({ refreshToken }, ENToken.JWT_SECRET_TOKEN, {
      subject: refreshTokenPayload.sub,
      expiresIn: "15s",
    })

    return response
      .setHeader(
        "Set-Cookie",
        cookies.serialize(ENCookies.ACCESS_TOKEN, accessToken, {
          httpOnly: true,
          sameSite: "none",
          path: "/",
          secure: true,
        })
      )
      .json({ accessToken })
  } catch (error) {
    return response
      .status(401)
      .json({ error_type: "INVALID_REFRESH_TOKEN", message: "Refresh token inválido!!!" })
  }
}
