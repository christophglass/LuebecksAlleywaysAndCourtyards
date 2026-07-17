import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppLanguage, TranslationService } from '../core/translation.service';

interface GaengeEintrag {
  id: string;
  name: string;
  typ: string;
  adresse: {
    strasse: string;
    hausnummer: string | null;
  };
  status: string;
  zugaenglichkeit: string;
  koordinaten: { lat: number; lng: number } | null;
  kartenlinks: {
    openstreetmap_suche: string;
  };
}

interface GaengeDaten {
  umfang: { anzahl_eintraege: number };
  eintraege: GaengeEintrag[];
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  eintraege: GaengeEintrag[] = [];
  suchtext = '';
  typFilter = 'Alle';
  statusFilter = 'Alle';
  ansicht: 'liste' | 'karte' = 'liste';
  geladen = false;
  language: AppLanguage;

  constructor(
    private readonly http: HttpClient,
    private readonly translations: TranslationService,
  ) {
    this.language = translations.currentLanguage;
    this.translations.language$.subscribe((language) => this.language = language);
    this.http.get<GaengeDaten>('assets/data/gaenge_und_hoefe_luebeck.json').subscribe({
      next: (daten) => {
        this.eintraege = daten.eintraege;
        this.geladen = true;
      },
      error: () => this.geladen = true,
    });
  }

  t(key: string, params: Record<string, string | number> = {}): string {
    return this.translations.translate(key, params);
  }

  setLanguage(language: AppLanguage): void {
    this.translations.setLanguage(language);
  }

  get gefilterteEintraege(): GaengeEintrag[] {
    const suchtext = this.suchtext.trim().toLocaleLowerCase('de-DE');
    return this.eintraege.filter((eintrag) => {
      const suchtreffer = !suchtext || [
        eintrag.name,
        eintrag.typ,
        eintrag.adresse.strasse,
        eintrag.adresse.hausnummer ?? '',
      ].join(' ').toLocaleLowerCase('de-DE').includes(suchtext);
      const typTreffer = this.typFilter === 'Alle' || eintrag.typ === this.typFilter;
      const statusTreffer = this.statusFilter === 'Alle' || eintrag.status === this.statusFilter;
      return suchtreffer && typTreffer && statusTreffer;
    });
  }

  get typen(): string[] {
    return [...new Set(this.eintraege.map((eintrag) => eintrag.typ))].sort();
  }

  get statuswerte(): string[] {
    return [...new Set(this.eintraege.map((eintrag) => eintrag.status))].sort();
  }

  adresse(eintrag: GaengeEintrag): string {
    return `${eintrag.adresse.strasse}${eintrag.adresse.hausnummer ? ` ${eintrag.adresse.hausnummer}` : ''}`;
  }

  hatKoordinaten(eintrag: GaengeEintrag): boolean {
    return eintrag.koordinaten !== null;
  }

  trackById(_: number, eintrag: GaengeEintrag): string {
    return eintrag.id;
  }

}
