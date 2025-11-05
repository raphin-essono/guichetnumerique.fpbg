/**
 * ====================================
 * GÉNÉRATEUR DE CODE OTP
 * ====================================
 *
 * Cette fonction génère un code OTP (One-Time Password) aléatoire
 * utilisé pour la vérification lors de l'inscription
 *
 * @param length - Longueur du code OTP (par défaut : 6 chiffres)
 * @returns Code OTP sous forme de chaîne de caractères
 *
 * Exemple : generateOtp() => "123456"
 */
export function generateOtp(length = 6): string {
  // Génère un nombre aléatoire entre 100000 et 999999 (6 chiffres)
  // puis le convertit en chaîne et tronque à la longueur souhaitée
  return Math.floor(100000 + Math.random() * 900000)
    .toString()
    .substring(0, length);
}
