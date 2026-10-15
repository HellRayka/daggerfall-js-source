// @ts-check
// G7 - THE SIXTEEN PRINCES (DaggerfallQuestPopupWindow.daedraData, MIT Daggerfall Workshop): each prince's faction, the
// quest a first summoning offers, his summoning day, his film, and the sky that favours him. A leaf - no import - since
// SUMMON-REPAIR (FIELD BUGS 2026-10-14): the account Worker reads which quest is a prince's (net/repairLaw.js), and
// systems/daedraSummoning.js, the table's home before, is no module it can bundle; daedraSummoning hands it on.

/** The sixteen princes, in DFU's own array order - the order is
 *  load-bearing twice: index 0 is Hircine (Glenmoril's, and excluded
 *  from the coven roll) and index 8 is Sheogorath (the gatecrasher). */
export const DAEDRA = Object.freeze([
  { factionId: 4, quest: 'X0C00Y00', dayOfYear: 155, video: 'HIRCINE.FLC', bonusCond: null, name: 'Hircine' },
  { factionId: 1, quest: 'V0C00Y00', dayOfYear: 1, video: 'CLAVICUS.FLC', bonusCond: null, name: 'Clavicus Vile' },
  { factionId: 2, quest: 'Y0C00Y00', dayOfYear: 320, video: 'MEHRUNES.FLC', bonusCond: null, name: 'Mehrunes Dagon' },
  { factionId: 3, quest: '20C00Y00', dayOfYear: 350, video: 'MOLAGBAL.FLC', bonusCond: null, name: 'Molag Bal' },
  { factionId: 5, quest: '70C00Y00', dayOfYear: 46, video: 'SANGUINE.FLC', bonusCond: 'Rain', name: 'Sanguine' },
  { factionId: 6, quest: '50C00Y00', dayOfYear: 99, video: 'PERYITE.FLC', bonusCond: 'Rain', name: 'Peryite' },
  { factionId: 7, quest: '80C0XY00', dayOfYear: 278, video: 'MALACATH.FLC', bonusCond: null, name: 'Malacath' },
  { factionId: 8, quest: 'W0C00Y00', dayOfYear: 65, video: 'HERMAEUS.FLC', bonusCond: null, name: 'Hermaeus Mora' },
  { factionId: 9, quest: '60C00Y00', dayOfYear: 32, video: 'SHEOGRTH.FLC', bonusCond: 'Thunder', name: 'Sheogorath' },
  { factionId: 10, quest: 'U0C00Y00', dayOfYear: 302, video: 'BOETHIAH.FLC', bonusCond: 'Rain', name: 'Boethiah' },
  { factionId: 11, quest: '30C00Y00', dayOfYear: 129, video: 'NAMIRA.FLC', bonusCond: null, name: 'Namira' },
  { factionId: 12, quest: '10C00Y00', dayOfYear: 13, video: 'MERIDIA.FLC', bonusCond: null, name: 'Meridia' },
  { factionId: 13, quest: '90C00Y00', dayOfYear: 190, video: 'VAERNIMA.FLC', bonusCond: null, name: 'Vaernima' },
  { factionId: 14, quest: '40C00Y00', dayOfYear: 248, video: 'NOCTURNA.FLC', bonusCond: 'Rain', name: 'Nocturnal' },
  { factionId: 15, quest: 'Z0C00Y00', dayOfYear: 283, video: 'MEPHALA.FLC', bonusCond: null, name: 'Mephala' },
  { factionId: 16, quest: 'T0C00Y00', dayOfYear: 81, video: 'AZURA.FLC', bonusCond: null, name: 'Azura' },
]);
