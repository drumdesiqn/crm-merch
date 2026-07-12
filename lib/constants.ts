/**
 * Default glossary terms seeded when no terms exist in the DB.
 */
export const DEFAULT_GLOSSARY = [
  { term: "Halfmoon", definition: "Meuble/display métallique arrondi installé en magasin pour présenter les produits Mars" },
  { term: "HM", definition: "Abréviation de Halfmoon" },
  { term: "Clipstrip", definition: "Bande plastique accrochée en rayon permettant d'exposer des produits supplémentaires" },
  { term: "C&T", definition: "Confiserie & Tablette — catégorie de produits chocolat/confiserie" },
  { term: "MEUBLES SELF C/O", definition: "Mobilier libre-service à vérifier, remplir et maintenir" },
  { term: "Ad Hoc", definition: "Visite ponctuelle hors planning standard pour une mission spécifique" },
  { term: "Maintenance", definition: "Visite de routine : remplissage produits, facing, vérification des prix, mise en ordre du rayon" },
  { term: "Sales rep", definition: "Représentant commercial Mars à contacter en cas de problème en magasin" },
  { term: "Facing", definition: "Mise en avant des produits en rayon (produits bien alignés et visibles en façade)" },
  { term: "CRF MKT", definition: "Carrefour Market" },
  { term: "CRF EXPRESS", definition: "Carrefour Express" },
  { term: "AD DELHAIZE", definition: "AD Delhaize — magasin affilié Delhaize" },
  { term: "INTERMARCHE", definition: "Intermarché" },
];

/**
 * Single source of truth for material types across the app.
 * Used by: MaterialTypeSelector component, /api/guide route.
 */
export const MATERIAL_TYPES: { name: string; category: string }[] = [
  // Snacking
  { name: "TG star", category: "snacking" },
  { name: "Butter", category: "snacking" },
  { name: "Halfmoon", category: "snacking" },
  { name: "Modulair", category: "snacking" },
  { name: "Accroche", category: "snacking" },
  { name: "Choco boutique", category: "snacking" },
  { name: "Colorworks", category: "snacking" },
  { name: "S180", category: "snacking" },
  { name: "Self check out 3 layer display", category: "snacking" },
  { name: "BE KIND single tower & metal HP tower", category: "snacking" },
  { name: "BE KIND 3 layer display", category: "snacking" },
  { name: "Plastic box & wooden box", category: "snacking" },
  { name: "Display", category: "snacking" },
  { name: "Arch", category: "snacking" },
  { name: "Totem", category: "snacking" },
  { name: "Standee", category: "snacking" },
  { name: "Pop up", category: "snacking" },
  { name: "Storbak/dumbbin display/flexi", category: "snacking" },
  { name: "Big wobbler (totem, arch, display)", category: "snacking" },
  { name: "Small wobbler (shelf)", category: "snacking" },
  { name: "Small & big freezer", category: "snacking" },
  // Food & Pet
  { name: "Arch (Pet)", category: "food-pet" },
  { name: "Totem (Pet)", category: "food-pet" },
  { name: "Caisse & Treat Furniture", category: "food-pet" },
  { name: "Wobbler in shelf", category: "food-pet" },
  { name: "Dumpbins & Free sample wobbler", category: "food-pet" },
  { name: "Special flexis", category: "food-pet" },
  { name: "Flexi Whiskas", category: "food-pet" },
  { name: "Flexi Sheba & Catisfactions", category: "food-pet" },
  { name: "Display (Pet)", category: "food-pet" },
  { name: "Display & Totem", category: "food-pet" },
  { name: "Flexis + totem + arch", category: "food-pet" },
];

/**
 * Mars team contacts. Centralized here for easy maintenance.
 * Future improvement: move to DB with an admin CRUD UI.
 */
export interface Contact {
  name: string;
  phone: string;
  email: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  contacts: Contact[];
}

export const TEAMS: Team[] = [
  {
    id: "snacking",
    name: "Mars Snacking",
    color: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
    contacts: [
      { name: "Ann-Sophie Noppe",        phone: "+32 472 07 15 63", email: "annsophie.noppe@effem.com" },
      { name: "Anne-Sophie Roose",       phone: "+32 497 51 57 15", email: "anne-sophie.roose@effem.com" },
      { name: "Annelies Heerwegh",       phone: "+32 470 38 21 78", email: "annelies.heerwegh@effem.com" },
      { name: "Didier Brynaert",         phone: "+32 499 58 59 40", email: "didier.brynaert@effem.com" },
      { name: "Jean-Jacques Bartholoméi",phone: "+32 493 31 59 07", email: "jeanjacques.bartholomei@effem.com" },
      { name: "Jordy Moonen",            phone: "+32 478 18 96 17", email: "jordy.moonen@effem.com" },
      { name: "Kristof Lowartz",         phone: "+32 491 90 98 24", email: "kristof.lowartz@effem.com" },
      { name: "Maxim Philippe",          phone: "+32 496 40 33 75", email: "maxim.philippe@effem.com" },
      { name: "Olivier Bex",             phone: "+32 493 09 65 65", email: "olivier.bex@effem.com" },
      { name: "Souliman Bensellam",      phone: "+32 492 73 03 67", email: "souliman.bensellam@effem.com" },
      { name: "Yassine Boulif",          phone: "+32 499 58 59 36", email: "yassine.boulit@effem.com" },
    ],
  },
  {
    id: "food-pet",
    name: "Mars Food & Pet Nutrition",
    color: "bg-blue-100 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300",
    contacts: [
      { name: "An Vangerven",       phone: "+32 476 50 78 71", email: "an.vangerven@effem.com" },
      { name: "Benjamin Francq",    phone: "+32 499 58 59 38", email: "benjamin.francq@effem.com" },
      { name: "Fabrizio Antonini",  phone: "+32 493 09 65 46", email: "fabrizio.antonini@effem.com" },
      { name: "Marie-Ysaline Minet",phone: "+32 474 70 95 13", email: "marieysaline.minet@effem.com" },
      { name: "Pierre Grotz",       phone: "+32 476 55 77 46", email: "pierre.grotz@effem.com" },
      { name: "Sofie Kina",         phone: "+32 497 51 60 55", email: "sofie.kina@effem.com" },
    ],
  },
  {
    id: "spt",
    name: "Mars SPT",
    color: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400",
    contacts: [
      { name: "Arnaud Van Pellecom", phone: "+32 493 97 70 88", email: "arnaud.van.pellecom@effem.com" },
      { name: "Dominique Colot",     phone: "+32 495 59 65 37", email: "dominique.colot@effem.com" },
      { name: "Stijn Dhooge",        phone: "+32 496 59 12 53", email: "stijn.dhooge@effem.com" },
    ],
  },
];

/**
 * Get material types grouped by category, for use in the selector component.
 */
export function getMaterialTypesByCategory(): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const m of MATERIAL_TYPES) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m.name);
  }
  return grouped;
}
