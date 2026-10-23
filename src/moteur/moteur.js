/*
 * Moteur de LIA : 100 traits et points (nanobots) dessinés sur un canvas 2D.
 *
 * Repris tel quel de la maquette validée par Marc le 22/10/2026 (fil Assistant, maquette v5) :
 * le dessin des 38 silhouettes et des 12 humeurs est une chorégraphie réglée à l'œil, on ne la réécrit
 * pas ligne à ligne. Ce fichier n'est donc volontairement PAS typé (JS) ; son contrat typé est
 * `moteur.d.ts`, et rien d'autre du paquet n'y touche en dehors de `lia.ts`.
 * Aucune donnée, aucun réseau, aucun accès au DOM : il ne fait que dessiner sur le contexte reçu.
 * État de module (humeur, regard, souffle) : une seule LIA par page.
 */
const TAU=Math.PI*2;
const h2=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const hsl=(h,s,l)=>{h=((h%360)+360)%360/360;const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1));};return[Math.round(f(0)*255),Math.round(f(8)*255),Math.round(f(4)*255)];};
const mixc=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
const css=(c,a=1)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
const hs=(i,k)=>{const x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)};
const lerp=(a,b,u)=>a+(b-a)*u;
const nz1=(x,k=1)=>{const f=Math.floor(x),u=x-f,v=u*u*(3-2*u);return lerp(hs(f,k),hs(f+1,k),v);};
const ang=x=>((x%TAU)+TAU)%TAU;
const adiff=(a,b)=>Math.abs(((a-b+Math.PI)%TAU+TAU)%TAU-Math.PI);
const sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
const pulse=(x,w)=>Math.exp(-(x/w)*(x/w));
const trail=(hd,a0,len,sg=1)=>{const dl=sg>0?ang(hd-a0):ang(a0-hd);return dl<len?Math.pow(1-dl/len,1.5):0;};
const vhAt=(P,d)=>P.vh[Math.max(0,P.vh.length-1-Math.floor(d))]||0;
const flick=c=>(c.i===((Math.floor(c.t*.5)*37+c.k*11)%c.N)&&((c.t*.5)%1)<.22)?.35:0;
const GRIS=h2('#8a8f98'),BLANC=h2('#E9EDF5');
const C={ind:h2('#93A0FF'),ind2:h2('#C4CBFF'),teal:h2('#2DD4BF'),viol:h2('#A78BFA'),blue:h2('#60A5FA'),blue2:h2('#5b8def'),cyan:h2('#22D3EE'),
 pink:h2('#F472B6'),lime:h2('#A3E635'),orange:h2('#FB923C'),ambre:h2('#e3a23b'),vert:h2('#3fb68b'),rouge:h2('#e5675b')};

/* Les 26 actions : couleur, quand, comment. Les actions « scène » ont leur propre silhouette (voir SC). */
const ACT={},ORDRE=[];
function def(id,label,fam,quand,desc,col,o){ACT[id]={id,label,fam,quand,desc,col,gz:'free',br:[1,1],bl:1,...o};ORDRE.push(id);}
def('repos','Repos','Présence','Il ne fait rien et attend.','Il respire, soupire parfois, jette un coup d\'œil de temps en temps.',[C.ind,C.ind2],
 {gz:'free',e:c=>.05+.07*nz1(c.i*.35+c.t*.35,c.k)});
def('ecoute','Il écoute','Présence','Tu parles ou tu écris.','Un micro reçoit des ondes qui arrivent des deux côtés, le niveau monte et descend.',[C.teal,C.ind2],{sc:1,gz:'user',br:[.6,.45]});
def('reponse','Il répond','Présence','Il te répond.','Chaque syllabe part du bas, comme une bouche, et se propage de chaque côté : les composants de l\'anneau extérieur sortent, ceux de l\'intérieur rentrent, au rythme des mots.',[C.ind,BLANC],
 {gz:'userSoft',e:c=>.05+.55*vhAt(c.P,(adiff(c.a0,Math.PI/2)/Math.PI)*28+(c.k?2:0)),
  d:c=>{const v=vhAt(c.P,(adiff(c.a0,Math.PI/2)/Math.PI)*28+(c.k?2:0));return(c.k?-.16:.2)*v;}});
def('demande','Il demande','Présence','Il a besoin de ton accord avant d\'agir.','Un point d\'interrogation et deux boutons, oui et non, qu\'il survole tour à tour en attendant ton choix.',[C.ambre,C.ambre],{sc:1,gz:'user'});
def('confus','Il ne comprend pas','Présence','Ta demande est floue.','Le point d\'interrogation vacille, des gribouillis flottent autour.',[C.rouge,C.ambre],{sc:1,gz:'aside'});
def('indispo','Indisponible','Présence','Une app ou un service ne répond pas.','Une prise qui tente de se brancher, étincelle, et n\'y arrive pas.',[GRIS,GRIS],{sc:1,gz:'down',br:[.5,1.1],bl:0});
def('reflexion','Il réfléchit','Pensée','Il prépare une réponse.','Une bulle de pensée, trois points qui sautent à tour de rôle.',[C.viol,C.blue],{sc:1,gz:'upleft',br:[1.5,.5]});
def('apprend','Il apprend','Pensée','Il retient une information nouvelle.','Des points entrent dans une ampoule, elle s\'allume d\'un coup.',[C.ambre,C.viol],{sc:1,gz:'upleft'});
def('souvient','Il se souvient','Pensée','Il va chercher dans sa mémoire (MemoryAI).','Une horloge dont les aiguilles reculent, une flèche qui tourne à l\'envers.',[C.viol,C.ind2],{sc:1,gz:'upleft'});
def('consulte','Il consulte tes apps','Recherche','Il appelle une de tes apps (appel réel seulement).','Six cases autour de lui : un rayon part vers l\'une, y va, revient, puis passe à la suivante.',[C.blue,C.teal],{sc:1,gz:'sectors'});
def('cherche','Il cherche','Recherche','Recherche sur le web ou dans des sources.','Une loupe parcourt un champ de points, ils grossissent sous le verre, elle se fixe sur celui qu\'elle trouve.',[C.blue,C.cyan],{sc:1,gz:'scan'});
def('lit','Il lit','Recherche','Il lit un document, un mail, une page.','Une page, des lignes qui se remplissent une à une au passage d\'un surlignage.',[C.teal,C.vert],{sc:1,gz:'read'});
def('surveille','Il surveille','Recherche','Il garde un œil sur tes apps en arrière-plan.','Un radar : un balayage lent, des points qui s\'allument à son passage et s\'estompent.',[C.teal,C.blue],{sc:1,gz:'scan',br:[.8,.6]});
def('ecrit','Il écrit','Création','Il rédige un texte, un mail, une lettre.','Un crayon écrit des lignes de mots qui apparaissent par rafales irrégulières.',[C.viol,C.pink],{sc:1,gz:'typing'});
def('code','Il programme','Création','Il écrit ou lit du code.','Les chevrons « < / > » respirent, la barre oblique s\'écrit, un curseur clignote.',[C.lime,C.teal],{sc:1,gz:'read'});
def('image','Il dessine','Création','Il génère ou retouche une image.','Un pinceau peint un paysage : fond en couleurs changeantes, montagnes, soleil.',t=>[hsl(t*40+300,.75,.68),hsl(t*40+20,.8,.66)],{sc:1,gz:'around'});
def('traduit','Il traduit','Création','Il passe un texte d\'une langue à l\'autre.','Un « A » saute en arc d\'une carte à l\'autre et devient « 文 ».',[C.pink,C.blue],{sc:1,gz:'read'});
def('calcule','Il calcule','Calcul','Il analyse des chiffres, une projection.','Un graphique en barres dont les hauteurs changent, la plus haute s\'allume, une courbe les relie.',[C.ambre,C.orange],{sc:1,gz:'upleft'});
def('planifie','Il planifie','Calcul','Il organise ton agenda ou tes tâches.','Un calendrier dont les cases se remplissent une à une, un cadre indique la prochaine.',[C.blue2,C.ind],{sc:1,gz:'sectors'});
def('organise','Il range','Calcul','Il trie des fichiers (DriveAI).','Des carrés éparpillés se rangent par couleur en trois piles, puis se dispersent de nouveau.',[C.blue,C.teal],{sc:1,gz:'read'});
def('synchronise','Il synchronise','Calcul','Il envoie ou reçoit des données.','Deux flèches se poursuivent en cercle : l\'icône universelle de synchro.',[C.blue,C.viol],{sc:1,gz:'scan'});
def('envoie','Il envoie','Calcul','Il envoie un message ou un mail.','Un avion en papier décolle, laisse une traînée et disparaît.',[C.vert,C.teal],{sc:1,gz:'up'});
def('securise','Il sécurise','Alerte','Il vérifie un accès, protège une donnée.','Un cadenas dont l\'anse descend, un balayage le vérifie, une onde de protection part.',[C.vert,C.blue],{sc:1,gz:'scan'});
def('alerte','Il prévient','Alerte','Quelque chose demande ton attention.','Un triangle d\'alerte tremble, des ondes s\'en échappent.',[C.ambre,C.rouge],{sc:1,gz:'user'});
def('reussi','C\'est fait','Alerte','Une tâche est terminée avec succès.','Un cercle se trace, la coche s\'écrit, une gerbe d\'étincelles part.',[C.vert,C.lime],{sc:1,gz:'user'});
def('veille','Il dort','Alerte','Personne depuis longtemps, il se met en veille.','Un croissant de lune, des « z » qui montent et s\'évanouissent.',[C.ind,C.ind2],{sc:1,gz:'down',br:[.4,1],bl:0,dim:.55});

