// Sweep, the paperhanger's smoothing brush who helps you order the right amount
// of wallpaper. Sweep offers a tip when tapped, smiles on a clean plain-paper
// job, looks thoughtful on a patterned one, frowns a little when a half-drop is
// eating paper, and flicks a few bubbles out if you tap five times fast.
// Everything Sweep says goes through the bubble's live region, so a screen
// reader hears it too. Moods are driven by the app, never on a timer of its own.
(function () {
  "use strict";
  var btn = document.getElementById("sweep");
  var bubble = document.getElementById("sweep-bubble");
  var dock = document.getElementById("sweep-dock");
  var hide = document.getElementById("sweep-hide");
  if (!btn) { window.Sweep = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var baseMood = "calm", tipKey = "start";
  var bubbleTimer = null, flashTimer = null, taps = [], tipAt = {};

  var TIPS = {
    start: [
      "Hi, I'm Sweep! Tell me the wall size and the paper, and I'll tell you how many rolls to buy.",
      "Wallpaper goes up in strips, called drops. I work out how many drops your walls need and how many you get from a roll.",
      "Measure right round the room for the width, and floor to ceiling for the height."
    ],
    room: [
      "For a whole room, add up all the wall widths, doors and windows included.",
      "The offcuts cover the short bits over doors and windows, so you don't take them off.",
      "Height is floor to ceiling, or to the coving if you have it."
    ],
    roll: [
      "Most UK and EU rolls are 10.05 m long and 53 cm wide. Check yours on the label.",
      "A wider roll means fewer drops across the wall. Pick the size that's printed on the roll.",
      "If your roll is an odd size, choose Custom and type the length and width."
    ],
    pattern: [
      "A plain paper has no repeat, so there's barely any waste.",
      "A straight match lines up at the same height across the join. Each drop loses up to one repeat.",
      "A half-drop steps down half a repeat each strip, lines up on the diagonal, and uses more paper."
    ],
    result: [
      "Buy from one batch so every roll is the same shade. The batch number is on the label.",
      "Keep a spare roll back for a scuff or a repair later; a patch never matches a new batch.",
      "Start the first drop at a plumb line, not the corner, so the pattern stays straight."
    ]
  };

  function setMood(m) { btn.setAttribute("data-mood", m); }

  function say(text, ms) {
    if (dock.classList.contains("tucked")) return;
    bubble.textContent = text;
    bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.textContent = ""; }, ms || 7000);
  }

  function flash(m, ms) {
    setMood(m);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { setMood(baseMood); }, ms || 1500);
  }

  function tip() {
    var list = TIPS[tipKey] || TIPS.start;
    var i = tipAt[tipKey] || 0;
    say(list[i % list.length]);
    tipAt[tipKey] = i + 1;
  }

  function bubbles() {
    if (still.matches) return;
    var rect = btn.getBoundingClientRect();
    for (var i = 0; i < 7; i++) {
      (function (n) {
        var s = document.createElement("span");
        s.className = "bub";
        s.style.left = (rect.left + 24) + "px";
        s.style.top = (rect.top + 10) + "px";
        s.style.setProperty("--dx", (Math.random() * 150 - 75) + "px");
        s.style.setProperty("--dy", (-40 - Math.random() * 90) + "px");
        s.style.animationDelay = (n * 0.05) + "s";
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 1200);
      })(i);
    }
  }

  btn.addEventListener("click", function () {
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t < 900; });
    taps.push(now);
    if (taps.length >= 5) { taps = []; bubbles(); say("Smoothed flat, not a wrinkle! Right, where were we?"); flash("happy"); return; }
    tip();
    flash("think", 900);
  });

  hide.addEventListener("click", function () {
    var tucked = dock.classList.toggle("tucked");
    hide.textContent = tucked ? "" : "tuck away";
    if (!tucked) { say("Back! Tap me any time for a tip."); }
  });

  // Eyes track the pointer a little, so Sweep feels awake. Cheap, eyes only.
  if (!still.matches) {
    document.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var dx = Math.max(-2, Math.min(2, (e.clientX - (r.left + r.width / 2)) / 60));
      var face = btn.querySelector(".sweep-face");
      if (face) face.style.transform = "translateX(" + dx + "px)";
    }, { passive: true });
  }

  // Public hooks the page calls.
  window.Sweep = {
    // Where the user is, so the next tip fits: "room", "roll", "pattern".
    context: function (key) { tipKey = TIPS[key] ? key : "start"; baseMood = "calm"; setMood(baseMood); },
    // React to a result: "plain", "straight", "offset", "bad".
    react: function (kind) {
      tipKey = "result";
      if (kind === "plain") { flash("happy"); say("Nice easy one. Plain paper, barely any waste."); }
      else if (kind === "straight") { flash("think"); say("Straight match: I've added a repeat to each drop so the pattern lines up."); }
      else if (kind === "offset") { flash("warn"); say("Half-drop match eats more paper. I've allowed for the extra, so you won't come up short."); }
      else if (kind === "bad") { flash("think"); say("I couldn't read those. Check the wall size and the roll?"); }
    },
    say: say
  };

  setTimeout(function () { if (!dock.classList.contains("tucked")) say(TIPS.start[0]); }, 900);
})();
