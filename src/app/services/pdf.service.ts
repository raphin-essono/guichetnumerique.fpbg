import { Injectable } from '@angular/core';

export interface PdfValidationResult {
  valid: boolean;
  error?: string;
}

export interface PdfConversionResult {
  success: boolean;
  base64?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB en bytes
  private readonly ALLOWED_TYPE = 'application/pdf';

  constructor() {}

  /**
   * Valide un fichier PDF (type et taille)
   */
  validatePdfFile(file: File): PdfValidationResult {
    // Vérifier le type
    if (file.type !== this.ALLOWED_TYPE) {
      return {
        valid: false,
        error: 'Le fichier doit être au format PDF uniquement.'
      };
    }

    // Vérifier la taille
    if (file.size > this.MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `Le fichier est trop volumineux (${sizeMB}MB). La taille maximale autorisée est de 10MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Convertit un fichier PDF en Base64
   */
  async convertPdfToBase64(file: File): Promise<PdfConversionResult> {
    // Valider d'abord
    const validation = this.validatePdfFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const result = e.target.result;
        const base64 = result.split(',')[1]; // Retirer le préfixe "data:application/pdf;base64,"

        resolve({
          success: true,
          base64: base64,
          fileName: file.name,
          fileSize: file.size
        });
      };

      reader.onerror = (error) => {
        console.error('Erreur lors de la lecture du fichier:', error);
        resolve({
          success: false,
          error: 'Erreur lors de la lecture du fichier PDF.'
        });
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Convertit plusieurs fichiers PDF en Base64
   */
  async convertMultiplePdfsToBase64(files: File[]): Promise<PdfConversionResult[]> {
    const promises = files.map(file => this.convertPdfToBase64(file));
    return Promise.all(promises);
  }

  /**
   * Formate la taille d'un fichier en format lisible
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Génère un data URL à partir du Base64
   */
  getDataUrl(base64: string): string {
    return `data:application/pdf;base64,${base64}`;
  }

  /**
   * Crée un lien de téléchargement pour un PDF en Base64
   */
  createDownloadLink(base64: string, fileName: string): string {
    return this.getDataUrl(base64);
  }
}
