import { connection } from "../services/mysql"

export const refreshToken = async (refresh_token_id: string) =>
  new Promise(async (resolve, reject) => {
    const q = "select * from refresh_tokens where id = (?)"
    const res = await connection.execute(q, [refresh_token_id])
    resolve(res)
    reject("Não foi possível realizar essa oporação no banco de dados.")
  })
