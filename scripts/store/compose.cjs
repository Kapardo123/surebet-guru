const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');
const OUT = path.join(REPO, 'store');
fs.mkdirSync(OUT, { recursive: true });
const b64 = (f) => 'data:image/' + (f.endsWith('.svg') ? 'svg+xml' : f.endsWith('.webp') ? 'webp' : 'png') + ';base64,' + fs.readFileSync(f).toString('base64');
const stadium = b64(path.join(REPO, 'src/assets/textures/stadium-night.webp'));
const felt = b64(path.join(REPO, 'src/assets/textures/felt.webp'));
const mark = b64(path.join(REPO, 'src/assets/brand/mark.svg'));
const FONT = '<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;700&family=Unbounded:wght@800;900&display=swap" rel="stylesheet">';
const css = `
*{box-sizing:border-box}html,body{margin:0}
body{background:#0b0e1f;color:#f6f2e8;font-family:Rubik,sans-serif}
.bg{position:absolute;inset:0;background:url(${felt}) 0 0/320px 320px;opacity:.5;mix-blend-mode:luminosity}
.st{position:absolute;inset:0 0 auto 0;height:62%;background:url(${stadium}) center top/cover;opacity:.75;-webkit-mask:linear-gradient(#000 30%,transparent)}
.glow{position:absolute;border-radius:50%;filter:blur(80px)}
.gold{background:linear-gradient(135deg,#b98a2a,#fff1b8 45%,#c99a33 70%,#f6dc8a);-webkit-background-clip:text;color:transparent}
.h{font-family:Unbounded,sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:-.03em;line-height:.98}
.lbl{font-weight:700;letter-spacing:.22em;text-transform:uppercase}
.phone{position:absolute;border-radius:72px;padding:16px;background:linear-gradient(145deg,#3a3f5c,#0c0e1a 40%,#2a2e45);box-shadow:0 60px 120px -30px rgba(0,0,0,.9),inset 0 0 0 2px rgba(255,255,255,.08)}
.phone img{display:block;width:100%;border-radius:58px}
.notch{position:absolute;top:30px;left:50%;transform:translateX(-50%);width:26px;height:26px;border-radius:50%;background:#05060c;box-shadow:0 0 0 3px #1a1d2e}
`;
const shots = [
  ['1-home', 'Today\'s picks', 'Daily picks,<br><span class="gold">dealt as cards</span>', '#ffd23f'],
  ['3-pack', 'Every morning', 'Tear open<br><span class="gold">a fresh pack</span>', '#ffb347'],
  ['2-cards', 'Common &amp; Gold', 'Collect<br><span class="gold">every pick</span>', '#3fbf74'],
  ['4-analysis', 'The read', 'The reasoning<br><span class="gold">on the back</span>', '#6c8cff'],
  ['6-album', 'Track record', 'Every result,<br><span class="gold">out in the open</span>', '#ffd23f'],
  ['5-premium', 'Go Gold', 'Unlock<br><span class="gold">the Gold cards</span>', '#f2cf6a'],
];
(async () => {
  const b = await chromium.launch();
  const shot = async (html, w, h, file) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html, { waitUntil: 'networkidle' }).catch(() => p.setContent(html));
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, file) });
    await p.close();
    console.log(file);
  };
  for (const [i, [raw, label, title, glow]] of shots.entries()) {
    const img = b64(`${path.join(REPO, 'store/raw')}/${raw}.png`);
    const html = `<!doctype html><html><head>${FONT}<style>${css}</style></head><body>
    <div style="position:relative;width:1080px;height:1920px;overflow:hidden">
      <div class="st"></div><div class="bg"></div>
      <div class="glow" style="width:820px;height:820px;left:130px;top:760px;background:${glow};opacity:.22"></div>
      <div style="position:absolute;top:150px;left:0;right:0;text-align:center">
        <div class="lbl" style="font-size:30px;color:rgba(246,242,232,.65)">${label}</div>
        <div class="h" style="font-size:96px;margin-top:28px">${title}</div>
      </div>
      <div class="phone" style="left:160px;top:640px;width:760px;transform:rotate(${i % 2 ? 2.5 : -2.5}deg)">
        <img src="${img}"><div class="notch"></div>
      </div>
    </div></body></html>`;
    await shot(html, 1080, 1920, `screenshot-${i + 1}.png`);
  }
  // Feature graphic 1024x500
  const a = b64(path.join(REPO, 'store/raw') + '/' + '2-cards.png'), c = b64(path.join(REPO, 'store/raw') + '/' + '3-pack.png');
  await shot(`<!doctype html><html><head>${FONT}<style>${css}</style></head><body>
    <div style="position:relative;width:1024px;height:500px;overflow:hidden">
      <div class="st" style="height:100%"></div><div class="bg"></div>
      <div class="glow" style="width:520px;height:520px;right:-60px;top:-40px;background:#ffd23f;opacity:.16"></div>
      <div style="position:absolute;left:64px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center">
        <img src="${mark}" style="width:116px;height:116px;filter:drop-shadow(0 10px 20px rgba(0,0,0,.5))">
        <div class="h" style="font-size:50px;margin-top:24px">Great Sport<br><span class="gold">Bets</span></div>
        <div class="lbl" style="font-size:17px;margin-top:20px;color:rgba(246,242,232,.7)">Daily picks, dealt as cards</div>
      </div>
      <div class="phone" style="left:600px;top:80px;width:230px;border-radius:34px;padding:8px;transform:rotate(-7deg)"><img src="${c}" style="border-radius:27px"></div>
      <div class="phone" style="left:790px;top:46px;width:230px;border-radius:34px;padding:8px;transform:rotate(6deg)"><img src="${a}" style="border-radius:27px"></div>
    </div></body></html>`, 1024, 500, 'feature-graphic.png');
  await b.close();
})();
