import { Resvg } from '@resvg/resvg-js'; import fs from 'node:fs';
const [chiq, ...f] = process.argv.slice(2); const W=390,H=844;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${(W+8)*f.length}" height="${H}">`+f.map((x,i)=>`<image x="${i*(W+8)}" y="0" width="${W}" height="${H}" href="data:image/png;base64,${fs.readFileSync(x).toString('base64')}"/>`).join('')+'</svg>';
fs.writeFileSync(chiq, new Resvg(svg).render().asPng());
