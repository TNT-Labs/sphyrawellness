import React from 'react';
import { Shield, Mail, Phone, FileText, Clock, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-pink-600" />
          <h1 className="text-3xl font-bold text-gray-900">Informativa sulla Privacy</h1>
        </div>
        <p className="text-gray-600">
          ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)
        </p>
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
          <span><strong>Versione:</strong> 1.0</span>
          <span><strong>Data pubblicazione:</strong> 18 Dicembre 2025</span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Titolare del Trattamento */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-pink-600" />
            <h2 className="text-2xl font-semibold text-gray-900">1. Titolare del Trattamento</h2>
          </div>
          <div className="text-gray-700 space-y-2">
            <p><strong>SPHYRA Wellness Lab</strong></p>
            <p>Sede legale: via Roma 21, 24020 Scanzorosciate (BG)</p>
            <p>Partita IVA/Codice Fiscale: [P.IVA/CF]</p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>Email: [EMAIL CONTATTO]</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>Telefono: +39 3927471954</span>
            </div>
            <p>PEC: [INDIRIZZO PEC]</p>
          </div>
        </section>

        {/* Finalità del Trattamento */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Finalità e Base Giuridica del Trattamento</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-pink-600 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                2.1 Gestione delle prenotazioni
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                <em>Base giuridica: Esecuzione del contratto - art. 6, par. 1, lett. b GDPR</em>
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Gestione e conferma della prenotazione dei servizi richiesti</li>
                <li>Invio di comunicazioni relative all'appuntamento prenotato</li>
                <li>Gestione del calendario appuntamenti e organizzazione del personale</li>
                <li>Archiviazione dello storico delle prenotazioni</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                2.2 Promemoria e comunicazioni di servizio
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                <em>Base giuridica: Consenso - art. 6, par. 1, lett. a GDPR</em>
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Invio di email di promemoria automatiche prima dell'appuntamento</li>
                <li>Comunicazioni relative a modifiche o cancellazioni degli appuntamenti</li>
                <li>Notifiche relative ai servizi prenotati</li>
              </ul>
            </div>

            <div className="border-l-4 border-amber-600 pl-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                2.3 Gestione delle allergie e condizioni di salute
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                <em>Base giuridica: Consenso esplicito - art. 9, par. 2, lett. a GDPR</em>
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-semibold mb-1">DATI PARTICOLARI</p>
                    <p>
                      Le informazioni relative ad allergie e condizioni di salute costituiscono dati particolari
                      ai sensi dell'art. 9 GDPR. Il trattamento di tali dati avviene esclusivamente previa
                      acquisizione del Suo consenso esplicito e per garantire la Sua sicurezza durante
                      l'erogazione dei servizi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tipologie di Dati */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Tipologie di Dati Raccolti</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-600" />
                Dati Obbligatori
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li><strong>Nome e Cognome:</strong> per identificare il cliente e personalizzare il servizio</li>
                <li><strong>Indirizzo Email:</strong> per l'invio di conferme, promemoria e comunicazioni</li>
                <li><strong>Numero di Telefono:</strong> per eventuali comunicazioni urgenti</li>
                <li><strong>Data e ora dell'appuntamento</strong></li>
                <li><strong>Servizio/trattamento prenotato</strong></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-gray-400" />
                Dati Facoltativi
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li><strong>Data di nascita:</strong> per personalizzare meglio i servizi offerti</li>
                <li><strong>Allergie e condizioni di salute:</strong> per garantire la sicurezza durante i trattamenti</li>
                <li><strong>Note e richieste speciali:</strong> per personalizzare l'esperienza</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Misure di Sicurezza */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-pink-600" />
            <h2 className="text-2xl font-semibold text-gray-900">4. Misure di Sicurezza</h2>
          </div>
          <p className="text-gray-700 mb-4">
            I dati personali sono trattati con strumenti informatici e telematici, con logiche strettamente
            correlate alle finalità indicate, garantendo la sicurezza e la riservatezza dei dati.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Crittografia:</strong> Protocollo HTTPS con certificati SSL/TLS</li>
            <li><strong>Autenticazione:</strong> Sistema di autenticazione sicura con hash delle password (PBKDF2-SHA256)</li>
            <li><strong>Protezione CSRF:</strong> Token per prevenire attacchi Cross-Site Request Forgery</li>
            <li><strong>Validazione input:</strong> Validazione rigorosa per prevenire injection</li>
            <li><strong>Rate Limiting:</strong> Limitazione delle richieste per prevenire abusi</li>
            <li><strong>Backup automatici:</strong> Backup giornalieri cifrati con conservazione di 7 giorni</li>
            <li><strong>Timeout di sessione:</strong> Disconnessione automatica dopo inattività (default: 5 minuti)</li>
            <li><strong>Controllo accessi:</strong> Accesso riservato al personale autorizzato</li>
          </ul>
        </section>

        {/* Destinatari */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Destinatari dei Dati</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Personale Interno</h3>
              <p className="text-gray-700">
                Personale del centro wellness autorizzato al trattamento (operatori, receptionist, responsabili)
                con accesso limitato ai soli dati necessari.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                Fornitori di Servizi (Responsabili del Trattamento)
              </h3>
              <div className="bg-gray-50 rounded-md p-4 mt-2">
                <p className="font-semibold text-gray-900 mb-2">SendGrid (Twilio Inc.)</p>
                <p className="text-sm text-gray-700 mb-1">Servizio di invio email per conferme e promemoria</p>
                <p className="text-sm text-gray-600">Sede: Stati Uniti d'America</p>
                <p className="text-sm text-gray-600">
                  Base di trasferimento: Standard Contractual Clauses (SCC) approvate dalla Commissione Europea
                </p>
                <a
                  href="https://www.twilio.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-pink-600 hover:text-pink-700 underline"
                >
                  Privacy Policy SendGrid
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Soggetti Autorizzati per Legge</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Autorità giudiziarie o amministrative</li>
                <li>Consulenti fiscali e commercialisti</li>
                <li>Altri soggetti pubblici, quando richiesto dalla legge</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Periodo di Conservazione */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-pink-600" />
            <h2 className="text-2xl font-semibold text-gray-900">6. Periodo di Conservazione</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-pink-100 text-pink-700 px-3 py-1 rounded-md font-semibold text-sm mt-0.5">
                24 mesi
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Dati per gestione prenotazioni:</strong> Dalla data dell'ultimo appuntamento
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md font-semibold text-sm mt-0.5">
                10 anni
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Dati fiscali e contabili:</strong> In conformità alle normative fiscali vigenti
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md font-semibold text-sm mt-0.5">
                7 giorni
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Backup automatici:</strong> Eliminati automaticamente
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mt-4 text-sm">
            Al termine dei periodi di conservazione, i dati saranno cancellati o resi anonimi in modo irreversibile.
          </p>
        </section>

        {/* Diritti dell'Interessato */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Diritti dell'Interessato</h2>
          <p className="text-gray-700 mb-4">
            In qualità di interessato, Lei ha il diritto di:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">✓ Diritto di Accesso</h3>
              <p className="text-sm text-gray-600">
                Ottenere conferma dell'esistenza di dati personali e riceverne copia (art. 15 GDPR)
              </p>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">✓ Diritto di Rettifica</h3>
              <p className="text-sm text-gray-600">
                Ottenere la rettifica dei dati inesatti o l'integrazione di dati incompleti (art. 16 GDPR)
              </p>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">✓ Diritto alla Cancellazione</h3>
              <p className="text-sm text-gray-600">
                Ottenere la cancellazione dei dati personali ("diritto all'oblio" - art. 17 GDPR)
              </p>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">✓ Diritto di Limitazione</h3>
              <p className="text-sm text-gray-600">
                Ottenere la limitazione del trattamento (art. 18 GDPR)
              </p>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">✓ Diritto alla Portabilità</h3>
              <p className="text-sm text-gray-600">
                Ricevere i dati in formato strutturato e leggibile (art. 20 GDPR)
              </p>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">✓ Diritto di Opposizione</h3>
              <p className="text-sm text-gray-600">
                Opporsi al trattamento dei dati personali (art. 21 GDPR)
              </p>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">✓ Diritto di Revoca</h3>
              <p className="text-sm text-gray-600">
                Revocare il consenso in qualsiasi momento (art. 7, par. 3 GDPR)
              </p>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">✓ Diritto di Reclamo</h3>
              <p className="text-sm text-gray-600">
                Proporre reclamo al Garante Privacy (art. 77 GDPR)
              </p>
            </div>
          </div>
        </section>

        {/* Esercizio Diritti */}
        <section className="bg-pink-50 border border-pink-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Come Esercitare i Suoi Diritti</h2>
          <p className="text-gray-700 mb-4">
            Per esercitare i diritti sopra elencati, può contattare il Titolare del Trattamento mediante:
          </p>
          <div className="space-y-2 text-gray-700">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-pink-600" />
              <span><strong>Email:</strong> [EMAIL PRIVACY/CONTATTO]</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-pink-600" />
              <span><strong>Telefono:</strong> [NUMERO TELEFONO]</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-pink-600" />
              <span><strong>PEC:</strong> [INDIRIZZO PEC]</span>
            </div>
          </div>
          <p className="text-gray-600 mt-4 text-sm">
            Il Titolare risponderà alla richiesta <strong>entro un mese</strong> dal ricevimento della stessa.
            Tale termine può essere prorogato di due mesi, se necessario.
          </p>
        </section>

        {/* Cookie */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookie e Tecnologie Simili</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Cookie Tecnici</h3>
              <p className="text-gray-700 mb-2">
                Il sistema di prenotazione utilizza esclusivamente <strong>cookie tecnici strettamente necessari</strong> per:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Garantire il funzionamento del sistema di prenotazione</li>
                <li>Gestire la sessione di prenotazione</li>
                <li>Implementare misure di sicurezza (token CSRF)</li>
                <li>Memorizzare temporaneamente i dati del form durante la compilazione</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">
                Questi cookie sono essenziali per il funzionamento del servizio e <strong>non richiedono il consenso</strong>
                dell'utente ai sensi delle Linee Guida del Garante Privacy.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Nessun Cookie di Profilazione</p>
                  <p className="text-sm text-gray-700">
                    Il sistema di prenotazione <strong>non utilizza</strong> cookie di profilazione, cookie di terze parti
                    per marketing o strumenti di tracciamento a fini pubblicitari.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Natura del Conferimento */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Natura del Conferimento</h2>

          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Dati Obbligatori</p>
                <p className="text-sm text-gray-700">
                  Il conferimento dei dati contrassegnati come obbligatori (nome, cognome, email, telefono)
                  è <strong>necessario</strong> per dar corso alla prenotazione richiesta.
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <strong>L'eventuale rifiuto di fornire tali dati comporterà l'impossibilità di procedere
                  con la prenotazione.</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Dati Facoltativi</p>
                <p className="text-sm text-gray-700">
                  Il conferimento di dati facoltativi (data di nascita, allergie, note) è rimesso alla
                  Sua libera scelta e <strong>non è obbligatorio</strong>. L'eventuale rifiuto non pregiudica
                  la possibilità di effettuare la prenotazione, ma potrebbe limitare la personalizzazione del servizio.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Garante Privacy */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contatti del Garante Privacy</h2>
          <p className="text-gray-700 mb-3">
            Ha il diritto di proporre reclamo all'autorità di controllo competente:
          </p>
          <div className="bg-gray-50 rounded-md p-4">
            <p className="font-semibold text-gray-900 mb-2">Garante per la Protezione dei Dati Personali</p>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Piazza Venezia, 11 - 00187 Roma</p>
              <p>Tel: +39 06.696771</p>
              <p>Fax: +39 06.69677.3785</p>
              <p>Email: garante@gpdp.it</p>
              <p>PEC: protocollo@pec.gpdp.it</p>
              <a
                href="https://www.garanteprivacy.it"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:text-pink-700 underline inline-block mt-1"
              >
                www.garanteprivacy.it
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600">
            <em>
              Documento generato in conformità al Regolamento (UE) 2016/679 (GDPR)
              e alle Linee Guida del Garante per la Protezione dei Dati Personali.
            </em>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Versione 1.0 - 18 Dicembre 2025
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
