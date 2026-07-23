locals {
  ssm_prefix = "/${var.project}/${var.environment}"

  database_url = "postgresql://${var.db_username}:${urlencode(random_password.db_password.result)}@${aws_db_instance.main.address}:5432/${var.db_name}"
  redis_url    = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379"
}

resource "aws_ssm_parameter" "database_url" {
  name  = "${local.ssm_prefix}/DATABASE_URL"
  type  = "SecureString"
  value = local.database_url
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "${local.ssm_prefix}/JWT_SECRET"
  type  = "SecureString"
  value = random_password.jwt_secret.result
}

resource "aws_ssm_parameter" "redis_url" {
  name  = "${local.ssm_prefix}/REDIS_URL"
  type  = "SecureString"
  value = local.redis_url
}

resource "aws_ssm_parameter" "app_url" {
  name  = "${local.ssm_prefix}/APP_URL"
  type  = "String"
  value = var.domain_name != null ? "https://${var.domain_name}" : "https://${aws_lb.main.dns_name}"
}

resource "aws_ssm_parameter" "storage_provider" {
  name  = "${local.ssm_prefix}/STORAGE_PROVIDER"
  type  = "String"
  value = "s3"
}

resource "aws_ssm_parameter" "s3_bucket" {
  name  = "${local.ssm_prefix}/S3_BUCKET"
  type  = "String"
  value = aws_s3_bucket.evidencias.bucket
}

resource "aws_ssm_parameter" "s3_region" {
  name  = "${local.ssm_prefix}/S3_REGION"
  type  = "String"
  value = var.aws_region
}

resource "aws_ssm_parameter" "s3_public_url" {
  name  = "${local.ssm_prefix}/S3_PUBLIC_URL"
  type  = "String"
  value = "https://${aws_s3_bucket.evidencias.bucket}.s3.${var.aws_region}.amazonaws.com"
}

resource "aws_ssm_parameter" "max_upload_size_mb" {
  name  = "${local.ssm_prefix}/MAX_UPLOAD_SIZE_MB"
  type  = "String"
  value = "5"
}

resource "aws_ssm_parameter" "public_default_municipality_slug" {
  name  = "${local.ssm_prefix}/PUBLIC_DEFAULT_MUNICIPALITY_SLUG"
  type  = "String"
  value = var.public_default_municipality_slug
}

resource "aws_ssm_parameter" "email_enabled" {
  name  = "${local.ssm_prefix}/EMAIL_ENABLED"
  type  = "String"
  value = var.email_enabled ? "true" : "false"
}

resource "aws_ssm_parameter" "resend_api_key" {
  count = var.resend_api_key != "" ? 1 : 0
  name  = "${local.ssm_prefix}/RESEND_API_KEY"
  type  = "SecureString"
  value = var.resend_api_key
}

resource "aws_ssm_parameter" "google_maps_key" {
  count = var.google_maps_api_key != "" ? 1 : 0
  name  = "${local.ssm_prefix}/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
  type  = "SecureString"
  value = var.google_maps_api_key
}
