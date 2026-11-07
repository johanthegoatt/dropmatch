// Dropmatch core: how many rolls of wallpaper a room really needs, and why a
// patterned paper needs more than the plain maths says. No DOM in here, so the
// same file runs in the page and under `node --test`.
//
// Wallpaper is hung in vertical strips ("drops"). The number of drops is the
// wall width divided by the roll width, rounded up. How many drops you get out
// of one roll is the roll length divided by the length of one drop, rounded
// down. Rolls needed is the drops divided by the drops-per-roll, rounded up.
//
// The part a plain "width times height" guess gets wrong is the PATTERN. If the
// paper has a design that repeats, every drop has to start at the same point in
// the pattern so the strips line up side by side, so each drop is cut up to a
// whole pattern repeat longer than the wall is tall, and the offcut is waste.
// A "straight match" lines up at the same height across the width; an "offset"
// (half-drop) match steps the pattern down by half a repeat on every other
// drop, which lines up on the diagonal and wastes more again. Dropmatch works
// out the cut length, the drops, the rolls, the waste and a sensible spare,
// and tells you which match you're dealing with. The roll sizes default to the
// European standard (10.05 m x 0.53 m); confirm yours on the roll's own label,
// since products vary.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Dropmatch = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var IN = 0.0254;   // metres per inch
  var FT = 0.3048;   // metres per foot

  // Common roll formats. Lengths and widths are in metres. The Euro roll is the
  // UK/European standard; the US double roll is sold by area and varies a lot,
  // so it's an approximate starting point you should check against the label.
  var ROLLS = {
    "euro": { label: "Euro roll (UK / EU standard)", length: 10.05, width: 0.53 },
    "euro-wide": { label: "Wide roll (paste-the-wall)", length: 10.05, width: 0.68 },
    "us-double": { label: "US double roll (approx.)", length: 8.2, width: 0.686 },
    "custom": { label: "Custom / off the label", length: 10.05, width: 0.53 }
  };

  // The three ways a paper lines up across a width.
  var MATCHES = {
    "free": { label: "Free match (no repeat)", offsets: false },
    "straight": { label: "Straight match", offsets: false },
    "offset": { label: "Offset / half-drop match", offsets: true }
  };

  function num(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) ? n : NaN;
  }

  // Any length into metres. Default unit is metres.
  function toM(value, unit) {
    var n = num(value);
    if (!isFinite(n)) return NaN;
    if (unit === "cm") return n / 100;
    if (unit === "mm") return n / 1000;
    if (unit === "in") return n * IN;
    if (unit === "ft") return n * FT;
    return n; // metres
  }

  function round2(x) { return Math.round(x * 100) / 100; }
  function round1(x) { return Math.round(x * 10) / 10; }
  function ceilTo(x, step) { return Math.ceil((x - 1e-9) / step) * step; }

  // Work out the cut length of a single drop: the wall height plus a trim
  // allowance at top and bottom, then, for a patterned paper, rounded up to a
  // whole number of pattern repeats so every drop starts at the same point.
  function cutLength(height, trim, repeat, match) {
    var base = height + trim;
    if (!(repeat > 0) || match === "free") return base;
    return ceilTo(base, repeat);
  }

  // The main calculation.
  //   width:   the wall width to cover (the room perimeter for a whole room),
  //            as { value, unit }. Short bits over doors and windows usually
  //            come out of the offcuts, so a standard room ignores openings.
  //   height:  { value, unit } floor to ceiling (or coving).
  //   roll:    key into ROLLS, or "custom".
  //   rollLength / rollWidth: { value, unit } overrides for a custom roll.
  //   repeat:  the pattern repeat, { value, unit } (0 or blank for a plain paper).
  //   match:   "free" | "straight" | "offset".
  //   trim:    { value, unit } top-and-bottom trim allowance (default 100 mm).
  //   spare:   percent extra to keep back for mistakes and later repairs.
  //   pricePerRoll: optional, to put a cost on it.
  function plan(opts) {
    opts = opts || {};

    var rollKey = ROLLS[opts.roll] ? opts.roll : "euro";
    var preset = ROLLS[rollKey];

    var rollLength = toM(opts.rollLength && opts.rollLength.value, opts.rollLength && opts.rollLength.unit);
    var rollWidth = toM(opts.rollWidth && opts.rollWidth.value, opts.rollWidth && opts.rollWidth.unit);
    if (!(rollLength > 0)) rollLength = preset.length;
    if (!(rollWidth > 0)) rollWidth = preset.width;

    var width = toM(opts.width && opts.width.value, opts.width && opts.width.unit);
    var height = toM(opts.height && opts.height.value, opts.height && opts.height.unit);
    if (!(width > 0)) return { ok: false, reason: "bad-width" };
    if (!(height > 0)) return { ok: false, reason: "bad-height" };

    var match = MATCHES[opts.match] ? opts.match : "straight";
    var repeat = toM(opts.repeat && opts.repeat.value, opts.repeat && opts.repeat.unit);
    if (!(repeat > 0)) { repeat = 0; if (match !== "free") match = "free"; }

    var trim = toM(opts.trim && opts.trim.value, opts.trim && opts.trim.unit);
    if (!(trim >= 0)) trim = 0.10; // 100 mm, 50 mm each end

    var spare = num(opts.spare);
    if (!(spare >= 0)) spare = 10;

    if (height + trim > rollLength) return { ok: false, reason: "too-tall" };

    var cut = cutLength(height, trim, repeat, match);

    // For an offset (half-drop) match the pattern steps down half a repeat on
    // alternate drops, so you lose up to half a repeat more off each of those
    // drops and can't reliably reuse it. Costing each drop as half a repeat
    // longer spreads that loss across the wall, which is the safe way to order.
    var offsetWaste = (match === "offset" && repeat > 0) ? repeat / 2 : 0;
    var packCut = cut + offsetWaste;

    var dropsPerRoll = Math.floor((rollLength + 1e-9) / packCut);
    if (dropsPerRoll < 1) return { ok: false, reason: "too-tall" };

    var rawDrops = Math.ceil((width - 1e-9) / rollWidth);

    // Full-height openings (a door or patio door) have no wall above them to
    // paper, so the whole strips that fall entirely inside the opening are
    // drops you don't hang at all. A window has wall above and below it, so you
    // still hang the full drop and cut the hole out (and the offcut is reused),
    // which is why only full-height openings reduce the count. The part-covered
    // strips at each edge of the opening are still full drops, so only the
    // whole roll-widths inside the opening come off.
    var dropsSaved = 0;
    (opts.openings || []).forEach(function (o) {
      if (!o || !o.fullHeight) return;
      var w = toM(o.width && o.width.value, o.width && o.width.unit);
      if (!(w > 0)) return;
      var whole = Math.floor((w + 1e-9) / rollWidth);
      if (whole > 0) dropsSaved += whole;
    });
    var dropsNeeded = Math.max(1, rawDrops - dropsSaved);

    var rollsBare = Math.ceil(dropsNeeded / dropsPerRoll);

    // A spare margin, kept as extra drops so a damaged strip or a later repair
    // can be matched from the same batch. Always at least the bare rolls.
    var spareDrops = Math.ceil(dropsNeeded * (spare / 100));
    var rolls = Math.max(rollsBare, Math.ceil((dropsNeeded + spareDrops) / dropsPerRoll));

    var dropsFromRolls = rolls * dropsPerRoll;
    var leftoverDrops = dropsFromRolls - dropsNeeded;

    var usedLength = dropsNeeded * cut;
    var boughtLength = rolls * rollLength;
    var wasteLength = boughtLength - usedLength;
    var wastePercent = boughtLength > 0 ? Math.round((wasteLength / boughtLength) * 100) : 0;

    // After the full drops are cut, what's left on each roll. If that offcut is
    // long enough for a short drop, it's where the bits over doors and windows
    // come from, which is why a plain room ignores openings.
    var tailPerRoll = rollLength - dropsPerRoll * packCut;

    var out = {
      ok: true,
      rollKey: rollKey,
      rollLabel: rollKey === "custom" ? "Custom roll" : preset.label,
      rollLength: round2(rollLength),
      rollWidth: round2(rollWidth),
      match: match,
      matchLabel: MATCHES[match].label,
      repeat: round2(repeat),
      trim: round2(trim),
      spare: spare,
      width: round2(width),
      height: round2(height),
      cut: round2(cut),
      offsetWaste: round2(offsetWaste),
      dropsPerRoll: dropsPerRoll,
      rawDrops: rawDrops,
      dropsSaved: dropsSaved,
      dropsNeeded: dropsNeeded,
      rollsBare: rollsBare,
      rolls: rolls,
      spareDrops: spareDrops,
      leftoverDrops: leftoverDrops,
      usedLength: round1(usedLength),
      boughtLength: round1(boughtLength),
      wasteLength: round1(wasteLength),
      wastePercent: wastePercent,
      tailPerRoll: round2(tailPerRoll)
    };

    var price = num(opts.pricePerRoll);
    out.cost = isFinite(price) && price > 0 ? round2(rolls * price) : null;

    out.advice = advise(out);
    return out;
  }

  function advise(r) {
    var tips = [];
    tips.push("Buy " + r.rolls + " roll" + (r.rolls === 1 ? "" : "s") + ". The walls need " + r.dropsNeeded +
      " drop" + (r.dropsNeeded === 1 ? "" : "s") + " and each roll gives you " + r.dropsPerRoll + ".");

    if (r.match === "free") {
      tips.push("Plain or free-match paper: each drop is just the height plus trim, so there's little waste and no lining-up to do.");
    } else if (r.match === "straight") {
      tips.push("Straight match: the pattern meets at the same height across the join, so each drop is cut up to one " +
        r.repeat + " m repeat longer than the wall to keep the pattern lined up.");
    } else {
      tips.push("Offset (half-drop) match: the pattern steps down half a repeat on every other drop, so it lines up on the diagonal and wastes about " +
        r.offsetWaste + " m more per alternate drop. That's why it needs more paper.");
    }

    if (r.leftoverDrops > 0) {
      tips.push("That leaves about " + r.leftoverDrops + " spare drop" + (r.leftoverDrops === 1 ? "" : "s") +
        " (roughly a " + r.spare + "% margin) to cover a mis-cut or a later repair. Keep a note of the batch number.");
    }

    if (r.dropsSaved > 0) {
      tips.push("Full-height doors take " + r.dropsSaved + " whole drop" + (r.dropsSaved === 1 ? "" : "s") +
        " off the count (" + r.rawDrops + " down to " + r.dropsNeeded + "), since there's no wall above a door to paper. The part-covered strips at each edge are still full drops.");
    }

    if (r.tailPerRoll >= r.height * 0.5) {
      tips.push("The offcut left on each roll is about " + r.tailPerRoll + " m, long enough for the short drops over a window, so a normal room doesn't deduct for windows.");
    } else {
      tips.push("Short bits over windows usually come from the offcuts; only deduct a drop for a very wide opening.");
    }

    tips.push("Planning figures. Check the roll length, width, pattern repeat and match on the paper's own label, and buy every roll from the same batch so the colour matches.");
    return tips;
  }

  // The whole input goes in the URL fragment, which a browser never sends to a
  // server, so a shared link reopens on the same room without anything leaving
  // the device.
  function pack(state) {
    var json = JSON.stringify(state);
    var b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf8").toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function unpack(text) {
    try {
      var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");
      var o = JSON.parse(json);
      return o && typeof o === "object" ? o : null;
    } catch (e) { return null; }
  }

  return {
    IN: IN, FT: FT, ROLLS: ROLLS, MATCHES: MATCHES,
    toM: toM, round1: round1, round2: round2, ceilTo: ceilTo,
    cutLength: cutLength, plan: plan, advise: advise, pack: pack, unpack: unpack
  };
});
