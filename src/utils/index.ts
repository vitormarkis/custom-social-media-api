import dayjs from "dayjs"
import jwt from "jsonwebtoken"
import { ENToken } from "../constants/secret"
import { connection } from "../services/mysql"

interface IRefreshToken {
  user_id: number
  expires_in: number
}

// interface Query extends IRefreshToken, RowDataPacket {}

export const createRefreshToken = async (id: number) => {
  const expiresIn = dayjs().add(15, "second").unix()
  const qc = "insert into refresh_tokens (expires_in, user_id) values (?, ?)"
  const qs = "select max(id) from refresh_tokens where user_id = (?)"
  await connection.execute(qc, [expiresIn, id])
  const [rows, fields] = await connection.execute(qs, [id])

  return [rows, fields]
}

export const generateToken = (payload: any, subject: string, secretKey: string, expiresIn: number) => {
  const token = jwt.sign(payload, secretKey, {
    subject,
    expiresIn,
  })
  return token
}
