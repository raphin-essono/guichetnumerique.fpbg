import prisma from '../config/db.js';

async function main() {
  const userId = '184ed2cb-d607-4379-aace-62a764ce5cf6';

  console.log(`📊 Vérification des demandes pour l'utilisateur ${userId}\n`);

  const demandes = await prisma.demandeSubvention.findMany({
    where: { idSoumisPar: userId },
    select: {
      id: true,
      titre: true,
      statut: true,
      creeLe: true,
      misAJourLe: true,
      localisation: true,
      dureeMois: true
    },
    orderBy: { creeLe: 'desc' }
  });

  console.log(`✅ ${demandes.length} demande(s) trouvée(s):\n`);

  demandes.forEach((d, i) => {
    console.log(`${i + 1}. ${d.titre}`);
    console.log(`   ID: ${d.id}`);
    console.log(`   Statut: ${d.statut}`);
    console.log(`   Créé le: ${d.creeLe.toLocaleString()}`);
    console.log(`   Mis à jour: ${d.misAJourLe.toLocaleString()}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
