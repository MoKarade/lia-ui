/**
 * Les poids du réseau interne de LIA, repris de la maquette V9 (`reseau.js`) : cinq couches (62 entrées, 52 appréciations,
 * 18 interprétations, 36 émotions, 40 humeurs et 17 intentions), des liens récurrents (les émotions s'inhibent
 * entre elles), du bruit lent et deux échelles de mémoire par émotion (rapide ≈ 3 s, lente ≈ 20 min, gardée d'une
 * visite à l'autre). Les poids sont posés à la main (pas appris) : c'est un vrai calcul, pas un modèle entraîné.
 * Ici, les DONNÉES seulement, recopiées telles quelles de la maquette : on n'y touche pas à l'œil. Le calcul est dans `reseau.ts`.
 */

/** Poids d'un neurone : nom de l'entrée ou du neurone lu → poids ; `_b` est le biais. */
export type Poids = Record<string, number>;

const APP_IDS = ["financeai", "batchchef", "jobai", "driveai", "carai", "memoryai"];
/** Les entrées (0 à 1 chacune) : envies, moment de la journée, activité de Marc, état du monde de l'hôte. */
export const ENTREES: readonly string[] = [
  ...["energie", "curiosite", "social", "inquiet", "joie", "ennui", "nuit", "matin", "midi", "soir", "weekend", "actif", "absent", "alerte", "nbAlertes", "toutVert", "nouveau", "touche", "parle", "reponse", "rejet", "scroll", "demande", "bon", "mauvais", "sessionLongue", "conv", "calmeMonde", "changement", "recurrence"],
  ...APP_IDS.map((x) => "g_" + x),
  ...APP_IDS.map((x) => "v_" + x),
  ...["aube", "apresmidi", "vendredi", "lundi", "tendBonne", "tendMauvaise", "hierPire", "hierMieux", "instable", "retour", "questions", "bref", "bavard", "rythme", "souvenirs", "piste", "silence", "quota", "cout", "attentionMarc"],
];