def('salue','Il salue','Émotion','Tu arrives, ou tu reviens après un moment.','Une main s\'agite, deux petites ondes de chaque côté : le bonjour universel.',[C.orange,C.ambre],{sc:1,gz:'user'});
def('content','Il est content','Émotion','Une bonne nouvelle, un objectif atteint.','Une étoile qui bat comme un cœur, des étincelles qui jaillissent et des points qui montent.',[C.ambre,C.lime],{sc:1,gz:'around'});
def('triste','Il est triste','Émotion','Un échec, une mauvaise nouvelle, une longue absence.','Un petit nuage bas, la pluie tombe goutte à goutte, il regarde vers le sol.',[C.blue,C.ind],{sc:1,gz:'down',br:[.7,.8],dim:.8});
def('surpris','Il est surpris','Émotion','Un événement inattendu.','Un point d\'exclamation qui saute, des rayons qui éclatent tout autour.',[C.cyan,C.ind2],{sc:1,gz:'up'});
def('remercie','Il te remercie','Émotion','Tu l\'as aidé, ou un geste sympa.','Un cœur qui bat à deux temps, de petits cœurs qui montent.',[C.pink,C.rouge],{sc:1,gz:'user'});
def('musique','Il fredonne','Émotion','Il est de bonne humeur, rien à faire.','Deux notes rebondissent à tour de rôle, des ondes de son s\'échappent.',[C.viol,C.pink],{sc:1,gz:'around'});
def('reveille','Il se réveille','Présence','Le matin, ou tu reviens après un long silence.','Un soleil se lève sur la ligne d\'horizon, ses rayons s\'ouvrent un à un.',[C.ambre,C.orange],{sc:1,gz:'up',br:[.7,1.1]});
def('concentre','Il se concentre','Travail','Tâche longue ou délicate.','Des cercles se resserrent sur une cible, le point central bat de plus en plus net.',[C.teal,C.cyan],{sc:1,gz:'scan',br:[.6,.4]});
def('attend','Il attend','Travail','Un traitement lent, ou ta réponse.','Un sablier : le sable coule, il se retourne tout seul.',[C.ind,C.blue],{sc:1,gz:'free',br:[.8,.8]});
def('telecharge','Il télécharge','Travail','Il récupère un fichier ou des données.','Une flèche descend dans un bac, une barre de progression se remplit.',[C.blue2,C.teal],{sc:1,gz:'read'});
def('verifie','Il vérifie','Travail','Il contrôle une liste de choses.','Trois cases, chacune cochée à son tour par une coche qui s\'écrit.',[C.vert,C.lime],{sc:1,gz:'read'});
def('appelle','Il t\'appelle','Travail','Il te contacte : message, appel, rappel.','Un téléphone qui vibre, des ondes qui sortent des deux côtés.',[C.vert,C.cyan],{sc:1,gz:'user'});
def('analyse','Il analyse','Travail','Il lit une app ou un bloc en détail.','Quatre coins se posent sur ce qu\'il regarde, une ligne le balaie, les points s\'allument à son passage.',[C.teal,C.cyan],{sc:1,gz:'scan'});
const ST=ORDRE.slice();
const FAMILLES=['Présence','Émotion','Pensée','Recherche','Création','Calcul','Travail','Alerte'];

/* Petits outils de dessin (espace unité : l'icône tient dans -1..1) */
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const eo=u=>{u=cl(u);return 1-Math.pow(1-u,3);};
const L=(c,x1,y1,x2,y2)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
const circ=(c,x,y,r,fill)=>{c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);fill?c.fill():c.stroke();};
const rr=(c,x,y,w,h,r)=>{c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);};
const arrow=(c,x,y,dx,dy,sz=.16)=>{const a=Math.atan2(dy,dx);for(const s of[-1,1]){c.beginPath();c.moveTo(x,y);c.lineTo(x-Math.cos(a+s*.55)*sz,y-Math.sin(a+s*.55)*sz);c.stroke();}};
function poly(c,pts,frac=1,close=false){let tot=0;const sg=[];for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);sg.push(d);tot+=d;}
 let rest=tot*cl(frac);c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
 for(let i=1;i<pts.length&&rest>0;i++){const d=sg[i-1],u=Math.min(1,rest/d);c.lineTo(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*u,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*u);rest-=d;}
 if(close&&frac>=1)c.closePath();c.stroke();}
const Q=(c,s)=>{c.beginPath();c.arc(0,-.42*s,.28*s,Math.PI,Math.PI*2.55);c.lineTo(0,0);c.lineTo(0,.12*s);c.stroke();};
const gA=(c,x,y,s)=>{poly(c,[[x-.17*s,y+.22*s],[x,y-.24*s],[x+.17*s,y+.22*s]]);L(c,x-.09*s,y+.07*s,x+.09*s,y+.07*s);};
const gB=(c,x,y,s)=>{L(c,x,y-.32*s,x,y-.22*s);L(c,x-.3*s,y-.14*s,x+.3*s,y-.14*s);L(c,x-.3*s,y+.3*s,x+.15*s,y-.14*s);L(c,x+.3*s,y+.3*s,x-.15*s,y-.14*s);};
const bz=s=>{const a=(1-s)*(1-s),b=2*s*(1-s),d=s*s;return[a*-.8+b*-.2+d*.85,a*.6+b*-.75+d*-.45];};

