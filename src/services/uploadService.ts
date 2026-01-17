import { Service, Staff } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Upload image for a service
 */
export async function uploadServiceImage(serviceId: string, file: File): Promise<{ imageUrl: string; service: Service }> {
  const formData = new FormData();
  formData.append('image', file);

  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_URL}/upload/service/${serviceId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    // Handle network errors with clearer messages
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
      const apiUrl = API_URL.replace('/api', '');
      throw new Error(
        `Impossibile connettersi al server backend.\n\n` +
        `Possibili cause:\n` +
        `• Il server backend non è in esecuzione\n` +
        `• Stai accedendo da un IP non autorizzato\n` +
        `• Problema di configurazione CORS\n` +
        `• Certificato HTTPS non valido o scaduto\n\n` +
        `URL cercato: ${apiUrl}\n\n` +
        `Assicurati che il server backend sia avviato e che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.`
      );
    }
    if (error.message && error.message.includes('CORS')) {
      throw new Error('Errore di configurazione CORS. Verifica che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.');
    }
    throw error;
  }
}

/**
 * Delete image for a service
 */
export async function deleteServiceImage(serviceId: string): Promise<{ service: Service }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Autenticazione non disponibile. Riprova ad effettuare il login per caricare/eliminare immagini.');
  }

  try {
    const response = await fetch(`${API_URL}/upload/service/${serviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete image');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    // Handle network errors with clearer messages
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
      const apiUrl = API_URL.replace('/api', '');
      throw new Error(
        `Impossibile connettersi al server backend.\n\n` +
        `Possibili cause:\n` +
        `• Il server backend non è in esecuzione\n` +
        `• Stai accedendo da un IP non autorizzato\n` +
        `• Problema di configurazione CORS\n` +
        `• Certificato HTTPS non valido o scaduto\n\n` +
        `URL cercato: ${apiUrl}\n\n` +
        `Assicurati che il server backend sia avviato e che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.`
      );
    }
    if (error.message && error.message.includes('CORS')) {
      throw new Error('Errore di configurazione CORS. Verifica che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.');
    }
    throw error;
  }
}

/**
 * Upload profile image for a staff member
 */
export async function uploadStaffImage(staffId: string, file: File): Promise<{ imageUrl: string; staff: Staff }> {
  const formData = new FormData();
  formData.append('image', file);

  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_URL}/upload/staff/${staffId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    // Handle network errors with clearer messages
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
      const apiUrl = API_URL.replace('/api', '');
      throw new Error(
        `Impossibile connettersi al server backend.\n\n` +
        `Possibili cause:\n` +
        `• Il server backend non è in esecuzione\n` +
        `• Stai accedendo da un IP non autorizzato\n` +
        `• Problema di configurazione CORS\n` +
        `• Certificato HTTPS non valido o scaduto\n\n` +
        `URL cercato: ${apiUrl}\n\n` +
        `Assicurati che il server backend sia avviato e che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.`
      );
    }
    if (error.message && error.message.includes('CORS')) {
      throw new Error('Errore di configurazione CORS. Verifica che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.');
    }
    throw error;
  }
}

/**
 * Delete profile image for a staff member
 */
export async function deleteStaffImage(staffId: string): Promise<{ staff: Staff }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Autenticazione non disponibile. Riprova ad effettuare il login per caricare/eliminare immagini.');
  }

  try {
    const response = await fetch(`${API_URL}/upload/staff/${staffId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete image');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    // Handle network errors with clearer messages
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
      const apiUrl = API_URL.replace('/api', '');
      throw new Error(
        `Impossibile connettersi al server backend.\n\n` +
        `Possibili cause:\n` +
        `• Il server backend non è in esecuzione\n` +
        `• Stai accedendo da un IP non autorizzato\n` +
        `• Problema di configurazione CORS\n` +
        `• Certificato HTTPS non valido o scaduto\n\n` +
        `URL cercato: ${apiUrl}\n\n` +
        `Assicurati che il server backend sia avviato e che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.`
      );
    }
    if (error.message && error.message.includes('CORS')) {
      throw new Error('Errore di configurazione CORS. Verifica che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.');
    }
    throw error;
  }
}

/**
 * Get full URL for an image
 */
export function getImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;

  // If already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Images are served from server root (not /api path)
  // API_URL is http://localhost:3001/api, but images are at http://localhost:3001/uploads
  // So we need to extract base URL and append image path
  const baseUrl = API_URL.replace(/\/api$/, '');
  return `${baseUrl}${imageUrl}`;
}

// ============================================================================
// APK Repository Functions
// ============================================================================

export interface ApkFileInfo {
  id: string;
  fileName: string;
  filePath: string;
  version: string | null;
  fileSize: string; // BigInt as string
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * Upload APK file (RESPONSABILE only)
 */
export async function uploadApk(file: File): Promise<{ apk: ApkFileInfo }> {
  const formData = new FormData();
  formData.append('apk', file);

  const token = getAuthToken();
  if (!token) {
    throw new Error('Autenticazione richiesta');
  }

  try {
    const response = await fetch(`${API_URL}/upload/apk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante il caricamento dell\'APK');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    // Handle network errors with clearer messages
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
      const apiUrl = API_URL.replace('/api', '');
      throw new Error(
        `Impossibile connettersi al server backend.\n\n` +
        `Possibili cause:\n` +
        `• Il server backend non è in esecuzione\n` +
        `• Stai accedendo da un IP non autorizzato\n` +
        `• Problema di configurazione CORS\n` +
        `• Certificato HTTPS non valido o scaduto\n\n` +
        `URL cercato: ${apiUrl}\n\n` +
        `Assicurati che il server backend sia avviato e che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.`
      );
    }
    if (error.message && error.message.includes('CORS')) {
      throw new Error('Errore di configurazione CORS. Verifica che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.');
    }
    throw error;
  }
}

/**
 * Get current APK info
 */
export async function getApkInfo(): Promise<{ apk: ApkFileInfo | null }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Autenticazione richiesta');
  }

  try {
    const response = await fetch(`${API_URL}/upload/apk/info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante il recupero delle informazioni APK');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    // Handle network errors
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
      const apiUrl = API_URL.replace('/api', '');
      throw new Error(
        `Impossibile connettersi al server backend.\n\n` +
        `URL cercato: ${apiUrl}`
      );
    }
    throw error;
  }
}

/**
 * Get download URL for current APK
 */
export function getApkDownloadUrl(): string {
  const baseUrl = API_URL;
  return `${baseUrl}/upload/apk/download`;
}

/**
 * Delete current APK (RESPONSABILE only)
 */
export async function deleteApk(): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Autenticazione richiesta');
  }

  try {
    const response = await fetch(`${API_URL}/upload/apk`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante l\'eliminazione dell\'APK');
    }
  } catch (error: any) {
    // Handle network errors
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
      const apiUrl = API_URL.replace('/api', '');
      throw new Error(
        `Impossibile connettersi al server backend.\n\n` +
        `URL cercato: ${apiUrl}`
      );
    }
    throw error;
  }
}
