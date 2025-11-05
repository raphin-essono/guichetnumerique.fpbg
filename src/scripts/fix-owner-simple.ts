import prisma from '../config/db.js';

async function main() {
  const OLD_USER_ID = '6f7affea-3e0a-4811-a0d7-23736ca864ad';
  const NEW_USER_EMAIL = 'gersonsacama1@gmail.com';

  console.log('🔄 Migration des demandes...');
  console.log(`   Ancien ID: ${OLD_USER_ID}`);
  console.log(`   Nouvel email: ${NEW_USER_EMAIL}\n`);

  // Trouver le nouvel utilisateur
  const newUser = await prisma.utilisateur.findUnique({
    where: { email: NEW_USER_EMAIL }
  });

  if (!newUser) {
    console.error('❌ Utilisateur introuvable !');
    process.exit(1);
  }

  console.log(`✓ Utilisateur trouvé: ${newUser.prenom} (ID: ${newUser.id})\n`);

  // Compter les demandes à migrer
  const count = await prisma.demandeSubvention.count({
    where: { idSoumisPar: OLD_USER_ID }
  });

  console.log(`📊 Demandes à migrer: ${count}`);

  if (count === 0) {
    console.log('✅ Aucune demande à migrer.');
    process.exit(0);
  }

  // Migrer
  const result = await prisma.demandeSubvention.updateMany({
    where: { idSoumisPar: OLD_USER_ID },
    data: { idSoumisPar: newUser.id }
  });

  console.log(`\n✅ ${result.count} demande(s) migrée(s) avec succès !`);

  // Vérifier
  const verification = await prisma.demandeSubvention.findMany({
    where: { idSoumisPar: newUser.id },
    select: { titre: true, creeLe: true }
  });

  console.log(`\n📋 Demandes maintenant associées à ${NEW_USER_EMAIL}:`);
  verification.forEach(d => {
    console.log(`  ✓ ${d.titre}`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Erreur:', error);
    prisma.$disconnect();
    process.exit(1);
  });
