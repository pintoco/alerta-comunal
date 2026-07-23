resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "random_password" "db_password" {
  length  = 32
  special = false # evita caracteres que rompan la connection string de Postgres
}
