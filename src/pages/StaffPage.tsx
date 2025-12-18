import React, { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Staff } from '../types';
import { Plus, Search, Edit, Trash2, UserCheck, Mail, Phone, Calendar, X, Upload, Image as ImageIcon } from 'lucide-react';
import { generateId, isValidEmail, isValidPhone, formatPhoneNumber } from '../utils/helpers';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { canDeleteStaff } from '../utils/db';
import { logger } from '../utils/logger';
import { isToday, parseISO } from 'date-fns';
import { uploadStaffImage, deleteStaffImage, getImageUrl } from '../services/uploadService';

const StaffPage: React.FC = () => {
  const { staff, addStaff, updateStaff, deleteStaff, staffRoles, serviceCategories, appointments } = useApp();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if filter=today is present
  const filterToday = searchParams.get('filter') === 'today';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    specializations: [] as string[],
    color: '#ec4899',
    isActive: true,
  });

  // Filter only active roles and categories
  const activeRoles = staffRoles.filter(r => r.isActive);
  const activeCategories = serviceCategories.filter(c => c.isActive);

  // Get staff IDs with appointments today
  const todayStaffIds = useMemo(() => {
    if (!filterToday) return null;
    const todayAppointments = appointments.filter((apt) => isToday(parseISO(apt.date)));
    return new Set(todayAppointments.map((apt) => apt.staffId));
  }, [appointments, filterToday]);

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      // Filter by today's appointments if enabled
      if (filterToday && todayStaffIds && !todayStaffIds.has(member.id)) {
        return false;
      }

      // Filter by search term
      const searchLower = searchTerm.toLowerCase();
      const roleName = staffRoles.find(r => r.id === member.role)?.name || '';
      return (
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        roleName.toLowerCase().includes(searchLower)
      );
    });
  }, [staff, searchTerm, staffRoles, filterToday, todayStaffIds]);

  const handleOpenModal = (member?: Staff) => {
    if (member) {
      setEditingStaff(member);
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        specializations: member.specializations,
        color: member.color,
        isActive: member.isActive,
      });
      // Set image preview if staff has an image
      if (member.profileImageUrl) {
        setImagePreview(getImageUrl(member.profileImageUrl) || null);
      }
    } else {
      setEditingStaff(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        specializations: [],
        color: '#ec4899',
        isActive: true,
      });
      setSelectedImage(null);
      setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
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
    if (editingStaff && editingStaff.profileImageUrl) {
      // If editing and staff has an image, delete it from server
      const confirmed = await confirm({
        title: 'Rimuovi Immagine',
        message: 'Sei sicuro di voler rimuovere l\'immagine del profilo?',
        confirmText: 'Rimuovi',
        variant: 'danger',
      });

      if (confirmed) {
        try {
          setIsUploadingImage(true);
          const { staff: updatedStaff } = await deleteStaffImage(editingStaff.id);
          await updateStaff(updatedStaff);
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

    // Validate email
    if (!isValidEmail(formData.email)) {
      showError('Inserisci un indirizzo email valido');
      return;
    }

    // Validate phone
    if (!isValidPhone(formData.phone)) {
      showError('Inserisci un numero di telefono valido (es: +39 333 1234567)');
      return;
    }

    const staffData: Staff = {
      id: editingStaff?.id || generateId(),
      ...formData,
      phone: formatPhoneNumber(formData.phone),
    };

    try {
      // Save staff first
      if (editingStaff) {
        await updateStaff(staffData);
      } else {
        await addStaff(staffData);
      }

      // Then upload image if selected
      if (selectedImage) {
        setIsUploadingImage(true);
        try {
          const { staff: updatedStaff } = await uploadStaffImage(staffData.id, selectedImage);
          await updateStaff(updatedStaff);
          showSuccess(editingStaff ? 'Membro e immagine aggiornati con successo!' : 'Membro e immagine aggiunti con successo!');
        } catch (error) {
          showError('Membro salvato ma errore durante il caricamento dell\'immagine');
          logger.error('Error uploading image:', error);
        } finally {
          setIsUploadingImage(false);
        }
      } else {
        showSuccess(editingStaff ? 'Membro aggiornato con successo!' : 'Membro aggiunto con successo!');
      }

      handleCloseModal();
    } catch (error) {
      showError('Errore durante il salvataggio del membro dello staff');
      logger.error('Error with staff operation:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const member = staff.find((s) => s.id === id);
    if (!member) return;

    // Check if staff has future appointments
    const canDelete = await canDeleteStaff(id);

    if (!canDelete.canDelete) {
      showError(`Impossibile eliminare: ${canDelete.reason}. Cancella prima gli appuntamenti futuri.`);
      return;
    }

    const confirmed = await confirm({
      title: 'Conferma Eliminazione',
      message: `Sei sicuro di voler eliminare ${member.firstName} ${member.lastName}? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteStaff(id);
        showSuccess('Membro dello staff eliminato con successo');
      } catch (error) {
        showError('Errore durante l\'eliminazione del membro dello staff');
        logger.error('Error with staff operation:', error);
      }
    }
  };

  const toggleSpecialization = (categoryId: string) => {
    const current = formData.specializations;
    const updated = current.includes(categoryId)
      ? current.filter((s) => s !== categoryId)
      : [...current, categoryId];
    setFormData({ ...formData, specializations: updated });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Personale</h1>
            {filterToday && (
              <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                Solo Oggi
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {filterToday
              ? 'Personale impegnato negli appuntamenti di oggi'
              : 'Gestisci i membri del team del centro'
            }
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus size={20} className="inline mr-2" />
          Nuovo Membro
        </button>
      </div>

      {/* Filter Badge and Search Bar */}
      {filterToday && (
        <div className="card bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-purple-600" />
              <p className="text-sm text-purple-700 font-medium">
                Visualizzazione filtrata: solo personale impegnato oggi
              </p>
            </div>
            <button
              onClick={() => setSearchParams({})}
              className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-1"
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
            placeholder="Cerca per nome, email o ruolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="card text-center py-12">
          <UserCheck size={48} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">
            {searchTerm
              ? 'Nessun membro trovato'
              : 'Nessun membro dello staff registrato'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary mt-4"
            >
              Aggiungi il primo membro
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((member) => {
            const imageUrl = getImageUrl(member.profileImageUrl);

            return (
            <div
              key={member.id}
              className="card hover:shadow-lg transition-shadow border-l-4"
              style={{ borderLeftColor: member.color }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${member.firstName} ${member.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${member.color}20` }}
                    >
                      <UserCheck size={24} style={{ color: member.color }} />
                    </div>
                  )}
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">
                      {member.firstName} {member.lastName}
                    </h3>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mt-1">
                      {staffRoles.find(r => r.id === member.role)?.name || 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  {member.isActive ? (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Attivo
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      Non attivo
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail size={16} className="mr-2 text-gray-400" />
                  {member.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-2 text-gray-400" />
                  {member.phone}
                </div>
              </div>

              {member.specializations.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Specializzazioni:</p>
                  <div className="flex flex-wrap gap-1">
                    {member.specializations.map((categoryId) => {
                      const category = serviceCategories.find(c => c.id === categoryId);
                      if (!category) return null;
                      return (
                        <span
                          key={categoryId}
                          className="inline-block px-2 py-1 text-white text-xs rounded-full"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleOpenModal(member)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-semibold touch-manipulation"
                >
                  <Edit size={16} className="inline mr-1" />
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold touch-manipulation"
                >
                  <Trash2 size={16} className="inline mr-1" />
                  Elimina
                </button>
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
                {editingStaff ? 'Modifica Membro' : 'Nuovo Membro'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Cognome *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Telefono *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Ruolo *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="input"
                  >
                    <option value="">Seleziona un ruolo</option>
                    {activeRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="label">Immagine Profilo</label>
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
                          id="staff-image-input"
                        />
                        <label
                          htmlFor="staff-image-input"
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

                <div>
                  <label className="label">Specializzazioni (Categorie)</label>
                  <p className="text-sm text-gray-600 mb-2">
                    Seleziona le categorie di servizi per cui questo membro è specializzato
                  </p>
                  <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                    {activeCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center py-2 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={formData.specializations.includes(category.id)}
                          onChange={() => toggleSpecialization(category.id)}
                          className="mr-2"
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm">{category.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Colore Identificativo</label>
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
                      Colore per identificare nel calendario
                    </span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Membro attivo
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1 touch-manipulation"
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? 'Caricamento...' : (editingStaff ? 'Salva Modifiche' : 'Crea Membro')}
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
};

export default StaffPage;
