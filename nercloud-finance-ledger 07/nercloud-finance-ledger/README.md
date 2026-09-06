# NERCloud Finance Ledger

Módulo financeiro completo para:
- Double-entry Ledger
- Reconciliation
- Financial Reports
- Audit

Princípio central: toda transação financeira gera débitos e créditos equilibrados.

## Componentes

### Double-entry Ledger
Plano de contas, contas contábeis, journal entries, journal lines e períodos.

### Reconciliation
Importação de transações externas, matching, tolerância, status de reconciliação e diferenças.

### Financial Reports
- Trial Balance
- General Ledger
- Profit & Loss
- Balance Sheet
- Account balances

### Audit
Trilha imutável de ações, ator, entidade, alterações antes/depois, IP e user-agent.

## API

GET/POST /api/ledger/accounts
GET/POST /api/ledger/journals
GET/POST /api/ledger/journals/:id/post

POST /api/reconciliation/import
GET /api/reconciliation
POST /api/reconciliation/:id/match
POST /api/reconciliation/:id/reject

GET /api/reports/trial-balance
GET /api/reports/general-ledger
GET /api/reports/profit-loss
GET /api/reports/balance-sheet

GET /api/audit

## Regra de integridade

Um JournalEntry só pode ser POSTED quando:

SUM(debits) = SUM(credits)

As linhas de um lançamento publicado não devem ser alteradas ou excluídas.