/* Appréciations : elles lisent les entrées. */
export const L1: Record<string, Poids> = {
 a_danger:{alerte:1,nbAlertes:.6,inquiet:.6,mauvais:.4,_b:-.05},
 a_urgence:{alerte:.8,mauvais:.5,changement:.3,nuit:-.2,_b:-.05},
 a_recurrence:{recurrence:1,mauvais:.2},
 a_solitude:{absent:1,social:.5,parle:-.3,reponse:-.6,_b:-.1},
 a_compagnie:{actif:.6,reponse:.6,parle:.3,touche:.3,conv:.4,_b:-.1},
 a_reconnaissance:{reponse:.6,bon:.5,conv:.2,_b:-.1},
 a_nouveaute:{changement:.7,curiosite:.4,nouveau:.5,bon:.2,_b:-.1},
 a_routine:{calmeMonde:.7,toutVert:.4,changement:-.5,_b:-.05},
 a_surcharge:{alerte:.5,scroll:.5,demande:.4,nbAlertes:.5,touche:.3,_b:-.1},
 a_succes:{bon:1,toutVert:.3,joie:.4,_b:-.1},
 a_echec:{mauvais:1,rejet:.5,alerte:.3,_b:-.05},
 a_fatigue:{energie:-1.5,nuit:.4,sessionLongue:.3,_b:1},
 a_eveil:{energie:.6,matin:.5,midi:.2,actif:.3,nuit:-.6,_b:-.2},
 a_reverie:{nuit:.3,absent:.5,calmeMonde:.4,ennui:.3,actif:-.4,_b:-.1},
 a_jeu:{touche:.6,joie:.5,energie:.3,curiosite:.2,_b:-.3},
 a_attention:{actif:.5,scroll:.3,demande:.6,conv:.5,_b:-.1},
 a_intimite:{nuit:.3,soir:.4,conv:.5,reponse:.4,weekend:.2,_b:-.2},
 a_ennui:{ennui:1.6,curiosite:-.4,actif:-.3,calmeMonde:.3,_b:-.1},
 a_fierte:{bon:.9,toutVert:.12,joie:.2,_b:-.3},
 a_inquietude:{nbAlertes:.8,inquiet:.4,recurrence:.2,_b:-.05},
 a_tendresse:{soir:.3,conv:.5,reponse:.5,joie:.3,nuit:.2,_b:-.3},
 a_irritation:{touche:.6,rejet:.6,scroll:.4,mauvais:.3,_b:-.3},
 a_gene:{touche:.8,parle:.2,_b:-.3},
 a_curioApp:{curiosite:.5,v_financeai:.15,v_batchchef:.15,v_jobai:.15,v_driveai:.15,v_carai:.15,v_memoryai:.15,_b:-.1},
 a_devoir:{nbAlertes:.6,changement:.4,energie:.3,_b:-.1},
 a_vigilanceNuit:{nuit:.5,nbAlertes:.5,alerte:.5,_b:-.1},
 a_detente:{weekend:1,toutVert:.3,soir:.2,_b:-.1},
 a_attenteRep:{conv:.6,demande:.3,_b:-.1},
 a_sympathie:{scroll:.4,rejet:.4,mauvais:.3,nuit:.2,_b:-.1},
 a_emerveille:{bon:.5,changement:.5,curiosite:.5,_b:-.4},
 a_melancolie:{nuit:.3,absent:.4,joie:-.5,ennui:.2,_b:-.05},
 a_confiance:{toutVert:.4,reponse:.3,nouveau:-.6,recurrence:-.4,_b:.1},
 a_defiance:{recurrence:.7,mauvais:.4,rejet:.3,_b:-.1},
 a_lassitude:{sessionLongue:.6,ennui:.4,energie:-.4,_b:-.1},
 a_espiegle:{joie:.4,touche:.4,energie:.3,ennui:.3,soir:.1,_b:-.3},
 a_soulagement:{},
 a_progres:{tendBonne:1,hierMieux:.6,toutVert:.3,_b:-.15},
 a_regression:{tendMauvaise:1,hierPire:.7,mauvais:.2,_b:-.15},
 a_retrouvailles:{retour:1,nouveau:-.2,actif:.3,_b:-.1},
 a_questions:{questions:.9,conv:.4,curiosite:.2,_b:-.2},
 a_discretion:{bref:.8,scroll:.3,rythme:-.3,actif:.2,_b:-.2},
 a_bavardage:{bavard:.8,rythme:.6,conv:.4,_b:-.2},
 a_prudenceBudget:{quota:.9,cout:.7,_b:-.3},
 a_intrigue:{piste:.9,curiosite:.4,recurrence:.3,_b:-.1},
 a_silencePesant:{silence:1,social:.4,absent:-.3,_b:-.2},
 a_instabilite:{instable:1,changement:.4,nbAlertes:.3,_b:-.1},
 a_matinee:{aube:.7,matin:.5,energie:.2,_b:-.1},
 a_finSemaine:{vendredi:.8,weekend:.5,soir:.2,_b:-.2},
 a_lundi:{lundi:1,matin:.3,energie:-.2,_b:-.2},
 a_apresMidi:{apresmidi:.8,calmeMonde:.3,_b:-.1},
 a_memoire:{souvenirs:.7,conv:.3,nouveau:-.5,_b:-.2},
 a_regard:{attentionMarc:.9,actif:.3,_b:-.1}
};
/* Interprétations : elles lisent les appréciations (et non les entrées brutes) et en tirent un sens. */
export const L1B: Record<string, Poids> = {
 i_progresGlobal:{a_progres:1,a_succes:.5,a_confiance:.3,a_regression:-.8,a_danger:-.6},
 i_inquietudeFond:{a_regression:.7,a_recurrence:.6,a_instabilite:.5,a_inquietude:.4,a_prudenceBudget:.3,a_confiance:-.4},
 i_fete:{a_succes:.6,a_progres:.5,a_finSemaine:.4,a_fierte:.4,a_danger:-.7},
 i_besoinCalme:{a_surcharge:.7,a_discretion:.6,a_irritation:.4,a_fatigue:.3},
 i_besoinPresence:{a_solitude:.6,a_silencePesant:.7,a_retrouvailles:.4,a_intimite:.3},
 i_vigilanceLongue:{a_recurrence:.6,a_defiance:.5,a_instabilite:.5,a_vigilanceNuit:.4,a_routine:-.3},
 i_confianceGagnee:{a_confiance:.8,a_progres:.5,a_reconnaissance:.4,a_defiance:-.6},
 i_surpriseAgreable:{a_nouveaute:.6,a_succes:.4,a_emerveille:.5,a_echec:-.5},
 i_deception:{a_echec:.7,a_regression:.5,a_irritation:.3,a_succes:-.6},
 i_attente:{a_attenteRep:.8,a_questions:.4,a_curioApp:.2,a_silencePesant:.2},
 i_urgenceReelle:{a_danger:.8,a_urgence:.7,a_inquietude:.4,a_routine:-.7},
 i_retourMaison:{a_retrouvailles:1,a_compagnie:.4,a_matinee:.2},
 i_curiositePartagee:{a_questions:.7,a_regard:.6,a_curioApp:.4,a_attention:.4},
 i_fatigueMarc:{a_discretion:.5,a_lassitude:.5,a_sympathie:.5,nuit:.3,sessionLongue:.3},
 i_douceur:{a_intimite:.5,a_tendresse:.5,a_routine:.3,a_finSemaine:.3,a_danger:-.6},
 i_doute:{a_intrigue:.7,a_defiance:.4,a_instabilite:.3,a_confiance:-.4},
 i_complicite:{a_bavardage:.6,a_jeu:.5,a_compagnie:.5,a_espiegle:.3,a_surcharge:-.5},
 i_sobriete:{a_prudenceBudget:.7,a_regression:.3,a_discretion:.3}
};
/* Émotions : elles lisent les appréciations, les interprétations et, en récurrence, les autres émotions. */
export const L2: Record<string, Poids> = {
 e_joie:{a_succes:.9,a_compagnie:.4,a_fierte:.3,a_jeu:.3,a_danger:-.7,a_echec:-.8,e_peine:-.5,_b:.1},
 e_peine:{a_echec:.7,a_solitude:.5,a_melancolie:.7,a_sympathie:.2,e_joie:-.4,_b:-.05},
 e_peur:{a_danger:.9,a_urgence:.5,a_recurrence:.3,a_vigilanceNuit:.4,e_apaisement:-.6,_b:-.05},
 e_colere:{a_irritation:1,a_echec:.3,a_surcharge:.3,e_serenite:-.4,_b:-.1},
 e_surprise:{a_nouveaute:.8,a_emerveille:.3,a_urgence:.3,_b:-.1},
 e_tendresse:{a_tendresse:.9,a_intimite:.5,a_compagnie:.4,a_reconnaissance:.3,e_colere:-.5},
 e_fierte:{a_fierte:1,a_succes:.4,a_confiance:.2},
 e_gene:{a_gene:1,e_fierte:-.2},
 e_curiosite:{a_nouveaute:.4,a_curioApp:.7,a_attention:.3,e_ennui:-.5,e_fatigue:-.3,_b:-.05},
 e_ennui:{a_ennui:1,a_lassitude:.4,a_routine:.2,e_curiosite:-.4},
 e_fatigue:{a_fatigue:1.1,a_lassitude:.3,a_eveil:-.8},
 e_apaisement:{a_routine:.5,a_detente:.5,a_confiance:.4,e_peur:-.7,e_colere:-.4},
 e_vigilance:{a_danger:.5,a_urgence:.4,a_vigilanceNuit:.5,a_devoir:.4,a_defiance:.3,e_apaisement:-.3,_b:-.05},
 e_determination:{a_devoir:.7,a_urgence:.3,a_attention:.3,a_eveil:.3,e_fatigue:-.3,_b:-.2},
 e_nostalgie:{a_melancolie:.7,a_reverie:.4,a_intimite:.3,a_solitude:.2},
 e_reverie:{a_reverie:1,a_detente:.3,e_vigilance:-.5},
 e_malice:{a_espiegle:1,a_jeu:.5,e_peine:-.3,e_peur:-.3},
 e_soulagement:{a_soulagement:1.2,e_peur:-.2},
 e_solitude:{a_solitude:1,a_melancolie:.3,e_tendresse:-.2},
 e_enthousiasme:{a_succes:.4,a_emerveille:.5,a_eveil:.5,a_jeu:.3,e_fatigue:-.5,_b:-.35},
 e_mefiance:{a_defiance:1,a_recurrence:.4,a_confiance:-.5},
 e_attachement:{a_compagnie:.5,a_reconnaissance:.5,a_intimite:.4,a_confiance:.4,a_solitude:.2,_b:-.2},
 e_concentration:{a_attention:.7,a_devoir:.4,a_eveil:.3,a_nouveaute:.1,e_reverie:-.4,_b:-.15},
 e_serenite:{a_routine:.5,a_confiance:.5,a_detente:.4,e_peur:-.6,e_colere:-.5,a_danger:-.5,_b:-.1}
};
Object.assign(L2, {
 e_espoir:{i_progresGlobal:.7,i_surpriseAgreable:.3,i_confianceGagnee:.4,i_deception:-.5,_b:-.1},
 e_gratitude:{i_confianceGagnee:.6,i_complicite:.4,i_retourMaison:.3,a_reconnaissance:.4,_b:-.15},
 e_amusement:{i_complicite:.7,a_espiegle:.4,a_jeu:.3,i_urgenceReelle:-.6,_b:-.15},
 e_doute:{i_doute:1,i_inquietudeFond:.3,e_serenite:-.3,_b:-.1},
 e_confiance:{i_confianceGagnee:.9,e_peur:-.4,a_routine:.3,e_mefiance:-.5,_b:-.1},
 e_impatience:{i_attente:.8,a_silencePesant:.4,e_serenite:-.2,_b:-.2},
 e_compassion:{i_fatigueMarc:.9,i_deception:.3,i_besoinCalme:.3,e_colere:-.4,_b:-.15},
 e_euphorie:{i_fete:1,i_progresGlobal:.4,e_fatigue:-.5,i_urgenceReelle:-.6,_b:-.3},
 e_paix:{i_douceur:.8,i_besoinCalme:.3,e_peur:-.5,e_colere:-.5,_b:-.1},
 e_pensivite:{i_sobriete:.4,i_doute:.3,a_memoire:.5,a_reverie:.3,i_vigilanceLongue:.2,_b:-.2},
 e_empressement:{i_urgenceReelle:.7,i_retourMaison:.3,a_regard:.2,_b:-.2},
 e_solidarite:{i_curiositePartagee:.6,i_besoinPresence:.4,a_attention:.3,_b:-.2}
});
/* Les émotions d'origine lisent aussi la couche d'interprétation. */
const ajouter = (k: string, w: Poids): void => {
  Object.assign(L2[k] ?? {}, w);
};
ajouter("e_peur", { i_urgenceReelle: 0.5, i_inquietudeFond: 0.3 });
ajouter("e_joie", { i_fete: 0.5, i_progresGlobal: 0.3 });
ajouter("e_serenite", { i_douceur: 0.3, i_confianceGagnee: 0.3 });
ajouter("e_peine", { i_deception: 0.4, i_besoinPresence: 0.3 });
ajouter("e_curiosite", { i_curiositePartagee: 0.4 });
ajouter("e_vigilance", { i_vigilanceLongue: 0.5, i_urgenceReelle: 0.3 });
ajouter("e_tendresse", { i_douceur: 0.4, i_besoinPresence: 0.2 });
ajouter("e_solitude", { i_besoinPresence: 0.5 });

