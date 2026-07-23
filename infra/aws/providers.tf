terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Backend remoto recomendado para no perder el state en tu propia máquina.
  # Crea el bucket y la tabla de lock antes de "terraform init" y descomenta:
  #
  # backend "s3" {
  #   bucket         = "alertacomunal-tfstate"
  #   key            = "aws/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "alertacomunal-tfstate-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "alertacomunal"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
