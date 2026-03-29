import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import mysql from "mysql";

const sm = new SecretsManager();
let connection: any;

async function getConnection() {
  if (connection) return connection;
  const resp = await sm.getSecretValue({ SecretId: process.env.SECRET_ARN });
  const secret = JSON.parse(resp.SecretString!);
  connection = mysql.createConnection({
    host: secret.host,
    user: secret.username,
    password: secret.password,
    database: secret.dbname,
  });
  return connection;
}

export async function main() {
  const conn = await getConnection();
  return new Promise((resolve, reject) => {
    conn.query("show tables", (error: any, results: any) => {
      if (error) {
        connection = null;
        conn.destroy();
        reject(error);
      } else {
        console.log(results);
        resolve(results);
      }
    });
  });
}
