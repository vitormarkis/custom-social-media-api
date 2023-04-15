import mysql from "mysql2"
import dotenv from 'dotenv'
dotenv.config()

export const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
})

connection.connect(error => {
  if (error) return console.log(error)
  console.log("Conectado ao banco de dados com sucesso!")
})
