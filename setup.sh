#!/bin/bash

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem cor

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}       Instalador Rápido Neer-Data-Base (ZimaOS Edition)      ${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo -e "Este script vai configurar automaticamente todo o seu ambiente."
echo -e "Responda as 3 perguntas abaixo para gerar sua nuvem privada.\n"

# 1. IP Local
echo -e "${YELLOW}Passo 1: Qual é o endereço IP do seu ZimaOS na rede Wi-Fi local?${NC}"
echo -e "Exemplo: 192.168.1.50"
read -p "IP: " LOCAL_IP

if [[ -z "$LOCAL_IP" ]]; then
    echo -e "${RED}O IP é obrigatório para continuar. Abortando.${NC}"
    exit 1
fi

# 2. Senha do Banco de Dados
echo -e "\n${YELLOW}Passo 2: Crie uma senha para o banco de dados (PostgreSQL/MinIO).${NC}"
read -s -p "Senha do Banco: " DB_PASSWORD
echo ""

if [[ -z "$DB_PASSWORD" ]]; then
    echo -e "${RED}A senha do banco não pode ficar em branco. Abortando.${NC}"
    exit 1
fi


echo -e "\n${GREEN}Gerando chaves de segurança secretas...${NC}"
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

echo -e "${GREEN}Criando o arquivo .env...${NC}"

cat <<EOF > .env
# ── PostgreSQL & MinIO ───────────────────────────────────────────────
POSTGRES_PASSWORD=$DB_PASSWORD
AUTHENTICATOR_PASSWORD=$DB_PASSWORD
AUTH_DB_PASSWORD=$DB_PASSWORD
MINIO_ROOT_USER=neer-data-base
MINIO_ROOT_PASSWORD=$DB_PASSWORD

# ── Senhas Administrativas e Segurança ───────────────────────────────
STUDIO_ADMIN_EMAIL='neersoftwarebr@gmail.com'
STUDIO_ADMIN_PASSWORD='25150605'
JWT_SECRET=$JWT_SECRET
STUDIO_SESSION_SECRET='642483de8083285d0f3cf89b29b7a2615cdf68c9c8c3c92af64b570f1f604caf'

# ── ZimaOS / Rede Local (IMPORTANTE) ──────────────────────────────────
PUBLIC_DASHBOARD_URL=http://$LOCAL_IP:3010
PUBLIC_GATEWAY_URL=http://$LOCAL_IP:8000
PUBLIC_CONTROL_PLANE_URL=http://$LOCAL_IP:3001

DATA_PATH=./neer-data-base-data

# ── Portas ───────────────────────────────────────────────────────────
POSTGRES_PORT=5432
POOLER_PORT=6432
GATEWAY_PORT=8000
KONG_ADMIN_PORT=8001
CONTROL_PLANE_PORT=3001
DASHBOARD_PORT=3010
STORAGE_PORT=3002
FUNCTIONS_PORT=8787
GRAPHQL_PORT=5000
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001

# ── Limites de Memória Modestos (ZimaOS) ─────────────────────────────
POSTGRES_MEM_LIMIT=512m
POOLER_MEM_LIMIT=64m
REST_MEM_LIMIT=128m
AUTH_MEM_LIMIT=128m
KONG_MEM_LIMIT=256m
CONTROL_PLANE_MEM_LIMIT=128m
DASHBOARD_MEM_LIMIT=256m
REALTIME_MEM_LIMIT=256m
MINIO_MEM_LIMIT=256m
STORAGE_MEM_LIMIT=128m
FUNCTIONS_MEM_LIMIT=128m
GRAPHQL_MEM_LIMIT=256m
REDIS_MEM_LIMIT=64m
EOF

echo -e "${GREEN}Arquivo .env gerado com sucesso!${NC}\n"

echo -e "${YELLOW}Iniciando a instalação via Docker... Isso pode demorar de 2 a 5 minutos dependendo da sua internet.${NC}"
docker compose --profile core,storage,functions up -d --build

echo -e "\n${BLUE}=======================================================${NC}"
echo -e "${GREEN}Instalação Concluída com Sucesso! 🎉${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo -e "\nSeu painel privado já está rodando no ZimaOS."
echo -e "\nPara acessar o seu Dashboard Neer-Data-Base:"
echo -e "👉 ${YELLOW}http://$LOCAL_IP:3010${NC}"
echo -e "\nUse a senha de administrador (25150605) para entrar."
echo -e "Aproveite a sua nuvem local! 🚀"
