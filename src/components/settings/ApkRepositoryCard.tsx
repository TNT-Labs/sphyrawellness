/**
 * APK Repository Component for Settings
 * Allows RESPONSABILE to upload APK files for the mobile app
 * Allows all users to download the current APK
 */

import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Upload, Download, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { uploadApk, getApkInfo, deleteApk, getApkDownloadUrl, type ApkFileInfo } from '../../services/uploadService';
import { logger } from '../../utils/logger';

export default function ApkRepositoryCard(): JSX.Element {
  const { canModifySettings } = useAuth();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();

  const [apkInfo, setApkInfo] = useState<ApkFileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load APK info on component mount
  useEffect(() => {
    loadApkInfo();
  }, []);

  const loadApkInfo = async () => {
    try {
      setIsLoading(true);
      const { apk } = await getApkInfo();
      setApkInfo(apk);
    } catch (error) {
      logger.error('Error loading APK info:', error);
      // Don't show error on initial load - just log it
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.apk')) {
      showError('Seleziona un file APK valido');
      return;
    }

    // Validate file size (max 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('Il file APK è troppo grande (massimo 200MB)');
      return;
    }

    try {
      setIsUploading(true);
      const { apk } = await uploadApk(file);
      setApkInfo(apk);
      showSuccess('APK caricato con successo');

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      logger.error('Error uploading APK:', error);
      showError(error.message || 'Errore durante il caricamento dell\'APK');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Conferma eliminazione',
      message: 'Sei sicuro di voler eliminare l\'APK corrente? Questa azione non può essere annullata.',
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      await deleteApk();
      setApkInfo(null);
      showSuccess('APK eliminato con successo');
    } catch (error: any) {
      logger.error('Error deleting APK:', error);
      showError(error.message || 'Errore durante l\'eliminazione dell\'APK');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!apkInfo) return;

    const downloadUrl = getApkDownloadUrl();
    const token = localStorage.getItem('auth_token');

    // Create a temporary link with auth token
    const link = document.createElement('a');
    link.href = `${downloadUrl}`;
    link.download = apkInfo.fileName;

    // For authenticated downloads, we need to fetch and create blob
    fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = apkInfo.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Download avviato');
      })
      .catch(error => {
        logger.error('Error downloading APK:', error);
        showError('Errore durante il download dell\'APK');
      });
  };

  const formatFileSize = (bytes: string): string => {
    const size = parseInt(bytes, 10);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Repository App Mobile</h2>
          </div>
        </div>

        <div className="space-y-4">
          {/* Info section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Repository APK</p>
                <p className="text-blue-700">
                  In questa sezione puoi gestire il file APK dell'app mobile.
                  {canModifySettings() ? ' Come ADMIN puoi caricare nuove versioni dell\'APK.' : ' Puoi scaricare l\'ultima versione disponibile.'}
                </p>
              </div>
            </div>
          </div>

          {/* Current APK Info */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Caricamento...</p>
            </div>
          ) : apkInfo ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 mb-1">APK Disponibile</p>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Nome file:</strong> {apkInfo.fileName}</p>
                    <p><strong>Dimensione:</strong> {formatFileSize(apkInfo.fileSize)}</p>
                    <p><strong>Caricato il:</strong> {formatDate(apkInfo.uploadedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Scarica APK
                </button>

                {canModifySettings() && (
                  <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Elimina
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Nessun APK disponibile</p>
              {canModifySettings() && (
                <p className="text-sm text-gray-500 mt-1">Carica un file APK per renderlo disponibile agli utenti</p>
              )}
            </div>
          )}

          {/* Upload section (RESPONSABILE only) */}
          {canModifySettings() && (
            <div className="border-t border-gray-200 pt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Caricamento in corso...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {apkInfo ? 'Carica Nuova Versione APK' : 'Carica APK'}
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Formati supportati: .apk (max 200MB)
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog />
    </>
  );
}
