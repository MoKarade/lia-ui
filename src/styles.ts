/**
 * Styles de LIA. Les couleurs sont des variables `--lia-*` avec des valeurs par défaut sombres
 * (palette du hub) ; l'hôte les surcharge sur `.lia-ui` s'il le faut. Cibles ≥ 44 px, champs à 16 px.
 */
export const CSS = `
.lia-ui{--lia-bg:#0B0D12;--lia-surface:#12151C;--lia-glass:rgba(18,21,28,.94);--lia-surface-2:#181C25;--lia-border:rgba(255,255,255,.12);--lia-text:#E9EDF5;--lia-soft:#A7AEBD;--lia-accent:#93A0FF;--lia-danger:#E5675B;--lia-h-curieux:#93A0FF;--lia-h-calme:#5CC8B6;--lia-h-joyeux:#E3A23B;--lia-h-concentre:#9B7BE0;--lia-h-espiegle:#E5809F;--lia-h-fatigue:#8A8F98;
position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:inherit;color:var(--lia-text)}
.lia-ui--conteneur{position:absolute;z-index:5}
.lia-ui *{box-sizing:border-box}
.lia-ui__corps{position:absolute;left:0;top:0;width:0;height:0;will-change:transform}
.lia-ui__toile{position:absolute;pointer-events:none;transform:translate(-50%,-50%)}
.lia-ui__hit{position:absolute;transform:translate(-50%,-50%);border-radius:50%;border:0;background:transparent;padding:0;margin:0;cursor:grab;pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent}
.lia-ui__hit:active{cursor:grabbing}
.lia-ui__hit:focus-visible{outline:2px solid var(--lia-accent);outline-offset:2px}
.lia-ui__bulle,.lia-ui__chat,.lia-ui__menu{position:absolute;pointer-events:auto;background:var(--lia-glass);border:1px solid var(--lia-border);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.45);backdrop-filter:blur(14px)}
.lia-ui__bulle{max-width:min(320px,calc(100% - 16px));padding:.6rem .85rem;font-size:.95rem;line-height:1.35}
.lia-ui__bulle[hidden],.lia-ui__chat[hidden],.lia-ui__menu[hidden]{display:none}
.lia-ui__puces{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem}
.lia-ui__puce{min-height:44px;padding:0 .9rem;border-radius:22px;border:1px solid var(--lia-border);background:var(--lia-surface-2);color:var(--lia-text);font:inherit;font-size:.9rem;cursor:pointer}
.lia-ui__puce:hover{border-color:var(--lia-accent)}
.lia-ui__puce:focus-visible,.lia-ui__btn:focus-visible,.lia-ui__item:focus-visible,.lia-ui__champ:focus-visible{outline:2px solid var(--lia-accent);outline-offset:2px}
.lia-ui__chat{width:min(360px,calc(100% - 16px));display:flex;flex-direction:column;max-height:min(520px,calc(100% - 16px))}
.lia-ui__entete{display:flex;align-items:center;justify-content:space-between;padding:.4rem .5rem .4rem 1rem;border-bottom:1px solid var(--lia-border)}
.lia-ui__titre{font-weight:600;letter-spacing:-.01em}
.lia-ui__btn{width:44px;height:44px;border-radius:50%;border:1px solid var(--lia-border);background:transparent;color:var(--lia-text);display:grid;place-items:center;cursor:pointer;font:inherit;padding:0}
.lia-ui__btn--accent{background:var(--lia-accent);border-color:var(--lia-accent);color:#0B0D12}
.lia-ui__btn[disabled]{opacity:.5;cursor:default}
.lia-ui__journal{overflow-y:auto;padding:.8rem 1rem;display:flex;flex-direction:column;gap:.6rem;min-height:120px}
.lia-ui__msg{max-width:88%;padding:.55rem .8rem;border-radius:16px;font-size:.95rem;line-height:1.38;overflow-wrap:anywhere;white-space:pre-wrap}
.lia-ui__msg--lia{align-self:flex-start;background:var(--lia-surface-2);border:1px solid var(--lia-border)}
.lia-ui__msg--moi{align-self:flex-end;background:#262B4A;border:1px solid rgba(147,160,255,.5)}
.lia-ui__msg--erreur{border-color:rgba(229,103,91,.6)}
.lia-ui__points{display:inline-flex;gap:5px;padding:.2rem 0}
.lia-ui__points i{width:7px;height:7px;border-radius:50%;background:var(--lia-soft);animation:lia-ui-saut 1s infinite ease-in-out}
.lia-ui__points i:nth-child(2){animation-delay:.15s}.lia-ui__points i:nth-child(3){animation-delay:.3s}
@keyframes lia-ui-saut{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}
.lia-ui__form{display:flex;gap:.5rem;padding:.6rem;border-top:1px solid var(--lia-border)}
.lia-ui__champ{flex:1;min-width:0;min-height:44px;border-radius:22px;border:1px solid var(--lia-border);background:var(--lia-bg);color:var(--lia-text);padding:0 1rem;font:inherit;font-size:16px}
.lia-ui__menu{min-width:240px;padding:.4rem;display:flex;flex-direction:column}
.lia-ui__item{min-height:44px;display:flex;align-items:center;gap:.6rem;padding:0 .8rem;border:0;border-radius:12px;background:transparent;color:var(--lia-text);font:inherit;font-size:.95rem;text-align:left;cursor:pointer}
.lia-ui__item:hover{background:var(--lia-surface-2)}
.lia-ui__item[aria-checked=true]::after{content:"";margin-left:auto;width:.55rem;height:.55rem;border-radius:50%;background:var(--lia-accent)}
.lia-ui__etat-humeur{position:absolute;left:0;top:0;transform:translateX(-50%);display:flex;align-items:center;gap:.4rem;padding:.25rem .7rem;border-radius:999px;border:1px solid color-mix(in srgb,var(--lia-point,var(--lia-accent)) 55%,var(--lia-border));background:var(--lia-glass);color:color-mix(in srgb,var(--lia-point,var(--lia-accent)) 70%,var(--lia-text));font-size:.8rem;line-height:1.2;white-space:nowrap;pointer-events:none;transition:border-color 1.2s ease,color 1.2s ease}
.lia-ui__etat-humeur[hidden]{display:none}
.lia-ui__etat-humeur i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--lia-point,var(--lia-accent))}
.lia-ui__sep{height:1px;background:var(--lia-border);margin:.3rem .4rem}
.lia-ui__menu-titre{margin:0;padding:.5rem .8rem .4rem;font-size:.85rem;line-height:1.3;color:var(--lia-soft);overflow-wrap:anywhere;max-width:min(320px,100%)}
.lia-ui__menu:not(.lia-ui__menu--element){min-width:264px}
.lia-ui__rangee{display:grid;gap:4px;padding:.2rem .1rem}
.lia-ui__rangee--humeurs{grid-template-columns:repeat(3,1fr)}
.lia-ui__rangee--gestes{grid-template-columns:repeat(4,1fr)}
.lia-ui__actions{max-height:min(44vh,340px);overflow-y:auto;padding:.1rem .1rem .3rem;display:flex;flex-direction:column;gap:.2rem}
.lia-ui__actions[hidden]{display:none}
.lia-ui__famille-titre{margin:0;padding:.35rem .6rem .1rem;font-size:.72rem;color:var(--lia-soft)}
.lia-ui__rangee--actions{grid-template-columns:repeat(2,1fr)}
.lia-ui__action{padding:0 .5rem;font-size:.82rem;line-height:1.15}
.lia-ui__item[aria-expanded]::after{content:"";margin-left:auto;width:.45rem;height:.45rem;border-right:2px solid var(--lia-soft);border-bottom:2px solid var(--lia-soft);transform:rotate(45deg) translateY(-2px)}
.lia-ui__item[aria-expanded=true]::after{transform:rotate(-135deg)}
.lia-ui__humeur{justify-content:flex-start;gap:.4rem;padding:0 .5rem;font-size:.82rem;border:1px solid transparent}
.lia-ui__humeur::before{content:"";flex:none;width:9px;height:9px;border-radius:50%;background:var(--lia-point,var(--lia-soft))}
.lia-ui__humeur[aria-checked=true]{border-color:var(--lia-point,var(--lia-accent));background:var(--lia-surface-2)}
.lia-ui__geste{justify-content:center;padding:0;color:var(--lia-soft)}
.lia-ui__geste:hover,.lia-ui__geste:focus-visible{color:var(--lia-text)}
.lia-ui__repere{position:absolute;pointer-events:none;border:2px solid var(--lia-accent);border-radius:12px;box-shadow:0 0 0 4px rgba(147,160,255,.18)}
.lia-ui__repere[hidden]{display:none}
@media (prefers-reduced-motion:reduce){.lia-ui__points i{animation:none}}
`;
