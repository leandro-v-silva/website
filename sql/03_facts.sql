-- 03_facts.sql -----------------------------------------------------------
-- Fact tables at two grains: sales line (fact_sales) and order/invoice
-- (fact_orders). customer_age_months measures how mature the customer
-- relationship was at purchase time (0 = first month) — the basis for
-- new-vs-returning revenue splits.

CREATE OR REPLACE TABLE fact_sales AS
SELECT
    cast(strftime(s.order_date, '%Y%m%d') AS integer) AS date_key,
    s.order_date,
    s.invoice,
    s.customer_id,
    s.stock_code,
    s.country,
    s.quantity,
    s.unit_price,
    s.revenue,
    date_diff('month', c.first_order_date, s.order_date) AS customer_age_months
FROM stg_clean s
JOIN dim_customer c USING (customer_id);

CREATE OR REPLACE TABLE fact_orders AS
SELECT
    invoice,
    min(order_date)                                          AS order_date,
    cast(strftime(min(order_date), '%Y%m%d') AS integer)     AS date_key,
    customer_id,
    arg_max(country, order_date)                             AS country,
    round(sum(revenue), 2)                                   AS order_value,
    count(*)                                                 AS line_count,
    sum(quantity)                                            AS item_count
FROM stg_clean
GROUP BY invoice, customer_id;