/* Une silhouette par action : on doit la reconnaître sans lire. t = temps propre de l'action. */
const SC={};
SC.ecoute=(c,t,K)=>{
 c.strokeStyle=K.A(1);rr(c,-.2,-.62,.4,.7,.2);c.stroke();c.beginPath();c.arc(0,-.1,.38,0,Math.PI);c.stroke();L(c,0,.28,0,.55);
 for(let j=0;j<2;j++){const u=((t*.8+j/2)%1),r=1.0-.45*u,al=Math.sin(Math.PI*u)*.9;c.strokeStyle=K.B(al);
  c.beginPath();c.arc(0,-.2,r,-.5,.5);c.stroke();c.beginPath();c.arc(0,-.2,r,Math.PI-.5,Math.PI+.5);c.stroke();}
};
SC.demande=(c,t,K)=>{
 c.save();c.translate(0,-.15-.04*Math.sin(t*2.2));c.strokeStyle=K.A(1);c.fillStyle=K.A(1);Q(c,1.1);circ(c,0,.34,.06,true);c.restore();
 const hov=Math.floor(t*.9)%2;
 for(let i=0;i<2;i++){c.fillStyle=css(i?C.rouge:C.vert,hov===i?1:.5);circ(c,i?.4:-.4,.7,hov===i?.1:.06,true);}
};
SC.confus=(c,t,K)=>{
 c.save();c.rotate(.3*Math.sin(t*2.2));c.translate(0,.04);c.strokeStyle=K.A(1);c.fillStyle=K.A(1);Q(c,1.2);circ(c,0,.42,.07,true);c.restore();
};
SC.indispo=(c,t,K)=>{
 const q=Math.pow(.5+.5*Math.sin(t*1.5),3),xp=-.7+.56*q;
 c.strokeStyle=K.A(1);rr(c,xp-.22,-.26,.44,.52,.08);c.stroke();L(c,xp+.22,-.12,xp+.42,-.12);L(c,xp+.22,.12,xp+.42,.12);
 rr(c,.38,-.34,.52,.68,.08);c.stroke();
 if(q>.55&&hs(Math.floor(t*14),1)>.35){c.strokeStyle=css(C.rouge,1);poly(c,[[xp+.46,-.1],[xp+.52,.02],[xp+.57,-.04],[.37,.08]]);}
};
SC.reflexion=(c,t,K)=>{
 c.strokeStyle=K.A(1);c.beginPath();c.ellipse(0,-.12,.92+.015*Math.sin(t*1.7),.6+.015*Math.cos(t*1.3),0,0,TAU);c.stroke();
 for(let i=0;i<3;i++){const b=Math.pow(Math.max(0,Math.sin(t*3.4-i*.8)),2);c.fillStyle=i===1?K.B(1):K.A(1);circ(c,(i-1)*.4,-.12-.22*b,.1+.03*b,true);}
};
SC.apprend=(c,t,K)=>{
 const u=(t%4.4)/4.4,lit=sm((u-.5)/.08)*(1-sm((u-.88)/.1)),by=-.15,br=.5;
 c.strokeStyle=K.A(1);c.beginPath();c.arc(0,by,br,Math.PI/2+.42,Math.PI/2-.42+TAU);c.lineTo(.2,.52);c.lineTo(-.2,.52);c.closePath();c.stroke();
 if(lit>.02){c.strokeStyle=K.B(lit);for(let k=0;k<5;k++){const a=-Math.PI*.9+k*(Math.PI*.8/4);L(c,Math.cos(a)*.74,by+Math.sin(a)*.74,Math.cos(a)*(.74+.22*lit),by+Math.sin(a)*(.74+.22*lit));}}
 for(let i=0;i<5;i++){const pr=cl((u/.5)*1.3-i*.12);if(pr>0&&pr<1){const a=i*1.3+.4,r=1.15*(1-eo(pr))+.66*eo(pr);c.fillStyle=K.W(1-Math.pow(pr,3));circ(c,Math.cos(a)*r,by+Math.sin(a)*r*.8,.06,true);}}
};
SC.souvient=(c,t,K)=>{
 c.strokeStyle=K.A(1);circ(c,0,0,.62);
 const rw=-(t*2.6+.5*Math.sin(t*2.6));
 c.strokeStyle=K.B(1);L(c,0,0,Math.cos(rw-Math.PI/2)*.46,Math.sin(rw-Math.PI/2)*.46);
 c.strokeStyle=K.W(.85);L(c,0,0,Math.cos(rw/12-Math.PI/2)*.3,Math.sin(rw/12-Math.PI/2)*.3);
 c.save();c.rotate(-t*.5);c.strokeStyle=K.A(.9);c.beginPath();c.arc(0,0,.88,-.15*Math.PI,-.85*Math.PI,true);c.stroke();
 const e=-.85*Math.PI;arrow(c,Math.cos(e)*.88,Math.sin(e)*.88,Math.sin(e),-Math.cos(e),.2);c.restore();
};
SC.consulte=(c,t,K)=>{
 const sp=1.3,k=Math.floor(t*sp)%6,u=(t*sp)%1;
 for(let i=0;i<6;i++){const a=-Math.PI/2+i*TAU/6,x=Math.cos(a)*.74,y=Math.sin(a)*.74,on=i===k;
  c.fillStyle=on?K.A(1):K.A(.45);circ(c,x,y,on?.13:.07,true);
  if(on){const d=u<.5?u*2:2-u*2;c.strokeStyle=K.B(.6);L(c,0,0,x*.8,y*.8);c.fillStyle=K.W(1);circ(c,x*(.15+.65*d),y*(.15+.65*d),.06,true);}}
 c.fillStyle=K.B(1);circ(c,0,0,.12,true);
};
SC.cherche=(c,t,K)=>{
 const cyc=3.6,n=Math.floor(t/cyc),u=(t%cyc)/cyc,f=(n*7+3)%15,fx=-.7+(f%5)*.35,fy=-.4+Math.floor(f/5)*.4;
 let lx=.45*Math.sin(t*.9),ly=.25*Math.sin(t*1.3+1);const m=sm((u-.55)/.25)*(1-sm((u-.88)/.1));lx+=(fx-lx)*m;ly+=(fy-ly)*m;
 for(let i=0;i<15;i++){const x=-.7+(i%5)*.35,y=-.4+Math.floor(i/5)*.4,d=Math.hypot(x-lx,y-ly),g=1-cl(d/.45),isF=i===f&&m>.5;
  c.fillStyle=isF?K.B(1):K.W(.25+.6*g);circ(c,x,y,.04+.05*g+(isF?.04*(1+Math.sin(t*10)):0),true);}
 c.strokeStyle=K.A(1);circ(c,lx,ly,.34);L(c,lx+.24,ly+.24,lx+.55,ly+.55);
};
SC.lit=(c,t,K)=>{
 const WW=[.95,.85,.95,.6,.9],sp=1.0,cur=Math.floor(t*sp)%7,p=(t*sp)%1;
 for(let i=0;i<5;i++){const y=-.5+i*.25,x0=-.5,w=WW[i]*.95;
  if(i<cur){c.strokeStyle=K.A(.95);L(c,x0,y,x0+w,y);}
  else if(i===cur){c.strokeStyle=K.W(.25);L(c,x0,y,x0+w,y);c.strokeStyle=K.B(1);L(c,x0,y,x0+w*p,y);c.fillStyle=K.B(1);circ(c,x0+w*p,y,.06,true);}
  else{c.strokeStyle=K.W(.25);L(c,x0,y,x0+w,y);}}
};
SC.surveille=(c,t,K)=>{
 c.strokeStyle=K.W(.25);for(const r of[.4,.85])circ(c,0,0,r);
 const a0=t*1.3;
 for(let j=0;j<5;j++){const a=a0-j*.1,al=Math.pow(1-j/5,1.4)*.7;c.strokeStyle=K.A(al);L(c,0,0,Math.cos(a)*.85,Math.sin(a)*.85);}
 for(let i=0;i<4;i++){const a=hs(i,1)*TAU,r=.3+.5*hs(i,2),dl=ang(a0-a),al=Math.max(0,1-dl/TAU*1.3);c.fillStyle=i===2?K.B(al):K.A(al);circ(c,Math.cos(a)*r,Math.sin(a)*r,.07,true);}
};
SC.ecrit=(c,t,K)=>{
 const cap=1.5,pos=(t*.7+.12*Math.sin(t*4.3))%5.6,tot=Math.min(pos,4.5);
 for(let li=0;li<3;li++){const y=-.4+li*.4,done=cl(tot-li*cap,0,cap);let x=-.8,wi=0;
  while(x<-.8+cap-.03){const w=.2+.3*hs(li*9+wi,5),x2=Math.min(x+w,-.8+cap),vis=-.8+done;
   if(x<vis){c.strokeStyle=K.A(.95);L(c,x,y,Math.min(x2,vis),y);}x=x2+.1;wi++;}}
 const li=Math.min(2,Math.floor(tot/cap)),cx=-.8+(tot-li*cap),cy=-.4+li*.4,al=pos<4.5?1:1-sm((pos-4.5)/.5);
 c.save();c.globalAlpha*=al;c.translate(cx,cy+.02*Math.sin(t*20));c.rotate(-.9);c.strokeStyle=K.B(1);L(c,0,0,.6,0);L(c,.12,-.07,.12,.07);c.restore();
};
SC.code=(c,t,K)=>{
 const br=.04*Math.sin(t*1.6);c.strokeStyle=K.A(1);
 poly(c,[[-.28-br,-.5],[-.78-br,0],[-.28-br,.5]]);poly(c,[[.28+br,-.5],[.78+br,0],[.28+br,.5]]);
 const s=.55+.45*sm(.5+.5*Math.sin(t*1.8));c.strokeStyle=K.B(1);L(c,.1*s,-.5*s,-.1*s,.5*s);
};
SC.image=(c,t,K)=>{
 const cyc=6,u=(t%cyc)/cyc,p=cl(u/.78),xe=-.85+1.7*eo(p),al=1-sm((u-.93)/.07);
 c.save();c.globalAlpha*=al;c.strokeStyle=css(hsl(t*40+250,.7,.66),.9);rr(c,-.85,-.62,1.7,1.24,.1);c.stroke();
 if(xe>.3){c.strokeStyle=css(hsl(45,.9,.65),cl((xe-.3)/.3));circ(c,.4,-.25,.17);}
 c.strokeStyle=css(hsl(t*40+120,.7,.7),.95);poly(c,[[-.85,.62],[-.4,0],[-.1,.3],[.25,-.1],[.85,.62]],cl((xe+.85)/1.7));
 c.restore();
};
SC.traduit=(c,t,K)=>{
 const cyc=3.8,u=(t%cyc)/cyc,out=1-sm((u-.9)/.08),v=cl((u-.12)/.5);
 c.strokeStyle=K.A(v>0&&v<1?.35:1);gA(c,-.58,0,1.2);
 if(v>0&&v<1){const x=-.58+1.16*eo(v),y=-.55*Math.sin(Math.PI*v),m=sm((v-.35)/.4);c.strokeStyle=K.A(1-m);gA(c,x,y,1.2);c.strokeStyle=K.B(m);gB(c,x,y,1.2);}
 if(v>=1){c.strokeStyle=K.B(out);gB(c,.58,0,1.2);}
};
SC.calcule=(c,t,K)=>{
 const hh=[];let max=0,mi=0;for(let i=0;i<5;i++){const h=.2+.85*nz1(t*.55+i*5.3,i+2);hh.push(h);if(h>max){max=h;mi=i;}}
 for(let i=0;i<5;i++){const x=-.6+i*.3;c.strokeStyle=i===mi?K.B(1):K.A(.8);L(c,x,.7,x,.7-hh[i]);}
};
SC.planifie=(c,t,K)=>{
 c.strokeStyle=K.A(.95);rr(c,-.85,-.62,1.7,1.5,.1);c.stroke();
 const f=Math.floor(t*2.4)%24;
 for(let i=0;i<15;i++){const x=-.6+(i%5)*.3,y=-.2+Math.floor(i/5)*.34,filled=i<f&&hs(i,4)>.3;
  c.fillStyle=filled?(hs(i,8)>.7?K.B(.95):K.A(.9)):K.W(.3);circ(c,x,y,.06,true);}
};
SC.organise=(c,t,K)=>{
 const u=(t%6)/6;
 for(let i=0;i<9;i++){const g=i%3,k=Math.floor(i/3),m=sm((u-.1-i*.03)/.4)*(1-sm((u-.85+i*.01)/.12));
  const sx=-.8+hs(i,5)*1.6+.03*Math.sin(t*1.3+i),sy=-.7+hs(i,6)*.9+.03*Math.cos(t*1.1+i),tx=(g-1)*.6,ty=.5-k*.22;
  c.fillStyle=g===0?K.A(.9):g===1?K.B(.9):K.W(.8);circ(c,sx+(tx-sx)*m,sy+(ty-sy)*m,.09,true);}
};
SC.synchronise=(c,t,K)=>{
 const rot=t*1.4+.5*Math.sin(t*1.4);
 for(let j=0;j<2;j++){const a1=rot+j*Math.PI+.3,a2=rot+j*Math.PI+Math.PI-.3;c.strokeStyle=j?K.B(1):K.A(1);
  c.beginPath();c.arc(0,0,.62,a1,a2);c.stroke();arrow(c,Math.cos(a2)*.62,Math.sin(a2)*.62,-Math.sin(a2),Math.cos(a2),.22);}
};
SC.envoie=(c,t,K)=>{
 const cyc=2.8,u=(t%cyc)/cyc,s=sm(cl(u/.8)),al=sm(u/.08)*(1-sm((u-.86)/.14));
 c.save();c.globalAlpha*=al;
 for(let j=0;j<24;j+=3){const p=bz(s*j/24),q=bz(s*(j+1.6)/24);c.strokeStyle=K.B(j/24);L(c,p[0],p[1],q[0],q[1]);}
 const p=bz(s),p2=bz(Math.min(1,s+.01)),p1=bz(Math.max(0,s-.01)),a=Math.atan2(p2[1]-p1[1],p2[0]-p1[0]);
 c.translate(p[0],p[1]);c.rotate(a);c.strokeStyle=K.A(1);
 c.beginPath();c.moveTo(.4,0);c.lineTo(-.3,-.26);c.lineTo(-.3,.26);c.closePath();c.stroke();c.restore();
};
SC.securise=(c,t,K)=>{
 const u=(t%5)/5,lf=.3*(1-sm((u-.12)/.12))+.3*sm((u-.88)/.1);
 c.strokeStyle=K.A(1);c.beginPath();c.moveTo(-.27,.02-lf);c.lineTo(-.27,-.3-lf);c.arc(0,-.3-lf,.27,Math.PI,0);c.lineTo(.27,.02-lf);c.stroke();
 rr(c,-.45,.02,.9,.72,.1);c.stroke();
};
SC.alerte=(c,t,K)=>{
 const u=(t%1.3)/1.3,P0=[[0,-.78],[.82,.64],[-.82,.64]];
 c.save();c.rotate(u<.25?.05*Math.sin(u*70):0);const sc=1+.04*Math.sin(t*6);c.scale(sc,sc);
 c.strokeStyle=K.A(1);poly(c,P0.concat([P0[0]]));
 L(c,0,-.3,0,.15);c.fillStyle=K.A(1);circ(c,0,.4,.06,true);c.restore();
};
SC.reussi=(c,t,K)=>{
 const u=(t%3.8)/3.8,al=1-sm((u-.9)/.1);c.save();c.globalAlpha*=al;
 const pop=1+.08*Math.sin(Math.PI*cl((u-.25)/.2));c.scale(pop,pop);
 c.strokeStyle=K.A(1);c.beginPath();c.arc(0,0,.62,-Math.PI/2,-Math.PI/2+TAU*eo(u/.25));c.stroke();
 c.strokeStyle=K.B(1);poly(c,[[-.3,.02],[-.08,.26],[.32,-.2]],cl((u-.2)/.2));
 const p=(u-.4)/.5;
 if(p>0&&p<1){for(let k=0;k<8;k++){const a=k*TAU/8+.1,r1=.85+.4*eo(p),r2=r1+.2*(1-p)+.04;c.strokeStyle=k%2?K.A(1-p):K.B(1-p);L(c,Math.cos(a)*r1,Math.sin(a)*r1,Math.cos(a)*r2,Math.sin(a)*r2);}}
 c.restore();
};
SC.veille=(c,t,K)=>{
 const br=1+.03*Math.sin(t*.9);c.save();c.scale(br,br);c.strokeStyle=K.A(.95);
 const ax=-.1,ay=.05,r1=.55,bx=.2,by=-.15,r2=.46,ph=Math.atan2(by-ay,bx-ax),a1=.9815,a2=1.4523;
 c.beginPath();c.arc(ax,ay,r1,ph+a1,ph-a1+TAU);c.stroke();c.beginPath();c.arc(bx,by,r2,ph+Math.PI-a2,ph+Math.PI+a2);c.stroke();c.restore();
 for(let i=0;i<2;i++){const u=((t*.35-i*.5)%1+1)%1,s=.16+.06*i,x=.35+i*.25+u*.1,y=.15-u*.9;c.strokeStyle=K.B(Math.sin(Math.PI*u)*.9);poly(c,[[x,y],[x+s,y],[x,y+s],[x+s,y+s]]);}
};

