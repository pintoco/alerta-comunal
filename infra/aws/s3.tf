resource "aws_s3_bucket" "evidencias" {
  bucket = "${local.name}-evidencias"
}

resource "aws_s3_bucket_versioning" "evidencias" {
  bucket = aws_s3_bucket.evidencias.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Solo lectura pública de objetos (fotos de evidencia mostradas en el dashboard).
# Sin ListBucket público: nadie puede enumerar los archivos, solo acceder por URL directa.
resource "aws_s3_bucket_public_access_block" "evidencias" {
  bucket = aws_s3_bucket.evidencias.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

data "aws_iam_policy_document" "evidencias_public_read" {
  statement {
    sid       = "PublicReadGetObject"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.evidencias.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_policy" "evidencias" {
  bucket     = aws_s3_bucket.evidencias.id
  policy     = data.aws_iam_policy_document.evidencias_public_read.json
  depends_on = [aws_s3_bucket_public_access_block.evidencias]
}

resource "aws_s3_bucket_cors_configuration" "evidencias" {
  bucket = aws_s3_bucket.evidencias.id
  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "evidencias" {
  bucket = aws_s3_bucket.evidencias.id
  rule {
    id     = "expire-old-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
