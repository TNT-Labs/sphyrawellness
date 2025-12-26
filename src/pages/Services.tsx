import React, { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { useDebounce } from '../hooks/useDebounce';
import { Service } from '../types';
import { Plus, Search, Edit, Trash2, Scissors, Clock, Euro, Calendar, X, Upload, Image as ImageIcon } from 'lucide-react';
import { generateId, validateAmount, validateDuration } from '../utils/helpers';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { logger } from '../utils/logger';
import { isToday, parseISO } from 'date-fns';
import AppointmentModal from '../components/calendar/AppointmentModal';
import { uploadServiceImage, deleteServiceImage, getImageUrl } from '../services/uploadService';

const Services: React.FC = () => {
  const { services, addService, updateService, deleteService, serviceCategories, appointments } = useApp();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if filter=today is present
  const filterToday = searchParams.get('filter') === 'today';

  // Debounce search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    category: '',
    color: '#ec4899',
  });

  // Filter only active categories
  const activeCategories = serviceCategories.filter(c => c.isActive);

  // Get service IDs used in appointments today
  const todayServiceIds = useMemo(() => {
    if (!filterToday) return null;
    const todayAppointments = appointments.filter((apt) => isToday(parseISO(apt.date)));
    return new Set(todayAppointments.map((apt) => apt.serviceId));
  }, [appointments, filterToday]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Filter by today's appointments if enabled
      if (filterToday && todayServiceIds && !todayServiceIds.has(service.id)) {
        return false;
      }

      // Filter by search term
      const searchLower = debouncedSearchTerm.toLowerCase();
      const categoryName = serviceCategories.find(c => c.id === service.category)?.name || '';
      return (
        service.name.toLowerCase().includes(searchLower) ||
        categoryName.toLowerCase().includes(searchLower) ||
        service.description.toLowerCase().includes(searchLower)
      );
    });
  }, [services, debouncedSearchTerm, serviceCategories, filterToday, todayServiceIds]);

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
        category: service.category,
        color: service.color || '#ec4899',
      });
      // Set image preview if service has an image
      if (service.imageUrl) {
        setImagePreview(getImageUrl(service.imageUrl) || null);
      }
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        duration: 60,
        price: 0,
        category: '',
        color: '#ec4899',
      });
      setSelectedImage(null);
      setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setSelectedImage(null);
    setImagePreview(null);
  };

  // ESC key to close modal
  useEscapeKey(handleCloseModal, isModalOpen);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Per favore seleziona un file immagine valido');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError('L\'immagine deve essere inferiore a 5MB');
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async () => {
    if (editingService && editingService.imageUrl) {
      // If editing and service has an image, delete it from server
      const confirmed = await confirm({
        title: 'Rimuovi Immagine',
        message: 'Sei sicuro di voler rimuovere l\'immagine del servizio?',
        confirmText: 'Rimuovi',
        variant: 'danger',
      });

      if (confirmed) {
        try {
          setIsUploadingImage(true);
          const { service } = await deleteServiceImage(editingService.id);
          await updateService(service);
          showSuccess('Immagine rimossa con successo!');
          setImagePreview(null);
          setSelectedImage(null);
        } catch (error) {
          showError('Errore durante la rimozione dell\'immagine');
          logger.error('Error deleting image:', error);
        } finally {
          setIsUploadingImage(false);
        }
      }
    } else {
      // Just clear the preview
      setImagePreview(null);
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const serviceData: Service = {
      id: editingService?.id || generateId(),
      ...formData,
      // Preserve existing image URL if not uploading a new image
      imageUrl: editingService?.imageUrl,
    };

    try {
      // Save service first
      if (editingService) {
        await updateService(serviceData);
      } else {
        await addService(serviceData);
      }

      // Then upload image if selected
      if (selectedImage) {
        setIsUploadingImage(true);
        try {
          const { service } = await uploadServiceImage(serviceData.id, selectedImage);
          // FIX: Preserve original service data, only update imageUrl
          // This prevents the backend's minimal placeholder data from overwriting the correct service data
          await updateService({
            ...serviceData,
            imageUrl: service.imageUrl,
            updatedAt: service.updatedAt
          });
          showSuccess(editingService ? 'Servizio e immagine aggiornati con successo!' : 'Servizio e immagine aggiunti con successo!');
          // Wait a bit to ensure React updates the UI before closing modal
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          showError('Servizio salvato ma errore durante il caricamento dell\'immagine');
          logger.error('Error uploading image:', error);
        } finally {
          setIsUploadingImage(false);
        }
      } else {
        showSuccess(editingService ? 'Servizio aggiornato con successo!' : 'Servizio aggiunto con successo!');
      }

      handleCloseModal();
    } catch (error) {
      showError('Errore durante il salvataggio del servizio');
      logger.error('Error saving service:', error);
    }
  };

  const handleDelete = async (service: Service) => {
    const confirmed = await confirm({
      title: 'Elimina Servizio',
      message: `Sei sicuro di voler eliminare "${service.name}"? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteService(service.id);
        showSuccess('Servizio eliminato con successo!');
      } catch (error) {
        // Backend will return an error if service has future appointments
        const errorMessage = error instanceof Error ? error.message : 'Errore durante l\'eliminazione del servizio';
        showError(errorMessage);
        logger.error('Error deleting service:', error);
      }
    }
  };

  const handleOpenAppointmentModal = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setIsAppointmentModalOpen(true);
  };

  const handleCloseAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setSelectedServiceId(undefined);
  };

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Servizi</h1>
            {filterToday && (
              <span className="inline-flex items-center px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold">
                Solo Oggi
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {filterToday
              ? 'Servizi erogati negli appuntamenti di oggi'
              : 'Gestisci i trattamenti offerti dal tuo centro'
            }
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus size={20} className="inline mr-2" />
          Nuovo Servizio
        </button>
      </div>

      {/* Filter Badge and Search Bar */}
      {filterToday && (
        <div className="card bg-pink-50 border-pink-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-pink-600" />
              <p className="text-sm text-pink-700 font-medium">
                Visualizzazione filtrata: solo servizi erogati oggi
              </p>
            </div>
            <button
              onClick={() => setSearchParams({})}
              className="text-pink-600 hover:text-pink-700 font-semibold text-sm flex items-center gap-1"
            >
              <X size={16} />
              Mostra Tutti
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Cerca servizio per nome, categoria o descrizione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="card text-center py-12">
          <Scissors size={48} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">
            {searchTerm
              ? 'Nessun servizio trovato'
              : 'Nessun servizio registrato'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary mt-4"
            >
              Aggiungi il primo servizio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const category = serviceCategories.find(c => c.id === service.category);
            const displayColor = category?.color || service.color || '#ec4899';
            const imageUrl = getImageUrl(service.imageUrl);

            return (
              <div
                key={service.id}
                className="card hover:shadow-lg transition-shadow border-l-4"
                style={{ borderLeftColor: displayColor }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={service.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${displayColor}20` }}
                      >
                        <Scissors size={24} style={{ color: displayColor }} />
                      </div>
                    )}
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <span
                        className="inline-block px-2 py-1 text-white text-xs rounded-full mt-1"
                        style={{ backgroundColor: displayColor }}
                      >
                        {category?.name || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {service.description}
              </p>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock size={16} className="mr-1 text-gray-400" />
                  {service.duration} min
                </div>
                <div className="flex items-center text-lg font-bold text-gray-900">
                  <Euro size={18} className="mr-1" />
                  {service.price != null ? service.price.toFixed(2) : 'N/A'}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleOpenAppointmentModal(service.id)}
                  className="w-full px-3 py-2 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors text-sm font-semibold touch-manipulation"
                >
                  <Calendar size={16} className="inline mr-1" />
                  Nuovo Appuntamento
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(service)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-semibold touch-manipulation"
                  >
                    <Edit size={16} className="inline mr-1" />
                    Modifica
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold touch-manipulation"
                  >
                    <Trash2 size={16} className="inline mr-1" />
                    Elimina
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-x-hidden">
          <div className="bg-white rounded-lg w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingService ? 'Modifica Servizio' : 'Nuovo Servizio'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nome Servizio *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input"
                    placeholder="Es. Manicure completa"
                  />
                </div>

                <div>
                  <label className="label">Categoria *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => {
                      const categoryId = e.target.value;
                      const category = serviceCategories.find(c => c.id === categoryId);
                      setFormData({
                        ...formData,
                        category: categoryId,
                        color: category?.color || formData.color,
                      });
                    }}
                    className="input"
                  >
                    <option value="">Seleziona una categoria</option>
                    {activeCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {formData.category && (
                    <p className="text-sm text-gray-600 mt-2">
                      Il colore della categoria verrà utilizzato per il servizio
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Descrizione *</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input"
                    rows={3}
                    placeholder="Descrizione del servizio..."
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="label">Immagine Servizio</label>
                  <div className="space-y-3">
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={isUploadingImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          id="service-image-input"
                        />
                        <label
                          htmlFor="service-image-input"
                          className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Upload size={16} className="mr-2" />
                          Carica Immagine
                        </label>
                        <span className="text-sm text-gray-500">
                          JPG, PNG, GIF o WebP (max 5MB)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Durata (minuti) *</label>
                    <input
                      type="number"
                      required
                      min="15"
                      max="480"
                      step="15"
                      value={formData.duration}
                      onChange={(e) => {
                        const validated = validateDuration(e.target.value, {
                          min: 15,
                          max: 480,
                          step: 15,
                        });
                        setFormData({
                          ...formData,
                          duration: validated,
                        });
                      }}
                      onBlur={(e) => {
                        // Validate on blur to ensure proper rounding
                        const validated = validateDuration(e.target.value, {
                          min: 15,
                          max: 480,
                          step: 15,
                        });
                        setFormData({
                          ...formData,
                          duration: validated,
                        });
                      }}
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Multiplo di 15 minuti (max 8 ore)
                    </p>
                  </div>

                  <div>
                    <label className="label">Prezzo (€) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="99999.99"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => {
                        const validated = validateAmount(e.target.value, {
                          min: 0,
                          max: 99999.99,
                          allowZero: true,
                        });
                        setFormData({
                          ...formData,
                          price: validated,
                        });
                      }}
                      onBlur={(e) => {
                        // Validate on blur to ensure proper formatting
                        const validated = validateAmount(e.target.value, {
                          min: 0,
                          max: 99999.99,
                          allowZero: true,
                        });
                        setFormData({
                          ...formData,
                          price: validated,
                        });
                      }}
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Massimo €99,999.99
                    </p>
                  </div>
                </div>

                <div>
                  <label className="label">Colore</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="h-10 w-20 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">
                      Scegli un colore per identificare il servizio
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1 touch-manipulation"
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? 'Caricamento...' : (editingService ? 'Salva Modifiche' : 'Crea Servizio')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary flex-1 touch-manipulation"
                    disabled={isUploadingImage}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={handleCloseAppointmentModal}
        editingAppointment={null}
        initialServiceId={selectedServiceId}
      />
    </div>
    </>
  );
};

export default Services;
