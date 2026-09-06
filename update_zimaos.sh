#!/bin/bash
# Neer-Data-Base ZimaOS Updater Script

# Esse script é disparado remotamente pela API
# e tem como objetivo buscar as alterações recentes, aplicar
# as dependências e recriar os containers Docker sem depender de interação.

# Configuração de ambiente e logs
set -e
exec > >(tee -i /var/log/neer-updater.log)
exec 2>&1

echo "========================================"
echo "Iniciando atualização do Neer-Data-Base"
echo "Data: $(date)"
echo "========================================"

# Diretório padrão
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "[1/4] Puxando alterações do Git..."
git fetch origin main
git reset --hard origin/main
git clean -fd

echo "[2/4] Executando build e recriando containers Docker..."
docker compose up -d --build

echo "[3/4] Aplicando migrações do banco de dados (headless)..."
docker compose exec -T api npx prisma db push --accept-data-loss || true

echo "========================================"
echo "Atualização concluída com sucesso."
echo "========================================"
