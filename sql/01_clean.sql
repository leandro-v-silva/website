-- 01_clean.sql -----------------------------------------------------------
-- Cleaning rules applied to the raw staging table:
--   * drop lines without a customer id (marketing KPIs need attribution)
--   * drop cancellations (invoices prefixed 'C') and debt adjustments ('A')
--   * drop non-positive quantities and prices (returns already removed with
--     cancellations, these are data-entry noise)
--   * exact-duplicate lines removed with DISTINCT
CREATE OR REPLACE TABLE stg_clean AS
SELECT DISTINCT
    invoice,
    stock_code,
    trim(description)                                   AS description,
    quantity,
    invoice_date,
    cast(invoice_date AS date)                          AS order_date,
    unit_price,
    round(quantity * unit_price, 2)                     AS revenue,
    customer_id,
    trim(country)                                       AS country
FROM stg_raw
WHERE customer_id IS NOT NULL
  AND quantity    >  0
  AND unit_price  >  0
  AND invoice NOT ILIKE 'C%'     -- cancellations
  AND invoice NOT ILIKE 'A%';    -- bad-debt adjustments
