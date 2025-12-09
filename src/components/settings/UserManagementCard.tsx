/**
 * User Management Component for Settings
 * Full CRUD for user management (only for RESPONSABILE role)
 */

import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, Eye, EyeOff, Shield, User as UserIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { User, UserRole } from '../../types';
import { hashPassword } from '../../utils/auth';

export default function UserManagementCard(): JSX.Element {
  const { users, addUser, updateUser, deleteUser } = useApp();
  const { currentUser, canModifySettings } = useAuth();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'UTENTE' as UserRole,
    firstName: '',
    lastName: '',
    email: '',
  });

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'UTENTE',
      firstName: '',
      lastName: '',
      email: '',
    });
    setIsAdding(false);
    setEditingId(null);
    setShowPassword(false);
  };

  const handleStartEdit = (user: User) => {
    setFormData({
      username: user.username,
      password: '', // Don't show existing password
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
    });
    setEditingId(user.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.username.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
        showError('Compila tutti i campi obbligatori');
        return;
      }

      if (!editingId && !formData.password) {
        showError('La password è obbligatoria per i nuovi utenti');
        return;
      }

      // Check username uniqueness (only for new users or if username changed)
      const existingUser = users.find(u =>
        u.username === formData.username && u.id !== editingId
      );
      if (existingUser) {
        showError('Username già esistente');
        return;
      }

      if (editingId) {
        // Update existing user
        const existingUser = users.find(u => u.id === editingId);
        if (!existingUser) return;

        const updatedUser: User = {
          ...existingUser,
          username: formData.username.trim(),
          role: formData.role,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };

        // Only update password if provided
        if (formData.password) {
          updatedUser.passwordHash = await hashPassword(formData.password);
        }

        await updateUser(updatedUser);
        showSuccess('Utente aggiornato con successo');
      } else {
        // Add new user
        const passwordHash = await hashPassword(formData.password);
        const newUser: User = {
          id: 'user-' + Date.now(),
          username: formData.username.trim(),
          passwordHash,
          role: formData.role,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || undefined,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        await addUser(newUser);
        showSuccess('Utente creato con successo');
      }

      resetForm();
    } catch (error) {
      showError('Errore durante il salvataggio dell\'utente');
      console.error(error);
    }
  };

  const handleDelete = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Prevent deleting yourself
    if (currentUser?.id === userId) {
      showError('Non puoi eliminare il tuo stesso account');
      return;
    }

    // Prevent deleting the last RESPONSABILE
    const responsabili = users.filter(u => u.role === 'RESPONSABILE' && u.isActive);
    if (responsabili.length === 1 && user.role === 'RESPONSABILE') {
      showError('Non puoi eliminare l\'ultimo Responsabile attivo');
      return;
    }

    const confirmed = await confirm(
      `Eliminare l'utente "${user.username}"?`,
      'Questa azione non può essere annullata.'
    );

    if (confirmed) {
      try {
        await deleteUser(userId);
        showSuccess('Utente eliminato');
      } catch (error) {
        showError('Errore durante l\'eliminazione');
      }
    }
  };

  const handleToggleActive = async (user: User) => {
    // Prevent deactivating yourself
    if (currentUser?.id === user.id) {
      showError('Non puoi disattivare il tuo stesso account');
      return;
    }

    // Prevent deactivating the last RESPONSABILE
    const responsabili = users.filter(u => u.role === 'RESPONSABILE' && u.isActive);
    if (responsabili.length === 1 && user.role === 'RESPONSABILE' && user.isActive) {
      showError('Non puoi disattivare l\'ultimo Responsabile attivo');
      return;
    }

    try {
      await updateUser({
        ...user,
        isActive: !user.isActive,
        updatedAt: new Date().toISOString(),
      });
      showSuccess(user.isActive ? 'Utente disattivato' : 'Utente attivato');
    } catch (error) {
      showError('Errore durante l\'aggiornamento');
    }
  };

  const isReadOnly = !canModifySettings();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <ConfirmationDialog />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Users className="w-6 h-6 text-purple-600 mr-3" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gestione Utenti</h2>
            <p className="text-sm text-gray-600">Gestisci gli account utente del sistema</p>
          </div>
        </div>
        {!isReadOnly && !isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Nuovo Utente
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Sola lettura:</strong> Solo i Responsabili possono gestire gli utenti.
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingId) && !isReadOnly && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-4">
            {editingId ? 'Modifica Utente' : 'Nuovo Utente'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="es. mario.rossi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {editingId ? '(lascia vuoto per non modificare)' : '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Mario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cognome *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Rossi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="mario.rossi@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ruolo *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="UTENTE">Utente (sola lettura Impostazioni)</option>
                <option value="RESPONSABILE">Responsabile (accesso completo)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {editingId ? 'Salva Modifiche' : 'Crea Utente'}
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nessun utente presente</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                user.isActive
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  user.role === 'RESPONSABILE' ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                  {user.role === 'RESPONSABILE' ? (
                    <Shield size={20} className="text-purple-600" />
                  ) : (
                    <UserIcon size={20} className="text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    {user.id === currentUser?.id && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                        Tu
                      </span>
                    )}
                    {!user.isActive && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                        Disattivato
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    @{user.username} • {user.role === 'RESPONSABILE' ? 'Responsabile' : 'Utente'}
                  </p>
                  {user.email && (
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  )}
                </div>
              </div>

              {!isReadOnly && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      user.isActive
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {user.isActive ? 'Disattiva' : 'Attiva'}
                  </button>
                  <button
                    onClick={() => handleStartEdit(user)}
                    disabled={!user.isActive}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Modifica"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Elimina"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
