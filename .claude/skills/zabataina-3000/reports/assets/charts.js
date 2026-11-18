/* =====================================================================
   ZABATAINA EDITORIAL REPORT — Chart engine (ECharts 5, SVG renderer)
   Usage:
     <div class="chart" data-chart="waterfall">
       <script type="application/json">{ ...data... }</script>
     </div>
     ZChart.autoRender();            // renders every [data-chart]
   or ZChart.render(el, 'waterfall', data, opts)
   Palettes validated with the dataviz validator (light on #F4F4F6 / dark on #0C0C10).
   ===================================================================== */
(function (global) {
  'use strict';

  var FONT = "'Inter Tight','Inter Display','Inter','Helvetica Neue',Arial,sans-serif";

  var THEMES = {
    light: {
      surface: '#FFFFFF', ink: '#0C0C10', text2: '#55555F', muted: '#8A8A94',
      rule: '#CFCFD7', grid: '#ECECF1',
      // categorical — fixed order, never cycled (max 5; 3 for scatter/bubble)
      cat: ['#1D2BE6', '#2E9AD6', '#C58F2C', '#5B2FB0', '#8A8FE0'],
      // sequential — one hue, light → dark
      seq: ['#9EA2E3', '#7A80DA', '#5560E0', '#1D2BE6', '#131C9C'],
      // diverging — two poles + neutral midpoint
      div: { pos: '#1D2BE6', neg: '#C2701F', mid: '#C9C9D1' },
      band: 'rgba(122,128,218,.22)', track: '#E6E6EE', ranges: ['#ECECF2', '#DEDEE6', '#CFCFD9']
    },
    dark: {
      surface: '#15151B', ink: '#F4F4F6', text2: '#B9B9C4', muted: '#8A8A94',
      rule: '#33333D', grid: '#24242C',
      cat: ['#4A57FA', '#2A92CC', '#B3842C', '#8670E6'],
      seq: ['#2A2F7A', '#3540B8', '#4A57FA', '#8C93FF', '#C9CCFF'],
      div: { pos: '#4A57FA', neg: '#C98A3A', mid: '#4A4A55' },
      band: 'rgba(140,147,255,.22)', track: '#26262F', ranges: ['#22222A', '#2C2C36', '#383843']
    }
  };

  /* ---------- formatting ---------- */
  function fmt(v, o) {
    o = o || {};
    if (v === null || v === undefined || v === '-' || isNaN(v)) return '';
    var dec = o.decimals !== undefined ? o.decimals : 1;
    var loc = o.locale || 'pt-PT';
    var a = Math.abs(v), s = '', n = v;
    if (o.compact !== false) {
      if (a >= 1e9) { n = v / 1e9; s = 'B'; }
      else if (a >= 1e6) { n = v / 1e6; s = 'M'; }
      else if (a >= 1e3) { n = v / 1e3; s = 'K'; }
      else { dec = o.decimals !== undefined ? o.decimals : 0; }
    }
    var str = Number(n).toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: dec });
    return (o.prefix || '') + str + s + (o.suffix || '');
  }
  function F(o) { return function (v) { return fmt(v, o); }; }

  /* ---------- shared pieces ---------- */
  function base(t, o) {
    return {
      animation: false,
      backgroundColor: 'transparent',
      color: t.cat,
      textStyle: { fontFamily: FONT, color: t.text2, fontSize: 9 },
      grid: { left: 4, right: o.gridRight || 14, top: o.legend ? 30 : 16, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'item', backgroundColor: t.surface, borderColor: t.rule, borderWidth: 1,
        textStyle: { color: t.ink, fontSize: 10, fontFamily: FONT }, extraCssText: 'border-radius:6px;box-shadow:none;'
      }
    };
  }
  function legend(t, data) {
    return { top: 0, left: 0, data: data, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 12,
      textStyle: { color: t.text2, fontSize: 8.5, fontFamily: FONT } };
  }
  function catAxis(t, data, extra) {
    return Object.assign({ type: 'category', data: data, axisLine: { lineStyle: { color: t.rule } }, axisTick: { show: false },
      axisLabel: { color: t.text2, fontSize: 8.5, fontFamily: FONT } }, extra || {});
  }
  function valAxis(t, f, extra) {
    return Object.assign({ type: 'value', axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: t.grid, width: 1 } },
      axisLabel: { color: t.muted, fontSize: 8, fontFamily: FONT, formatter: f } }, extra || {});
  }
  function seqIndex(t, i, n) { return t.seq[Math.min(t.seq.length - 1, Math.round(i * (t.seq.length - 1) / Math.max(1, n - 1)))]; }
  function ink(t) { return { color: t.ink, fontFamily: FONT }; }
  function warnCap(name, n, cap) { if (n > cap && global.console) console.warn('[ZChart] ' + name + ': ' + n + ' series > cap ' + cap + ' — fold into "Outros" or use small multiples.'); }

  /* ======================= BUILDERS ======================= */
  var B = {};

  /* 1. Rounded columns (signature style). data: {categories, values, unit?} */
  B.bars = function (d, o, t) {
    var f = F(o), n = d.values.length, horiz = !!o.horizontal;
    var series = [{
      type: 'bar', barCategoryGap: horiz ? '35%' : '28%',
      data: d.values.map(function (v, i) {
        var c = o.uniform ? t.cat[0] : (o.highlight !== undefined ? (i === o.highlight ? t.cat[0] : t.seq[0]) : seqIndex(t, i, n));
        return { value: v, itemStyle: { color: c, borderRadius: horiz ? [0, 4, 4, 0] : [4, 4, 0, 0] } };
      }),
      label: { show: true, position: horiz ? 'right' : 'top', color: t.ink, fontWeight: 700, fontSize: 9.5, fontFamily: FONT,
        formatter: function (p) { return f(p.value); } }
    }];
    var opt = base(t, o);
    opt.tooltip.formatter = function (p) { return p.name + ': <b>' + f(p.value) + '</b>'; };
    if (horiz) { opt.yAxis = catAxis(t, d.categories, { inverse: true }); opt.xAxis = valAxis(t, f, { show: o.axis === true }); opt.grid.right = 40; }
    else { opt.xAxis = catAxis(t, d.categories); opt.yAxis = valAxis(t, f, { show: o.axis !== false }); }
    opt.series = series;
    return opt;
  };

  /* 2. Grouped columns (≤ 5 series). data: {categories, series:[{name, values}]} */
  B.groupedBars = function (d, o, t) {
    var f = F(o); warnCap('groupedBars', d.series.length, 5);
    var opt = base(t, Object.assign({ legend: true }, o));
    opt.legend = legend(t, d.series.map(function (s) { return s.name; }));
    opt.tooltip.trigger = 'axis'; opt.tooltip.axisPointer = { type: 'shadow', shadowStyle: { color: 'rgba(29,43,230,.06)' } };
    opt.xAxis = catAxis(t, d.categories); opt.yAxis = valAxis(t, f);
    opt.series = d.series.map(function (s, i) {
      return { name: s.name, type: 'bar', data: s.values, barGap: '12%', barCategoryGap: '30%',
        itemStyle: { color: t.cat[i], borderRadius: [4, 4, 0, 0] },
        label: { show: !!o.labels, position: 'top', fontSize: 8, color: t.ink, formatter: function (p) { return f(p.value); } } };
    });
    return opt;
  };

  /* 3. Waterfall / bridge. data: {steps:[{name, value, type:'start'|'delta'|'total'}]} */
  B.waterfall = function (d, o, t) {
    var f = F(o), run = 0, cats = [], invisible = [], up = [], down = [], tot = [];
    d.steps.forEach(function (s) {
      cats.push(s.name);
      if (s.type === 'start' || s.type === 'total') {
        if (s.type === 'total' && (s.value === undefined || s.value === null)) s.value = run;
        invisible.push(0); tot.push(s.value); up.push('-'); down.push('-'); run = s.value;
      } else if (s.value >= 0) { invisible.push(run); up.push(s.value); down.push('-'); tot.push('-'); run += s.value; }
      else { run += s.value; invisible.push(run); down.push(-s.value); up.push('-'); tot.push('-'); }
    });
    var L = function (sign) { return { show: true, position: 'top', fontSize: 8.5, fontWeight: 700, color: t.ink, fontFamily: FONT,
      formatter: function (p) { return p.value === '-' ? '' : sign + f(p.value); } }; };
    var opt = base(t, Object.assign({ legend: true }, o));
    opt.legend = legend(t, [o.totalLabel || 'Total', o.upLabel || 'Aumento', o.downLabel || 'Redução']);
    opt.xAxis = catAxis(t, cats, { axisLabel: { color: t.text2, fontSize: 8, interval: 0, fontFamily: FONT } });
    opt.yAxis = valAxis(t, f);
    opt.tooltip.formatter = function (p) { return p.seriesName === '_base' ? '' : p.name + ': <b>' + f(p.value) + '</b>'; };
    opt.series = [
      { name: '_base', type: 'bar', stack: 'w', data: invisible, itemStyle: { color: 'transparent' }, emphasis: { disabled: true }, silent: true },
      { name: o.totalLabel || 'Total', type: 'bar', stack: 'w', data: tot, itemStyle: { color: t.ink === '#0C0C10' ? '#0C0C10' : '#F4F4F6', borderRadius: [4, 4, 0, 0] }, label: L('') },
      { name: o.upLabel || 'Aumento', type: 'bar', stack: 'w', data: up, itemStyle: { color: t.div.pos, borderRadius: 3 }, label: L('+') },
      { name: o.downLabel || 'Redução', type: 'bar', stack: 'w', data: down, itemStyle: { color: t.div.neg, borderRadius: 3 }, label: Object.assign(L('−'), { position: 'bottom' }) }
    ];
    return opt;
  };

  /* 4. Scenario fan — base line + conservative/ambitious band + actuals.
        data: {x, base, conservative, ambitious, actual?} */
  B.scenarioFan = function (d, o, t) {
    var f = F(o);
    var band = d.ambitious.map(function (v, i) { return v - d.conservative[i]; });
    var names = [o.baseLabel || 'Base', o.bandLabel || 'Intervalo conservador–ambicioso'];
    if (d.actual) names.push(o.actualLabel || 'Real');
    var opt = base(t, Object.assign({ legend: true, gridRight: 64 }, o));
    opt.legend = legend(t, names);
    opt.tooltip.trigger = 'axis';
    opt.tooltip.formatter = function (ps) {
      var i = ps[0].dataIndex, h = '<b>' + d.x[i] + '</b><br>';
      h += 'Ambicioso: ' + f(d.ambitious[i]) + '<br>Base: ' + f(d.base[i]) + '<br>Conservador: ' + f(d.conservative[i]);
      if (d.actual && d.actual[i] !== null && d.actual[i] !== undefined) h += '<br>Real: <b>' + f(d.actual[i]) + '</b>';
      return h;
    };
    opt.xAxis = catAxis(t, d.x, { boundaryGap: false });
    opt.yAxis = valAxis(t, f);
    opt.series = [
      { name: '_low', type: 'line', stack: 'band', data: d.conservative, symbol: 'none', lineStyle: { opacity: 0 }, silent: true },
      { name: names[1], type: 'line', stack: 'band', data: band, symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: t.band }, itemStyle: { color: t.band } },
      { name: names[0], type: 'line', data: d.base, symbol: 'none', lineStyle: { width: 2, color: t.cat[0] }, itemStyle: { color: t.cat[0] },
        endLabel: { show: true, formatter: function (p) { return f(p.value); }, color: t.ink, fontWeight: 700, fontSize: 9, fontFamily: FONT } }
    ];
    if (d.actual) opt.series.push({ name: names[2], type: 'line', data: d.actual, symbol: 'circle', symbolSize: 8,
      lineStyle: { width: 2, color: t.ink }, itemStyle: { color: t.ink, borderColor: t.surface, borderWidth: 2 } });
    return opt;
  };

  /* 5. Multi-line trend (≤ 4 series, end-labelled). data: {x, series:[{name, values}]} */
  B.lines = function (d, o, t) {
    var f = F(o); warnCap('lines', d.series.length, 4);
    var opt = base(t, Object.assign({ legend: d.series.length > 1, gridRight: 60 }, o));
    if (d.series.length > 1) opt.legend = legend(t, d.series.map(function (s) { return s.name; }));
    opt.tooltip.trigger = 'axis';
    opt.xAxis = catAxis(t, d.x, { boundaryGap: false }); opt.yAxis = valAxis(t, f);
    opt.series = d.series.map(function (s, i) {
      return { name: s.name, type: 'line', data: s.values, symbol: 'none', smooth: false,
        lineStyle: { width: 2, color: t.cat[i] }, itemStyle: { color: t.cat[i] },
        areaStyle: (o.area && d.series.length === 1) ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(29,43,230,.22)' }, { offset: 1, color: 'rgba(29,43,230,0)' }] } } : undefined,
        endLabel: { show: true, formatter: function (p) { return (d.series.length > 1 ? s.name + '  ' : '') + f(p.value); }, color: t.ink, fontSize: 8.5, fontWeight: 600, fontFamily: FONT } };
    });
    return opt;
  };

  /* 6. Funnel with conversion rates. data: {stages:[{name, value}]} */
  B.funnel = function (d, o, t) {
    var f = F(o), n = d.stages.length;
    var opt = base(t, o);
    opt.tooltip.formatter = function (p) { return p.name + ': <b>' + f(p.value) + '</b>'; };
    opt.series = [{
      type: 'funnel', sort: 'none', left: 0, width: '58%', top: 6, bottom: 6, gap: 2, minSize: '22%', maxSize: '100%',
      label: { show: true, position: 'right', color: t.ink, fontSize: 8.5, fontFamily: FONT, lineHeight: 12,
        formatter: function (p) {
          var i = p.dataIndex, conv = i > 0 ? '  ·  ' + (100 * d.stages[i].value / d.stages[i - 1].value).toFixed(1).replace('.', ',') + '% conv.' : '';
          return '{n|' + p.name + '}\n{v|' + f(p.value) + '}{c|' + conv + '}';
        },
        rich: { n: { fontSize: 8, color: t.text2 }, v: { fontSize: 10, fontWeight: 700, color: t.ink }, c: { fontSize: 7.5, color: t.muted } } },
      labelLine: { length: 8, lineStyle: { color: t.rule } },
      itemStyle: { borderColor: t.surface, borderWidth: 0 },
      data: d.stages.map(function (s, i) { return { name: s.name, value: s.value, itemStyle: { color: t.seq[t.seq.length - 1 - Math.min(t.seq.length - 1, Math.round(i * (t.seq.length - 1) / Math.max(1, n - 1)))] } }; })
    }];
    return opt;
  };

  /* 7. Tornado (sensitivity). data: {base, items:[{name, low, high}]} — low/high = outcome values */
  B.tornado = function (d, o, t) {
    var f = F(o);
    var items = d.items.slice().sort(function (a, b) { return Math.abs(b.high - b.low) - Math.abs(a.high - a.low); });
    var lowLabel = o.lowLabel || 'Variável −20%', highLabel = o.highLabel || 'Variável +20%';
    var opt = base(t, Object.assign({ legend: true, gridRight: 30 }, o));
    opt.legend = legend(t, [lowLabel, highLabel]);
    opt.yAxis = catAxis(t, items.map(function (i) { return i.name; }), { inverse: true, axisLine: { show: false } });
    var ext = 0; items.forEach(function (i) { ext = Math.max(ext, Math.abs(i.low - d.base), Math.abs(i.high - d.base)); });
    opt.xAxis = valAxis(t, function (v) { return f(d.base + v); }, { min: -ext * 1.75, max: ext * 1.75, axisLabel: { show: false }, splitLine: { show: false } });
    opt.grid.bottom = 16;
    opt.tooltip.formatter = function (p) { return p.name + ' — ' + p.seriesName + ': <b>' + f(d.base + p.value) + '</b>'; };
    var lbl = function (pos) { return { show: true, position: pos, fontSize: 8, color: t.ink, fontFamily: FONT, formatter: function (p) { return f(d.base + p.value); } }; };
    opt.series = [
      { name: lowLabel, type: 'bar', barGap: '-100%', barWidth: '55%', data: items.map(function (i) { var v = i.low - d.base; return { value: v, label: { position: v < 0 ? 'left' : 'right' } }; }), itemStyle: { color: t.div.neg, borderRadius: 3 }, label: lbl('left'),
        markLine: { symbol: 'none', silent: true, lineStyle: { color: t.ink, type: 'solid', width: 1 }, label: { formatter: (o.baseLabel || 'Base ') + f(d.base), color: t.ink, fontSize: 8, fontWeight: 700, fontFamily: FONT, position: 'start' }, data: [{ xAxis: 0 }] } },
      { name: highLabel, type: 'bar', barGap: '-100%', barWidth: '55%', data: items.map(function (i) { var v = i.high - d.base; return { value: v, label: { position: v < 0 ? 'left' : 'right' } }; }), itemStyle: { color: t.div.pos, borderRadius: 3 }, label: lbl('right') }
    ];
    return opt;
  };

  /* 8. Heatmap (cohort retention, seasonality, risk scores). data: {x, y, values:[[xi, yi, v]], min?, max?} */
  B.heatmap = function (d, o, t) {
    var f = F(Object.assign({ compact: false, decimals: 0 }, o));
    var vals = d.values.map(function (v) { return v[2]; }).filter(function (v) { return v !== null && v !== undefined; });
    var min = d.min !== undefined ? d.min : Math.min.apply(null, vals), max = d.max !== undefined ? d.max : Math.max.apply(null, vals);
    var opt = base(t, o);
    opt.grid.bottom = 30;
    opt.xAxis = catAxis(t, d.x, { position: 'top', axisLine: { show: false }, splitArea: { show: false } });
    opt.yAxis = catAxis(t, d.y, { inverse: true, axisLine: { show: false } });
    opt.visualMap = { min: min, max: max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 8, itemHeight: 90,
      text: [f(max), f(min)], textStyle: { color: t.muted, fontSize: 7.5, fontFamily: FONT }, inRange: { color: t.seq } };
    opt.tooltip.formatter = function (p) { return d.y[p.value[1]] + ' · ' + d.x[p.value[0]] + ': <b>' + f(p.value[2]) + '</b>'; };
    opt.series = [{ type: 'heatmap', data: d.values.map(function (v) {
      var r = (v[2] - min) / Math.max(1e-9, (max - min));
      return { value: v, label: { color: r > 0.45 ? '#FFFFFF' : '#0C0C10' } };
    }), label: { show: o.labels !== false, fontSize: 7.5, fontFamily: FONT, formatter: function (p) { return f(p.value[2]); } },
      itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 2 } }];
    return opt;
  };

  /* 9. Risk matrix (probability × impact, 5×5). data: {risks:[{id, p, i}]} */
  B.riskMatrix = function (d, o, t) {
    var cells = [], lab = {};
    d.risks.forEach(function (r) { var k = (r.i - 1) + ',' + (r.p - 1); (lab[k] = lab[k] || []).push(r.id); });
    for (var p = 0; p < 5; p++) for (var i = 0; i < 5; i++) cells.push([i, p, (i + 1) * (p + 1)]);
    var opt = base(t, o);
    opt.grid.left = 16; opt.grid.bottom = 16;
    var axisNames = { color: t.text2, fontSize: 8, fontFamily: FONT };
    opt.xAxis = catAxis(t, ['1', '2', '3', '4', '5'], { name: o.xName || 'Impacto →', nameLocation: 'middle', nameGap: 18, nameTextStyle: axisNames, axisLine: { show: false } });
    opt.yAxis = catAxis(t, ['1', '2', '3', '4', '5'], { name: o.yName || 'Probabilidade →', nameLocation: 'middle', nameGap: 18, nameTextStyle: axisNames, axisLine: { show: false } });
    opt.visualMap = { show: false, min: 1, max: 25, inRange: { color: ['#ECECF4', '#C8CAEE', '#9EA2E3', '#5560E0', '#1D2BE6'] } };
    opt.tooltip.formatter = function (q) { var k = q.value[0] + ',' + q.value[1]; return 'P' + (q.value[1] + 1) + ' × I' + (q.value[0] + 1) + ' = ' + q.value[2] + (lab[k] ? '<br>' + lab[k].join(', ') : ''); };
    opt.series = [{ type: 'heatmap', data: cells.map(function (c) {
      return { value: c, label: { color: c[2] >= 10 ? '#FFFFFF' : '#0C0C10' } }; }),
      label: { show: true, fontSize: 8, fontWeight: 700, fontFamily: FONT, formatter: function (q) { var k = q.value[0] + ',' + q.value[1]; return lab[k] ? lab[k].join('\n') : ''; } },
      itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 3 } }];
    return opt;
  };

  /* 10. Bubble / positioning map (≤ 3 groups). data: {xName, yName, series:[{name, points:[[x, y, size, label]]}]} */
  B.bubble = function (d, o, t) {
    warnCap('bubble', d.series.length, 3);
    var maxS = 0; d.series.forEach(function (s) { s.points.forEach(function (p) { maxS = Math.max(maxS, p[2] || 0); }); });
    var opt = base(t, Object.assign({ legend: d.series.length > 1 }, o));
    if (d.series.length > 1) opt.legend = legend(t, d.series.map(function (s) { return s.name; }));
    opt.grid.bottom = 18; opt.grid.left = 22; opt.grid.right = 48;
    var nameStyle = { color: t.text2, fontSize: 8, fontFamily: FONT };
    opt.xAxis = valAxis(t, F(o.x || {}), { name: d.xName, nameLocation: 'middle', nameGap: 20, nameTextStyle: nameStyle, splitLine: { lineStyle: { color: t.grid } }, scale: true, max: function (v) { return Math.ceil(v.max * 1.12); } });
    opt.yAxis = valAxis(t, F(o.y || {}), { name: d.yName, nameLocation: 'middle', nameGap: 26, nameTextStyle: nameStyle, scale: true, max: function (v) { return Math.ceil(v.max * 1.1); } });
    opt.tooltip.formatter = function (p) { return '<b>' + (p.value[3] || '') + '</b><br>' + d.xName + ': ' + p.value[0] + '<br>' + d.yName + ': ' + p.value[1]; };
    opt.series = d.series.map(function (s, i) {
      return { name: s.name, type: 'scatter', data: s.points,
        symbolSize: function (v) { return 10 + 30 * Math.sqrt((v[2] || 0) / (maxS || 1)); },
        itemStyle: { color: t.cat[i], opacity: .88, borderColor: t.surface, borderWidth: 2 },
        label: { show: true, position: 'right', fontSize: 8, color: t.ink, fontFamily: FONT, formatter: function (p) { return p.value[3] || ''; } } };
    });
    if (o.quadrants) {
      opt.series[0].markLine = { symbol: 'none', silent: true, lineStyle: { color: t.rule, type: 'dashed' }, label: { show: false },
        data: [{ xAxis: o.quadrants.x }, { yAxis: o.quadrants.y }] };
    }
    return opt;
  };

  /* 11. Donut / mix (≤ 5 slices; extras fold into "Outros"). data: {items:[{name, value}], centerLabel?} */
  B.donut = function (d, o, t) {
    // colour follows the entity (input order), never its rank; only the folding into "Outros" looks at size
    var f = F(o), items = d.items.slice();
    if (items.length > 5) {
      var keep = items.slice().sort(function (a, b) { return b.value - a.value; }).slice(0, 4);
      var rest = items.filter(function (x) { return keep.indexOf(x) < 0; }).reduce(function (s, x) { return s + x.value; }, 0);
      items = items.filter(function (x) { return keep.indexOf(x) >= 0; }).concat([{ name: o.otherLabel || 'Outros', value: rest }]);
    }
    var total = items.reduce(function (s, x) { return s + x.value; }, 0);
    var opt = base(t, o);
    opt.tooltip.formatter = function (p) { return p.name + ': <b>' + f(p.value) + '</b> (' + p.percent.toFixed(1).replace('.', ',') + '%)'; };
    opt.graphic = [{ type: 'text', left: 'center', top: '44%', style: { text: d.centerValue || f(total), font: '700 15px ' + FONT, fill: t.ink, textAlign: 'center' } },
      { type: 'text', left: 'center', top: '53%', style: { text: d.centerLabel || 'Total', font: '400 9px ' + FONT, fill: t.muted, textAlign: 'center' } }];
    opt.series = [{ type: 'pie', radius: ['44%', '64%'], center: ['50%', '50%'], padAngle: 2, avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: t.surface, borderWidth: 0 },
      label: { show: true, overflow: 'none', color: t.ink, fontSize: 8.5, fontFamily: FONT, formatter: function (p) { return p.name + '\n{b|' + p.percent.toFixed(0) + '%}'; }, rich: { b: { fontWeight: 700, fontSize: 10, color: t.ink } } },
      labelLine: { length: 6, length2: 6, lineStyle: { color: t.rule } },
      data: items.map(function (x, i) { return { name: x.name, value: x.value, itemStyle: { color: t.cat[i] } }; }) }];
    return opt;
  };

  /* 12. 100% stacked horizontal bars (composition across groups). data: {categories, series:[{name, values}]} */
  B.stacked100 = function (d, o, t) {
    warnCap('stacked100', d.series.length, 5);
    var totals = d.categories.map(function (_, ci) { return d.series.reduce(function (s, x) { return s + x.values[ci]; }, 0); });
    var opt = base(t, Object.assign({ legend: true, gridRight: 8 }, o));
    opt.legend = legend(t, d.series.map(function (s) { return s.name; }));
    opt.yAxis = catAxis(t, d.categories, { inverse: true, axisLine: { show: false } });
    opt.xAxis = valAxis(t, function (v) { return v + '%'; }, { max: 100, show: false });
    opt.tooltip.formatter = function (p) { return p.name + ' · ' + p.seriesName + ': <b>' + p.value.toFixed(1).replace('.', ',') + '%</b>'; };
    var darkSlots = [0, 3];
    opt.series = d.series.map(function (s, i) {
      return { name: s.name, type: 'bar', stack: 's', barWidth: '52%',
        data: s.values.map(function (v, ci) { return totals[ci] ? 100 * v / totals[ci] : 0; }),
        itemStyle: { color: t.cat[i], borderColor: t.surface, borderWidth: 1.5, borderRadius: 2 },
        label: { show: true, fontSize: 7.5, fontWeight: 700, fontFamily: FONT, color: darkSlots.indexOf(i) >= 0 ? '#FFFFFF' : '#0C0C10',
          formatter: function (p) { return p.value >= 8 ? Math.round(p.value) + '%' : ''; } } };
    });
    return opt;
  };

  /* 13. Sankey (revenue / cash / channel flows). data: {nodes:[{name, depth?}], links:[{source, target, value}]} */
  B.sankey = function (d, o, t) {
    var f = F(o);
    var opt = base(t, o);
    opt.tooltip.formatter = function (p) { return p.dataType === 'edge' ? p.data.source + ' → ' + p.data.target + ': <b>' + f(p.data.value) + '</b>' : p.name + ': <b>' + f(p.value) + '</b>'; };
    opt.series = [{ type: 'sankey', left: 4, right: 104, top: 6, bottom: 6, nodeGap: 8, nodeWidth: 10, draggable: false,
      data: d.nodes, links: d.links, emphasis: { focus: 'adjacency' },
      levels: [{ depth: 0, itemStyle: { color: t.ink === '#0C0C10' ? '#0C0C10' : '#F4F4F6' } }, { depth: 1, itemStyle: { color: t.seq[3] } }, { depth: 2, itemStyle: { color: t.seq[2] } }, { depth: 3, itemStyle: { color: t.seq[0] } }],
      itemStyle: { borderWidth: 0, borderRadius: 2 },
      lineStyle: { color: 'source', opacity: .22, curveness: .5 },
      label: { color: t.ink, fontSize: 8, fontFamily: FONT, formatter: function (p) { return p.name + '  {v|' + f(p.value) + '}'; }, rich: { v: { fontWeight: 700, color: t.ink, fontSize: 8 } } } }];
    return opt;
  };

  /* 14. Treemap (cost structure, market composition). data: {items:[{name, value}]} */
  B.treemap = function (d, o, t) {
    var f = F(o), items = d.items.slice().sort(function (a, b) { return b.value - a.value; });
    var total = items.reduce(function (s, x) { return s + x.value; }, 0), n = items.length;
    var opt = base(t, o);
    opt.tooltip.formatter = function (p) { return p.name + ': <b>' + f(p.value) + '</b>'; };
    opt.series = [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0,
      itemStyle: { gapWidth: 2, borderColor: t.surface, borderRadius: 4 },
      label: { show: true, fontFamily: FONT, fontSize: 8.5, lineHeight: 12, formatter: function (p) { return p.name + '\n{b|' + f(p.value) + '}  ' + (100 * p.value / total).toFixed(0) + '%'; }, rich: { b: { fontWeight: 700, fontSize: 10 } } },
      data: items.map(function (x, i) {
        var idx = t.seq.length - 1 - Math.min(t.seq.length - 1, Math.round(i * (t.seq.length - 1) / Math.max(1, n - 1)));
        return { name: x.name, value: x.value, itemStyle: { color: t.seq[idx] }, label: { color: idx >= 2 ? '#FFFFFF' : '#0C0C10' } };
      }) }];
    return opt;
  };

  /* 15. Gantt roadmap with gates. data: {tasks:[{name, start, end, phase}], phases:[names], gates:[{name, day}], max?} */
  B.gantt = function (d, o, t) {
    var phases = d.phases || [];
    var opt = base(t, Object.assign({ legend: phases.length > 0 }, o));
    if (phases.length) opt.legend = legend(t, phases);
    opt.grid.top = phases.length ? 44 : 26;
    opt.yAxis = catAxis(t, d.tasks.map(function (x) { return x.name; }), { inverse: true, axisLine: { show: false } });
    opt.xAxis = valAxis(t, function (v) { return (o.unit || 'Dia ') + v; }, { min: d.min || 0, max: d.max || 180, interval: d.interval || 30 });
    opt.tooltip.formatter = function (p) { var x = d.tasks[p.value[0]]; return '<b>' + x.name + '</b><br>' + (o.unit || 'Dia ') + x.start + ' → ' + x.end; };
    var renderItem = function (params, api) {
      var y = api.value(0), s = api.coord([api.value(1), y]), e = api.coord([api.value(2), y]);
      var h = api.size([0, 1])[1] * .52;
      return { type: 'rect', shape: { x: s[0], y: s[1] - h / 2, width: Math.max(2, e[0] - s[0]), height: h, r: 3 }, style: { fill: api.visual('color') } };
    };
    var byPhase = phases.length ? phases : ['Tarefas'];
    opt.series = byPhase.map(function (ph, pi) {
      return { name: ph, type: 'custom', renderItem: renderItem, encode: { x: [1, 2], y: 0 }, itemStyle: { color: t.cat[pi] },
        data: d.tasks.map(function (x, i) { return { x: x, i: i }; }).filter(function (r) { return !phases.length || r.x.phase === ph; })
          .map(function (r) { return [r.i, r.x.start, r.x.end]; }) };
    });
    if (d.gates && d.gates.length) {
      opt.series[0].markLine = { symbol: 'none', silent: true, lineStyle: { color: t.ink, type: 'dashed', width: 1 },
        label: { formatter: '{b}', color: t.ink, fontSize: 8, fontWeight: 700, fontFamily: FONT, position: 'start' },
        data: d.gates.map(function (g) { return { name: g.name, xAxis: g.day }; }) };
    }
    return opt;
  };

  /* 16. Bullet (actual vs target, % of target). data: {items:[{name, actual, target, unit?}]}, opts.ranges=[60,90,120] */
  B.bullet = function (d, o, t) {
    var ranges = o.ranges || [70, 100, 130];
    var names = d.items.map(function (x) { return x.name; });
    var pct = d.items.map(function (x) { return x.target ? 100 * x.actual / x.target : 0; });
    var max = Math.max(ranges[2], Math.ceil(Math.max.apply(null, pct) / 10) * 10);
    var opt = base(t, Object.assign({ legend: true, gridRight: 54 }, o));
    opt.legend = legend(t, [o.actualLabel || 'Real', o.targetLabel || 'Meta (100%)']);
    opt.grid.right = 14;
    opt.yAxis = catAxis(t, names, { inverse: true, axisLine: { show: false }, axisLabel: { fontFamily: FONT, lineHeight: 12,
      formatter: function (v, i) { var x = d.items[i]; return '{n|' + v + '}\n{v|' + fmt(x.actual, x) + '}{p|  ' + Math.round(pct[i]) + '%}'; },
      rich: { n: { color: t.text2, fontSize: 8, align: 'right' }, v: { color: t.ink, fontSize: 9, fontWeight: 700, align: 'right' }, p: { color: t.muted, fontSize: 8, align: 'right' } } } });
    opt.xAxis = valAxis(t, function (v) { return v + '%'; }, { max: max, splitLine: { show: false } });
    opt.tooltip.formatter = function (p) { var x = d.items[p.dataIndex]; return '<b>' + x.name + '</b><br>Real: ' + fmt(x.actual, x) + '<br>Meta: ' + fmt(x.target, x) + '<br>' + pct[p.dataIndex].toFixed(0) + '% da meta'; };
    var bg = function (v, c) { return { type: 'bar', silent: true, barWidth: 16, barGap: '-100%', data: names.map(function () { return v; }), itemStyle: { color: c, borderRadius: 2 }, tooltip: { show: false } }; };
    opt.series = [bg(max, t.ranges[0]), bg(ranges[1], t.ranges[1]), bg(ranges[0], t.ranges[2]),
      { name: o.actualLabel || 'Real', type: 'bar', barWidth: 6, barGap: '-100%', data: pct, itemStyle: { color: t.cat[0], borderRadius: [0, 3, 3, 0] }, z: 5 },
      { name: o.targetLabel || 'Meta (100%)', type: 'scatter', symbol: 'rect', symbolSize: [2.5, 20], data: names.map(function () { return 100; }), itemStyle: { color: t.ink }, z: 6 }];
    opt.color = [t.ranges[0], t.ranges[1], t.ranges[2], t.cat[0], t.ink];
    return opt;
  };

  /* 17. Radar (capability scores 0–4; ≤ 2 series: current vs target). data: {indicators:[{name, max}], series:[{name, values}]} */
  B.radar = function (d, o, t) {
    warnCap('radar', d.series.length, 2);
    var opt = base(t, Object.assign({ legend: d.series.length > 1 }, o));
    if (d.series.length > 1) opt.legend = legend(t, d.series.map(function (s) { return s.name; }));
    opt.radar = { indicator: d.indicators, radius: '64%', center: ['50%', '56%'], splitNumber: 4,
      axisName: { color: t.text2, fontSize: 7.5, fontFamily: FONT }, splitLine: { lineStyle: { color: t.grid } },
      splitArea: { show: false }, axisLine: { lineStyle: { color: t.grid } } };
    opt.series = [{ type: 'radar', symbolSize: 6, data: d.series.map(function (s, i) {
      return { name: s.name, value: s.values, lineStyle: { width: 2, color: t.cat[i], type: i === 1 ? 'dashed' : 'solid' }, itemStyle: { color: t.cat[i] },
        areaStyle: i === 0 ? { color: 'rgba(29,43,230,.14)' } : undefined };
    }) }];
    return opt;
  };

  /* 18. Break-even (revenue vs total cost). data: {fixed, variable, price, maxUnits} */
  B.breakEven = function (d, o, t) {
    var f = F(o), steps = 10, xs = [], rev = [], cost = [];
    var be = d.fixed / (d.price - d.variable);
    for (var i = 0; i <= steps; i++) { var u = Math.round(d.maxUnits * i / steps); xs.push(u); rev.push([u, u * d.price]); cost.push([u, d.fixed + u * d.variable]); }
    var opt = base(t, Object.assign({ legend: true, gridRight: 56 }, o));
    opt.legend = legend(t, [o.revenueLabel || 'Receita', o.costLabel || 'Custo total']);
    opt.tooltip.trigger = 'axis';
    opt.xAxis = valAxis(t, F({ compact: true, decimals: 0 }), { max: d.maxUnits, name: o.unitName || 'Unidades', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: t.text2, fontSize: 8, fontFamily: FONT }, splitLine: { show: false } });
    opt.grid.bottom = 16;
    opt.yAxis = valAxis(t, f);
    var endL = function (name) { return { show: true, formatter: name, color: t.ink, fontSize: 8, fontWeight: 600, fontFamily: FONT }; };
    opt.series = [
      { name: o.revenueLabel || 'Receita', type: 'line', data: rev, symbol: 'none', lineStyle: { width: 2, color: t.cat[0] }, itemStyle: { color: t.cat[0] }, endLabel: endL(o.revenueLabel || 'Receita'),
        markLine: { symbol: 'none', silent: true, lineStyle: { color: t.ink, type: 'dashed', width: 1 },
          label: { formatter: (o.beLabel || 'Ponto de equilíbrio ') + fmt(be, { compact: true, decimals: 1 }) + ' ' + (o.unitShort || 'un.'), color: t.ink, fontSize: 8, fontWeight: 700, fontFamily: FONT, position: 'insideEndTop' },
          data: be <= d.maxUnits ? [{ xAxis: be }] : [] },
        markPoint: be <= d.maxUnits ? { symbol: 'circle', symbolSize: 9, itemStyle: { color: t.ink, borderColor: t.surface, borderWidth: 2 }, label: { show: false }, data: [{ coord: [be, be * d.price] }] } : undefined },
      { name: o.costLabel || 'Custo total', type: 'line', data: cost, symbol: 'none', lineStyle: { width: 2, color: t.cat[2] }, itemStyle: { color: t.cat[2] }, endLabel: endL(o.costLabel || 'Custo total') }
    ];
    return opt;
  };

  /* 19. Dumbbell (before → after). data: {items:[{name, before, after}]} */
  B.dumbbell = function (d, o, t) {
    var f = F(o), names = d.items.map(function (x) { return x.name; });
    var bL = o.beforeLabel || 'Antes', aL = o.afterLabel || 'Depois';
    var opt = base(t, Object.assign({ legend: true, gridRight: 40 }, o));
    opt.legend = legend(t, [bL, aL]);
    opt.yAxis = catAxis(t, names, { inverse: true, axisLine: { show: false } });
    opt.xAxis = valAxis(t, f, { scale: true });
    opt.series = [
      { type: 'custom', silent: true, tooltip: { show: false }, data: d.items.map(function (x, i) { return [i, x.before, x.after]; }),
        renderItem: function (p, api) { var a = api.coord([api.value(1), api.value(0)]), b = api.coord([api.value(2), api.value(0)]);
          return { type: 'line', shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: t.rule, lineWidth: 3 } }; }, z: 1 },
      { name: bL, type: 'scatter', symbolSize: 10, data: d.items.map(function (x, i) { return [x.before, i]; }), itemStyle: { color: t.cat[4] || t.seq[0] }, z: 3 },
      { name: aL, type: 'scatter', symbolSize: 10, data: d.items.map(function (x, i) { return [x.after, i]; }), itemStyle: { color: t.cat[0] }, z: 4,
        label: { show: true, position: 'right', fontSize: 8, fontWeight: 700, color: t.ink, fontFamily: FONT, formatter: function (p) { return f(p.value[0]); } } }
    ];
    opt.tooltip.formatter = function (p) { return names[p.value[1]] + ' — ' + p.seriesName + ': <b>' + f(p.value[0]) + '</b>'; };
    return opt;
  };

  /* 20. Pareto-style ranked bars with cumulative share as labels (single axis).
        data: {items:[{name, value}]} */
  B.pareto = function (d, o, t) {
    var f = F(o), items = d.items.slice().sort(function (a, b) { return b.value - a.value; });
    var total = items.reduce(function (s, x) { return s + x.value; }, 0), cum = 0;
    var cumPct = items.map(function (x) { cum += x.value; return 100 * cum / total; });
    var cut = o.cut || 80;
    var opt = base(t, o);
    opt.xAxis = catAxis(t, items.map(function (x) { return x.name; }), { axisLabel: { color: t.text2, fontSize: 7.5, interval: 0, rotate: o.rotate || 0, fontFamily: FONT } });
    opt.yAxis = valAxis(t, f);
    opt.tooltip.formatter = function (p) { return p.name + ': <b>' + f(p.value) + '</b><br>Acumulado: ' + cumPct[p.dataIndex].toFixed(0) + '%'; };
    opt.series = [{ type: 'bar', barCategoryGap: '25%', data: items.map(function (x, i) {
      return { value: x.value, itemStyle: { color: (i === 0 || cumPct[i - 1] < cut) ? t.cat[0] : t.seq[0], borderRadius: [4, 4, 0, 0] } }; }),
      label: { show: true, position: 'top', fontSize: 7.5, color: t.text2, fontFamily: FONT, formatter: function (p) { return cumPct[p.dataIndex].toFixed(0) + '%'; } } }];
    return opt;
  };

  /* ======================= SPARKLINE (pure SVG) ======================= */
  function sparkline(el, values, o) {
    o = o || {};
    var w = el.clientWidth || 80, h = el.clientHeight || 22, pad = 3;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values), n = values.length;
    var x = function (i) { return pad + (w - 2 * pad) * i / Math.max(1, n - 1); };
    var y = function (v) { return h - pad - (h - 2 * pad) * (v - min) / Math.max(1e-9, max - min); };
    var pts = values.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
    var c = o.color || '#1D2BE6';
    el.innerHTML = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
      '<polyline fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"/>' +
      '<circle cx="' + x(n - 1).toFixed(1) + '" cy="' + y(values[n - 1]).toFixed(1) + '" r="2.4" fill="' + c + '"/></svg>';
  }

  /* ======================= PUBLIC API ======================= */
  function modeOf(el) { return el.closest('.on-dark, .page--ink, .bg-ink') ? 'dark' : 'light'; }

  function render(el, type, data, opts) {
    if (!global.echarts) throw new Error('ECharts not loaded');
    if (!B[type]) throw new Error('Unknown chart type: ' + type);
    opts = opts || {};
    var mode = opts.mode || modeOf(el), t = Object.assign({}, THEMES[mode]);
    if (opts.surface) t.surface = opts.surface;
    var chart = global.echarts.init(el, null, { renderer: 'svg' });
    chart.setOption(B[type](JSON.parse(JSON.stringify(data)), opts, t));
    return chart;
  }

  function autoRender(root) {
    root = root || document;
    var charts = [];
    root.querySelectorAll('[data-chart]').forEach(function (el) {
      var s = el.querySelector('script[type="application/json"]');
      var payload = s ? JSON.parse(s.textContent) : {};
      var data = payload.data || payload, opts = payload.opts || JSON.parse(el.getAttribute('data-opts') || '{}');
      try { charts.push(render(el, el.getAttribute('data-chart'), data, opts)); }
      catch (e) { el.innerHTML = '<div style="color:#D33A3A;font-size:8pt">Chart error: ' + e.message + '</div>'; console.error(e); }
    });
    root.querySelectorAll('[data-spark]').forEach(function (el) { sparkline(el, JSON.parse(el.getAttribute('data-spark'))); });
    global.__chartsReady = true;
    return charts;
  }

  global.ZChart = { render: render, autoRender: autoRender, sparkline: sparkline, fmt: fmt, themes: THEMES, types: Object.keys(B) };
})(window);