SC.salue=(c,t,K)=>{
 const w=.4*Math.sin(t*5.2)*(.7+.3*Math.sin(t*.8));
 c.save();c.translate(0,.78);c.rotate(w);c.strokeStyle=K.A(1);
 rr(c,-.3,-.52,.6,.52,.16);c.stroke();
 for(let i=0;i<4;i++){const x=-.21+i*.14,h=(i===1||i===2)?.5:.4;L(c,x,-.52,x+(i-1.5)*.03,-.52-h);}
 L(c,-.3,-.2,-.58,-.46);L(c,-.14,0,-.14,.2);L(c,.14,0,.14,.2);
 c.restore();
 for(let j=0;j<2;j++){const u=((t*.9+j/2)%1),al=Math.sin(Math.PI*u)*.9,r=.78+.3*u;c.strokeStyle=K.B(al);
  c.beginPath();c.arc(0,.25,r,Math.PI*1.12,Math.PI*1.32);c.stroke();c.beginPath();c.arc(0,.25,r,Math.PI*1.68,Math.PI*1.88);c.stroke();}
};
SC.content=(c,t,K)=>{
 const s=1+.07*Math.sin(t*4.4),pts=[];
 for(let i=0;i<10;i++){const a=i/10*TAU-Math.PI/2+t*.5,r=(i%2?.26:.62)*s;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}
 c.strokeStyle=K.A(1);poly(c,pts.concat([pts[0]]));
 for(let k=0;k<6;k++){const u=((t*.7+k/6)%1),a=k*TAU/6+.4+.3*hs(k,2),r1=.8+.3*u;c.strokeStyle=k%2?K.A(1-u):K.B(1-u);L(c,Math.cos(a)*r1,Math.sin(a)*r1,Math.cos(a)*(r1+.12),Math.sin(a)*(r1+.12));}
 for(let k=0;k<3;k++){const u=((t*.5+k/3)%1);c.fillStyle=K.W(Math.sin(Math.PI*u));circ(c,(hs(k,3)-.5)*1.5,.75-u*1.5,.05,true);}
};
SC.triste=(c,t,K)=>{
 const by=-.35+.02*Math.sin(t*1.1);
 c.strokeStyle=K.A(1);c.beginPath();c.moveTo(-.55,by+.28);c.lineTo(.5,by+.28);c.arc(.5,by+.13,.15,Math.PI/2,-Math.PI/2,true);
 c.arc(.1,by-.08,.32,-.25,-Math.PI+.35,true);c.arc(-.35,by+.08,.2,-2.2,-Math.PI*1.5,true);c.closePath();c.stroke();
 for(let k=0;k<6;k++){const u=((t*.8+hs(k,1)+k*.17)%1),x=-.45+k*.18,y=by+.42+u*.7;c.strokeStyle=k%2?K.B(Math.sin(Math.PI*u)):K.A(Math.sin(Math.PI*u));L(c,x,y,x-.03,y+.14);}
};
SC.surpris=(c,t,K)=>{
 const u=(t%1.8)/1.8,j=Math.pow(Math.max(0,1-u*3),2)*.12;
 c.save();c.translate(0,-j);c.strokeStyle=K.A(1);c.fillStyle=K.A(1);L(c,-.07,-.62,-.02,.1);L(c,.07,-.62,.02,.1);circ(c,0,.4,.08,true);c.restore();
 const p=cl(u/.85);if(p<1)for(let k=0;k<12;k++){const a=k*TAU/12+.13,r1=.62+.3*eo(p),r2=r1+.2*(1-p)+.05;c.strokeStyle=k%2?K.A(1-p*.8):K.B(1-p*.8);L(c,Math.cos(a)*r1,Math.sin(a)*r1*1.05,Math.cos(a)*r2,Math.sin(a)*r2*1.05);}
};
SC.remercie=(c,t,K)=>{
 const ph=(t%1.5)/1.5,b=Math.pow(Math.max(0,Math.sin(ph*TAU)),6)*.12+Math.pow(Math.max(0,Math.sin(ph*TAU-1.2)),6)*.07,pts=[];
 for(let i=0;i<=40;i++){const th=i/40*TAU,x=16*Math.pow(Math.sin(th),3),y=-(13*Math.cos(th)-5*Math.cos(2*th)-2*Math.cos(3*th)-Math.cos(4*th));pts.push([x/19*.72*(1+b),y/19*.72*(1+b)+.05]);}
 c.strokeStyle=K.A(1);poly(c,pts);
 for(let k=0;k<4;k++){const u=((t*.45+k/4)%1);c.fillStyle=k%2?K.B(Math.sin(Math.PI*u)):K.W(Math.sin(Math.PI*u));circ(c,(hs(k,4)-.5)*1.5,.85-u*1.6,.06,true);}
};
SC.musique=(c,t,K)=>{
 const nt=(x,ph,col)=>{const b=Math.abs(Math.sin(t*3+ph))*.14,y=.32-b;c.fillStyle=col;c.strokeStyle=col;circ(c,x,y,.11,true);L(c,x+.1,y,x+.1,y-.62);L(c,x+.1,y-.62,x+.34,y-.4);};
 nt(-.4,0,K.A(1));nt(.2,1.5,K.B(1));
 for(let j=0;j<2;j++){const u=((t*.8+j/2)%1);c.strokeStyle=K.W(Math.sin(Math.PI*u)*.6);c.beginPath();c.arc(-.05,.05,.8+.2*u,-1.1,-.4);c.stroke();}
};
SC.reveille=(c,t,K)=>{
 const tc=t%7,u=Math.min(1,tc/4.5),h=eo(u),cy=.4-.55*h,al=1-sm((tc-6.3)/.7),q=Math.min(1,(.4-cy)/.38);
 c.save();c.globalAlpha*=al;c.strokeStyle=K.A(.7);L(c,-.9,.4,.9,.4);c.strokeStyle=K.A(1);c.beginPath();
 if(q>=1)c.arc(0,cy,.38,0,TAU);else c.arc(0,cy,.38,Math.PI-Math.asin(Math.max(-1,q)),TAU+Math.asin(Math.max(-1,q)));c.stroke();
 const ry=cl((u-.4)/.5);for(let k=0;k<7;k++){const a=-Math.PI+(k+.5)*Math.PI/7,r1=.52,r2=.52+.3*ry;if(ry>.02&&cy+Math.sin(a)*r2<.4){c.strokeStyle=k%2?K.B(ry):K.A(ry);L(c,Math.cos(a)*r1,cy+Math.sin(a)*r1,Math.cos(a)*r2,cy+Math.sin(a)*r2);}}
 c.restore();
};
SC.concentre=(c,t,K)=>{
 for(let j=0;j<3;j++){const r=[.92,.6,.3][j],al=.25+.75*pulse(((t*1.2-(2-j)*.45)%2.4+2.4)%2.4-.0,.5);c.strokeStyle=j%2?K.B(al):K.A(al);circ(c,0,0,r);}
 c.strokeStyle=K.W(.6);for(let k=0;k<4;k++){const a=k*Math.PI/2+t*.3;L(c,Math.cos(a)*.98,Math.sin(a)*.98,Math.cos(a)*1.1,Math.sin(a)*1.1);}
 c.fillStyle=K.B(1);circ(c,0,0,.06+.02*Math.sin(t*6),true);
};
SC.attend=(c,t,K)=>{
 const cyc=5,u=(t%cyc)/cyc,fl=sm((u-.9)/.1),p=cl(u/.88);
 c.save();c.rotate(Math.PI*fl);c.strokeStyle=K.A(1);
 poly(c,[[-.42,-.72],[.42,-.72],[.03,-.03],[.03,.03],[.42,.72],[-.42,.72],[-.03,.03],[-.03,-.03],[-.42,-.72]]);
 c.strokeStyle=K.B(1);const ty=-.62+.55*p,w=.3*(1-p),by=.7-.45*p;
 if(w>.04)L(c,-w,ty,w,ty);if(p<1&&fl<.05){L(c,0,0,0,by);}
 const w2=.08+.3*p;L(c,-w2,by,w2,by);if(p>.3)L(c,-w2*.7,by+.08,w2*.7,by+.08);
 c.restore();
};
SC.telecharge=(c,t,K)=>{
 const u=(t%2.6)/2.6,y=-.75+.8*eo(cl(u/.8)),al=1-sm((u-.88)/.12);
 c.strokeStyle=K.A(1);poly(c,[[-.62,.12],[-.62,.58],[.62,.58],[.62,.12]]);
 c.save();c.globalAlpha*=al;c.strokeStyle=K.B(1);L(c,0,y-.5,0,y);arrow(c,0,y,0,1,.2);c.restore();
 c.strokeStyle=K.W(.25);L(c,-.62,.8,.62,.8);c.strokeStyle=K.B(1);L(c,-.62,.8,-.62+1.24*u,.8);
};
SC.verifie=(c,t,K)=>{
 const cyc=4.8,u=(t%cyc)/cyc,al=1-sm((u-.92)/.08);c.save();c.globalAlpha*=al;
 for(let i=0;i<3;i++){const y=-.5+i*.5,p=cl(u*3.4-i*.95);
  c.strokeStyle=K.A(.9);rr(c,-.78,y-.16,.32,.32,.06);c.stroke();c.strokeStyle=K.W(.35);L(c,-.3,y,.72,y);
  if(p>0){c.strokeStyle=K.B(1);poly(c,[[-.72,y],[-.63,y+.1],[-.5,y-.12]],cl(p*1.4));}}
 c.restore();
};
SC.appelle=(c,t,K)=>{
 const u=(t%2)/2,ring=u<.55,sh=ring?.06*Math.sin(t*28):0;
 c.save();c.rotate(sh);c.strokeStyle=K.A(1);rr(c,-.3,-.62,.6,1.24,.12);c.stroke();c.restore();
 if(ring)for(let j=0;j<2;j++){const q=cl((u/.55)*1.3-j*.3);if(q>0&&q<1){c.strokeStyle=K.B(Math.sin(Math.PI*q));const r=.55+.2*j+.2;
  c.beginPath();c.arc(0,0,r,-.55,.55);c.stroke();c.beginPath();c.arc(0,0,r,Math.PI-.55,Math.PI+.55);c.stroke();}}
};

