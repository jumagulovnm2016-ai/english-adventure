// Значки над персонажами и мелкие эффекты: пузыри «!» и «?», сердечки, звёздочки, пыль, круги на воде.
import { art, rgrad, vgrad, ST, ST2, INK, type Art } from './svg';

/** Пузырь-реплика с хвостиком вниз и знаком внутри. 12×14 единиц мира. */
function bubble(fill: string, sign: string, signColor: string): Art {
  return art(12, 14, `<path d="M8 6 H40 Q46 6 46 12 V34 Q46 40 40 40 H30 L24 50 L20 40 H8 Q2 40 2 34 V12 Q2 6 8 6Z" fill="url(#b)" ${ST}/>
    <path d="M9 12 Q9 10 12 10 H20" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <text x="24" y="34" text-anchor="middle" font-family="Nunito, Arial Rounded MT Bold, Verdana, sans-serif" font-weight="900" font-size="28" fill="${signColor}" stroke="${INK}" stroke-width="1.2">${sign}</text>`,
  vgrad('b', fill, 0.3, -0.08));
}

function star(color: string): Art {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 4.6 : 11, a = (Math.PI / 5) * i - Math.PI / 2;
    return `${12 + Math.cos(a) * r},${12 + Math.sin(a) * r}`;
  }).join(' ');
  return art(6, 6, `<polygon points="${pts}" fill="url(#s)" ${ST2}/>`, rgrad('s', color, 0.45, -0.1));
}

export const FX_ART = {
  ui_alert: () => bubble('#ffd23f', '!', '#3d2b24'),
  ui_question: () => bubble('#8fd0ff', '?', '#3d2b24'),
  ui_look: () => bubble('#ffffff', '★', '#ffb300'),
  fx_heart: () => art(6, 6, `<path d="M12 21 Q2 14 3 8 Q4 3 8.5 3 Q11 3 12 6 Q13 3 15.5 3 Q20 3 21 8 Q22 14 12 21Z" fill="url(#h)" ${ST2}/>`, rgrad('h', '#ff5d8f', 0.45, -0.1)),
  fx_star: () => star('#ffd23f'),
  fx_puff: () => art(6, 4, `<g fill="#fff" opacity="0.9"><circle cx="8" cy="10" r="5"/><circle cx="14" cy="8" r="6"/><circle cx="18" cy="11" r="4"/></g>`),
  fx_ring: () => art(12, 5, `<ellipse cx="24" cy="10" rx="21" ry="7.5" fill="none" stroke="#fff" stroke-width="3"/><ellipse cx="24" cy="10" rx="21" ry="7.5" fill="none" stroke="#ffd23f" stroke-width="1.5"/>`),
  fx_ripple: () => art(10, 4, `<ellipse cx="20" cy="8" rx="17" ry="5.5" fill="none" stroke="#fff" stroke-width="2.4" opacity="0.85"/>`),
};
export type FxKey = keyof typeof FX_ART;
