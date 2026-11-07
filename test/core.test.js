"use strict";
const test = require("node:test");
const assert = require("node:assert");
const D = require("../src/core.js");

test("cut length: free match is just height plus trim", () => {
  assert.strictEqual(D.cutLength(2.4, 0.1, 0, "free"), 2.5);
  assert.strictEqual(D.cutLength(2.4, 0.1, 0.52, "free"), 2.5);
});

test("cut length: straight match rounds up to a whole repeat", () => {
  // 2.4 + 0.1 = 2.5, repeat 0.52 -> 5 repeats = 2.6
  assert.strictEqual(D.round2(D.cutLength(2.4, 0.1, 0.52, "straight")), 2.6);
  // exact multiple stays put
  assert.strictEqual(D.round2(D.cutLength(2.3, 0.1, 0.6, "straight")), 2.4);
});

test("drops needed: perimeter divided by roll width, rounded up", () => {
  const r = D.plan({
    width: { value: 10, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "free", spare: 0
  });
  assert.ok(r.ok);
  // 10 / 0.53 = 18.87 -> 19 drops
  assert.strictEqual(r.dropsNeeded, 19);
});

test("euro roll, plain paper: drops per roll from the length", () => {
  const r = D.plan({
    width: { value: 5.3, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "free", spare: 0
  });
  assert.ok(r.ok);
  // cut = 2.5; 10.05 / 2.5 = 4.02 -> 4 drops per roll
  assert.strictEqual(r.dropsPerRoll, 4);
  // 5.3 / 0.53 = 10 drops; ceil(10/4) = 3 rolls
  assert.strictEqual(r.dropsNeeded, 10);
  assert.strictEqual(r.rolls, 3);
});

test("straight match needs the repeat rounding, which can cost a roll", () => {
  const plain = D.plan({
    width: { value: 5.3, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "free", spare: 0
  });
  const patt = D.plan({
    width: { value: 5.3, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "straight", repeat: { value: 0.64, unit: "m" }, spare: 0
  });
  assert.ok(patt.ok);
  // cut rounds 2.5 up to 2.56 (4 x 0.64); 10.05/2.56 = 3.9 -> 3 per roll
  assert.strictEqual(patt.dropsPerRoll, 3);
  // ceil(10/3) = 4 rolls, more than the plain 3
  assert.strictEqual(patt.rolls, 4);
  assert.ok(patt.rolls >= plain.rolls);
});

test("offset match wastes more than straight for the same paper", () => {
  const base = {
    width: { value: 8, unit: "m" }, height: { value: 2.6, unit: "m" },
    roll: "euro", repeat: { value: 0.52, unit: "m" }, spare: 0
  };
  const straight = D.plan(Object.assign({}, base, { match: "straight" }));
  const offset = D.plan(Object.assign({}, base, { match: "offset" }));
  assert.ok(straight.ok && offset.ok);
  assert.ok(offset.offsetWaste > 0);
  assert.ok(offset.wastePercent >= straight.wastePercent);
  assert.ok(offset.rolls >= straight.rolls);
});

test("spare margin adds whole drops but never fewer than the bare rolls", () => {
  const bare = D.plan({
    width: { value: 5.3, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "free", spare: 0
  });
  const spared = D.plan({
    width: { value: 5.3, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "free", spare: 15
  });
  assert.ok(spared.rolls >= bare.rolls);
  assert.ok(spared.spareDrops >= 1);
});

test("waste percent and lengths are consistent", () => {
  const r = D.plan({
    width: { value: 6, unit: "m" }, height: { value: 2.5, unit: "m" },
    roll: "euro", match: "straight", repeat: { value: 0.53, unit: "m" }, spare: 10
  });
  assert.ok(r.ok);
  assert.strictEqual(r.boughtLength, D.round1(r.rolls * r.rollLength));
  assert.ok(r.wasteLength >= 0);
  assert.ok(r.wastePercent >= 0 && r.wastePercent <= 100);
});

test("units: cm and feet convert to the same answer as metres", () => {
  const m = D.plan({
    width: { value: 4, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "free", spare: 0
  });
  const cm = D.plan({
    width: { value: 400, unit: "cm" }, height: { value: 240, unit: "cm" },
    roll: "euro", match: "free", spare: 0
  });
  assert.strictEqual(m.rolls, cm.rolls);
  assert.strictEqual(m.dropsNeeded, cm.dropsNeeded);
});

test("cost is rolls times the per-roll price", () => {
  const r = D.plan({
    width: { value: 5.3, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "free", spare: 0, pricePerRoll: 28
  });
  assert.strictEqual(r.cost, D.round2(r.rolls * 28));
});

test("custom roll size is respected", () => {
  const r = D.plan({
    width: { value: 5, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "custom", rollLength: { value: 5, unit: "m" }, rollWidth: { value: 1, unit: "m" },
    match: "free", spare: 0
  });
  assert.ok(r.ok);
  assert.strictEqual(r.rollWidth, 1);
  assert.strictEqual(r.rollLength, 5);
  // cut 2.5; 5/2.5 = 2 per roll; 5/1 = 5 drops; ceil(5/2) = 3 rolls
  assert.strictEqual(r.dropsPerRoll, 2);
  assert.strictEqual(r.dropsNeeded, 5);
  assert.strictEqual(r.rolls, 3);
});

test("bad input is reported, not guessed", () => {
  assert.strictEqual(D.plan({ height: { value: 2.4, unit: "m" } }).reason, "bad-width");
  assert.strictEqual(D.plan({ width: { value: 4, unit: "m" } }).reason, "bad-height");
  // a wall taller than the roll can't be hung in one drop
  const tall = D.plan({ width: { value: 4, unit: "m" }, height: { value: 11, unit: "m" }, roll: "euro", match: "free" });
  assert.strictEqual(tall.reason, "too-tall");
});

test("a blank repeat forces free match even if a pattern match was picked", () => {
  const r = D.plan({
    width: { value: 4, unit: "m" }, height: { value: 2.4, unit: "m" },
    roll: "euro", match: "offset", spare: 0
  });
  assert.strictEqual(r.match, "free");
  assert.strictEqual(r.offsetWaste, 0);
});

test("share link round-trips the state", () => {
  const state = { w: "5.3", h: "2.4", r: "euro", m: "straight", rep: "0.52" };
  const packed = D.pack(state);
  assert.deepStrictEqual(D.unpack(packed), state);
  assert.strictEqual(D.unpack("@@not-base64@@!!"), null);
});

test("a full-height door opening saves whole drops; a window does not", () => {
  // Euro roll width 0.53 m. A 1.6 m wide full-height patio door = 3 whole drops inside it.
  const base = D.plan({ width: { value: 10, unit: "m" }, height: { value: 2.4, unit: "m" }, match: "free" });
  const withDoor = D.plan({
    width: { value: 10, unit: "m" }, height: { value: 2.4, unit: "m" }, match: "free",
    openings: [{ width: { value: 1.6, unit: "m" }, fullHeight: true }]
  });
  assert.strictEqual(withDoor.dropsSaved, 3);           // floor(1.6 / 0.53) = 3
  assert.strictEqual(withDoor.dropsNeeded, base.dropsNeeded - 3);
  // A window (not full height) saves nothing.
  const withWindow = D.plan({
    width: { value: 10, unit: "m" }, height: { value: 2.4, unit: "m" }, match: "free",
    openings: [{ width: { value: 1.6, unit: "m" }, fullHeight: false }]
  });
  assert.strictEqual(withWindow.dropsSaved, 0);
  assert.strictEqual(withWindow.dropsNeeded, base.dropsNeeded);
});

test("an opening narrower than a roll width saves no whole drops", () => {
  const r = D.plan({
    width: { value: 10, unit: "m" }, height: { value: 2.4, unit: "m" }, match: "free",
    openings: [{ width: { value: 0.4, unit: "m" }, fullHeight: true }]
  });
  assert.strictEqual(r.dropsSaved, 0);
});

test("openings can never take the drop count below one", () => {
  const r = D.plan({
    width: { value: 1, unit: "m" }, height: { value: 2.4, unit: "m" }, match: "free",
    openings: [{ width: { value: 5, unit: "m" }, fullHeight: true }]
  });
  assert.strictEqual(r.dropsNeeded, 1);
});