SC.analyse=(c,t,K,o)=>{
 const asp=(o&&o.asp)||.7,x=.96,y=asp*.96,L2=.2;
 c.strokeStyle=K.A(1);for(const[sx,sy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){L(c,sx*x,sy*y,sx*(x-L2),sy*y);L(c,sx*x,sy*y,sx*x,sy*(y-L2*asp*1.2));}
 const u=(t*.45)%1,by=-y+2*y*u;c.strokeStyle=K.B(1);L(c,-.86,by,.86,by);
 for(let i=0;i<12;i++){const px=-.7+(i%4)*.46,py=(-.55+Math.floor(i/4)*.55)*asp*1.2,g=Math.max(0,1-Math.abs(py-by)/(.5*asp));c.fillStyle=g>.2?K.B(.5+.5*g):K.W(.25);circ(c,px,py,.035+.03*g,true);}
};
/* Humeurs */
const HUMEURS={
 neutre:{bs:1,ba:1,blr:1,ga:1,en:1,tint:0,sag:0,jit:1},
 joyeux:{bs:1.2,ba:1.1,blr:1,ga:1.2,en:1.15,tint:.28,sag:0,jit:1,hopI:14},
 calme:{bs:.8,ba:.8,blr:.8,ga:.7,en:.8,tint:-.12,sag:0,jit:.6,yawnI:70},
 curieux:{bs:1,ba:.9,blr:.7,ga:1.5,en:1.1,tint:.12,sag:0,jit:1.4,wigI:11},
 fatigue:{bs:.65,ba:1.2,blr:1.8,ga:.5,en:.6,tint:-.22,sag:.03,jit:.5,yawnI:22},
 inquiet:{bs:1.5,ba:.7,blr:1.2,ga:1.3,en:1,tint:.18,sag:0,jit:2,shivI:7},
 excite:{bs:1.8,ba:1.3,blr:1,ga:1.4,en:1.4,tint:.35,sag:0,jit:2.4,hopI:5,hopV:5.5},
 triste:{bs:.7,ba:.6,blr:1.2,ga:.4,en:.55,tint:-.3,sag:.045,jit:.4,tc:[110,140,230],yawnI:60},
 concentre:{bs:.8,ba:.5,blr:.4,ga:.25,en:.9,tint:-.08,sag:0,jit:.2},
 espiegle:{bs:1.3,ba:1.1,blr:1.3,ga:1.6,en:1.2,tint:.22,sag:0,jit:1.6,tc:[255,140,200],wigI:5,hopI:10,hopV:3},
 fier:{bs:.9,ba:1.4,blr:.7,ga:.8,en:1.1,tint:.25,sag:-.04,jit:.5,tc:[255,205,120],hopI:22,hopV:3},
 timide:{bs:1.2,ba:.7,blr:1.6,ga:.5,en:.7,tint:.12,sag:.025,jit:1.2,tc:[255,160,170],wigI:15}};
let humeur='auto';
export function setHumeur(h){humeur=HUMEURS[h]||h==='auto'?h:'auto';}
export function lireHumeur(){return humeur;}
/* Crochet de la maquette V9 (build.py : HUM_MIX) : en auto, le corps est le mélange des humeurs que lui rend son réseau. */
let melangeFn=null;
export function setMelange(f){melangeFn=typeof f==='function'?f:null;}
function humeurNow(){if(humeur!=='auto')return HUMEURS[humeur];if(melangeFn)return melangeFn();const h=new Date().getHours();return HUMEURS[h<6||h>=23?'fatigue':h<10?'joyeux':h<18?'neutre':'calme'];}

/* Voix : un coup par syllabe */
const rnd=(s=>()=>{s=(s*16807)%2147483647;return s/2147483647});
let TL=[],TOTAL=3;
function construire(txt){const r=rnd(txt.length*97+13);TL=[];let t=.4;
 for(const w of txt.trim().split(/\s+/).filter(Boolean)){const n=Math.max(1,(w.toLowerCase().match(/[aeiouyàâäéèêëîïôöùûüœ]+/g)||[]).length);
  for(let s=0;s<n;s++){const d=.15+(s===n-1?.07:0)+r()*.05;TL.push([t,t+d,Math.min(1,(.5+.42*r())*(s===0?1.15:1)*(/[?]$/.test(w)&&s===n-1?1.2:1))]);t+=d+.02;}
  t+=.07;if(/[,;:]$/.test(w))t+=.22;if(/[.!?…]$/.test(w))t+=.5;}
 TOTAL=Math.max(1.5,t+1.1);}
function brut(sp){for(const[a,b,m]of TL){if(sp>=a&&sp<=b)return Math.pow(Math.sin(Math.PI*(sp-a)/(b-a)),.7)*m;}return 0;}

/* L'âme : regard, souffle, clignement, hochements, soupirs, hésitations, réactions */
const ptr={x:0,y:0,t:-9,sp:0};
/* Le regard suit le curseur : position normalisée (-1..1) dans le cadre de référence que l'hôte choisit. */
export function regarder(nx,ny){ptr.sp=Math.min(1,Math.hypot(nx-ptr.x,ny-ptr.y)*6);ptr.x=nx;ptr.y=ny;ptr.t=performance.now()/1000;}
const HK={v:.35},THK={v:.008};
const HZ={gx:0,gy:0,b:0,blink:0,kick:0,sq:0,mag:0,nod:0,hes:0,tilt:0,typeA:0,flash:0,cur:0,hop:0,yawn:0,shiv:0};
const HUM={gx:0,gy:0,vx:0,vy:0,tgx:0,tgy:0,next:0,sacc:0,pend:null,phase:0,b:0,blinkAt:2,blinkT:-9,ts:0,last:'repos',sil:0,vs:0,seq:0,seqT:0,
 nod:0,nodv:0,nextNod:3,lastHi:false,glanceAt:2,glanceUntil:0,sighAt:14,sighStart:-9,hes:0,tilt:0,typeA:0,flash:0,rd:0,cur:0,hop:0,hopv:0,hopAt:6,yawnAt:18,yawnStart:-9,shivAt:8,shivStart:-9,wigAt:7,wigStart:-9};
function humanStep(dt,t,id,P){const H=HUM,M=humeurNow(),A=ACT[id];
 if(id!==H.last){H.ts=t;H.last=id;H.next=t;H.seqT=t;H.pend=null;}
 const wander=(t-ptr.t>3);const px=wander?Math.sin(t*.37)*.7:ptr.x,py=wander?Math.cos(t*.29)*.5:ptr.y;
 const aim=(x,y)=>{H.pend={x:x*M.ga,y:y*M.ga,at:t+.11};H.tgx=H.gx-(x-H.gx)*.14;H.tgy=H.gy-(y-H.gy)*.14;H.sacc=t+.33;};
 if(H.pend&&t>=H.pend.at){H.tgx=H.pend.x;H.tgy=H.pend.y;H.pend=null;}
 let stiff=30,damp=10,ex=H.tgx,ey=H.tgy;let gz=A.gz;
 const sacc=(a,b)=>{stiff=t<H.sacc?a:b;damp=t<H.sacc?24:9;};
 if(gz==='free'){if(t>=H.next){if(Math.random()<.35)aim(0,0);else aim((Math.random()*2-1)*.6,(Math.random()*2-1)*.45);H.next=t+(2.2+Math.random()*3.8)/M.ga;}sacc(170,26);}
 else if(gz==='user'){ex=px*.9*M.ga;ey=py*.9*M.ga;stiff=50;damp=12;if(id==='ecoute'&&t>=H.nextNod){H.nodv+=2.2;H.nextNod=t+2.2+Math.random()*2.6;}}
 else if(gz==='userSoft'){ex=px*.5;ey=py*.5+P.v*.16;stiff=38;damp=11;const hi=P.v>.72;if(hi&&!H.lastHi)H.nodv+=1.6*Math.min(1,P.v);H.lastHi=hi;}
 else if(gz==='upleft'){if(t>=H.next){aim(-.5+(Math.random()-.5)*.35,-.55+(Math.random()-.5)*.3);H.next=t+1.6+Math.random()*1.6;}
  if(t>=H.glanceAt){H.glanceUntil=t+.55;H.glanceAt=t+3+Math.random()*2.5;}if(t<H.glanceUntil){ex=px*.5;ey=py*.5;}sacc(150,20);if(Math.random()<1.3*dt)H.hes=1;}
 else if(gz==='sectors'){if(t>=H.seqT+.7+hs(H.seq,3)*.5){H.seqT=t;H.seq=(H.seq+1)%6;const a=-Math.PI/2+H.seq*TAU/6;aim(Math.cos(a)*.95,Math.sin(a)*.95);}sacc(190,40);}
 else if(gz==='scan'){ex=Math.sin(t*.8)*.8;ey=Math.sin(t*.5+1)*.25;stiff=40;damp=11;}
 else if(gz==='read'){const line=Math.floor(t*.9)%4,x=-.8+((t*3.2)%1)*1.6;ex=x;ey=-.3+line*.2;stiff=t%(1/3.2)<.08?170:40;damp=18;}
 else if(gz==='typing'){ex=Math.cos(H.typeA-Math.PI/2)*.7;ey=Math.sin(H.typeA-Math.PI/2)*.5;stiff=60;damp=14;}
 else if(gz==='around'){if(t>=H.next){aim((Math.random()*2-1)*.8,(Math.random()*2-1)*.6);H.next=t+.5+Math.random()*.9;}sacc(170,30);}
 else if(gz==='aside'){ex=.6+.1*Math.sin(t*1.3);ey=-.35;stiff=24;damp=9;}
 else if(gz==='up'){ex=0;ey=-.55;stiff=40;damp=11;}
 else{ex=0;ey=.7;stiff=8;damp=5;}
 if(gz!=='userSoft')H.lastHi=false;
 ex+=(nz1(t*2.6,31)-.5)*.05*M.jit;ey+=(nz1(t*2.2,32)-.5)*.05*M.jit;
 ey+=M.sag*8;
 const n=Math.max(1,Math.ceil(dt/.008)),h=dt/n;
 for(let q=0;q<n;q++){H.vx+=(stiff*(ex-H.gx)-damp*H.vx)*h;H.vy+=(stiff*(ey-H.gy)-damp*H.vy)*h;H.gx+=H.vx*h;H.gy+=H.vy*h;H.nodv+=(-90*H.nod-9*H.nodv)*h;H.nod+=H.nodv*h;H.hopv+=(-150*H.hop-9*H.hopv)*h;H.hop+=H.hopv*h;}
 H.hes*=Math.exp(-6*dt);H.flash*=Math.exp(-3.5*dt);
 /* vie propre : petits événements qui dépendent de l'humeur */
 if(M.hopI&&t>=H.hopAt){H.hopv+=M.hopV||4;H.hopAt=t+M.hopI*(.6+.8*Math.random());}
 if(M.yawnI&&id==='repos'&&t>=H.yawnAt){H.yawnStart=t;H.yawnAt=t+M.yawnI*(.7+.6*Math.random());}
 if(M.shivI&&t>=H.shivAt){H.shivStart=t;H.shivAt=t+M.shivI*(.6+.8*Math.random());}
 if(M.wigI&&t>=H.wigAt){H.wigStart=t;H.wigAt=t+M.wigI*(.6+.8*Math.random());}
 const yu=(t-H.yawnStart)/2.8,yawn=yu>=0&&yu<=1?Math.pow(Math.sin(Math.PI*yu),1.6):0,su=(t-H.shivStart)/1.3,shiv=su>=0&&su<=1?1-su:0,wu=(t-H.wigStart)/1.2,wig=wu>=0&&wu<=1?.2*Math.sin(wu*TAU*3)*(1-wu):0;
 H.typeA+=(.4+2.2*Math.max(0,nz1(t*2.2,50)-.45))*dt;
 const tt=(A.tilt?A.tilt(t):0)+wig;H.tilt+=(tt-H.tilt)*(1-Math.exp(-dt*8));
 H.cur+=(ptr.sp-H.cur)*(1-Math.exp(-dt*4));ptr.sp*=Math.exp(-dt*2);
 const om=TAU/4.2*(1+.25*Math.sin(t*.31))*A.br[0]*M.bs;H.phase+=om*dt;
 const amp=(id==='repos'?1:A.br[1])*(.8+.2*Math.sin(t*.173))*M.ba;
 let bt=Math.sin(H.phase)*amp;
 if(id==='repos'){if(t>=H.sighAt){H.sighStart=t;H.sighAt=t+15+Math.random()*12;}const u=(t-H.sighStart)/2.6;if(u>=0&&u<=1)bt+=1.1*Math.sin(Math.PI*u);}
 if(id==='reponse'){H.sil=P.v<.06?H.sil+dt:0;bt=-.5+1.4*Math.min(1,H.sil/.45);}
 if(id==='indispo')bt=-.6+.3*Math.sin(H.phase);
 H.b+=(bt-H.b)*(1-Math.exp(-dt*(id==='reponse'?6:12)));
 if(t>=H.blinkAt){H.blinkT=t;H.blinkAt=t+(2.5+Math.random()*3.5)/M.blr;if(Math.random()<.2)H.blinkAt=t+.35;}
 const sb=t-H.blinkT;let blink=sb<0||sb>.2?0:(sb<.07?sb/.07:1-(sb-.07)/.13);
 if(id==='indispo')blink=.55;if(id==='veille')blink=.92;if(A.bl===0&&id!=='indispo'&&id!=='veille')blink=0;
 H.vs+=(P.v-H.vs)*(1-Math.exp(-dt*5));
 const s2=t-H.ts;
 return{gx:H.gx,gy:H.gy,b:H.b,blink,kick:Math.exp(-5*s2)*Math.cos(16*s2),sq:P.v*.08-.05*(P.v-H.vs),mag:Math.min(1,Math.hypot(H.gx,H.gy)),nod:H.nod,hes:H.hes,tilt:H.tilt,typeA:H.typeA,flash:H.flash,cur:H.cur,hop:H.hop,yawn,shiv};}
function poke(){const H=HUM,t=performance.now()/1000;H.nodv+=3;H.flash=1;H.ts=t;H.blinkT=t-.05;H.blinkAt=t+3;}

/* Enregistreur : on rejoue le dessin d'une silhouette dans un faux contexte, qui en garde les traits et les points */
function mkRec(){
 const o={els:[],globalAlpha:1,lineWidth:1,lineCap:'',lineJoin:'',strokeStyle:'',fillStyle:''};
 let M=[1,0,0,1,0,0],stk=[],subs=[],cur=null,lu=[0,0];
 const T=(x,y)=>[M[0]*x+M[2]*y+M[4],M[1]*x+M[3]*y+M[5]];
 const mul=m=>{const a=M;M=[a[0]*m[0]+a[2]*m[1],a[1]*m[0]+a[3]*m[1],a[0]*m[2]+a[2]*m[3],a[1]*m[2]+a[3]*m[3],a[0]*m[4]+a[2]*m[5]+a[4],a[1]*m[4]+a[3]*m[5]+a[5]];};
 const col=st=>{const m=String(st).match(/[\d.]+/g)||[255,255,255,1];return[+m[0],+m[1],+m[2],m.length>3?+m[3]:1];};
 const add=(x,y)=>{if(!cur){cur=[T(x,y)];subs.push(cur);}else cur.push(T(x,y));lu=[x,y];};
 o.save=()=>stk.push([M,o.globalAlpha,o.strokeStyle,o.fillStyle]);
 o.restore=()=>{const q=stk.pop();if(q){M=q[0];o.globalAlpha=q[1];o.strokeStyle=q[2];o.fillStyle=q[3];}};
 o.translate=(x,y)=>mul([1,0,0,1,x,y]);o.scale=(x,y)=>mul([x,0,0,y,0,0]);o.rotate=a=>mul([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);
 o.beginPath=()=>{subs=[];cur=null;};
 o.moveTo=(x,y)=>{cur=[T(x,y)];subs.push(cur);lu=[x,y];};
 o.lineTo=(x,y)=>add(x,y);
 o.closePath=()=>{if(cur&&cur.length>1){cur.push(cur[0].slice());}};
 o.arc=(x,y,r,a0,a1,ccw)=>{if(!ccw){while(a1<a0)a1+=TAU;if(a1-a0>TAU)a1=a0+TAU;}else{while(a1>a0)a1-=TAU;if(a0-a1>TAU)a1=a0-TAU;}
  const n=Math.max(4,Math.ceil(Math.abs(a1-a0)/.2));for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;add(x+Math.cos(a)*r,y+Math.sin(a)*r);}};
 o.ellipse=(x,y,rx,ry,rot,a0,a1)=>{const n=Math.max(8,Math.ceil(Math.abs(a1-a0)/.2));for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n,ex=Math.cos(a)*rx,ey=Math.sin(a)*ry;add(x+ex*Math.cos(rot)-ey*Math.sin(rot),y+ex*Math.sin(rot)+ey*Math.cos(rot));}};
 o.bezierCurveTo=(x1,y1,x2,y2,x,y)=>{const[x0,y0]=lu;for(let i=1;i<=12;i++){const u=i/12,v=1-u;add(v*v*v*x0+3*v*v*u*x1+3*v*u*u*x2+u*u*u*x,v*v*v*y0+3*v*v*u*y1+3*v*u*u*y2+u*u*u*y);}};
 o.rect=(x,y,w,h)=>{o.moveTo(x,y);add(x+w,y);add(x+w,y+h);add(x,y+h);add(x,y);};
 o.roundRect=(x,y,w,h,r)=>{r=Math.min(r,w/2,h/2);o.moveTo(x+r,y);add(x+w-r,y);o.arc(x+w-r,y+r,r,-Math.PI/2,0);add(x+w,y+h-r);o.arc(x+w-r,y+h-r,r,0,Math.PI/2);add(x+r,y+h);o.arc(x+r,y+h-r,r,Math.PI/2,Math.PI);add(x,y+r);o.arc(x+r,y+r,r,Math.PI,Math.PI*1.5);add(x+r,y);};
 o.clip=()=>{};
 o.stroke=()=>{const c=col(o.strokeStyle);for(const sb of subs)if(sb.length>=2)o.els.push({k:'l',pts:sb,c,a:c[3]*o.globalAlpha});};
 o.fill=()=>{const c=col(o.fillStyle);for(const sb of subs){if(sb.length<2)continue;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of sb){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}
  const w=x1-x0,h=y1-y0,mx=Math.max(w,h),mn=Math.max(1e-3,Math.min(w,h)),a=c[3]*o.globalAlpha;
  if(mx<.32&&mx/mn<1.6)o.els.push({k:'d',x:(x0+x1)/2,y:(y0+y1)/2,sz:mx,c,a});
  else if(mx/mn>=1.6&&mx>=.16&&mn<.3)o.els.push({k:'l',pts:w>=h?[[x0,(y0+y1)/2],[x1,(y0+y1)/2]]:[[(x0+x1)/2,y0],[(x0+x1)/2,y1]],c,a});}};
 o.fillRect=(x,y,w,h)=>{o.beginPath();o.rect(x,y,w,h);o.fill();};
 return o;}
