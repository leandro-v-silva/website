/* Retail Marketing Analytics dashboard.
 *
 * Emulates BI-tool semantics: the page loads the fact table at invoice grain
 * (window.MARTS.orders) and computes every measure in the browser, so slicer
 * selections re-filter the fact rows and recalculate all KPIs and charts —
 * no BI server involved.
 *
 * Also fully bilingual (EN/PT) via the I18N dictionary below.
 */
(function () {
  "use strict";

  const M = window.MARTS;
  if (!M || !M.orders) {
    document.body.innerHTML =
      "<p style='padding:2rem'>data.js not found — run <code>make export</code> first.</p>";
    return;
  }

  /* ================= i18n ================= */

  const I18N = {
    en: {
      "app.title": "Retail Marketing Analytics",
      "app.subtitle":
        "Online Retail II · UK non-store retailer, Dec 2009 – Dec 2011 · ETL in DuckDB · dashboard in D3",
      "slicer.year": "Year",
      "slicer.country": "Country",
      "slicer.all": "All",
      "slicer.hint":
        "Slicers re-filter the fact table — all KPIs, charts and RFM segments recalculate, like Power BI.",
      "kpi.revenue": "Net revenue",
      "kpi.revenue.sub": "{n} units sold",
      "kpi.orders": "Orders",
      "kpi.orders.sub": "{x} avg order value",
      "kpi.customers": "Customers",
      "kpi.customers.sub": "across {n} countries",
      "kpi.repeat": "Repeat customer rate",
      "kpi.repeat.sub": "share with 2+ orders",
      "kpi.returning": "Returning revenue",
      "kpi.returning.sub": "from existing customers",
      "kpi.basket": "Avg basket",
      "kpi.basket.sub": "{n} items per order · {x} lines",
      "chart.revenue.legend": "Revenue",
      "chart.revenue.legendMa": "3-mo avg",
      "chart.newret.legendNew": "New",
      "chart.newret.legendReturning": "Returning",
      "tt.revenue": "Revenue",
      "tt.orders": "Orders",
      "tt.aov": "AOV",
      "tt.customers": "Customers",
      "tt.new": "New",
      "tt.returning": "Returning",
      "tt.total": "Total",
      "tt.pctReturning": "% returning",
      "tt.cohortTitle": "Cohort {c} · month {p}",
      "tt.active": "Active",
      "tt.activeOf": "{a} of {b}",
      "tt.retention": "Retention",
      "tt.stockCode": "Stock code",
      "tt.category": "Category",
      "tt.units": "Units",
      "tt.avgPrice": "Avg price",
      "tt.avgRecency": "Avg recency",
      "tt.avgFrequency": "Avg frequency",
      "tt.avgMonetary": "Avg monetary",
      "tt.pctCustomers": "% of customers",
      "tt.pctRevenue": "% of revenue",
      "seg.champions": "Champions",
      "seg.loyal": "Loyal customers",
      "seg.new": "New customers",
      "seg.potential": "Potential loyalists",
      "seg.atrisk": "At risk",
      "seg.hibernating": "Hibernating",
      "seg.abouttosleep": "About to sleep",
      nodata: "No data for the current selection",
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
    pt: {
      "app.title": "Análise de Marketing Varejista",
      "app.subtitle":
        "Online Retail II · varejista online do Reino Unido, dez 2009 – dez 2011 · ETL com DuckDB · painel em D3",
      "slicer.year": "Ano",
      "slicer.country": "País",
      "slicer.all": "Todos",
      "slicer.hint":
        "Os filtros re-filtram a tabela fato — todos os KPIs, gráficos e segmentos RFM recalculam, como no Power BI.",
      "kpi.revenue": "Receita líquida",
      "kpi.revenue.sub": "{n} unidades vendidas",
      "kpi.orders": "Pedidos",
      "kpi.orders.sub": "ticket médio de {x}",
      "kpi.customers": "Clientes",
      "kpi.customers.sub": "em {n} países",
      "kpi.repeat": "Taxa de recompra",
      "kpi.repeat.sub": "% com 2+ pedidos",
      "kpi.returning": "Receita recorrente",
      "kpi.returning.sub": "de clientes existentes",
      "kpi.basket": "Cesta média",
      "kpi.basket.sub": "{n} itens por pedido · {x} linhas",
      "chart.revenue.legend": "Receita",
      "chart.revenue.legendMa": "Média 3m",
      "chart.newret.legendNew": "Novos",
      "chart.newret.legendReturning": "Recorrentes",
      "tt.revenue": "Receita",
      "tt.orders": "Pedidos",
      "tt.aov": "Ticket médio",
      "tt.customers": "Clientes",
      "tt.new": "Novos",
      "tt.returning": "Recorrentes",
      "tt.total": "Total",
      "tt.pctReturning": "% recorrentes",
      "tt.cohortTitle": "Coorte {c} · mês {p}",
      "tt.active": "Ativos",
      "tt.retention": "Retenção",
      "tt.stockCode": "Código",
      "tt.category": "Categoria",
      "tt.units": "Unidades",
      "tt.avgPrice": "Preço médio",
      "tt.avgRecency": "Recência média",
      "tt.avgFrequency": "Frequência média",
      "tt.avgMonetary": "Ticket médio",
      "tt.pctCustomers": "% dos clientes",
      "tt.pctRevenue": "% da receita",
      "seg.champions": "Champions",
      "seg.loyal": "Clientes fiéis",
      "seg.new": "Novos clientes",
      "seg.potential": "Leais em potencial",
      "seg.atrisk": "Em risco",
      "seg.hibernating": "Hibernando",
      "seg.abouttosleep": "Prestes a hibernar",
      nodata: "Sem dados para a seleção atual",
      months: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
    },
  };

  const TIME_LOCALES = {
    en: {
      dateTime: "%x, %X", date: "%-m/%-d/%Y", time: "%-I:%M:%S %p",
      periods: ["AM", "PM"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
    pt: {
      dateTime: "%d/%m/%Y %H:%M", date: "%d/%m/%Y", time: "%H:%M:%S",
      periods: ["AM", "PM"],
      days: ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"],
      shortDays: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
      months: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
      shortMonths: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
    },
  };

  let lang = "en";
  try {
    lang = localStorage.getItem("rma-lang") || "en";
  } catch (e) { /* file:// or privacy mode — default to en */ }
  if (!I18N[lang]) lang = "en";

  const t = (key, params) => {
    let s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    if (params) {
      for (const k in params) s = s.replace("{" + k + "}", params[k]);
    }
    return s;
  };

  /* ---------------- locale-aware formatters ---------------- */
  let fmt, timeLoc;
  function buildFormatters() {
    const numDef = lang === "pt"
      ? { decimal: ",", thousands: ".", grouping: [3], currency: ["£", ""] }
      : { decimal: ".", thousands: ",", grouping: [3], currency: ["£", ""] };
    const f = d3.formatLocale(numDef);
    fmt = {
      money: f.format("$,.3s"),
      moneyFull: f.format("$,.2f"),
      int: f.format(",.0f"),
      pct: (v) => f.format(".1f")(v) + "%",
    };
    timeLoc = d3.timeFormatLocale(TIME_LOCALES[lang]);
  }
  buildFormatters();

  const monthYear = (d) => t("months")[d.getMonth()] + " " + d.getFullYear();
  const parseD = d3.timeParse("%Y-%m-%d");
  const parseMonth = d3.timeParse("%Y-%m");
  const addMonthsLabel = (label, p) => {
    const y = +label.slice(0, 4);
    const m = +label.slice(5, 7) - 1 + p;
    return d3.timeFormat("%Y-%m")(new Date(y, m, 1));
  };

  /* ================= data ================= */

  const COUNTRIES = M.countries;
  const orders = M.orders.map((o) => ({
    date: o.date,
    month: o.date.slice(0, 7),
    year: +o.date.slice(0, 4),
    c: o.country,
    cu: o.customer,
    v: o.value,
    i: o.items,
    l: o.lines,
  }));

  const state = { year: "all", country: "all" };
  let newRetView = "customers";

  function filteredOrders() {
    return orders.filter(
      (o) =>
        (state.year === "all" || o.year === +state.year) &&
        (state.country === "all" || o.c === +state.country)
    );
  }

  /* ================= measure engine =================
   * Everything a BI tool would call "measures with filter context":
   * computed on the rows that survive the slicers. */

  function segment(r, f, m) {
    if (r >= 4 && f >= 4 && m >= 4) return "seg.champions";
    if (f >= 4) return "seg.loyal";
    if (r === 5 && f <= 2) return "seg.new";
    if (f === 3 || m === 3) return "seg.potential";
    if (r <= 2 && f >= 4) return "seg.atrisk";
    if (r <= 2 && f <= 2 && m <= 2) return "seg.hibernating";
    return "seg.abouttosleep";
  }

  function computeModel(rows) {
    const model = { nOrders: rows.length };
    if (!rows.length) return model;

    model.revenue = d3.sum(rows, (o) => o.v);
    model.items = d3.sum(rows, (o) => o.i);
    model.aov = model.revenue / model.nOrders;
    model.avgItems = d3.sum(rows, (o) => o.i) / model.nOrders;
    model.avgLines = d3.sum(rows, (o) => o.l) / model.nOrders;
    model.firstDate = d3.min(rows, (o) => o.date);
    model.lastDate = d3.max(rows, (o) => o.date);

    // customer rollup (one entry per customer in the current filter context)
    const byCust = d3.rollup(
      rows,
      (v) => ({
        orders: v.length,
        revenue: d3.sum(v, (o) => o.v),
        first: d3.min(v, (o) => o.month),
        lastDate: d3.max(v, (o) => o.date),
      }),
      (o) => o.cu
    );
    model.nCustomers = byCust.size;
    model.nCountries = new Set(rows.map((o) => o.c)).size;
    model.repeatPct =
      (100 * d3.sum([...byCust.values()], (c) => (c.orders > 1 ? 1 : 0))) / byCust.size;

    const firstMonth = new Map([...byCust].map(([id, c]) => [id, c.first]));
    model.returningRevPct =
      (100 *
        d3.sum(rows, (o) => (firstMonth.get(o.cu) !== o.month ? o.v : 0))) /
      model.revenue;

    // monthly trend + new-vs-returning split
    const byMonth = d3.rollup(
      rows,
      (v) => {
        const nc = new Set();
        let newRev = 0;
        for (const o of v) {
          if (firstMonth.get(o.cu) === o.month) {
            nc.add(o.cu);
            newRev += o.v;
          }
        }
        return {
          revenue: d3.sum(v, (o) => o.v),
          orders: v.length,
          customers: new Set(v.map((o) => o.cu)).size,
          newCustomers: nc.size,
          newRevenue: newRev,
        };
      },
      (o) => o.month
    );
    model.monthly = [...byMonth]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([m, d]) => ({
        month: m,
        revenue: d.revenue,
        orders: d.orders,
        customers: d.customers,
        newCustomers: d.newCustomers,
        returningCustomers: d.customers - d.newCustomers,
        newRevenue: d.newRevenue,
        returningRevenue: d.revenue - d.newRevenue,
        aov: d.revenue / d.orders,
      }));

    // cohorts
    const custMonths = d3.rollup(
      rows,
      (v) => new Set(v.map((o) => o.month)),
      (o) => o.cu
    );
    const cohortGroups = d3.group([...byCust], ([id]) => byCust.get(id).first);
    model.cohorts = [];
    const MAXP = 13;
    for (const [cohort, members] of [...cohortGroups].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      const size = members.length;
      for (let p = 0; p <= MAXP; p++) {
        const label = addMonthsLabel(cohort, p);
        const active = members.filter(([id]) => custMonths.get(id).has(label)).length;
        model.cohorts.push({ cohort, period: p, active, size, pct: (100 * active) / size });
      }
    }

    // RFM on the filtered customer base
    const snapshot = parseD(model.lastDate);
    snapshot.setDate(snapshot.getDate() + 1);
    const rfm = [...byCust].map(([id, c]) => ({
      id,
      recency: Math.floor((snapshot - parseD(c.lastDate)) / 864e5),
      frequency: c.orders,
      monetary: c.revenue,
    }));
    const assign = (key, target, desc) => {
      const s = rfm
        .slice()
        .sort((a, b) => d3[desc ? "descending" : "ascending"](a[key], b[key]) || d3.ascending(a.id, b.id));
      const n = s.length;
      s.forEach((d, i) => (d[target] = Math.min(5, Math.floor((5 * i) / n) + 1)));
    };
    assign("recency", "r", true);
    assign("frequency", "f", false);
    assign("monetary", "m", false);
    rfm.forEach((d) => (d.seg = segment(d.r, d.f, d.m)));
    const totalRev = d3.sum(rfm, (d) => d.monetary);
    model.rfm = [...d3.rollup(rfm, (v) => ({
      key: v[0].seg,
      customers: v.length,
      revenue: d3.sum(v, (d) => d.monetary),
      avgRecency: d3.mean(v, (d) => d.recency),
      avgFrequency: d3.mean(v, (d) => d.frequency),
      avgMonetary: d3.mean(v, (d) => d.monetary),
    }), (d) => d.seg).values()]
      .map((d) => ({
        ...d,
        name: t(d.key),
        pctCustomers: (100 * d.customers) / rfm.length,
        pctRevenue: (100 * d.revenue) / totalRev,
      }))
      .sort((a, b) => d3.descending(a.revenue, b.revenue));

    // geography
    const byCountry = d3.rollup(
      rows,
      (v) => ({
        idx: v[0].c,
        revenue: d3.sum(v, (o) => o.v),
        orders: v.length,
        customers: new Set(v.map((o) => o.cu)).size,
      }),
      (o) => o.c
    );
    model.byCountry = [...byCountry.values()].sort((a, b) => d3.descending(a.revenue, b.revenue));

    return model;
  }

  /* ================= shared chart helpers ================= */

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");
  function showTooltip(event, title, rows) {
    tooltip
      .html(
        `<div class="tt-title">${title}</div>` +
          rows.map(([k, v]) => `<div class="tt-row"><span>${k}</span><span>${v}</span></div>`).join("")
      )
      .style("opacity", 1)
      .style("left", event.pageX + 14 + "px")
      .style("top", event.pageY - 10 + "px");
  }
  const hideTooltip = () => tooltip.style("opacity", 0);

  function chartWidth(sel, margin) {
    const w = document.querySelector(sel).clientWidth;
    return { width: Math.max(w, 320), height: 320, margin };
  }

  function showEmpty(sel) {
    d3.select(sel).selectAll("svg").remove();
    d3.select(sel).selectAll("div.nodata").remove();
    d3.select(sel).append("div").attr("class", "nodata").text(t("nodata"));
  }

  function clearEmpty(sel) {
    d3.select(sel).selectAll("div.nodata").remove();
  }

  const ACCENT = "#4f46e5";
  const TEAL = "#0d9488";
  const AMBER = "#f59e0b";
  const INK_SOFT = "#64748b";

  /* ================= KPI cards ================= */

  function renderKpis(m) {
    if (!m.nOrders) {
      d3.select("#kpis").selectAll(".kpi").remove();
      d3.select("#kpis").append("div").attr("class", "nodata").text(t("nodata"));
      return;
    }
    clearEmpty("#kpis");
    const cards = [
      { label: t("kpi.revenue"), value: fmt.money(m.revenue), sub: t("kpi.revenue.sub", { n: fmt.int(m.items) }) },
      { label: t("kpi.orders"), value: fmt.int(m.nOrders), sub: t("kpi.orders.sub", { x: fmt.moneyFull(m.aov) }) },
      { label: t("kpi.customers"), value: fmt.int(m.nCustomers), sub: t("kpi.customers.sub", { n: fmt.int(m.nCountries) }) },
      { label: t("kpi.repeat"), value: fmt.pct(m.repeatPct), sub: t("kpi.repeat.sub") },
      { label: t("kpi.returning"), value: fmt.pct(m.returningRevPct), sub: t("kpi.returning.sub") },
      { label: t("kpi.basket"), value: fmt.int(m.avgItems), sub: t("kpi.basket.sub", { n: fmt.int(m.avgItems), x: fmt.int(m.avgLines) }) },
    ];
    d3.select("#kpis")
      .selectAll(".kpi")
      .data(cards)
      .join("div")
      .attr("class", "kpi")
      .html(
        (d) =>
          `<div class="kpi-label">${d.label}</div>` +
          `<div class="kpi-value">${d.value}</div>` +
          `<div class="kpi-sub">${d.sub}</div>`
      );
  }

  /* ================= monthly revenue ================= */

  function renderRevenue(m) {
    const sel = "#chart-revenue";
    if (!m.monthly || !m.monthly.length) return showEmpty(sel);
    clearEmpty(sel);
    const data = m.monthly.map((d) => ({ ...d, date: parseMonth(d.month) }));
    data.forEach((d, i) => {
      const win = data.slice(Math.max(0, i - 2), i + 1);
      d.ma = d3.mean(win, (w) => w.revenue);
    });

    d3.select(sel).selectAll("svg").remove();
    const { width, height, margin } = chartWidth(sel, { top: 18, right: 16, bottom: 34, left: 62 });
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(sel).append("svg").attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(data, (d) => d.date)).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.revenue) * 1.08]).range([innerH, 0]).nice();

    svg.append("g").attr("class", "grid-line")
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat("")).select(".domain").remove();
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(Math.min(12, data.length)).tickFormat(timeLoc.format("%b %y")));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(fmt.money));

    svg.append("path").datum(data).attr("fill", ACCENT).attr("opacity", 0.14)
      .attr("d", d3.area().x((d) => x(d.date)).y0(innerH).y1((d) => y(d.revenue)).curve(d3.curveMonotoneX));
    svg.append("path").datum(data).attr("fill", "none").attr("stroke", ACCENT).attr("stroke-width", 2.2)
      .attr("d", d3.line().x((d) => x(d.date)).y((d) => y(d.revenue)).curve(d3.curveMonotoneX));
    svg.append("path").datum(data).attr("fill", "none").attr("stroke", AMBER).attr("stroke-width", 1.8)
      .attr("stroke-dasharray", "5 4")
      .attr("d", d3.line().x((d) => x(d.date)).y((d) => y(d.ma)).curve(d3.curveMonotoneX));

    const legend = svg.append("g").attr("transform", `translate(${innerW - 150},4)`)
      .attr("font-size", 11.5).attr("fill", INK_SOFT);
    legend.append("line").attr("x1", 0).attr("x2", 18).attr("stroke", ACCENT).attr("stroke-width", 2.2);
    legend.append("text").attr("x", 24).attr("y", 4).text(t("chart.revenue.legend"));
    legend.append("line").attr("x1", 84).attr("x2", 102).attr("stroke", AMBER).attr("stroke-width", 1.8).attr("stroke-dasharray", "5 4");
    legend.append("text").attr("x", 108).attr("y", 4).text(t("chart.revenue.legendMa"));

    const bisect = d3.bisector((d) => d.date).center;
    svg.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", "transparent")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event);
        const d = data[bisect(data, x.invert(mx))];
        if (!d) return;
        showTooltip(event, timeLoc.format("%B %Y")(d.date), [
          [t("tt.revenue"), fmt.money(d.revenue)],
          [t("tt.orders"), fmt.int(d.orders)],
          [t("tt.aov"), fmt.moneyFull(d.aov)],
          [t("tt.customers"), fmt.int(d.customers)],
        ]);
      })
      .on("mouseleave", hideTooltip);
  }

  /* ================= new vs returning ================= */

  function renderNewReturning(m) {
    const sel = "#chart-newret";
    if (!m.monthly || !m.monthly.length) return showEmpty(sel);
    clearEmpty(sel);
    const isCust = newRetView === "customers";
    const data = m.monthly.map((d) => ({
      label: d.month,
      date: parseMonth(d.month),
      New: isCust ? d.newCustomers : d.newRevenue,
      Returning: isCust ? d.returningCustomers : d.returningRevenue,
    }));
    const val = isCust ? fmt.int : fmt.money;

    d3.select(sel).selectAll("svg").remove();
    const { width, height, margin } = chartWidth(sel, { top: 10, right: 12, bottom: 44, left: 56 });
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(sel).append("svg").attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map((d) => d.label)).range([0, innerW]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.New + d.Returning) * 1.05]).range([innerH, 0]).nice();
    const series = d3.stack().keys(["New", "Returning"])(data);

    svg.append("g").attr("class", "grid-line")
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat("")).select(".domain").remove();
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % 3 === 0)));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(val));

    svg.selectAll("g.layer").data(series).join("g").attr("class", "layer")
      .attr("fill", (d) => (d.key === "New" ? AMBER : TEAL))
      .selectAll("rect").data((d) => d).join("rect")
      .attr("x", (d) => x(d.data.label))
      .attr("y", (d) => y(d[1]))
      .attr("height", (d) => Math.max(0, y(d[0]) - y(d[1])))
      .attr("width", x.bandwidth())
      .on("mousemove", (event, d) => {
        const total = d.data.New + d.data.Returning;
        showTooltip(event, d.data.label, [
          [t("tt.new"), val(d.data.New)],
          [t("tt.returning"), val(d.data.Returning)],
          [t("tt.total"), val(total)],
          [t("tt.pctReturning"), fmt.pct((100 * d.data.Returning) / total)],
        ]);
      })
      .on("mouseleave", hideTooltip);

    const legend = svg.append("g").attr("transform", `translate(0,${innerH + 30})`)
      .attr("font-size", 11.5).attr("fill", INK_SOFT);
    [["Returning", TEAL], ["New", AMBER]].forEach(([name, color], i) => {
      const g = legend.append("g").attr("transform", `translate(${i * 96},0)`);
      g.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", color);
      g.append("text").attr("x", 16).attr("y", 9)
        .text(name === "New" ? t("chart.newret.legendNew") : t("chart.newret.legendReturning"));
    });
  }

  /* ================= cohort heatmap ================= */

  function renderCohort(m) {
    const sel = "#chart-cohort";
    if (!m.cohorts || !m.cohorts.length) return showEmpty(sel);
    clearEmpty(sel);
    const maxPeriod = 13;
    const rows = d3.groups(m.cohorts.filter((d) => d.period <= maxPeriod), (d) => d.cohort)
      .map(([cohort, cells]) => ({ cohort, cells }))
      .sort((a, b) => (a.cohort < b.cohort ? -1 : 1));
    const periods = d3.range(0, maxPeriod + 1);

    d3.select(sel).selectAll("svg").remove();
    const { width, margin } = chartWidth(sel, { top: 24, right: 12, bottom: 34, left: 76 });
    const cellH = 22;
    const cellW = Math.max(30, Math.floor((width - margin.left - margin.right) / periods.length));
    const height = rows.length * cellH + margin.top + margin.bottom;

    const svg = d3.select(sel).append("svg").attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const color = d3.scaleSequential()
      .domain([0, d3.max(m.cohorts, (d) => d.pct) || 100])
      .interpolator(d3.interpolateRgbBasis(["#f1f5f9", "#c7d2fe", "#818cf8", "#4f46e5"]));

    svg.append("g").attr("class", "axis").selectAll("text").data(periods).join("text")
      .attr("x", (p) => p * cellW + cellW / 2).attr("y", -8)
      .attr("text-anchor", "middle").attr("fill", INK_SOFT).attr("font-size", 11.5)
      .text((p) => (p === 0 ? "M0" : p));

    const row = svg.selectAll("g.row").data(rows).join("g").attr("class", "row")
      .attr("transform", (_, i) => `translate(0,${i * cellH})`);

    row.append("text").attr("x", -10).attr("y", cellH / 2 + 4)
      .attr("text-anchor", "end").attr("fill", INK_SOFT).attr("font-size", 11.5)
      .text((d) => d.cohort);

    row.selectAll("rect").data((d) => d.cells).join("rect")
      .attr("x", (d) => d.period * cellW + 1).attr("y", 1)
      .attr("width", cellW - 2).attr("height", cellH - 2).attr("rx", 3)
      .attr("fill", (d) => color(d.pct))
      .on("mousemove", (event, d) => {
        showTooltip(event, t("tt.cohortTitle", { c: d.cohort, p: d.period }), [
          [t("tt.active"), t("tt.activeOf", { a: fmt.int(d.active), b: fmt.int(d.size) })],
          [t("tt.retention"), fmt.pct(d.pct)],
        ]);
      })
      .on("mouseleave", hideTooltip);

    row.selectAll("text.pct").data((d) => d.cells).join("text").attr("class", "pct")
      .attr("x", (d) => d.period * cellW + cellW / 2).attr("y", cellH / 2 + 3.5)
      .attr("text-anchor", "middle").attr("font-size", 10)
      .attr("fill", (d) => (d.pct > 45 ? "#fff" : "#334155"))
      .text((d) => (cellW >= 42 ? d.pct.toFixed(0) : ""));
  }

  /* ================= RFM segments ================= */

  function renderRfm(m) {
    const sel = "#chart-rfm";
    if (!m.rfm || !m.rfm.length) return showEmpty(sel);
    clearEmpty(sel);
    const data = [...m.rfm].sort((a, b) => d3.descending(a.customers, b.customers));

    d3.select(sel).selectAll("svg").remove();
    const { width, height, margin } = chartWidth(sel, { top: 14, right: 46, bottom: 48, left: 128 });
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(sel).append("svg").attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // shared 0–100% scale: bar = % of customers, dot = % of revenue
    const y = d3.scaleBand().domain(data.map((d) => d.name)).range([0, innerH]).padding(0.28);
    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);

    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((v) => v + "%"));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0));

    svg.selectAll("rect").data(data).join("rect")
      .attr("x", 0).attr("y", (d) => y(d.name))
      .attr("width", (d) => x(d.pctCustomers)).attr("height", y.bandwidth())
      .attr("rx", 4).attr("fill", ACCENT).attr("opacity", 0.85)
      .on("mousemove", (event, d) => {
        showTooltip(event, d.name, [
          [t("tt.customers"), fmt.int(d.customers)],
          [t("tt.revenue"), fmt.money(d.revenue)],
          [t("tt.pctCustomers"), fmt.pct(d.pctCustomers)],
          [t("tt.pctRevenue"), fmt.pct(d.pctRevenue)],
          [t("tt.avgRecency"), fmt.int(d.avgRecency) + " d"],
          [t("tt.avgFrequency"), d.avgFrequency.toFixed(1)],
          [t("tt.avgMonetary"), fmt.moneyFull(d.avgMonetary)],
        ]);
      })
      .on("mouseleave", hideTooltip);

    svg.selectAll("circle").data(data).join("circle")
      .attr("cx", (d) => x(d.pctRevenue))
      .attr("cy", (d) => y(d.name) + y.bandwidth() / 2)
      .attr("r", 5).attr("fill", AMBER).attr("stroke", "#fff").attr("stroke-width", 1.5);

    const lg = svg.append("g").attr("transform", `translate(0,${innerH + 30})`)
      .attr("font-size", 11.5).attr("fill", INK_SOFT);
    lg.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", ACCENT).attr("opacity", 0.85);
    lg.append("text").attr("x", 16).attr("y", 9).text(t("tt.pctCustomers"));
    lg.append("circle").attr("cx", 132).attr("cy", 5).attr("r", 5).attr("fill", AMBER);
    lg.append("text").attr("x", 142).attr("y", 9).text(t("tt.pctRevenue"));
  }

  /* ================= top products (static: no slicer) ================= */

  function renderProducts() {
    const sel = "#chart-products";
    const data = [...M.top_products].reverse();
    const maxLen = 34;

    d3.select(sel).selectAll("svg").remove();
    const { width, margin } = chartWidth(sel, { top: 10, right: 60, bottom: 30, left: 210 });
    const rowH = 26;
    const height = data.length * rowH + margin.top + margin.bottom;
    const innerW = width - margin.left - margin.right;

    const svg = d3.select(sel).append("svg").attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand().domain(data.map((d) => d.stock_code)).range([0, data.length * rowH]).padding(0.25);
    const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.total_revenue)]).range([0, innerW]).nice();

    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${data.length * rowH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(fmt.money));
    svg.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).tickFormat((code) => {
        const d = data.find((p) => p.stock_code === code);
        const label = (d.description || "").toLowerCase();
        return label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
      }));

    svg.selectAll("rect").data(data).join("rect")
      .attr("x", 0).attr("y", (d) => y(d.stock_code))
      .attr("width", (d) => x(d.total_revenue)).attr("height", y.bandwidth())
      .attr("rx", 3).attr("fill", TEAL).attr("opacity", 0.85)
      .on("mousemove", (event, d) => {
        showTooltip(event, d.description, [
          [t("tt.stockCode"), d.stock_code],
          [t("tt.category"), d.category],
          [t("tt.revenue"), fmt.money(d.total_revenue)],
          [t("tt.units"), fmt.int(d.units_sold)],
          [t("tt.orders"), fmt.int(d.orders)],
          [t("tt.avgPrice"), fmt.moneyFull(d.avg_unit_price)],
        ]);
      })
      .on("mouseleave", hideTooltip);

    svg.selectAll("text.val").data(data).join("text").attr("class", "val")
      .attr("x", (d) => x(d.total_revenue) + 6)
      .attr("y", (d) => y(d.stock_code) + y.bandwidth() / 2 + 4)
      .attr("fill", INK_SOFT).attr("font-size", 11.5)
      .text((d) => fmt.money(d.total_revenue));
  }

  /* ================= countries ================= */

  function renderCountry(m) {
    const sel = "#chart-country";
    if (!m.byCountry || !m.byCountry.length) return showEmpty(sel);
    clearEmpty(sel);
    const data = m.byCountry.slice(0, 10).reverse();

    d3.select(sel).selectAll("svg").remove();
    const { width, margin } = chartWidth(sel, { top: 10, right: 60, bottom: 30, left: 130 });
    const rowH = 34;
    const height = data.length * rowH + margin.top + margin.bottom;
    const innerW = width - margin.left - margin.right;

    const svg = d3.select(sel).append("svg").attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand().domain(data.map((d) => COUNTRIES[d.idx])).range([0, data.length * rowH]).padding(0.25);
    // sqrt scale: the home market dwarfs every other one (~10x the runner-up)
    const x = d3.scaleSqrt().domain([0, d3.max(data, (d) => d.revenue)]).range([0, innerW]).nice();

    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${data.length * rowH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(fmt.money));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0));

    svg.selectAll("rect").data(data).join("rect")
      .attr("x", 0).attr("y", (d) => y(COUNTRIES[d.idx]))
      .attr("width", (d) => x(d.revenue)).attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => (state.country !== "all" && d.idx === +state.country ? ACCENT : "#94a3b8"))
      .attr("opacity", (d) => (state.country === "all" || d.idx === +state.country ? 0.95 : 0.35))
      .on("mousemove", (event, d) => {
        showTooltip(event, COUNTRIES[d.idx], [
          [t("tt.revenue"), fmt.money(d.revenue)],
          [t("tt.orders"), fmt.int(d.orders)],
          [t("tt.customers"), fmt.int(d.customers)],
          [t("tt.aov"), fmt.moneyFull(d.revenue / d.orders)],
        ]);
      })
      .on("mouseleave", hideTooltip);

    svg.selectAll("text.val").data(data).join("text").attr("class", "val")
      .attr("x", (d) => x(d.revenue) + 6)
      .attr("y", (d) => y(COUNTRIES[d.idx]) + y.bandwidth() / 2 + 4)
      .attr("fill", INK_SOFT).attr("font-size", 11.5)
      .text((d) => fmt.money(d.revenue));
  }

  /* ================= render orchestration ================= */

  function renderAll() {
    const m = computeModel(filteredOrders());
    renderKpis(m);
    renderRevenue(m);
    renderNewReturning(m);
    renderCohort(m);
    renderRfm(m);
    renderProducts();
    renderCountry(m);
  }

  /* ================= static i18n + language switch ================= */

  const APP_VERSION = "2.1";
  function updateVersion() {
    document.getElementById("app-version").textContent =
      (lang === "pt" ? "Painel v" : "Dashboard v") + APP_VERSION +
      " · " + d3.min(orders, (o) => o.date) + " → " + d3.max(orders, (o) => o.date);
  }

  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.body.classList.toggle("lang-en", lang === "en");
    document.body.classList.toggle("lang-pt", lang === "pt");
    document.querySelector(".footer-en").hidden = lang !== "en";
    document.querySelector(".footer-pt").hidden = lang !== "pt";
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    document.querySelectorAll(".lang-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.lang === lang)
    );
  }

  function setLang(l) {
    lang = l;
    try {
      localStorage.setItem("rma-lang", l);
    } catch (e) { /* ignore */ }
    buildFormatters();
    applyStatic();
    updateVersion();
    renderAll();
  }

  document.querySelectorAll(".lang-btn").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang))
  );

  /* ================= slicers ================= */

  const countrySelect = document.getElementById("slicer-country");
  countrySelect.innerHTML =
    `<option value="all">${t("slicer.all")}</option>` +
    COUNTRIES.map((c, i) => `<option value="${i}">${c}</option>`).join("");
  countrySelect.addEventListener("change", () => {
    state.country = countrySelect.value;
    renderAll();
  });

  document.querySelectorAll("#slicer-year .chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      document.querySelectorAll("#slicer-year .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.year = chip.dataset.year;
      renderAll();
    })
  );

  document.querySelectorAll(".toggle-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      newRetView = btn.dataset.view;
      renderAll();
    })
  );

  /* ================= boot & resize ================= */

  // version stamp so users (and bug reports) can confirm which build is loaded
  updateVersion();
  console.info("[dashboard] v" + APP_VERSION + " lang=" + lang);

  // header badge always reflects the full dataset period
  document.getElementById("period-badge").textContent =
    monthYear(parseD(d3.min(orders, (o) => o.date))) + " – " +
    monthYear(parseD(d3.max(orders, (o) => o.date)));

  applyStatic();
  renderAll();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 200);
  });
})();
