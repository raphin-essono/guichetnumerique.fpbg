import { DatePipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type GrantMini = {
  name: 'Petite subvention' | 'Subvention moyenne';
  min: number; // FCFA
  max: number; // FCFA
  deadline: string; // ISO date (Note conceptuelle)
};

type AAPCard = {
  id: string;
  code: string;
  titre: string;
  resume: string;
  launchDate: string; // ISO
  cover?: string; // url image éventuelle
  grants: GrantMini[];
  tags: string[];
};

const AAP_CARDS: AAPCard[] = [
  {
    id: 'aap-obl-2025',
    code: 'AAP-OBL-2025',
    titre: 'Conservation marine et littorale (Obligations Bleues – FPBG)',
    resume: `Appel visant des projets locaux de protection, restauration, sensibilisation et gestion durable des écosystèmes marins et littoraux au Gabon.`,
    launchDate: '2025-09-22',
    tags: ['Gabon', 'Océan & littoral', 'FPBG'],
    grants: [
      { name: 'Petite subvention', min: 5_000_000, max: 50_000_000, deadline: '2025-11-23' },
      { name: 'Subvention moyenne', min: 51_000_000, max: 200_000_000, deadline: '2025-11-23' },
    ],
  },
];

@Component({
  selector: 'liste-appels',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, DatePipe],
  templateUrl: './liste-appels.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeAppels {
  readonly search = signal('');
  readonly typeFilter = signal<'all' | 'petite' | 'moyenne'>('all');

  readonly appels = signal<AAPCard[]>(AAP_CARDS);

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const t = this.typeFilter();
    return this.appels().filter((a) => {
      const matchText =
        !q ||
        a.titre.toLowerCase().includes(q) ||
        a.resume.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.tags.some((tag) => tag.toLowerCase().includes(q));

      const matchType =
        t === 'all' ||
        (t === 'petite' && a.grants.some((g) => g.name === 'Petite subvention')) ||
        (t === 'moyenne' && a.grants.some((g) => g.name === 'Subvention moyenne'));

      return matchText && matchType;
    });
  });

  fmt(n: number) {
    return n.toLocaleString('fr-FR') + ' FCFA';
  }

  daysLeft(iso: string) {
    const dl = new Date(iso).getTime();
    const now = Date.now();
    const d = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
    if (isNaN(d)) return '—';
    return d >= 0 ? `J-${d}` : `Clôturé (${Math.abs(d)} j)`;
    // NB : badge purement indicatif
  }
}
