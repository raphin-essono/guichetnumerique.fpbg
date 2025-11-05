/**
 * Script pour corriger les idSoumisPar dans la table DemandeSubvention
 *
 * Ce script associe les demandes orphelines à un utilisateur spécifique.
 * Utilisez-le quand les projets ont été créés avec un ancien ID utilisateur.
 */

import prisma from '../config/db.js';

async function fixDemandesOwner() {
  console.log('🔧 Correction des propriétaires de demandes...\n');

  try {
    // 1. Lister tous les utilisateurs
    const utilisateurs = await prisma.utilisateur.findMany({
      select: { id: true, email: true, prenom: true, nom: true }
    });

    console.log('📋 Utilisateurs disponibles:');
    utilisateurs.forEach((u, index) => {
      console.log(`  ${index + 1}. ${u.email} (ID: ${u.id}) - ${u.prenom} ${u.nom || ''}`);
    });

    // 2. Trouver les demandes sans propriétaire ou avec un propriétaire invalide
    const demandesSansProprietaire = await prisma.demandeSubvention.findMany({
      where: {
        OR: [
          { idSoumisPar: null },
          {
            NOT: {
              soumisPar: {
                is: {}
              }
            }
          }
        ]
      },
      select: { id: true, titre: true, idSoumisPar: true, creeLe: true }
    });

    console.log(`\n❓ Demandes sans propriétaire valide: ${demandesSansProprietaire.length}`);
    demandesSansProprietaire.forEach(d => {
      console.log(`  - ${d.titre} (idSoumisPar: ${d.idSoumisPar || 'NULL'})`);
    });

    // 3. Option interactive : choisir l'utilisateur
    console.log('\n⚠️  IMPORTANT: Ce script va assigner ces demandes à un utilisateur.');
    console.log('   Utilisez ce script uniquement si vous êtes sûr de vouloir faire cette modification.\n');

    // Pour l'exécution automatique, assignons au premier utilisateur
    // Dans un vrai environnement, vous devriez utiliser readline pour une saisie interactive

    if (utilisateurs.length === 0) {
      console.error('❌ Aucun utilisateur trouvé dans la base de données.');
      return;
    }

    if (demandesSansProprietaire.length === 0) {
      console.log('✅ Aucune demande à corriger. Tout est en ordre !');
      return;
    }

    // Pour cet exemple, on assigne au premier utilisateur
    const utilisateurCible = utilisateurs[0];
    console.log(`\n🎯 Attribution des demandes à: ${utilisateurCible.email} (${utilisateurCible.id})`);

    // 4. Mettre à jour les demandes
    const result = await prisma.demandeSubvention.updateMany({
      where: {
        id: {
          in: demandesSansProprietaire.map(d => d.id)
        }
      },
      data: {
        idSoumisPar: utilisateurCible.id
      }
    });

    console.log(`\n✅ ${result.count} demande(s) mise(s) à jour avec succès !`);

    // 5. Vérifier le résultat
    const verification = await prisma.demandeSubvention.findMany({
      where: {
        idSoumisPar: utilisateurCible.id
      },
      select: { id: true, titre: true, creeLe: true }
    });

    console.log(`\n📊 Demandes maintenant associées à ${utilisateurCible.email}:`);
    verification.forEach(d => {
      console.log(`  ✓ ${d.titre} (créé le ${d.creeLe.toLocaleDateString()})`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour assigner à un utilisateur spécifique par email
export async function assignDemandesTo(email: string) {
  console.log(`🔧 Attribution des demandes orphelines à ${email}...\n`);

  try {
    // Trouver l'utilisateur
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true, email: true, prenom: true, nom: true }
    });

    if (!utilisateur) {
      console.error(`❌ Utilisateur avec l'email "${email}" introuvable.`);
      return;
    }

    console.log(`✓ Utilisateur trouvé: ${utilisateur.prenom} ${utilisateur.nom || ''} (${utilisateur.id})`);

    // Trouver les demandes orphelines
    const demandes = await prisma.demandeSubvention.findMany({
      where: {
        OR: [
          { idSoumisPar: null },
          {
            NOT: {
              soumisPar: {
                is: {}
              }
            }
          }
        ]
      },
      select: { id: true, titre: true }
    });

    if (demandes.length === 0) {
      console.log('✅ Aucune demande orpheline à corriger.');
      return;
    }

    console.log(`\n📋 ${demandes.length} demande(s) orpheline(s) trouvée(s):`);
    demandes.forEach(d => console.log(`  - ${d.titre}`));

    // Mettre à jour
    const result = await prisma.demandeSubvention.updateMany({
      where: {
        id: {
          in: demandes.map(d => d.id)
        }
      },
      data: {
        idSoumisPar: utilisateur.id
      }
    });

    console.log(`\n✅ ${result.count} demande(s) attribuée(s) à ${utilisateur.email} avec succès !`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour assigner des demandes spécifiques par leur ancien idSoumisPar
export async function migrateDemandesFromOldUser(oldUserId: string, newUserEmail: string) {
  console.log(`🔄 Migration des demandes de l'ancien utilisateur ${oldUserId} vers ${newUserEmail}...\n`);

  try {
    // Trouver le nouvel utilisateur
    const newUser = await prisma.utilisateur.findUnique({
      where: { email: newUserEmail },
      select: { id: true, email: true }
    });

    if (!newUser) {
      console.error(`❌ Utilisateur avec l'email "${newUserEmail}" introuvable.`);
      return;
    }

    // Trouver les demandes avec l'ancien ID
    const demandes = await prisma.demandeSubvention.findMany({
      where: { idSoumisPar: oldUserId },
      select: { id: true, titre: true }
    });

    if (demandes.length === 0) {
      console.log(`❌ Aucune demande trouvée pour l'ancien utilisateur ${oldUserId}`);
      return;
    }

    console.log(`\n📋 ${demandes.length} demande(s) trouvée(s) avec l'ancien ID:`);
    demandes.forEach(d => console.log(`  - ${d.titre}`));

    // Mettre à jour
    const result = await prisma.demandeSubvention.updateMany({
      where: { idSoumisPar: oldUserId },
      data: { idSoumisPar: newUser.id }
    });

    console.log(`\n✅ ${result.count} demande(s) migrée(s) vers ${newUser.email} (${newUser.id}) avec succès !`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args[0] === '--assign' && args[1]) {
    // Assigner à un email spécifique
    assignDemandesTo(args[1]);
  } else if (args[0] === '--migrate' && args[1] && args[2]) {
    // Migrer d'un ancien ID vers un nouvel email
    migrateDemandesFromOldUser(args[1], args[2]);
  } else {
    // Correction automatique
    fixDemandesOwner();
  }
}

export default fixDemandesOwner;
