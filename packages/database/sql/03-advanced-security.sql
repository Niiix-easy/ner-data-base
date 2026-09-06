-- 03-advanced-security.sql
-- Adiciona proteções robustas: Imutabilidade, Idempotência, Constraints Financeiras e Triggers Cross-Tenant

DO $$
BEGIN
  EXECUTE 'ALTER TABLE public."Invoice" ADD CONSTRAINT "invoice_totals_positive" CHECK (subtotal >= 0 AND discount >= 0 AND tax >= 0 AND total >= 0)';
  EXECUTE 'ALTER TABLE public."Payment" ADD CONSTRAINT "payment_amount_positive" CHECK (amount >= 0)';
  EXECUTE 'ALTER TABLE public."UsageAggregate" ADD CONSTRAINT "usage_quantity_positive" CHECK (quantity >= 0)';
  EXECUTE 'ALTER TABLE public."Coupon" ADD CONSTRAINT "coupon_value_positive" CHECK (value >= 0)';
  EXECUTE 'ALTER TABLE public."Price" ADD CONSTRAINT "price_amount_positive" CHECK ("unitAmount" >= 0)';
  EXECUTE 'ALTER TABLE public."Entitlement" ADD CONSTRAINT "entitlement_limit_positive" CHECK (limit >= 0)';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraints already exist. Skipping.';
END
$$;

CREATE OR REPLACE FUNCTION enforce_invoice_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    IF OLD.status IN ('PAID', 'VOID', 'UNCOLLECTIBLE') THEN
      RAISE EXCEPTION 'Invoice is immutable because it is already in a terminal state (PAID, VOID, UNCOLLECTIBLE)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoice_immutability ON public."Invoice";
CREATE TRIGGER trigger_invoice_immutability
  BEFORE UPDATE OR DELETE ON public."Invoice"
  FOR EACH ROW EXECUTE FUNCTION enforce_invoice_immutability();


CREATE OR REPLACE FUNCTION enforce_payment_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    IF OLD.status IN ('SUCCEEDED', 'FAILED', 'REFUNDED') THEN
      RAISE EXCEPTION 'Payment is immutable because it has already reached a terminal status (SUCCEEDED, FAILED, REFUNDED)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_immutability ON public."Payment";
CREATE TRIGGER trigger_payment_immutability
  BEFORE UPDATE OR DELETE ON public."Payment"
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_immutability();


CREATE OR REPLACE FUNCTION enforce_audit_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only. UPDATE or DELETE operations are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_append_only ON public."AuditLog";
CREATE TRIGGER trigger_audit_append_only
  BEFORE UPDATE OR DELETE ON public."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_append_only();


CREATE OR REPLACE FUNCTION check_payment_invoice_tenant_match()
RETURNS TRIGGER AS $$
DECLARE
  invoice_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO invoice_org_id FROM public."Invoice" WHERE id = NEW."invoiceId";
  IF invoice_org_id IS NOT NULL AND invoice_org_id != NEW."organizationId" THEN
    RAISE EXCEPTION 'Cross-tenant violation: Payment organizationId (%) does not match Invoice organizationId (%)', NEW."organizationId", invoice_org_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_invoice_tenant_match ON public."Payment";
CREATE TRIGGER trigger_payment_invoice_tenant_match
  BEFORE INSERT OR UPDATE ON public."Payment"
  FOR EACH ROW EXECUTE FUNCTION check_payment_invoice_tenant_match();


CREATE OR REPLACE FUNCTION check_cycle_subscription_tenant_match()
RETURNS TRIGGER AS $$
DECLARE
  sub_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO sub_org_id FROM public."Subscription" WHERE id = NEW."subscriptionId";
  IF sub_org_id IS NOT NULL AND sub_org_id != NEW."organizationId" THEN
    RAISE EXCEPTION 'Cross-tenant violation: BillingCycle organizationId (%) does not match Subscription organizationId (%)', NEW."organizationId", sub_org_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cycle_subscription_tenant_match ON public."BillingCycle";
CREATE TRIGGER trigger_cycle_subscription_tenant_match
  BEFORE INSERT OR UPDATE ON public."BillingCycle"
  FOR EACH ROW EXECUTE FUNCTION check_cycle_subscription_tenant_match();
