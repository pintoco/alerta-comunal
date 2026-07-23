resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-redis-subnets"
  subnet_ids = aws_subnet.data[*].id
}

# Rate limiting no necesita persistencia ni un cluster grande: un solo nodo alcanza.
# Para alta disponibilidad real, subir a un replication group con automatic_failover_enabled.
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${local.name}-redis"
  engine               = "redis"
  engine_version        = "7.1"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  port                 = 6379
  subnet_group_name   = aws_elasticache_subnet_group.main.name
  security_group_ids  = [aws_security_group.redis.id]
  apply_immediately    = true

  tags = { Name = "${local.name}-redis" }
}
