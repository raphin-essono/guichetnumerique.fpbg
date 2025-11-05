import { CommonModule, NgClass } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { SupportService, SupportContactData } from '../../services/support/support.service';
import { environment } from '../../../environments/environment';

type Appel = {
  id: string;
  code: string;
  titre: string;
  resume: string;
  tags: string[];
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NgClass, FormsModule],
  templateUrl: './home.html',
})
export class Home {
  private router = inject(Router);
  private elRef = inject(ElementRef<HTMLElement>);
  private supportService = inject(SupportService);

  // --- Liens officiels depuis environment ---
  liens = environment.liens;

  // --- État UI ---
  isMobileMenuOpen = signal(false);
  isScrolled = signal(false);
  isDropdownOpen = signal(false);

  // --- État formulaire de contact ---
  contactForm = {
    name: '',
    email: '',
    phone: '',
    message: ''
  };
  isSubmitting = signal(false);
  showSuccessModal = signal(false);
  errorMessage = signal<string | null>(null);

  // --- Données exemple pour le menu déroulant ---
  private _appels: Appel[] = [
    {
      id: 'aap-1',
      code: 'AAP-OBL-2025',
      titre: 'Conservation marine & littorale',
      resume: 'Soutien aux initiatives locales au Gabon.',
      tags: ['Marine', 'Littoral', 'Gabon'],
    },
  ];
  appels = () => this._appels;

  constructor() {
    // Fermer le menu à chaque navigation
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.isMobileMenuOpen.set(false);
      this.isDropdownOpen.set(false);
    });
  }

  // --- Toggle menu burger ---
  toggleMobileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isMobileMenuOpen.update((v) => !v);

    // Empêcher le scroll du body quand le menu est ouvert
    if (this.isMobileMenuOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    this.isDropdownOpen.set(false);
    document.body.style.overflow = '';
  }

  // --- Toggle dropdown Appels à Projet ---
  toggleDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isDropdownOpen.update((v) => !v);
  }

  // --- Clic extérieur ---
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const header = this.elRef.nativeElement.querySelector('[data-header-root]');
    const target = ev.target as Node;

    // Fermer le menu mobile si clic à l'extérieur
    if (this.isMobileMenuOpen() && header && !header.contains(target)) {
      this.closeMobileMenu();
    }

    // Fermer le dropdown si clic à l'extérieur
    if (this.isDropdownOpen() && header && !header.contains(target)) {
      this.isDropdownOpen.set(false);
    }
  }

  // --- Échap ---
  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeMobileMenu();
  }

  // --- Effet scroll ---
  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }

  // --- Scroll vers section ---
  scrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeMobileMenu();

    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 100);
  }

  // --- Gestion du formulaire de contact ---
  onSubmitContact(event: Event): void {
    event.preventDefault();

    // Réinitialiser les messages d'erreur
    this.errorMessage.set(null);

    // Validation basique
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      this.errorMessage.set('Veuillez remplir tous les champs requis');
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.contactForm.email)) {
      this.errorMessage.set('Veuillez entrer une adresse email valide');
      return;
    }

    // Validation longueur message
    if (this.contactForm.message.length < 10) {
      this.errorMessage.set('Le message doit contenir au moins 10 caractères');
      return;
    }

    // Indiquer que la soumission est en cours
    this.isSubmitting.set(true);

    // Préparer les données
    const data: SupportContactData = {
      name: this.contactForm.name.trim(),
      email: this.contactForm.email.trim(),
      phone: this.contactForm.phone.trim() || undefined,
      message: this.contactForm.message.trim()
    };

    // Envoyer le message
    this.supportService.sendSupportMessage(data).subscribe({
      next: (response) => {
        console.log('[SUCCESS] Message envoyé:', response);
        this.isSubmitting.set(false);
        this.showSuccessModal.set(true);

        // Réinitialiser le formulaire
        this.contactForm = {
          name: '',
          email: '',
          phone: '',
          message: ''
        };
      },
      error: (error) => {
        console.error('[ERROR] Erreur lors de l\'envoi:', error);
        this.isSubmitting.set(false);
        this.errorMessage.set(
          error.error?.message || 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.'
        );
      }
    });
  }

  // --- Fermer la modal de succès ---
  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
  }
}