function mkK(id,t){const cc=typeof ACT[id].col==='function'?ACT[id].col(t):ACT[id].col,c0=cc[0],c1=cc[1];
 return{A:a=>css(c0,a),B:a=>css(c1,a),W:a=>css(BLANC,a),lw:.03,c0,c1};}

/* Le corps : 100 traits et points. Au repos, deux anneaux. Pour une action, les mêmes traits se déplacent et dessinent la silhouette. */
const angMix=(a,b,f)=>a+(((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI)*f;
function corps(){
 const N=100,NB=[60,40],RB=[.62,.4],DR=[1,-1],GN=[.3,.26],OF=[.035,.085];
 const f32=()=>new Float32Array(N);
 const px=f32(),py=f32(),pa=f32(),pl=f32(),vx=f32(),vy=f32(),va=f32(),vl=f32(),cr=f32(),cg=f32(),cb=f32(),ca=f32();
 const tx=f32(),ty=f32(),ta=f32(),tl=f32(),tr=f32(),tg=f32(),tb=f32(),tal=f32();
 const fx=f32(),fy=f32(),fa=f32(),fl=f32(),fr=f32(),fg=f32(),fb=f32(),fal=f32();
 const rx=f32(),ry=f32(),ra=f32(),rl=f32(),rcr=f32(),rcg=f32(),rcb=f32(),ral=f32();
 const dl=f32(),ua=f32(),kI=f32(),sw=f32(),pm=new Int16Array(N);let needPerm=false;for(let i=0;i<N;i++){pm[i]=i;dl[i]=hs(i,3)*.6;kI[i]=38+hs(i,5)*70;sw[i]=(hs(i,7)-.5)*2;}
 const ev=[new Float32Array(60),new Float32Array(40)],evv=[new Float32Array(60),new Float32Array(40)];
 let curId=null,tCh=0,last=null,mw=1,fresh=true;const ew=[];
 return (c,w,h,P,t,id,o)=>{o=o||{};
  const A=ACT[id],R=o.R||Math.min(w,h)/2*.92,cx=o.cx!=null?o.cx:w/2,cy=o.cy!=null?o.cy:h/2,W=P.W,H=P.H||HZ,K=HK.v,M=humeurNow();
  const dt=last==null?0:Math.min(.05,Math.max(0,t-last));last=t;
  if(id!==curId){curId=id;tCh=t;ew.length=0;needPerm=true;}
  if(fresh)tCh=t-5;const tsw=t-tCh,snap=!!o.snap||fresh;fresh=false;
  mw+=((A.sc?0:1)-mw)*(snap?1:1-Math.exp(-dt*4));
  const dim=Math.max(.15,Object.keys(W).reduce((s,k)=>s+W[k]*(ACT[k].dim||1),0));
  let O=[0,0,0],I=[0,0,0];for(const k of ST){const wv=W[k];if(wv<.003)continue;let cc=ACT[k].col;if(typeof cc==='function')cc=cc(t);O=[O[0]+wv*cc[0][0],O[1]+wv*cc[0][1],O[2]+wv*cc[0][2]];I=[I[0]+wv*cc[1][0],I[1]+wv*cc[1][1],I[2]+wv*cc[1][2]];}
  if(M.tint){const tg=M.tc||(M.tint>0?[255,190,140]:[140,170,255]),u=Math.abs(M.tint)*.5;O=mixc(O,tg,u);I=mixc(I,tg,u);}
  const cbase=[[mixc(BLANC,O,.35),O],[mixc(BLANC,I,.35),I]];
  /* anneaux (cibles de repos et de réponse) */
  const gAng=Math.atan2(H.gy,H.gx),ux=Math.cos(gAng),uy=Math.sin(gAng);
  const sy=1+K*H.sq*1.2*.8,sx=1/sy,th=K*.38*H.mag,cs=Math.cos(th),ro=K*.1*H.gx+H.tilt*K,cr0=Math.cos(ro),sr0=Math.sin(ro);
  const sc=1+K*.035*H.b+K*.04*H.kick+.04*H.cur,sag=W.veille*.05+M.sag,nodY=R*.04*K*H.nod-R*.07*H.hop;
  const tf=(x,y)=>{const a=x*cr0-y*sr0,b=x*sr0+y*cr0,dd=a*ux+b*uy;return[a+(cs-1)*dd*ux,b+(cs-1)*dd*uy];};
  for(let k=0;k<2;k++){const Nk=NB[k],ox=cx+H.gx*R*OF[k]*K,oy=cy+H.gy*R*OF[k]*K+R*sag+nodY*(k?1.25:1),base=RB[k]*sc*(1+(k?1:-1)*.04*H.blink*K);
   for(let i=0;i<Nk;i++){const a=i/Nk*TAU,ctx={k,i,N:Nk,t,P,nz:nz1(i*.3+t*.8,k),a0:a,H};
    let e=0,dsp=0;for(const q of ST){const wv=W[q];if(wv<.003)continue;const Aq=ACT[q];e+=wv*(Aq.e?Aq.e(ctx):.05+.04*ctx.nz);if(Aq.d)dsp+=wv*Aq.d(ctx);}
    dsp+=H.yawn*(k?-.05:.09)+H.shiv*.012*Math.sin(a*14+t*45);e+=H.yawn*.3;
    e=e*M.en+K*H.hes*.3*W.reflexion+.35*H.flash*(.5+.5*ctx.nz);
    const ga=K*H.mag*Math.pow(Math.max(0,Math.cos(a-gAng)),2)*.55;e+=ga;e=Math.min(1.3,e);
    const kk=60+hs(i,k)*50,cc=6+hs(i,k+9)*5,n=Math.max(1,Math.ceil(dt/.008)),hh=dt/n;for(let q=0;q<n;q++){evv[k][i]+=(kk*(e-ev[k][i])-cc*evv[k][i])*hh;ev[k][i]+=evv[k][i]*hh;}e=Math.max(0,ev[k][i]);
    const len=R*(.012+GN[k]*e)*(1-.85*H.blink*K),r=R*(base+dsp),ex=r+DR[k]*len,ca_=Math.cos(a),sa_=Math.sin(a);
    const[x1,y1]=tf(r*sx*ca_,r*sy*sa_),[x2,y2]=tf(ex*sx*ca_,ex*sy*sa_),j=k?60+i:i,hot=(e>.5||ga>.1||Math.abs(dsp)>.03);
    rx[j]=ox+(x1+x2)/2;ry[j]=oy+(y1+y2)/2;ra[j]=Math.atan2(y2-y1,x2-x1);rl[j]=Math.hypot(x2-x1,y2-y1);
    const cc2=cbase[k][hot?1:0];rcr[j]=cc2[0];rcg[j]=cc2[1];rcb[j]=cc2[2];ral[j]=(.6+.4*Math.min(1,e*1.5))*dim;}}
  /* silhouette de l'action : on rejoue son dessin, on garde traits et points, on les répartit sur les 100 traits */
  let m=0;
  if(A.sc){const lt=((P.lts&&P.lts[id]!=null)?P.lts[id]:t)*1.15*(.85+.2*M.en),rec=mkRec(),sr=ro+.014*M.jit*Math.sin(t*.6),cs_=Math.cos(sr),sn_=Math.sin(sr),rp=(x,y)=>[x*cs_-y*sn_,x*sn_+y*cs_];SC[id](rec,lt,mkK(id,lt),o);
   const S=R*.72*(o.extra||1)*(1+.02*H.b*K)*(1+(snap?0:.07*Math.exp(-tsw*3.2)*Math.cos(tsw*9))),offx=cx+H.gx*R*.05*K,offy=cy+H.gy*R*.04*K+R*sag+nodY*.6,sp0=0;
   const inf=rec.els.map(e=>{if(e.k==='d')return{e,l:0,n:1};let l=0;const s2=[0];for(let i=1;i<e.pts.length;i++){l+=Math.hypot(e.pts[i][0]-e.pts[i-1][0],e.pts[i][1]-e.pts[i-1][1]);s2.push(l);}return{e,l,s:s2,n:1};});
   let nd=0,sw=0;
   inf.forEach((f,ei)=>{if(f.e.k==='d'){nd++;f.w=0;return;}ew[ei]=(ew[ei]==null||snap)?f.l:ew[ei]+(f.l-ew[ei])*.2;f.w=f.l<1e-4?0:Math.max(ew[ei],1e-3);sw+=f.w;});
   const avail=Math.max(0,N-nd);let used=0;
   inf.forEach(f=>{if(f.e.k==='d'){f.n=1;return;}f.raw=sw>0?f.w/sw*avail:0;f.n=Math.floor(f.raw);f.rem=f.raw-f.n;used+=f.n;});
   let left=avail-used;if(sw>0){const ord=inf.filter(f=>f.e.k!=='d'&&f.w>0).sort((x,y)=>y.rem-x.rem);for(let q2=0;left>0&&q2<ord.length*4;q2++){ord[q2%ord.length].n++;left--;}}
   for(const f of inf){if(f.n===0)continue;const e=f.e,cc=e.c;
    if(e.k==='d'){if(m<N){const q0=rp(e.x,e.y);tx[m]=offx+q0[0]*S;ty[m]=offy+q0[1]*S;ta[m]=0;tl[m]=Math.max(R*.004,(e.sz||0)*S*.55);tr[m]=cc[0];tg[m]=cc[1];tb[m]=cc[2];tal[m]=e.a*dim;m++;}continue;}
    const lwp=Math.max(1,R*THK.v*1.35),ld=Math.max(lwp*.25,Math.min(f.l/f.n*.84*S-lwp,.3*S));let sg=0;
    for(let i=0;i<f.n&&m<N;i++){const s0=(i+.5)/f.n*f.l;while(sg<e.pts.length-2&&f.s[sg+1]<s0)sg++;
     const p0=e.pts[sg],p1=e.pts[sg+1],sl=Math.max(1e-6,f.s[sg+1]-f.s[sg]),u=cl((s0-f.s[sg])/sl);
     const q1=rp(p0[0]+(p1[0]-p0[0])*u,p0[1]+(p1[1]-p0[1])*u);tx[m]=offx+q1[0]*S;ty[m]=offy+q1[1]*S;ta[m]=Math.atan2(p1[1]-p0[1],p1[0]-p0[0])+sr;tl[m]=ld;tr[m]=cc[0];tg[m]=cc[1];tb[m]=cc[2];tal[m]=e.a*dim;m++;}}
  }
  for(let j=m;j<N&&m>0;j++){const q2=(j*7)%m;tx[j]=tx[q2];ty[j]=ty[q2];ta[j]=ta[q2];tl[j]=tl[q2];tr[j]=tr[q2];tg[j]=tg[q2];tb[j]=tb[q2];tal[j]=tal[q2];}
  if(A.sc&&m>0)m=N;
  for(let j=0;j<N;j++){if(j>=m){const q=A.sc?.14:1;tx[j]=rx[j];ty[j]=ry[j];ta[j]=ra[j];tl[j]=rl[j];tr[j]=rcr[j];tg[j]=rcg[j];tb[j]=rcb[j];tal[j]=ral[j]*q;}}
  if(needPerm){needPerm=false;if(!snap&&m>=0){const ang=(x,y)=>Math.atan2(y-cy,x-cx),ip=[...Array(N).keys()],is=[...Array(N).keys()];
   ip.sort((u,v)=>ang(px[u],py[u])-ang(px[v],py[v]));is.sort((u,v)=>ang(tx[u],ty[u])-ang(tx[v],ty[v]));
   let best=1e18,bo=0;for(let off=0;off<N;off++){let sum=0;for(let q=0;q<N;q++){const u=ip[q],v=is[(q+off)%N];sum+=Math.hypot(px[u]-tx[v],py[u]-ty[v]);}if(sum<best){best=sum;bo=off;}}
   for(let q=0;q<N;q++)pm[ip[q]]=is[(q+bo)%N];}}
  if(o.fly&&o.fly.v>.04){const f=sm(cl(o.fly.v)),a0=Math.atan2(o.fly.dy,o.fly.dx),ca0=Math.cos(a0),sa0=Math.sin(a0);
   for(let j=0;j<N;j++){const u=(j*.618034)%1,al=-Math.pow(u,1.25)*R*2.2*f,ac=(hs(j,13)-.5)*2*R*.3*(.3+.7*Math.sqrt(u)),sx2=cx+ca0*al-sa0*ac,sy2=cy+sa0*al+ca0*ac;
    tx[j]+=(sx2-tx[j])*f;ty[j]+=(sy2-ty[j])*f;ta[j]=angMix(ta[j],a0+(hs(j,14)-.5)*.5,f);tl[j]+=(R*(.05+.05*(1-u))-tl[j])*f;}}
  /* les traits suivent leurs cibles, chacun avec son retard et son ressort : l'ensemble coule d'une forme à l'autre */
  const soft=Math.exp(-tsw/.9);
  for(let i=0;i<N;i++){const act=snap||tsw>=dl[i],g=pm[i];
   if(act){fx[i]=tx[g];fy[i]=ty[g];fa[i]=ta[g];fl[i]=tl[g];fr[i]=tr[g];fg[i]=tg[g];fb[i]=tb[g];fal[i]=tal[g];}
   const tA=fa[i]+Math.round((pa[i]-fa[i])/Math.PI)*Math.PI;
   if(snap){px[i]=fx[i];py[i]=fy[i];pa[i]=fa[i];pl[i]=fl[i];vx[i]=vy[i]=va[i]=vl[i]=0;cr[i]=fr[i];cg[i]=fg[i];cb[i]=fb[i];ca[i]=fal[i];continue;}
   const u=cl((tsw-dl[i])/1.1);ua[i]=snap?1:u;const kt=A.sc?150:(420*(1-soft)+260*soft),k=kI[i]*(1-u)+kt*u,z=.58*(1-u)+.95*u,cc=2*z*Math.sqrt(k),n=Math.max(1,Math.ceil(dt/.008)),hh=dt/n,sv=sw[i]*(1-u)*.7*k;
   for(let q=0;q<n;q++){const dx=fx[i]-px[i],dy=fy[i]-py[i];vx[i]+=(k*dx-sv*dy-cc*vx[i])*hh;px[i]+=vx[i]*hh;vy[i]+=(k*dy+sv*dx-cc*vy[i])*hh;py[i]+=vy[i]*hh;
    va[i]+=(k*1.3*(tA-pa[i])-cc*1.1*va[i])*hh;pa[i]+=va[i]*hh;vl[i]+=(k*(fl[i]-pl[i])-cc*vl[i])*hh;pl[i]+=vl[i]*hh;}
   const rt=1-Math.exp(-dt*(act?9:0));cr[i]+=(fr[i]-cr[i])*rt;cg[i]+=(fg[i]-cg[i])*rt;cb[i]+=(fb[i]-cb[i])*rt;ca[i]+=(fal[i]-ca[i])*(1-Math.exp(-dt*(act?10:0)));}
  /* dessin, par paquets de couleur */
  c.lineWidth=Math.max(1,R*THK.v*(1+.35*(1-mw)));c.lineCap='round';
  const bk=new Map();
  for(let i=0;i<N;i++){const al=ca[i];if(al<.03)continue;const r=cr[i]>>4,g=cg[i]>>4,b=cb[i]>>4,ab=Math.max(1,Math.min(8,Math.round(al*8))),key=((r*16+g)*16+b)*9+ab;
   let e=bk.get(key);if(!e){e={p:new Path2D(),s:`rgb(${r*16+8},${g*16+8},${b*16+8})`,a:ab/8};bk.set(key,e);}
   const sp=Math.hypot(vx[i],vy[i]),fly=cl(sp/(R*1.1))*(1-ua[i]),ang=fly>.08?angMix(pa[i],Math.atan2(vy[i],vx[i]),fly):pa[i];
   const l2=(Math.max(pl[i],.01)*(1-.55*fly)+fly*R*.022)/2,hx=Math.cos(ang)*l2,hy=Math.sin(ang)*l2,jx=A.sc&&fly<.1?Math.sin(t*2.3+i*1.7)*R*.0025:0,jy=A.sc&&fly<.1?Math.cos(t*1.9+i*2.9)*R*.0025:0;
   e.p.moveTo(px[i]+jx-hx,py[i]+jy-hy);e.p.lineTo(px[i]+jx+hx,py[i]+jy+hy);
}
  for(const e of bk.values()){c.globalAlpha=e.a;c.strokeStyle=e.s;c.stroke(e.p);}
  c.globalAlpha=1;};}
export function totalVoix(){return TOTAL;}
export{ACT,ORDRE,ST,FAMILLES,HUMEURS,HZ,HK,THK,construire,brut,humanStep,poke,corps};
