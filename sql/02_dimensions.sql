-- 02_dimensions.sql ------------------------------------------------------
-- Star-schema dimensions: date, customer (with RFM scores + segment), product.

CREATE OR REPLACE TABLE dim_date AS
WITH bounds AS (
    SELECT min(order_date) AS d0, max(order_date) AS d1 FROM stg_clean
)
SELECT
    cast(strftime(date_value, '%Y%m%d') AS integer) AS date_key,
    date_value,
    date_trunc('month', date_value)::date           AS month,
    strftime(date_value, '%Y-%m')                   AS month_label,
    quarter(date_value)                             AS quarter,
    year(date_value)                                AS year,
    dayofweek(date_value)                           AS weekday,
    strftime(date_value, '%A')                      AS weekday_name
FROM (
    SELECT unnest(generate_series(d0, d1, interval 1 day))::date AS date_value
    FROM bounds
);

-- Customer dimension with RFM scoring.
-- Recency is measured against the day after the last transaction in the data
-- (the "snapshot date" of the analysis). R/F/M each get a 1-5 quantile score;
-- segments follow the classic RFM playbook.
CREATE OR REPLACE TABLE dim_customer AS
WITH cust AS (
    SELECT
        customer_id,
        arg_max(country, order_date) AS country,      -- most recent known country
        min(order_date)              AS first_order_date,
        max(order_date)              AS last_order_date,
        count(DISTINCT invoice)      AS order_count,
        round(sum(revenue), 2)       AS total_revenue,
        sum(quantity)                AS units_bought
    FROM stg_clean
    GROUP BY customer_id
),
snapshot AS (
    SELECT max(order_date) + 1 AS snapshot_date FROM stg_clean
),
scored AS (
    SELECT
        c.*,
        date_diff('day', c.last_order_date, s.snapshot_date) AS recency_days,
        ntile(5) OVER (ORDER BY date_diff('day', c.last_order_date, s.snapshot_date) DESC) AS r_score,
        ntile(5) OVER (ORDER BY c.order_count)   AS f_score,
        ntile(5) OVER (ORDER BY c.total_revenue) AS m_score
    FROM cust c
    CROSS JOIN snapshot s
)
SELECT
    customer_id,
    country,
    first_order_date,
    last_order_date,
    order_count                      AS frequency,
    total_revenue                    AS monetary,
    units_bought,
    recency_days,
    r_score, f_score, m_score,
    r_score + f_score + m_score      AS rfm_total,
    CASE
        WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
        WHEN f_score >= 4                                     THEN 'Loyal customers'
        WHEN r_score = 5 AND f_score <= 2                     THEN 'New customers'
        WHEN f_score = 3 OR m_score = 3                       THEN 'Potential loyalists'
        WHEN r_score <= 2 AND f_score >= 4                    THEN 'At risk'
        WHEN r_score <= 2 AND f_score <= 2 AND m_score <= 2   THEN 'Hibernating'
        ELSE 'About to sleep'
    END                              AS rfm_segment
FROM scored;

-- Product dimension. The retailer sells giftware; a keyword ruleset buckets
-- products into rough merchandising categories. Stock codes that are not real
-- products (postage fees, bank charges, charity commission) are flagged.
CREATE OR REPLACE TABLE dim_product AS
WITH prod AS (
    SELECT
        stock_code,
        arg_max(description, order_date) AS description,
        count(*)                         AS lines_sold,
        sum(quantity)                    AS units_sold,
        round(sum(revenue), 2)           AS total_revenue,
        round(avg(unit_price), 2)        AS avg_unit_price,
        count(DISTINCT invoice)          AS orders
    FROM stg_clean
    GROUP BY stock_code
)
SELECT
    stock_code,
    description,
    lines_sold,
    units_sold,
    total_revenue,
    avg_unit_price,
    orders,
    CASE
        WHEN upper(stock_code) IN ('POSTAGE', 'DOT', 'BANK CHARGES', 'CRUK', 'M', 'B', 'PADS', 'AMAZONFEE')
            THEN 'fee'
        ELSE 'product'
    END AS product_type,
    CASE
        WHEN regexp_matches(upper(coalesce(description, '')), 'BAG|HANDBAG|STORAGE')              THEN 'Bags & storage'
        WHEN regexp_matches(upper(coalesce(description, '')), 'LIGHT|LANTERN|CANDLE')             THEN 'Lights & candles'
        WHEN regexp_matches(upper(coalesce(description, '')), 'CAKE|BAKE|KITCHEN|TEA|COFFEE|MUG') THEN 'Kitchen & baking'
        WHEN regexp_matches(upper(coalesce(description, '')), 'PARTY|BANNER|BUNTING|BALLOON')     THEN 'Party'
        WHEN regexp_matches(upper(coalesce(description, '')), 'CHRISTMAS|XMAS|SANTA|SNOWMAN')     THEN 'Christmas'
        WHEN regexp_matches(upper(coalesce(description, '')), 'WRAP|GIFT|RIBBON|BOX')             THEN 'Gifts & wrapping'
        WHEN regexp_matches(upper(coalesce(description, '')), 'VINTAGE|RETRO')                    THEN 'Vintage'
        WHEN regexp_matches(upper(coalesce(description, '')), 'TOY|DOLL|GAME')                    THEN 'Toys & games'
        WHEN regexp_matches(upper(coalesce(description, '')), 'HEART|LOVE')                       THEN 'Hearts'
        ELSE 'Other'
    END AS category
FROM prod;
