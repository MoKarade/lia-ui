/**
 * Les 28 profils d'humeur que la maquette V9 ajoute aux 12 du moteur (`Object.assign(HUMEURS, …)` de `reseau.js`) :
 * les 40 humeurs du réseau en ont chacune un. Recopiés tels quels de la maquette validée.
 */

/** Le corps d'une humeur : vitesse, amplitude, flou, gain, énergie, teinte, affaissement, tremblement, tics. */
export interface ProfilHumeur {
  bs: number;
  ba: number;
  blr: number;
  ga: number;
  en: number;
  tint: number;
  sag: number;
  jit: number;
  tc?: [number, number, number];
  wigI?: number;
  hopI?: number;
  hopV?: number;
  yawnI?: number;
  shivI?: number;
}

export const PROFILS_V9: Readonly<Record<string, ProfilHumeur>> = {
 confiant:{bs:.85,ba:1,blr:.8,ga:.9,en:1,tint:.08,sag:0,jit:.5,tc:[170,215,200]},
 reconnaissant:{bs:.8,ba:.9,blr:.9,ga:.7,en:1,tint:.12,sag:.01,jit:.5,tc:[255,205,160]},
 amuse:{bs:1.15,ba:1,blr:1.2,ga:1.3,en:1.1,tint:.15,sag:0,jit:1.3,tc:[255,190,140],wigI:9,hopI:20,hopV:2},
 dubitatif:{bs:.95,ba:.6,blr:1,ga:1.2,en:.85,tint:.05,sag:.01,jit:1,tc:[190,185,225],wigI:20},
 impatient:{bs:1.35,ba:.8,blr:.6,ga:1.2,en:1.1,tint:.12,sag:0,jit:1.8,tc:[255,175,120],hopI:25,hopV:2},
 compatissant:{bs:.75,ba:.9,blr:1,ga:.7,en:.9,tint:.12,sag:.02,jit:.4,tc:[255,185,205]},
 euphorique:{bs:1.4,ba:1.4,blr:.4,ga:1.6,en:1.4,tint:.25,sag:-.04,jit:1.6,tc:[255,220,140],hopI:7,hopV:4},
 paisible:{bs:.7,ba:.8,blr:1,ga:.5,en:.85,tint:-.08,sag:.01,jit:.3,tc:[160,215,205],yawnI:70},
 pensif:{bs:.75,ba:.85,blr:1.3,ga:.5,en:.8,tint:-.1,sag:.01,jit:.6,tc:[185,175,235]},
 empresse:{bs:1.35,ba:1.2,blr:.5,ga:1.5,en:1.2,tint:.15,sag:-.03,jit:1.2,tc:[255,185,120]},
 solidaire:{bs:.95,ba:1.1,blr:.7,ga:.9,en:1.1,tint:.1,sag:0,jit:.5,tc:[200,190,255]},
 optimiste:{bs:1,ba:1.1,blr:.7,ga:1,en:1.15,tint:.12,sag:-.01,jit:.8,tc:[190,225,255],hopI:40,hopV:2},
 serein:{bs:.75,ba:.75,blr:.8,ga:.7,en:.85,tint:-.05,sag:0,jit:.4,tc:[150,215,200],yawnI:90},
 attentif:{bs:1,ba:.8,blr:.6,ga:1.3,en:1,tint:.05,sag:0,jit:.8},
 vigilant:{bs:1.3,ba:.6,blr:.5,ga:1.8,en:1,tint:.1,sag:-.01,jit:1.1,tc:[255,215,150]},
 protecteur:{bs:1,ba:1.1,blr:.6,ga:1,en:1.2,tint:.15,sag:-.03,jit:.6,tc:[255,190,120]},
 mefiant:{bs:1.1,ba:.6,blr:.8,ga:1.4,en:.9,tint:.05,sag:.01,jit:1.3,tc:[190,170,230],shivI:30},
 boudeur:{bs:.8,ba:.6,blr:1.3,ga:.3,en:.6,tint:-.1,sag:.03,jit:.5,tc:[200,150,200]},
 nostalgique:{bs:.7,ba:.8,blr:1.1,ga:.6,en:.7,tint:-.15,sag:.02,jit:.5,tc:[220,185,150],yawnI:80},
 reveur:{bs:.7,ba:.9,blr:1.5,ga:.5,en:.85,tint:-.05,sag:0,jit:.8,tc:[190,170,255],wigI:25},
 ennuye:{bs:.75,ba:.5,blr:1.4,ga:.8,en:.65,tint:-.15,sag:.02,jit:.6,yawnI:28},
 taquin:{bs:1.2,ba:1,blr:1.1,ga:1.5,en:1.15,tint:.18,sag:0,jit:1.5,tc:[255,170,120],wigI:7,hopI:16,hopV:2.5},
 soulage:{bs:.85,ba:1.1,blr:.9,ga:.8,en:.95,tint:.1,sag:.03,jit:.5,tc:[160,230,190],yawnI:40},
 emerveille:{bs:1.2,ba:1.3,blr:.5,ga:1.5,en:1.35,tint:.25,sag:-.02,jit:1.3,tc:[180,230,255],hopI:12,hopV:3.5},
 gene:{bs:1.3,ba:.6,blr:1.7,ga:.4,en:.8,tint:.15,sag:.02,jit:1.5,tc:[255,150,160],wigI:10},
 determine:{bs:1.1,ba:1.3,blr:.4,ga:1,en:1.2,tint:.05,sag:-.05,jit:.3,tc:[255,180,110]},
 agace:{bs:1.4,ba:.8,blr:1,ga:1.1,en:1.1,tint:.2,sag:0,jit:2.2,tc:[255,130,110],shivI:12},
 tendre:{bs:.8,ba:.9,blr:1,ga:.7,en:1,tint:.12,sag:0,jit:.5,tc:[255,185,205]}
};
