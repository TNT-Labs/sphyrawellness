import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { useDebounce } from '../hooks/useDebounce';
import { Service } from '../types';
import { Plus, Search, Edit, Trash2, Scissors, Clock, Euro } from 'lucide-react';
import { generateId } from '../utils/helpers';
import { useEscapeKey } from '../hooks/useEscapeKey';

const Services: React.FC = () => {
  const { services, addService, updateService, deleteService } = useApp();
  const { showSuccess } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

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

  const categories = [
    'Mani',
    'Piedi',
    'Viso',
    'Corpo',
    'Massaggi',
    'Epilazione',
    'Trattamenti Speciali',
    'Altro',
  ];

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        service.name.toLowerCase().includes(searchLower) ||
        service.category.toLowerCase().includes(searchLower) ||
        service.description.toLowerCase().includes(searchLower)
      );
    });
  }, [services, debouncedSearchTerm]);

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
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  // ESC key to close modal
  useEscapeKey(handleCloseModal, isModalOpen);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const serviceData: Service = {
      id: editingService?.id || generateId(),
      ...formData,
    };

    if (editingService) {
      updateService(serviceData);
      showSuccess('Servizio aggiornato con successo!');
    } else {
      addService(serviceData);
      showSuccess('Servizio aggiunto con successo!');
    }

    handleCloseModal();
  };

  const handleDelete = async (service: Service) => {
    const confirmed = await confirm({
      title: 'Elimina Servizio',
      message: `Sei sicuro di voler eliminare "${service.name}"? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (confirmed) {
      deleteService(service.id);
      showSuccess('Servizio eliminato con successo!');
    }
  };

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Servizi</h1>
          <p className="text-gray-600 mt-1">
            Gestisci i trattamenti offerti dal tuo centro
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus size={20} className="inline mr-2" />
          Nuovo Servizio
        </button>
      </div>

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
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="card hover:shadow-lg transition-shadow border-l-4"
              style={{ borderLeftColor: service.color }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${service.color}20` }}
                  >
                    <Scissors size={24} style={{ color: service.color }} />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mt-1">
                      {service.category}
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
                  {service.price.toFixed(2)}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleOpenModal(service)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-semibold"
                >
                  <Edit size={16} className="inline mr-1" />
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(service)}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold"
                >
                  <Trash2 size={16} className="inline mr-1" />
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="input"
                  >
                    <option value="">Seleziona una categoria</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Durata (minuti) *</label>
                    <input
                      type="number"
                      required
                      min="15"
                      step="15"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration: parseInt(e.target.value),
                        })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Prezzo (€) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value),
                        })
                      }
                      className="input"
                    />
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
                  <button type="submit" className="btn-primary flex-1">
                    {editingService ? 'Salva Modifiche' : 'Crea Servizio'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary flex-1"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Services;
