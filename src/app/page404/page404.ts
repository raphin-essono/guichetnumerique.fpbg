import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page404',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './page404.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Page404 {
  goBack(): void {
    // Optionnel : bouton "Retour"
    if (history.length > 1) history.back();
  }
}
