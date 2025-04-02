// Klucz API powinien być w zmiennych środowiskowych
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Interfejs dla wyników wyszukiwania
interface PlaceResult {
  place_id: string;
  formatted_address: string;
  name: string;
}

declare global {
  interface Window {
    google: any;
  }
}

// Funkcja do wyszukiwania miejsc
export const searchPlaces = async (query: string): Promise<PlaceResult[]> => {
  if (!query.trim()) return [];

  // Sprawdź czy API jest dostępne
  if (!window.google?.maps?.places?.AutocompleteService) {
    throw new Error('Google Maps API nie jest dostępne. Sprawdź czy API zostało poprawnie aktywowane w konsoli Google Cloud.');
  }

  return new Promise((resolve, reject) => {
    try {
      const service = new window.google.maps.places.AutocompleteService();
      
      service.getPlacePredictions(
        {
          input: query,
          language: 'pl',
        },
        (predictions: any[] | null, status: string) => {
          if (status === 'REQUEST_DENIED') {
            reject(new Error('Brak dostępu do Google Maps API. Sprawdź konfigurację API w konsoli Google Cloud.'));
            return;
          }

          if (status !== 'OK' || !predictions) {
            console.error('Status wyszukiwania:', status);
            resolve([]);
            return;
          }

          const results = predictions.map(prediction => ({
            place_id: prediction.place_id,
            formatted_address: prediction.description,
            name: prediction.structured_formatting.main_text
          }));

          resolve(results);
        }
      );
    } catch (error) {
      reject(new Error('Wystąpił błąd podczas inicjalizacji Google Maps API. Sprawdź konfigurację.'));
    }
  });
}; 