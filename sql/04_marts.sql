-- 04_marts.sql -----------------------------------------------------------
-- Marketing marts consumed by the D3 report.

-- Headline KPIs (single row).
CREATE OR REPLACE TABLE mart_kpis AS
SELECT
    (SELECT round(sum(revenue), 2)  FROM fact_sales)   AS total_revenue,
    (SELECT count(DISTINCT invoice) FROM fact_sales)   AS total_orders,
    (SELECT count(*)                FROM dim_customer) AS total_customers,
    (SELECT round(sum(order_value) / count(*), 2)
       FROM fact_orders)                             AS aov,
    (SELECT round(avg(item_count), 1) FROM fact_orders) AS avg_basket_items,
    (SELECT round(avg(line_count), 1) FROM fact_orders) AS avg_basket_lines,
    (SELECT sum(quantity)           FROM fact_sales)   AS units_sold,
    (SELECT round(100.0 * count(*) FILTER (WHERE frequency > 1) / count(*), 1)
       FROM dim_customer)                            AS repeat_customer_pct,
    (SELECT round(100.0 * sum(revenue) FILTER (WHERE customer_age_months > 0)
                        / sum(revenue), 1)
       FROM fact_sales)                              AS returning_revenue_pct,
    (SELECT count(DISTINCT country) FROM fact_sales)   AS countries,
    (SELECT min(order_date)         FROM fact_sales)   AS first_date,
    (SELECT max(order_date)         FROM fact_sales)   AS last_date;

-- Monthly trend: revenue, order activity and new-vs-returning split.
-- The final month (Dec 2011) holds only 9 days of data; including it would
-- draw a misleading cliff on the trend chart, so it is excluded.
CREATE OR REPLACE TABLE mart_monthly AS
WITH first_orders AS (
    SELECT customer_id, min(order_date) AS first_order_date
    FROM fact_sales
    GROUP BY customer_id
),
enriched AS (
    SELECT
        date_trunc('month', o.order_date)::date AS month,
        o.invoice,
        o.customer_id,
        o.order_value,
        CASE WHEN date_trunc('month', o.order_date)
                  = date_trunc('month', f.first_order_date)
             THEN 1 ELSE 0 END AS is_first_month
    FROM fact_orders o
    JOIN first_orders f USING (customer_id)
)
SELECT
    month,
    strftime(month, '%Y-%m')                                          AS month_label,
    round(sum(order_value), 2)                                        AS revenue,
    count(DISTINCT invoice)                                           AS orders,
    count(DISTINCT customer_id)                                       AS customers,
    count(DISTINCT customer_id) FILTER (WHERE is_first_month = 1)     AS new_customers,
    count(DISTINCT customer_id) FILTER (WHERE is_first_month = 0)     AS returning_customers,
    round(coalesce(sum(order_value) FILTER (WHERE is_first_month = 1), 0), 2) AS new_customer_revenue,
    round(coalesce(sum(order_value) FILTER (WHERE is_first_month = 0), 0), 2) AS returning_customer_revenue,
    round(sum(order_value) / count(DISTINCT invoice), 2)              AS aov
FROM enriched
WHERE month < (SELECT max(month) FROM enriched)
GROUP BY month
ORDER BY month;

-- Cohort retention: share of each acquisition cohort still buying N months
-- after their first purchase.
CREATE OR REPLACE TABLE mart_cohort AS
WITH first_orders AS (
    SELECT customer_id, min(order_date) AS first_order_date
    FROM fact_sales
    GROUP BY customer_id
),
activity AS (
    SELECT DISTINCT
        customer_id,
        date_trunc('month', order_date)::date AS active_month
    FROM fact_orders
),
labeled AS (
    SELECT
        a.customer_id,
        date_trunc('month', f.first_order_date)::date AS cohort_month,
        date_diff('month',
                  date_trunc('month', f.first_order_date)::date,
                  a.active_month)                  AS period
    FROM activity a
    JOIN first_orders f USING (customer_id)
),
cohorts AS (
    SELECT cohort_month, count(DISTINCT customer_id) AS cohort_size
    FROM labeled
    WHERE period = 0
    GROUP BY cohort_month
)
SELECT
    l.cohort_month,
    strftime(l.cohort_month, '%Y-%m')                        AS cohort_label,
    l.period,
    count(DISTINCT l.customer_id)                            AS active_customers,
    c.cohort_size,
    round(100.0 * count(DISTINCT l.customer_id) / c.cohort_size, 1) AS pct_active
FROM labeled l
JOIN cohorts c USING (cohort_month)
GROUP BY l.cohort_month, l.period, c.cohort_size
ORDER BY l.cohort_month, l.period;

-- RFM segments: size, revenue share and behaviour profile per segment.
CREATE OR REPLACE TABLE mart_rfm AS
SELECT
    rfm_segment,
    count(*)                                                  AS customers,
    round(sum(monetary), 2)                                   AS revenue,
    round(avg(recency_days), 0)                               AS avg_recency_days,
    round(avg(frequency), 1)                                  AS avg_frequency,
    round(avg(monetary), 2)                                   AS avg_monetary,
    round(100.0 * count(*) / sum(count(*)) OVER (), 1)        AS pct_customers,
    round(100.0 * sum(monetary) / sum(sum(monetary)) OVER (), 1) AS pct_revenue
FROM dim_customer
GROUP BY rfm_segment
ORDER BY revenue DESC;

-- Top 15 products by revenue (administrative fee codes excluded).
CREATE OR REPLACE TABLE mart_top_products AS
SELECT
    stock_code,
    description,
    category,
    orders,
    units_sold,
    total_revenue,
    avg_unit_price
FROM dim_product
WHERE product_type = 'product'
ORDER BY total_revenue DESC
LIMIT 15;

-- Geography: revenue concentration by country.
CREATE OR REPLACE TABLE mart_country AS
SELECT
    country,
    round(sum(revenue), 2)        AS revenue,
    count(DISTINCT invoice)       AS orders,
    count(DISTINCT customer_id)   AS customers
FROM fact_sales
GROUP BY country
ORDER BY revenue DESC;

-- Order-grain export for the dashboard. The report computes its measures
-- client-side from this table (Power BI semantics: slicers re-filter the
-- fact rows, then every measure recalculates), so it must stay at invoice
-- grain with the attributes the slicers need.
CREATE OR REPLACE TABLE mart_orders AS
SELECT
    o.order_date::date              AS order_date,
    o.country                       AS country,
    o.customer_id                   AS customer_id,
    o.order_value                   AS order_value,
    o.item_count                    AS item_count,
    o.line_count                    AS line_count
FROM fact_orders o;
