# Permite SSH a instancias en subred privada sin bastion ni IP publica,
# usando "aws ec2-instance-connect ssh/open-tunnel". Solo para diagnostico/
# administracion puntual; el acceso normal es via SSM Session Manager.
resource "aws_security_group" "instance_connect" {
  name        = "${local.name}-eice-sg"
  description = "EC2 Instance Connect Endpoint"
  vpc_id      = aws_vpc.main.id

  egress {
    description     = "SSH hacia las instancias de la app"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = { Name = "${local.name}-eice-sg" }
}

resource "aws_security_group_rule" "app_ssh_from_eice" {
  type                     = "ingress"
  from_port                = 22
  to_port                  = 22
  protocol                 = "tcp"
  security_group_id        = aws_security_group.app.id
  source_security_group_id = aws_security_group.instance_connect.id
  description               = "SSH desde el EC2 Instance Connect Endpoint"
}

resource "aws_ec2_instance_connect_endpoint" "main" {
  subnet_id          = aws_subnet.app[0].id
  security_group_ids = [aws_security_group.instance_connect.id]
  preserve_client_ip = false

  tags = { Name = "${local.name}-eice" }
}
