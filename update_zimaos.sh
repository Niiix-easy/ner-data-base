#!/bin/bash
# Neer-Data-Base ZimaOS Updater Script

# Esse script é disparado remotamente pela API
# e tem como objetivo buscar as alterações recentes, aplicar
# as dependências e recriar os containers Docker.

# Configuração de ambiente e logs
set -e
exec > >(tee -i /var/log/neer-updater.log)
exec 2>&1

echo "========================================"
echo "Iniciando atualização do Neer-Data-Base"
echo "Data: $(date)"
echo "========================================"

# Diretório padrão, caso executado fora do cron/API host (adaptar no servidor se diferente)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "[1/4] Puxando alterações do Git..."
# Descartar alterações locais não comitadas que possam conflitar
git fetch origin main
git reset --hard origin/main
# Limpa possíveis artefatos antigos
git clean -fd

echo "[2/4] Instalando dependências Node.js (via pnpm se local ou container)..."
# Em um ambiente ZimaOS puramente Docker, isso poderia ser ignorado e delegado ao Docker build
if command -v pnpm &> /dev/null; then
    pnpm install
else
    echo "pnpm não encontrado no host. Dependências serão tratadas pelo build do Docker."
fi

echo "[3/4] Atualizando banco de dados..."
# Não executa o setup.sh inteiro pois ele é interativo e destrutivo para o .env.
# Executa apenas as rotinas de banco (via docker ou npx direto) se existir o env.
if [ -f "./.env" ]; then
    echo "Sincronizando banco..."
    # Atualiza via API que já tem a variável de ambiente DATABASE_URL.
    docker compose exec -T api sh -c "cd /app/packages/database && npx prisma db push && npm run seed" || echo "Aviso: Sincronização do DB ignorada pois o container pode não estar ativo."
else
    echo "Aviso: Arquivo .env não encontrado, banco não pode ser sincronizado."
fi

echo "[4/4] Recriando Containers Docker com as novas imagens..."
# Se existirem modificações nas dependências ou nos Dockerfiles, isso reconstrói e atualiza
docker compose up -d --build

echo "========================================"
echo "Atualização concluída com sucesso."
echo "Dashboards rodando em:"
echo " - App Dashboard: http://192.168.0.58:3010"
echo " - API: http://192.168.0.58:3000"
echo "========================================"
