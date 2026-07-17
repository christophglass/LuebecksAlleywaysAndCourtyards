import { AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { Geolocation, Position } from '@capacitor/geolocation';
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
  private readonly http = inject(HttpClient);
  private readonly translations = inject(TranslationService);

  eintraege: GaengeEintrag[] = [];
  suchtext = '';
  typFilter = 'Alle';
  statusFilter = 'Alle';
  ansicht: 'liste' | 'karte' = 'karte';
  geladen = false;
  language: AppLanguage;
  locationMessage = '';
  private map?: L.Map;
  private markerLayer?: L.LayerGroup;
  private userLocationMarker?: L.Marker;
  private locationWatchId?: string;
  private lastPosition?: Position;

  constructor() {
    this.language = this.translations.currentLanguage;
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
    this.markerLayer = undefined;
    this.userLocationMarker = undefined;
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
    if (this.lastPosition) {
      this.updateUserLocation(this.lastPosition);
    } else if (this.locationMessage) {
      this.showFallbackLocation();
    } else {
      this.startLocationTracking();
    }

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

  async locateUser(): Promise<void> {
    try {
      await Geolocation.requestPermissions();
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      });
      this.updateUserLocation(position);
    } catch {
      this.showFallbackLocation();
    }
  }

  private async startLocationTracking(): Promise<void> {
    if (this.locationWatchId) return;

    await this.locateUser();
    try {
      this.locationWatchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, maximumAge: 5000 },
        (position) => {
          if (position) this.updateUserLocation(position);
        },
      );
    } catch {
      this.showFallbackLocation();
    }
  }

  private updateUserLocation(position: Position): void {
    this.lastPosition = position;
    if (!this.map) return;

    const actualLocation = L.latLng(position.coords.latitude, position.coords.longitude);
    const isInsideAltstadt = actualLocation.lat >= 53.852
      && actualLocation.lat <= 53.884
      && actualLocation.lng >= 10.666
      && actualLocation.lng <= 10.716;
    const displayLocation = isInsideAltstadt
      ? actualLocation
      : L.latLng(53.8688, 10.6697);

    this.locationMessage = isInsideAltstadt ? '' : this.t('locationFallback');
    this.setDisplayedLocation(
      displayLocation,
      this.locationPopup(isInsideAltstadt),
      isInsideAltstadt ? 17 : 14,
    );
  }

  private showFallbackLocation(): void {
    const fallbackLocation = L.latLng(53.8688, 10.6697);
    this.locationMessage = this.t('locationFallbackUnavailable');
    this.setDisplayedLocation(
      fallbackLocation,
      `<strong>${this.escapeHtml(this.t('locationFallbackTitle'))}</strong><br>${this.escapeHtml(this.t('locationFallbackUnavailable'))}`,
      14,
    );
  }

  private setDisplayedLocation(location: L.LatLng, popup: string, zoom: number): void {
    if (!this.map) return;

    const locationIcon = L.divIcon({
      className: 'user-location-wrapper',
      html: '<span class="user-location-marker"><ion-icon name="locate-outline"></ion-icon></span>',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng(location);
      this.userLocationMarker.setPopupContent(popup);
      this.map.setView(location, zoom);
      return;
    }

    this.userLocationMarker = L.marker(location, {
      icon: locationIcon,
      zIndexOffset: 1000,
    }).addTo(this.map);
    this.userLocationMarker.bindPopup(popup);
    this.map.setView(location, zoom);
  }

  private locationPopup(isInsideAltstadt: boolean): string {
    return isInsideAltstadt
      ? `<strong>${this.escapeHtml(this.t('yourLocation'))}</strong>`
      : `<strong>${this.escapeHtml(this.t('locationFallbackTitle'))}</strong><br>${this.escapeHtml(this.t('locationFallback'))}`;
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
