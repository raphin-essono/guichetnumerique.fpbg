import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


type CanalSondage =
  | 'RESEAUX_SOCIAUX' | 'EMAIL' | 'SITE_WEB' | 'PARTENAIRE'
  | 'BOUCHE_A_OREILLE' | 'EVENEMENT' | 'MOTEUR_RECHERCHE' | 'CHAINE_WHATSAPP' | 'AUTRE';

@Component({
  selector: 'app-fenetre-sondage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fenetre-sondage.component.html',
})
export class FenetreSondageComponent {
  @Input() visible = false;
  @Input() obligatoire = true;
  @Output() fermer = new EventEmitter<void>();


  // ← évènement renvoyant UN seul choix
  @Output() valider = new EventEmitter<{
    choixSelectionne: CanalSondage;
    texteAutre?: string;
    commentaire?: string;
  }>();

  canaux: { cle: CanalSondage; libelle: string }[] = [
    { cle: 'RESEAUX_SOCIAUX',  libelle: 'Réseaux sociaux' },
    { cle: 'EMAIL',            libelle: 'Email ou newsletter' },
    { cle: 'SITE_WEB',         libelle: 'Site web officiel' },
    { cle: 'PARTENAIRE',       libelle: 'Partenaire / Institution' },
    { cle: 'BOUCHE_A_OREILLE', libelle: 'Bouche-à-oreille' },
    { cle: 'EVENEMENT',        libelle: 'Événement / Conférence' },
    { cle: 'MOTEUR_RECHERCHE', libelle: 'Moteur de recherche' },
    { cle: 'CHAINE_WHATSAPP',  libelle: 'Chaîne WhatsApp' },
    { cle: 'AUTRE',            libelle: 'Autre (préciser)' },
  ];

  canalSelectionne: CanalSondage | null = null;     // ← unique
  texteAutre = '';
  commentaire = '';
  envoiEnCours = signal(false);
  erreur = signal<string | null>(null);

  get autreCoche() { return this.canalSelectionne === 'AUTRE'; }

  interrompre(e: MouseEvent) { e.stopPropagation(); }
  tenterFermer() { if (!this.obligatoire) this.fermer.emit(); }

  soumettre() {
    this.erreur.set(null);
    if (!this.canalSelectionne) {
      this.erreur.set('Sélectionnez un canal.'); return;
    }
    if (this.autreCoche && this.texteAutre.trim().length === 0) {
      this.erreur.set('Précisez le champ « Autre ».'); return;
    }
    this.envoiEnCours.set(true);
    this.valider.emit({
      choixSelectionne: this.canalSelectionne,
      texteAutre: this.autreCoche ? this.texteAutre.trim() : undefined,
      commentaire: this.commentaire?.trim() || undefined,
    });
  }
}
