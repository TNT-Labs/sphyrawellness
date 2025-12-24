/**
 * Admin Debug Page
 * Pagina di debug per gestire l'utente admin su dispositivi mobili
 * Accessibile tramite URL: /admin-debug-panel
 */

import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Trash2, Eye, EyeOff, AlertCircle, CheckCircle, Key, Users, Database, UserPlus } from 'lucide-react';
import PouchDB from 'pouchdb-browser';
import { getAllUsers, addUser as dbAddUser, deleteUser as dbDeleteUser } from '../utils/db';
import { User } from '../types';
import bcrypt from 'bcryptjs';

interface UserDoc {
  _id: string;
  _rev?: string;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  passwordHash: string;
}

// Hash password using bcrypt
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export default function AdminDebug(): JSX.Element {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [envPassword, setEnvPassword] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    loadUsers();
    checkEnvPassword();
  }, []);

  const checkEnvPassword = () => {
    const pwd = import.meta.env.VITE_ADMIN_INITIAL_PASSWORD;
    setEnvPassword(pwd || 'Non impostata');
  };

  const loadUsers = async () => {
    setLoading(true);
    setMessage(null);
    try {
      // Carica da IndexedDB (database principale)
      const loadedUsers = await getAllUsers();

      // Converti User[] a UserDoc[]
      const userDocs: UserDoc[] = loadedUsers.map(user => ({
        _id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        passwordHash: user.passwordHash
      }));

      setUsers(userDocs);
      setMessage({
        type: 'success',
        text: `Trovati ${userDocs.length} utente/i nel database IndexedDB`
      });
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
      setMessage({
        type: 'error',
        text: `Errore: ${error instanceof Error ? error.message : 'Impossibile caricare gli utenti'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const resetUsersDatabase = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setMessage({
        type: 'info',
        text: '⚠️ Sei sicuro? Clicca di nuovo per confermare l\'eliminazione di tutti gli utenti!'
      });
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      // 1. Elimina da IndexedDB (database principale)
      const loadedUsers = await getAllUsers();
      for (const user of loadedUsers) {
        await dbDeleteUser(user.id);
      }

      // 2. Elimina da PouchDB (database sincronizzazione)
      const db = new PouchDB('sphyra-users');
      const result = await db.allDocs({ include_docs: true });
      for (const row of result.rows) {
        if (row.doc && row.id && row.value.rev) {
          await db.remove(row.id, row.value.rev);
        }
      }

      setUsers([]);
      setConfirmReset(false);
      setMessage({
        type: 'success',
        text: '✅ Database resettato da IndexedDB e PouchDB! Ora puoi usare "Crea Admin" o ricaricare la pagina principale.'
      });
    } catch (error) {
      console.error('Errore reset database:', error);
      setMessage({
        type: 'error',
        text: `Errore durante il reset: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSpecificUser = async (userId: string, rev?: string) => {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${userId}?`)) {
      return;
    }

    setLoading(true);
    try {
      // 1. Elimina da IndexedDB
      await dbDeleteUser(userId);

      // 2. Elimina da PouchDB
      if (rev) {
        const db = new PouchDB('sphyra-users');
        await db.remove(userId, rev);
      }

      await loadUsers();
      setMessage({
        type: 'success',
        text: `✅ Utente ${userId} eliminato da entrambi i database`
      });
    } catch (error) {
      console.error('Errore eliminazione utente:', error);
      setMessage({
        type: 'error',
        text: `Errore: ${error instanceof Error ? error.message : 'Impossibile eliminare l\'utente'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const createAdminUser = async () => {
    setLoading(true);
    setMessage(null);
    try {
      // Leggi password da .env
      const envPassword = import.meta.env.VITE_ADMIN_INITIAL_PASSWORD;
      let initialPassword = envPassword;

      // Se non configurata o è la default, genera password casuale
      if (!envPassword || envPassword === 'admin123') {
        const randomPassword = Math.random().toString(36).slice(-12) +
                               Math.random().toString(36).toUpperCase().slice(-4) +
                               Math.floor(Math.random() * 1000);
        initialPassword = randomPassword;

        console.error('⚠️ SECURITY WARNING: VITE_ADMIN_INITIAL_PASSWORD not set or using default "admin123"!');
        console.error('⚠️ Generated random password for admin user. SAVE THIS PASSWORD:');
        console.error(`⚠️ Username: admin`);
        console.error(`⚠️ Password: ${randomPassword}`);

        alert(`⚠️ PASSWORD GENERATA CASUALMENTE!\n\nUsername: admin\nPassword: ${randomPassword}\n\n⚠️ SALVA QUESTA PASSWORD!`);
      }

      // Hash della password
      const hashedPassword = await hashPassword(initialPassword);

      // Crea utente admin
      const newAdmin: User = {
        id: 'admin-default-' + Date.now(),
        username: 'admin',
        passwordHash: hashedPassword,
        role: 'RESPONSABILE',
        firstName: 'Admin',
        lastName: 'Default',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Aggiungi a IndexedDB (che propagherà automaticamente a PouchDB)
      await dbAddUser(newAdmin);

      await loadUsers();

      if (envPassword && envPassword !== 'admin123') {
        setMessage({
          type: 'success',
          text: `✅ Admin creato! Username: admin, Password: ${envPassword}`
        });
      } else {
        setMessage({
          type: 'success',
          text: '✅ Admin creato con password casuale! Controlla la console e l\'alert.'
        });
      }
    } catch (error) {
      console.error('Errore creazione admin:', error);
      setMessage({
        type: 'error',
        text: `Errore: ${error instanceof Error ? error.message : 'Impossibile creare l\'admin'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Admin Debug Panel</h1>
          </div>
          <p className="text-purple-200">
            Gestione utenti e debug del database locale (PouchDB)
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border-l-4 ${
              message.type === 'success'
                ? 'bg-green-900/30 border-green-500 text-green-100'
                : message.type === 'error'
                ? 'bg-red-900/30 border-red-500 text-red-100'
                : 'bg-blue-900/30 border-blue-500 text-blue-100'
            }`}
          >
            <div className="flex items-start gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <p className="flex-1">{message.text}</p>
            </div>
          </div>
        )}

        {/* Environment Info */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-purple-300" />
            <h2 className="text-xl font-semibold text-white">Configurazione Ambiente</h2>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
              <span className="text-purple-200">VITE_ADMIN_INITIAL_PASSWORD:</span>
              <span className="font-mono text-white">
                {showPasswords ? envPassword : '••••••••'}
              </span>
            </div>

            <button
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2 text-purple-300 hover:text-purple-100 transition-colors"
            >
              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPasswords ? 'Nascondi' : 'Mostra'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-200 text-sm">
              💡 <strong>Nota:</strong> Se la password è "admin123" o non impostata,
              l'app genera automaticamente una password casuale al primo avvio.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-purple-300" />
            <h2 className="text-xl font-semibold text-white">Azioni Database</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Ricarica Utenti
            </button>

            <button
              onClick={createAdminUser}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Crea Admin
            </button>

            <button
              onClick={resetUsersDatabase}
              disabled={loading}
              className={`flex items-center justify-center gap-2 ${
                confirmReset
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-orange-600 hover:bg-orange-700'
              } disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors`}
            >
              <Trash2 className="w-5 h-5" />
              {confirmReset ? 'Conferma Reset!' : 'Reset Database'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg mb-2">
            <p className="text-green-200 text-sm">
              ✅ <strong>Crea Admin:</strong> Crea l'utente admin con la password da .env.
              Se non configurata, genera una password casuale e la mostra in un alert.
            </p>
          </div>

          <div className="mt-2 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-200 text-sm">
              ⚠️ <strong>Reset Database:</strong> Elimina TUTTI gli utenti da IndexedDB e PouchDB.
              Dopo il reset, usa "Crea Admin" o ricarica la pagina principale.
            </p>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-300" />
            <h2 className="text-xl font-semibold text-white">
              Utenti nel Database ({users.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 text-purple-300 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-purple-300 mx-auto mb-2" />
              <p className="text-purple-200">Nessun utente trovato nel database</p>
              <p className="text-purple-300 text-sm mt-1">
                Ricarica la pagina principale per creare l'utente admin
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="bg-black/20 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-semibold text-lg">
                          {user.username}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'RESPONSABILE'
                            ? 'bg-purple-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {user.role}
                        </span>
                        {user.isActive === false && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-600 text-white">
                            Inattivo
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-purple-200 space-y-1">
                        {user.firstName && user.lastName && (
                          <div>👤 {user.firstName} {user.lastName}</div>
                        )}
                        <div className="font-mono text-xs text-purple-300">
                          ID: {user._id}
                        </div>
                        <div className="font-mono text-xs text-purple-300 break-all">
                          Hash: {showPasswords ? user.passwordHash : user.passwordHash.substring(0, 20) + '...'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => user._rev && deleteSpecificUser(user._id, user._rev)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors self-start sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                      Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900/30 backdrop-blur-lg rounded-xl p-6 border border-blue-500/50">
          <h3 className="text-lg font-semibold text-blue-100 mb-3">📖 Istruzioni</h3>
          <ul className="text-blue-200 text-sm space-y-2">
            <li>• <strong>Ricarica Utenti:</strong> Aggiorna la lista degli utenti dal database</li>
            <li>• <strong>Reset Database:</strong> Elimina tutti gli utenti (richiede conferma)</li>
            <li>• <strong>Elimina:</strong> Rimuove un singolo utente specifico</li>
            <li>• <strong>Dopo il reset:</strong> Vai alla pagina di login e ricarica. L'app creerà automaticamente un nuovo admin</li>
            <li>• <strong>Password:</strong> Se VITE_ADMIN_INITIAL_PASSWORD è impostata correttamente, verrà usata. Altrimenti viene generata casualmente</li>
          </ul>
        </div>

        {/* Back to App */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Torna al Login
          </a>
        </div>
      </div>
    </div>
  );
}
