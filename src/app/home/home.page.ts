import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
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
export class HomePage implements AfterViewInit {
  @ViewChild('mapElement') mapElement?: ElementRef<HTMLElement>;

  eintraege: GaengeEintrag[] = [];
  suchtext = '';
  typFilter = 'Alle';
  statusFilter = 'Alle';
  ansicht: 'liste' | 'karte' = 'karte';
  geladen = false;
  language: AppLanguage;
  private map?: L.Map;
  private markerLayer?: L.LayerGroup;

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
        this.addMarkers();
      },
      error: () => this.geladen = true,
    });
  }

  ngAfterViewInit(): void {
    if (this.ansicht === 'karte') {
      this.initializeMap();
    }
  }

  onViewChange(): void {
    this.map?.remove();
    this.map = undefined;
    if (this.ansicht === 'karte') {
      setTimeout(() => this.initializeMap());
    }
  }

  private initializeMap(): void {
    const element = this.mapElement?.nativeElement;
    if (!element || this.map) return;

    const altstadtBounds = L.latLngBounds(
      [53.852, 10.666],
      [53.884, 10.716],
    );

    this.map = L.map(element, {
      minZoom: 14,
      maxZoom: 19,
      maxBounds: altstadtBounds,
      maxBoundsViscosity: 1,
      zoomControl: true,
    }).setView([53.868, 10.694], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.addMarkers();

    // Ionic finalizes the content dimensions after the view has been created.
    setTimeout(() => this.map?.invalidateSize(), 150);
  }

  private addMarkers(): void {
    if (!this.map) return;

    this.markerLayer?.clearLayers();
    this.markerLayer ??= L.layerGroup().addTo(this.map);

    this.eintraege
      .filter((eintrag) => eintrag.koordinaten !== null)
      .forEach((eintrag) => {
        const koordinaten = eintrag.koordinaten!;
        const iconName = eintrag.typ === 'Hof' ? 'home-outline' : 'walk-outline';
        const markerIcon = L.divIcon({
          className: 'luebeck-marker-wrapper',
          html: `<span class="luebeck-marker"><ion-icon name="${iconName}"></ion-icon></span>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -22],
        });

        L.marker([koordinaten.lat, koordinaten.lng], { icon: markerIcon })
          .bindPopup(this.popupContent(eintrag))
          .addTo(this.markerLayer!);
      });
  }

  private popupContent(eintrag: GaengeEintrag): string {
    const mapLink = eintrag.kartenlinks.openstreetmap_suche;
    return `<strong>${this.escapeHtml(eintrag.name)}</strong>`
      + `<br>${this.escapeHtml(this.adresse(eintrag))}`
      + `<br><small>${this.escapeHtml(eintrag.status)} · ${this.escapeHtml(eintrag.zugaenglichkeit)}</small>`
      + `<br><a href="${this.escapeHtml(mapLink)}" target="_blank" rel="noopener">OpenStreetMap öffnen</a>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    })[character] ?? character);
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
