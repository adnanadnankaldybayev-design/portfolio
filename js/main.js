/* Live GridCast panel: pull the public daily bundle and render an honest
   snapshot. Fails silent-to-stale (the link still works). */
(function () {
  "use strict";

  var FEED = "https://adnanadnankaldybayev-design.github.io/gridcast/data/metrics.json";
  var LIVE = "https://adnanadnankaldybayev-design.github.io/gridcast/data/latest_forecasts.json";

  var statusEl = document.getElementById("liveStatus");
  var metricEl = document.getElementById("liveMetric");
  var subEl = document.getElementById("liveSub");
  var rowsEl = document.getElementById("liveRows");
  var card = document.getElementById("liveCard");

  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        timeZone: "UTC", timeZoneName: "short"
      }).format(new Date(iso));
    } catch (e) { return iso; }
  }

  function row(label, value, cls) {
    var d = document.createElement("div");
    d.className = "live-row";
    var l = document.createElement("span");
    l.textContent = label;
    var v = document.createElement("span");
    v.textContent = value;
    if (cls) v.className = cls;
    d.appendChild(l);
    d.appendChild(v);
    return d;
  }

  function stale(msg) {
    statusEl.textContent = msg;
    card.classList.add("live--stale");
    rowsEl.appendChild(row("dashboard", "open live site", "warn"));
  }

  Promise.all([fetch(FEED).then(function (r) { return r.json(); }),
               fetch(LIVE).then(function (r) { return r.json(); })])
    .then(function (res) {
      var metrics = res[0];
      var live = res[1];

      statusEl.textContent = "feeding live · issued " + fmtDate(live.issue || live.generated_at);

      var units = metrics.units || {};
      var deltas = [];
      var wins = 0;
      var total = 0;
      Object.keys(units).forEach(function (u) {
        var m = units[u];
        if (typeof m.champion_value === "number" && typeof m.naive_value === "number") {
          var d = +(m.naive_value - m.champion_value).toFixed(2);
          total += 1;
          if (d > 0) wins += 1;
          deltas.push([u, d]);
        }
      });
      deltas.sort(function (a, b) { return b[1] - a[1]; });

      if (total > 0) {
        var mean = +(deltas.reduce(function (s, d) { return s + d[1]; }, 0) / total).toFixed(2);
        metricEl.textContent = mean.toFixed(2) + " pp";
        subEl.textContent = "model beats the naive baseline by this much, on average, across " + total + " live series";
        rowsEl.appendChild(row("baseline beaten on", wins + " of " + total + " series", "pos"));
        deltas.slice(0, 3).forEach(function (d) {
          rowsEl.appendChild(row("best: " + d[0], "+" + d[1].toFixed(2) + " pp", "pos"));
        });
        var worst = deltas[deltas.length - 1];
        if (worst && worst[1] < 0) {
          rowsEl.appendChild(row("honest loss: " + worst[0], worst[1].toFixed(2) + " pp", "warn"));
        }
        if (live.degraded && live.degraded.length) {
          rowsEl.appendChild(row("degraded today", live.degraded.map(function (d) { return d.unit; }).join(", "), "warn"));
        }
      } else {
        stale("live today — metrics being recomputed");
      }
    })
    .catch(function () {
      stale("could not reach the feed — the site itself is still live");
    });
})();
