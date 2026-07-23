variable "aws_region" {
  description = "Región AWS donde se despliega todo"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Nombre corto del ambiente (prod, staging)"
  type        = string
  default     = "prod"
}

variable "project" {
  description = "Prefijo usado en nombres de recursos"
  type        = string
  default     = "alertacomunal"
}

# ─── Red ──────────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR de la VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Zonas de disponibilidad a usar (2 mínimo para Multi-AZ)"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "single_nat_gateway" {
  description = "true = un solo NAT Gateway (más barato, menos resiliente). false = uno por AZ."
  type        = bool
  default     = true
}

# ─── App / EC2 ────────────────────────────────────────────────────────────────

variable "instance_type" {
  description = "Tipo de instancia EC2 para el Auto Scaling Group"
  type        = string
  default     = "t3.small"
}

variable "asg_min_size" {
  type    = number
  default = 2
}

variable "asg_max_size" {
  type    = number
  default = 6
}

variable "asg_desired_capacity" {
  type    = number
  default = 2
}

variable "app_repo_url" {
  description = "URL git del repo a clonar en cada instancia (público o con token embebido)"
  type        = string
}

variable "app_repo_branch" {
  description = "Branch a desplegar"
  type        = string
  default     = "main"
}

variable "ssh_key_name" {
  description = "Nombre del key pair EC2 para acceso SSH de emergencia (además de SSM Session Manager)"
  type        = string
  default     = null
}

variable "admin_cidr" {
  description = "CIDR desde donde se permite SSH directo a las instancias (usa tu IP /32). Vacío = solo SSM."
  type        = string
  default     = null
}

# ─── ACM / dominio ────────────────────────────────────────────────────────────

variable "certificate_arn" {
  description = "ARN de un certificado ACM ya validado para el listener HTTPS del ALB"
  type        = string
}

variable "domain_name" {
  description = "Dominio para el registro Route53 hacia el ALB (opcional)"
  type        = string
  default     = null
}

variable "hosted_zone_id" {
  description = "Zone ID de Route53 donde crear el registro (opcional, requiere domain_name)"
  type        = string
  default     = null
}

# ─── Base de datos ────────────────────────────────────────────────────────────

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_multi_az" {
  description = "Habilita standby síncrono en otra AZ (recomendado en prod real)"
  type        = bool
  default     = false
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_backup_retention_days" {
  type    = number
  default = 7
}

variable "db_deletion_protection" {
  type    = bool
  default = true
}

variable "db_name" {
  type    = string
  default = "alertacomunal"
}

variable "db_username" {
  type    = string
  default = "alertacomunal_app"
}

# ─── Redis ────────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  type    = string
  default = "cache.t3.micro"
}

# ─── Notificaciones ──────────────────────────────────────────────────────────

variable "alerts_email" {
  description = "Email que recibe las alarmas de CloudWatch (CPU, 5xx, conexiones DB)"
  type        = string
}

variable "resend_api_key" {
  description = "API key de Resend (se guarda en SSM Parameter Store, no en el código)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_enabled" {
  type    = bool
  default = false
}

variable "google_maps_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "public_default_municipality_slug" {
  type    = string
  default = "demo"
}
