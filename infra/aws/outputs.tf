output "alb_dns_name" {
  description = "DNS del load balancer. Apunta tu dominio (CNAME) aquí si no usas domain_name/hosted_zone_id."
  value       = aws_lb.main.dns_name
}

output "app_url" {
  value = var.domain_name != null ? "https://${var.domain_name}" : "https://${aws_lb.main.dns_name}"
}

output "db_endpoint" {
  value     = aws_db_instance.main.address
  sensitive = false
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "s3_bucket_name" {
  value = aws_s3_bucket.evidencias.bucket
}

output "ssm_parameter_prefix" {
  description = "Prefijo bajo el cual quedaron todas las variables de entorno de la app"
  value       = local.ssm_prefix
}

output "asg_name" {
  value = aws_autoscaling_group.app.name
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.app.name
}

output "vpc_id" {
  value = aws_vpc.main.id
}
