# Dropmatch

How many rolls of wallpaper a room really needs, and why a patterned paper needs more than "width times height" says.

Wallpaper goes up in vertical strips, called drops. On a plain paper a drop is just the wall height plus a little to trim. On a patterned paper every drop has to begin at the same point in the design so the strips line up, so each drop is cut up to a whole pattern repeat longer than the wall is tall, and that extra is waste. Dropmatch works out the drops, the rolls, the waste and a sensible spare, and shows how a straight match and a half-drop differ.

Everything runs in your browser. Nothing you type is uploaded.

**Live:** https://dropmatch.johanthegoat.xyz

## What it does

- **Drops and rolls.** Number of drops is the wall width divided by the roll width, rounded up. Drops per roll is the roll length divided by one drop's cut length, rounded down. Rolls needed is the drops divided by the drops-per-roll, rounded up.
- **Pattern match.** Pick free (plain), straight, or offset / half-drop, and give the repeat. A straight match rounds each drop up to a whole repeat so the pattern meets at the join. A half-drop steps the pattern down half a repeat on every other strip, so it costs about half a repeat more per alternate drop; Dropmatch spreads that loss across the wall so you don't come up short.
- **Waste and spare.** Shows how much of what you buy ends up as offcut, and keeps a spare margin (whole drops) back for a mis-cut or a later repair.
- **Roll sizes.** Defaults to the European standard (10.05 m x 0.53 m), with a wide paste-the-wall roll, an approximate US double roll, and a custom size. Units in metres, centimetres or feet.
- **Share link.** Copies a link that reopens on the same room. The whole input lives in the URL fragment, which the browser never sends to a server.
- **Sweep**, the smoothing brush, offers a tip for wherever you are and reacts to the result.

## The method

Roll size defaults are the Euro roll, 10.05 m long and 0.53 m wide, the UK/EU standard (confirm on your roll's label, since products vary). A drop's cut length is the wall height plus a trim allowance (about 100 mm, split top and bottom); for a patterned paper it rounds up to a whole pattern repeat. Short bits over doors and windows normally come from the offcuts, so a standard room doesn't deduct for openings. Half-drop (offset) papers waste noticeably more than straight-match ones, which is why they need more rolls for the same wall.

These are planning figures. Read the roll length, width, pattern repeat and match type off the paper's own label, and buy every roll from the same batch so the colour matches.

## Sources

- Euro-roll standard 10.05 m x 0.53 m: [Bricoflor](https://www.bricoflor.co.uk/blog/wallpaper-how-to-calculate-how-many-rolls-are-needed), and UK retailer listings (e.g. Dunelm) quoting W 53 cm x L 10.05 m.
- Drops, drops-per-roll and pattern-repeat method, half-drop wasting more: general decorating practice as described by [Fabrics & Papers](https://www.fabricsandpapers.com/blog/how-to-calculate-wallpaper-quantities) and the [B&Q wallpaper calculator](https://www.diy.com/ideas-advice/calculators/wallpaper-calculator).

## Develop

```
npm test
```

The engine in `src/core.js` has no DOM, so it runs under `node --test`. The page is `index.html` with `src/app.js` for the glue and `src/sweep.js` for the mascot. No build step, no dependencies.

## Licence

MIT
