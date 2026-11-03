// Dropmatch page glue: read the form, run the engine in core.js, draw the plan,
// keep the share link in sync, and tell Sweep what's going on. All the real work
// lives in core.js so it can be tested without a browser.
(function () {
  "use strict";
  var D = window.Dropmatch;
  var $ = function (id) { return document.getElementById(id); };

  var ids = ["width", "height", "len-unit", "roll", "roll-len", "roll-wid", "roll-unit",
    "match", "repeat", "rep-unit", "trim", "spare", "price"];
  var el = {};
  ids.forEach(function (id) { el[id] = $(id); });
  var out = $("out");

  function readState() {
    return {
      w: el.width.value.trim(), h: el.height.value.trim(), lu: el["len-unit"].value,
      r: el.roll.value, rl: el["roll-len"].value.trim(), rw: el["roll-wid"].value.trim(), ru: el["roll-unit"].value,
      m: el.match.value, rep: el.repeat.value.trim(), repu: el["rep-unit"].value,
      t: el.trim.value.trim(), sp: el.spare.value.trim(), p: el.price.value.trim()
    };
  }

  function writeState(s) {
    if (!s) return;
    if (s.w != null) el.width.value = s.w;
    if (s.h != null) el.height.value = s.h;
    if (s.lu) el["len-unit"].value = s.lu;
    if (s.r) el.roll.value = s.r;
    if (s.rl != null) el["roll-len"].value = s.rl;
    if (s.rw != null) el["roll-wid"].value = s.rw;
    if (s.ru) el["roll-unit"].value = s.ru;
    if (s.m) el.match.value = s.m;
    if (s.rep != null) el.repeat.value = s.rep;
    if (s.repu) el["rep-unit"].value = s.repu;
    if (s.t != null) el.trim.value = s.t;
    if (s.sp != null) el.spare.value = s.sp;
    if (s.p != null) el.price.value = s.p;
  }

  function cell(k, v, u, big) {
    return '<div class="cell' + (big ? " big" : "") + '"><span class="k">' + k + '</span><span class="v">' + v +
      (u ? '<span class="u"> ' + u + '</span>' : "") + '</span></div>';
  }

  function render(r) {
    if (!r || !r.ok) {
      var msg = r && r.reason === "bad-width" ? "Enter the wall width (add up the walls for a whole room)."
        : r && r.reason === "bad-height" ? "Enter the wall height, floor to ceiling."
        : r && r.reason === "too-tall" ? "That wall is taller than one roll will reach. Check the height and roll length."
        : "Fill in the wall size and the roll to start.";
      out.innerHTML = '<div class="result bad"><h3>Nothing to work out yet</h3><p class="msg">' + msg + '</p></div>';
      return "bad";
    }

    var pill = r.match === "free"
      ? '<span class="tagpill good">plain, little waste</span>'
      : r.match === "straight"
        ? '<span class="tagpill">straight match</span>'
        : '<span class="tagpill warn">half-drop, more waste</span>';

    var grid =
      cell("Rolls to buy", r.rolls, "", true) +
      cell("Drops needed", r.dropsNeeded, "") +
      cell("Per roll", r.dropsPerRoll, "") +
      cell("Cut length", r.cut, "m") +
      (r.cost != null ? cell("Cost", r.cost, "") : "");

    var wastePct = Math.max(2, Math.min(100, r.wastePercent));
    var wasteClass = r.wastePercent >= 25 ? "waste-bar high" : r.wastePercent >= 12 ? "waste-bar mid" : "waste-bar";
    var wasteBlock =
      '<div class="fill">' +
        '<div class="fill-track"><div class="' + wasteClass + '" style="width:' + wastePct + '%"></div></div>' +
        '<p class="fill-label">About ' + r.wastePercent + '% of the paper you buy ends up as offcut (' +
        r.wasteLength + ' m of the ' + r.boughtLength + ' m on ' + r.rolls + ' roll' + (r.rolls === 1 ? "" : "s") +
        '). Patterned papers waste more.</p>' +
      '</div>';

    var matchBox =
      '<div class="opt"><div class="opt-h">Pattern ' + pill + '</div>' +
      '<p class="opt-sub">' +
      (r.match === "free"
        ? "No repeat to line up, so each drop is just the height plus a " + r.trim + " m trim."
        : "Repeat " + r.repeat + " m. Each drop is cut to " + r.cut + " m so the pattern meets at the join" +
          (r.match === "offset" ? ", with about " + r.offsetWaste + " m more lost on every other drop for the half-drop step." : ".")) +
      '</p></div>';

    var advice = '<ul class="advice">' + r.advice.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>";

    out.innerHTML =
      '<div class="result">' +
        '<h3>' + r.rollLabel + ' · ' + r.rollLength + ' m &times; ' + r.rollWidth + ' m</h3>' +
        '<div class="opt pick">' +
          '<div class="opt-h">The order</div>' +
          '<div class="grid">' + grid + '</div>' +
          wasteBlock +
        '</div>' +
      '</div>' +
      '<div class="result"><h3>How it lines up</h3>' + matchBox + '</div>' +
      '<div class="result"><h3>What to do</h3>' + advice + '</div>';

    return r.match;
  }

  function recompute() {
    var s = readState();
    var r = D.plan({
      width: { value: s.w, unit: s.lu }, height: { value: s.h, unit: s.lu },
      roll: s.r,
      rollLength: { value: s.rl, unit: s.ru }, rollWidth: { value: s.rw, unit: s.ru },
      match: s.m, repeat: { value: s.rep, unit: s.repu },
      trim: { value: s.t === "" ? undefined : s.t, unit: s.repu },
      spare: s.sp === "" ? undefined : parseFloat(s.sp),
      pricePerRoll: s.p
    });
    var kind = render(r);
    if (window.Sweep) window.Sweep.react(r.ok ? kind : "bad");
    syncLink(s);
  }

  var linkState = "";
  function syncLink(s) {
    linkState = D.pack(s);
    try { history.replaceState(null, "", "#" + linkState); } catch (e) { /* ignore */ }
  }

  $("share").addEventListener("click", function () {
    var url = location.origin + location.pathname + "#" + linkState;
    var done = $("share-done");
    function ok() { done.textContent = "Link copied"; setTimeout(function () { done.textContent = ""; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { done.textContent = url; });
    else { done.textContent = url; }
  });

  // Picking a roll preset fills in its length and width and locks the custom
  // boxes unless "Custom" is chosen. The unit for the roll follows its preset
  // (metres), but a typed value is never overwritten by a later preset switch.
  function onRoll() {
    var key = el.roll.value;
    var preset = D.ROLLS[key] || D.ROLLS.euro;
    var custom = key === "custom";
    el["roll-len"].disabled = !custom;
    el["roll-wid"].disabled = !custom;
    if (!custom) {
      el["roll-unit"].value = "m";
      el["roll-len"].value = preset.length;
      el["roll-wid"].value = preset.width;
    }
  }

  // A free match has no repeat, so grey the repeat box out; a pattern match needs
  // one, so make sure it's enabled.
  function onMatch() {
    var free = el.match.value === "free";
    el.repeat.disabled = free;
    el["rep-unit"].disabled = free;
  }

  // Tips follow where the eye is.
  ["width", "height", "len-unit"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Sweep) window.Sweep.context("room"); });
  });
  ["roll", "roll-len", "roll-wid", "roll-unit"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Sweep) window.Sweep.context("roll"); });
  });
  ["match", "repeat", "rep-unit", "trim"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Sweep) window.Sweep.context("pattern"); });
  });

  el.roll.addEventListener("change", function () { onRoll(); recompute(); });
  el.match.addEventListener("change", function () { onMatch(); recompute(); });

  ids.forEach(function (id) {
    el[id].addEventListener("input", recompute);
    el[id].addEventListener("change", recompute);
  });

  // Open on a shared link if there is one, otherwise a sensible starting point.
  var frag = location.hash.replace(/^#/, "");
  var initial = frag ? D.unpack(frag) : null;
  if (initial) { writeState(initial); }
  onRoll();
  onMatch();
  recompute();
})();