/** Les 40 humeurs : chacune lit les émotions et les appréciations. */
export const SORTIES: Record<string, Poids> = {
 neutre:{_b:.45},
 joyeux:{e_joie:1.4,e_serenite:.3,e_peur:-.6,_b:-.2},
 excite:{e_enthousiasme:1.2,e_joie:.6,e_surprise:.4,_b:-.4},
 calme:{e_apaisement:.8,e_serenite:.5,e_fatigue:.2,e_peur:-.5,_b:.1},
 serein:{e_serenite:1.3,e_apaisement:.5,e_peur:-.8,_b:-.1},
 curieux:{e_curiosite:1.3,e_surprise:.3,_b:-.1},
 concentre:{e_concentration:1.3,e_determination:.3,_b:-.1},
 attentif:{e_attachement:.4,a_attention:.7,e_concentration:.4,a_attenteRep:.5,_b:-.2},
 fatigue:{e_fatigue:1.8,_b:-.15},
 inquiet:{e_peur:1.3,e_vigilance:.4,a_inquietude:.5,_b:-.1},
 vigilant:{e_vigilance:1.3,e_peur:.3,e_determination:.2,_b:-.15},
 protecteur:{e_vigilance:.6,e_attachement:.7,e_determination:.4,a_danger:.3,_b:-.3},
 mefiant:{e_mefiance:1.3,e_vigilance:.3,_b:-.1},
 triste:{e_peine:1.4,e_solitude:.4,_b:-.1},
 boudeur:{e_solitude:.9,e_attachement:.4,e_colere:.3,e_peine:.3,_b:-.3},
 nostalgique:{e_nostalgie:1.4,e_tendresse:.2,_b:-.1},
 reveur:{e_reverie:1.4,e_serenite:.2,_b:-.1},
 ennuye:{e_ennui:1.7,_b:-.1},
 espiegle:{e_malice:1.1,e_joie:.4,e_enthousiasme:.3,_b:-.2},
 taquin:{e_malice:1,e_attachement:.4,a_jeu:.4,a_gene:.2,_b:-.3},
 fier:{e_fierte:1.5,e_joie:.3,_b:-.3},
 soulage:{e_soulagement:1.6,e_joie:.3,_b:-.2},
 emerveille:{e_surprise:.6,a_emerveille:.8,e_curiosite:.5,e_enthousiasme:.4,_b:-.4},
 gene:{e_gene:1.4,_b:-.1},
 determine:{e_determination:1.4,e_vigilance:.3,e_concentration:.3,_b:-.2},
 agace:{e_colere:1.4,a_irritation:.4,_b:-.1},
 timide:{nouveau:.8,e_gene:.3,e_attachement:-.2,a_attention:-.1,_b:-.3},
 tendre:{e_tendresse:1.4,e_attachement:.4,e_serenite:.2,_b:-.15},
 confiant:{e_confiance:1.4,e_serenite:.3,e_doute:-.6,_b:-.2},
 reconnaissant:{e_gratitude:1.5,e_attachement:.4,_b:-.3},
 amuse:{e_amusement:1.4,e_malice:.3,e_joie:.3,_b:-.25},
 dubitatif:{e_doute:1.4,e_mefiance:.3,_b:-.2},
 impatient:{e_impatience:1.4,e_vigilance:.2,_b:-.3},
 compatissant:{e_compassion:1.5,e_tendresse:.4,_b:-.3},
 euphorique:{e_euphorie:1.5,e_enthousiasme:.5,e_joie:.4,_b:-.5},
 paisible:{e_paix:1.4,e_serenite:.5,e_fatigue:.1,_b:-.2},
 pensif:{e_pensivite:1.4,e_reverie:.4,e_nostalgie:.2,_b:-.2},
 empresse:{e_empressement:1.4,e_determination:.4,e_vigilance:.3,_b:-.4},
 solidaire:{e_solidarite:1.4,e_attachement:.4,e_concentration:.2,_b:-.3},
 optimiste:{e_espoir:1.5,e_joie:.3,e_serenite:.2,_b:-.3}
};
/** Les 17 intentions : ce que LIA a envie de faire (elles pèsent sur le choix de ses comportements). */
export const INTENT: Record<string, Poids> = {
 appeler:{a_danger:.9,a_urgence:.8,e_vigilance:.5,e_peur:.5,a_attention:-.3,e_serenite:-.5,_b:-.6},
 analyser:{e_curiosite:1,a_curioApp:.8,a_nouveaute:.6,e_concentration:.4,_b:-.5},
 pointer:{e_curiosite:.7,e_concentration:.5,a_attention:.4,_b:-.4},
 accompagner:{a_attention:.8,e_attachement:.6,e_curiosite:.3,_b:-.5},
 suivre:{e_attachement:.7,a_solitude:.5,e_malice:.5,e_joie:.3,_b:-.7},
 promener:{e_ennui:.9,e_malice:.3,e_enthousiasme:.4,a_eveil:.2,e_fatigue:-.6,_b:-.4},
 causer:{a_solitude:.7,e_tendresse:.5,e_attachement:.5,e_joie:.3,e_ennui:.3,e_nostalgie:.2,_b:-.5},
 jouer:{e_malice:.8,e_joie:.6,e_enthousiasme:.6,a_jeu:.6,_b:-.7},
 rentrer:{e_fatigue:.3,e_serenite:.3,e_gene:.4,a_surcharge:.5,_b:-.3},
 dormir:{e_fatigue:1.4,a_lassitude:.4,e_reverie:.3,_b:-.9},
 repos:{e_apaisement:.6,e_serenite:.6,e_reverie:.4,e_fatigue:.3,_b:-.1},
 setaire:{a_surcharge:.7,a_attention:.4,e_concentration:.5,e_gene:.3,_b:-.3},
 resumer:{a_progres:.7,a_regression:.5,i_progresGlobal:.5,a_matinee:.4,a_retrouvailles:.4,a_attention:.3,_b:-.7},
 feliciter:{i_fete:1,a_succes:.5,e_fierte:.3,e_joie:.3,_b:-.8},
 rappeler:{a_devoir:.6,a_prudenceBudget:.4,i_urgenceReelle:.4,e_determination:.3,_b:-.7},
 souvenir:{a_memoire:.7,e_nostalgie:.5,e_pensivite:.5,a_silencePesant:.3,a_ennui:.3,_b:-.8},
 veiller:{a_vigilanceNuit:.7,i_vigilanceLongue:.6,nuit:.4,absent:.3,e_vigilance:.4,_b:-.7}
};
export const MOODS = Object.keys(SORTIES);
export const L1K = Object.keys(L1);
export const L1BK = Object.keys(L1B);
export const L2K = Object.keys(L2);
export const INTK = Object.keys(INTENT);

const compter = (t: Record<string, Poids>): number => Object.values(t).reduce((n, w) => n + Object.keys(w).filter((k) => k !== "_b").length, 0);
/** Combien de neurones et de liens il compte (affiché par la maquette : « neurones · liens »). */
export const TAILLE_RESEAU = {
  neurones: ENTREES.length + L1K.length + L1BK.length + L2K.length + MOODS.length + INTK.length,
  liens: [L1, L1B, L2, SORTIES, INTENT].reduce((n, t) => n + compter(t), 0),
};

