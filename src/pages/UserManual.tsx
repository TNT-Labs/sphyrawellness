import React, { useState } from 'react';
import {
  BookOpen,
  Home,
  Calendar,
  Users,
  Scissors,
  UserCircle,
  CreditCard,
  Bell,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const UserManual: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    intro: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const Section = ({
    id,
    title,
    icon: Icon,
    children
  }: {
    id: string;
    title: string;
    icon: React.FC<{ className?: string }>;
    children: React.ReactNode;
  }) => (
    <div className="mb-6 bg-white rounded-lg shadow-sm">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-pink-600" />
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        {expandedSections[id] ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expandedSections[id] && (
        <div className="p-6 pt-0 space-y-4 text-gray-700">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-pink-600" />
          <h1 className="text-3xl font-bold text-gray-900">Manuale Utente</h1>
        </div>
        <p className="text-gray-600">
          Guida completa all'utilizzo di Sphyra Wellness Lab - Gestionale per Centri Estetici e Spa
        </p>
      </div>

      <Section id="intro" title="Introduzione" icon={BookOpen}>
        <div>
          <h3 className="font-semibold text-lg mb-2">Cos'è Sphyra Wellness Lab?</h3>
          <p className="mb-4">
            Sphyra Wellness Lab è una Progressive Web App (PWA) completa per la gestione di centri estetici e spa.
            L'applicazione è progettata per funzionare completamente offline e può essere installata su qualsiasi
            dispositivo (smartphone, tablet, computer) come un'app nativa.
          </p>

          <h3 className="font-semibold text-lg mb-2">Caratteristiche Principali</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Funzionamento Offline:</strong> Tutti i dati sono salvati localmente sul dispositivo</li>
            <li><strong>Backup Automatici:</strong> Backup giornalieri degli ultimi 7 giorni</li>
            <li><strong>Sincronizzazione Multi-Dispositivo:</strong> Opzionale tramite server CouchDB</li>
            <li><strong>Nessun Login Richiesto:</strong> Accesso diretto all'applicazione</li>
            <li><strong>Installabile:</strong> Può essere installata come app sul dispositivo</li>
            <li><strong>Responsive:</strong> Si adatta perfettamente a smartphone, tablet e desktop</li>
          </ul>

          <h3 className="font-semibold text-lg mb-2 mt-4">Installazione come App</h3>
          <p className="mb-2">
            Per installare Sphyra Wellness Lab sul tuo dispositivo:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Desktop (Chrome/Edge):</strong> Clicca sull'icona di installazione nella barra degli indirizzi</li>
            <li><strong>Android:</strong> Tocca "Aggiungi a schermata Home" dal menu del browser</li>
            <li><strong>iOS:</strong> Tocca il pulsante Condividi e seleziona "Aggiungi a Home"</li>
          </ul>
        </div>
      </Section>

      <Section id="dashboard" title="Dashboard" icon={Home}>
        <div>
          <p className="mb-4">
            La Dashboard è la schermata principale dell'applicazione e fornisce una panoramica immediata
            delle attività della giornata.
          </p>

          <h3 className="font-semibold mb-2">Informazioni Visualizzate</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Appuntamenti Oggi:</strong> Numero totale di appuntamenti programmati per oggi</li>
            <li><strong>Clienti Unici Oggi:</strong> Numero di clienti diversi con appuntamenti oggi</li>
            <li><strong>Servizi Erogati Oggi:</strong> Numero di servizi diversi prenotati per oggi</li>
            <li><strong>Prossimi Appuntamenti:</strong> Lista dei prossimi 5 appuntamenti in ordine cronologico</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Azioni Rapide</h3>
          <p className="mb-2">
            Dalla Dashboard puoi accedere rapidamente a:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Visualizzare i dettagli di un appuntamento (cliccando sulla card)</li>
            <li>Vedere se i reminder sono stati inviati (icona campanella)</li>
            <li>Navigare alle diverse sezioni dell'applicazione</li>
          </ul>
        </div>
      </Section>

      <Section id="calendar" title="Calendario" icon={Calendar}>
        <div>
          <p className="mb-4">
            Il Calendario è il cuore dell'applicazione, dove gestisci tutti gli appuntamenti del tuo centro.
          </p>

          <h3 className="font-semibold mb-2">Modalità di Visualizzazione</h3>
          <div className="space-y-3 ml-4">
            <div>
              <p className="font-medium">Vista Giorno</p>
              <p className="text-sm">Mostra tutti gli appuntamenti di un singolo giorno in formato timeline</p>
            </div>
            <div>
              <p className="font-medium">Vista Settimana</p>
              <p className="text-sm">Visualizza 7 giorni consecutivi per una pianificazione settimanale</p>
            </div>
            <div>
              <p className="font-medium">Vista Mese</p>
              <p className="text-sm">Panoramica mensile con tutti gli appuntamenti</p>
            </div>
          </div>

          <h3 className="font-semibold mb-2 mt-4">Creare un Nuovo Appuntamento</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Clicca sul pulsante "Nuovo Appuntamento" o su uno slot orario libero</li>
            <li>Seleziona il <strong>Cliente</strong> dall'elenco (se non presente, vai alla sezione Clienti per aggiungerlo)</li>
            <li>Scegli il <strong>Servizio</strong> da erogare</li>
            <li>Seleziona l'<strong>Operatore</strong> che eseguirà il servizio</li>
            <li>Imposta <strong>Data</strong> e <strong>Orario</strong> dell'appuntamento</li>
            <li>Aggiungi eventuali <strong>Note</strong> (opzionale)</li>
            <li>Clicca su "Salva"</li>
          </ol>

          <h3 className="font-semibold mb-2 mt-4">Stati Appuntamento</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong className="text-blue-600">Programmato:</strong> Appuntamento creato ma non ancora confermato</li>
            <li><strong className="text-green-600">Confermato:</strong> Il cliente ha confermato la sua presenza</li>
            <li><strong className="text-gray-600">Completato:</strong> Il servizio è stato erogato</li>
            <li><strong className="text-red-600">Cancellato:</strong> L'appuntamento è stato annullato</li>
            <li><strong className="text-orange-600">Non Presentato:</strong> Il cliente non si è presentato</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Funzionalità Avanzate</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Drag & Drop:</strong> Nelle viste Giorno e Settimana puoi spostare gli appuntamenti trascinandoli</li>
            <li><strong>Filtraggio per Specializzazione:</strong> Mostra solo gli operatori qualificati per il servizio selezionato</li>
            <li><strong>Colorazione:</strong> Gli appuntamenti sono colorati in base allo stato e all'operatore</li>
            <li><strong>Modifica Rapida:</strong> Clicca su un appuntamento per modificarlo o aggiornarne lo stato</li>
          </ul>
        </div>
      </Section>

      <Section id="customers" title="Clienti" icon={Users}>
        <div>
          <p className="mb-4">
            Gestisci l'anagrafica completa dei tuoi clienti in questa sezione.
          </p>

          <h3 className="font-semibold mb-2">Aggiungere un Nuovo Cliente</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Clicca sul pulsante "Aggiungi Cliente"</li>
            <li>Compila i campi obbligatori:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Nome</li>
                <li>Cognome</li>
                <li>Email (con validazione formato)</li>
                <li>Telefono</li>
              </ul>
            </li>
            <li>Compila i campi opzionali:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Data di Nascita</li>
                <li>Allergie (verranno evidenziate in rosso)</li>
                <li>Note personali</li>
              </ul>
            </li>
            <li>Clicca su "Salva"</li>
          </ol>

          <h3 className="font-semibold mb-2 mt-4">Ricerca Clienti</h3>
          <p className="mb-2">
            Utilizza la barra di ricerca per trovare rapidamente un cliente digitando:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Nome o Cognome</li>
            <li>Email</li>
            <li>Numero di telefono</li>
          </ul>
          <p className="mt-2 text-sm italic">
            La ricerca è in tempo reale e filtra i risultati mentre digiti.
          </p>

          <h3 className="font-semibold mb-2 mt-4">Modificare o Eliminare un Cliente</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Modifica:</strong> Clicca sull'icona matita nella card del cliente</li>
            <li><strong>Elimina:</strong> Clicca sull'icona cestino</li>
          </ul>
          <p className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-3">
            <strong>⚠️ Attenzione:</strong> Non è possibile eliminare un cliente che ha appuntamenti futuri programmati.
            Devi prima cancellare o completare gli appuntamenti.
          </p>

          <h3 className="font-semibold mb-2 mt-4">Visualizzare lo Storico</h3>
          <p>
            Dalla card del cliente puoi visualizzare tutti gli appuntamenti passati e futuri collegati a quel cliente.
          </p>
        </div>
      </Section>

      <Section id="services" title="Servizi" icon={Scissors}>
        <div>
          <p className="mb-4">
            Il catalogo servizi contiene tutti i trattamenti offerti dal tuo centro.
          </p>

          <h3 className="font-semibold mb-2">Creare un Nuovo Servizio</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Clicca sul pulsante "Aggiungi Servizio"</li>
            <li>Inserisci le informazioni:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li><strong>Nome:</strong> Es. "Manicure con Smalto Gel"</li>
                <li><strong>Descrizione:</strong> Dettagli del trattamento</li>
                <li><strong>Durata:</strong> In minuti (incrementi di 15)</li>
                <li><strong>Prezzo:</strong> In euro (€)</li>
                <li><strong>Categoria:</strong> Seleziona da menu a tendina</li>
                <li><strong>Colore:</strong> Per identificazione visiva nel calendario (opzionale)</li>
              </ul>
            </li>
            <li>Clicca su "Salva"</li>
          </ol>

          <h3 className="font-semibold mb-2 mt-4">Categorie Servizi</h3>
          <p className="mb-2">I servizi sono organizzati per categoria:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Mani</li>
            <li>Piedi</li>
            <li>Viso</li>
            <li>Corpo</li>
            <li>Massaggi</li>
            <li>Epilazione</li>
            <li>Trattamenti Speciali</li>
            <li>Altro</li>
          </ul>
          <p className="mt-2 text-sm italic">
            Puoi gestire le categorie dalla sezione Impostazioni.
          </p>

          <h3 className="font-semibold mb-2 mt-4">Ricerca Servizi</h3>
          <p>
            Cerca servizi per nome, categoria o descrizione usando la barra di ricerca.
          </p>

          <h3 className="font-semibold mb-2 mt-4">Modificare o Eliminare un Servizio</h3>
          <p className="mb-2">
            Ogni card servizio ha i pulsanti per modificare o eliminare.
          </p>
          <p className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <strong>⚠️ Attenzione:</strong> Non è possibile eliminare un servizio con appuntamenti futuri associati.
          </p>
        </div>
      </Section>

      <Section id="staff" title="Personale" icon={UserCircle}>
        <div>
          <p className="mb-4">
            Gestisci il team del tuo centro, inclusi ruoli e specializzazioni.
          </p>

          <h3 className="font-semibold mb-2">Aggiungere un Membro del Personale</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Clicca su "Aggiungi Membro"</li>
            <li>Compila i dati:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li><strong>Nome e Cognome</strong></li>
                <li><strong>Email e Telefono</strong></li>
                <li><strong>Ruolo:</strong> Es. Estetista Senior, Massaggiatrice, Receptionist</li>
                <li><strong>Specializzazioni:</strong> Seleziona le categorie di servizi che può erogare</li>
                <li><strong>Colore:</strong> Per identificazione visiva nel calendario</li>
                <li><strong>Stato:</strong> Attivo/Non attivo</li>
              </ul>
            </li>
            <li>Clicca su "Salva"</li>
          </ol>

          <h3 className="font-semibold mb-2 mt-4">Specializzazioni</h3>
          <p className="mb-2">
            Le specializzazioni determinano quali servizi può erogare un operatore. Quando crei un appuntamento:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Vengono mostrati solo gli operatori specializzati nella categoria del servizio scelto</li>
            <li>Questo previene errori di assegnazione e ottimizza il workflow</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Ruoli del Personale</h3>
          <p className="mb-2">I ruoli predefiniti includono:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Estetista Senior</li>
            <li>Estetista</li>
            <li>Massaggiatrice</li>
            <li>Manicurista</li>
            <li>Truccatrice</li>
            <li>Receptionist</li>
            <li>Manager</li>
          </ul>
          <p className="mt-2 text-sm italic">
            Puoi personalizzare i ruoli dalla sezione Impostazioni.
          </p>

          <h3 className="font-semibold mb-2 mt-4">Gestione Stato</h3>
          <p>
            Puoi impostare un membro come "Non attivo" quando non è temporaneamente disponibile
            (es. ferie, malattia). I membri non attivi non appariranno nella selezione degli appuntamenti.
          </p>
        </div>
      </Section>

      <Section id="payments" title="Pagamenti" icon={CreditCard}>
        <div>
          <p className="mb-4">
            Traccia tutti gli incassi e monitora il fatturato del tuo centro.
          </p>

          <h3 className="font-semibold mb-2">Registrare un Pagamento</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Clicca su "Registra Pagamento"</li>
            <li>Seleziona l'<strong>Appuntamento</strong> associato (il prezzo viene compilato automaticamente)</li>
            <li>Verifica o modifica l'<strong>Importo</strong></li>
            <li>Scegli il <strong>Metodo di Pagamento:</strong>
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Contanti</li>
                <li>Carta</li>
                <li>Bonifico</li>
                <li>Altro</li>
              </ul>
            </li>
            <li>Aggiungi eventuali <strong>Note</strong> (opzionale)</li>
            <li>Clicca su "Salva"</li>
          </ol>

          <h3 className="font-semibold mb-2 mt-4">Dashboard Finanziaria</h3>
          <p className="mb-2">Nella sezione pagamenti trovi:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Fatturato Totale:</strong> Somma di tutti i pagamenti registrati</li>
            <li><strong>Incassi per Metodo:</strong> Distribuzione tra contanti, carta, bonifico, altro</li>
            <li><strong>Appuntamenti Non Pagati:</strong> Alert per appuntamenti completati senza pagamento registrato</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Storico Pagamenti</h3>
          <p>
            La tabella storico mostra tutti i pagamenti con:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Data e ora</li>
            <li>Nome cliente</li>
            <li>Servizio erogato</li>
            <li>Importo</li>
            <li>Metodo di pagamento</li>
            <li>Pulsanti per modificare o eliminare</li>
          </ul>
        </div>
      </Section>

      <Section id="reminders" title="Reminder" icon={Bell}>
        <div>
          <p className="mb-4">
            Il sistema reminder aiuta a ridurre i "no-show" inviando notifiche ai clienti prima degli appuntamenti.
          </p>

          <h3 className="font-semibold mb-2">Come Funziona</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Il sistema identifica automaticamente gli appuntamenti nelle prossime 24 ore</li>
            <li>Vengono mostrati nella lista "Appuntamenti Imminenti"</li>
            <li>Puoi inviare reminder tramite:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Email</li>
                <li>SMS</li>
                <li>WhatsApp</li>
              </ul>
            </li>
            <li>Una volta inviato, il reminder viene contrassegnato (icona campanella verde)</li>
          </ol>

          <h3 className="font-semibold mb-2 mt-4">Statistiche Reminder</h3>
          <p className="mb-2">La dashboard mostra:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Numero di prossimi appuntamenti</li>
            <li>Reminder da inviare (appuntamenti senza reminder nelle prossime 24h)</li>
            <li>Reminder già inviati</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Inviare un Reminder</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Trova l'appuntamento nella lista "Appuntamenti Imminenti"</li>
            <li>Clicca sul pulsante del canale desiderato (Email/SMS/WhatsApp)</li>
            <li>Il sistema registra l'invio del reminder</li>
          </ol>

          <p className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
            <strong>💡 Suggerimento:</strong> È consigliabile inviare i reminder 24 ore prima dell'appuntamento
            per dare al cliente tempo di confermare o riprogrammare.
          </p>
        </div>
      </Section>

      <Section id="statistics" title="Statistiche" icon={BarChart3}>
        <div>
          <p className="mb-4">
            Monitora le performance del tuo centro con statistiche e report dettagliati.
          </p>

          <h3 className="font-semibold mb-2">Metriche Chiave</h3>
          <div className="space-y-2 ml-4">
            <div>
              <p className="font-medium">Fatturato Totale</p>
              <p className="text-sm">Somma di tutti i pagamenti registrati</p>
            </div>
            <div>
              <p className="font-medium">Fatturato Medio per Appuntamento</p>
              <p className="text-sm">Valore medio di ogni servizio erogato</p>
            </div>
            <div>
              <p className="font-medium">Clienti Totali</p>
              <p className="text-sm">Numero di clienti in anagrafica</p>
            </div>
            <div>
              <p className="font-medium">Tasso di Retention</p>
              <p className="text-sm">Percentuale di clienti con più di un appuntamento</p>
            </div>
            <div>
              <p className="font-medium">Appuntamenti Completati</p>
              <p className="text-sm">Numero e percentuale di appuntamenti portati a termine</p>
            </div>
          </div>

          <h3 className="font-semibold mb-2 mt-4">Report Dettagliati</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Top 5 Categorie:</strong> I tipi di servizio più richiesti con grafici a barre</li>
            <li><strong>Top 5 Servizi:</strong> I trattamenti più popolari</li>
            <li><strong>Performance Personale:</strong> Numero di appuntamenti completati per ogni operatore</li>
            <li><strong>Distribuzione Stati:</strong> Appuntamenti programmati, confermati, completati, cancellati, no-show</li>
            <li><strong>Fatturato Mensile:</strong> Trend degli incassi mese per mese</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Come Usare le Statistiche</h3>
          <p className="mb-2">Le statistiche ti aiutano a:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Identificare i servizi più redditizi</li>
            <li>Capire quali categorie promuovere</li>
            <li>Valutare le performance del personale</li>
            <li>Monitorare la crescita del business</li>
            <li>Ridurre i "no-show" analizzando i pattern</li>
          </ul>
        </div>
      </Section>

      <Section id="settings" title="Impostazioni" icon={Settings}>
        <div>
          <p className="mb-4">
            Personalizza l'applicazione e configura funzionalità avanzate.
          </p>

          <h3 className="font-semibold mb-2">Timeout Inattività</h3>
          <p className="mb-2">
            Imposta un tempo di inattività (0-30 minuti) dopo il quale viene mostrata una schermata di protezione.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Utile se il dispositivo è accessibile al pubblico</li>
            <li>Impostare a 0 per disabilitare</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Sincronizzazione Database</h3>
          <p className="mb-2">
            Configura la sincronizzazione con un server CouchDB per utilizzare l'app su più dispositivi:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Inserisci l'<strong>URL del server</strong> CouchDB</li>
            <li>Specifica il <strong>nome del database</strong></li>
            <li>Fornisci <strong>Username</strong> e <strong>Password</strong></li>
            <li>Scegli la modalità:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li><strong>Continua:</strong> Sincronizzazione in tempo reale automatica</li>
                <li><strong>Manuale:</strong> Sincronizzi quando vuoi con il pulsante</li>
              </ul>
            </li>
            <li>Clicca "Avvia Sincronizzazione"</li>
          </ol>
          <p className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
            <strong>💡 Vantaggi:</strong> Con la sincronizzazione attiva puoi usare l'app su più dispositivi
            (es. reception e postazioni operative) mantenendo i dati sempre allineati.
          </p>

          <h3 className="font-semibold mb-2 mt-4">Gestione Ruoli Personale</h3>
          <p className="mb-2">
            Personalizza i ruoli disponibili per il tuo team:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Aggiungi nuovi ruoli specifici per il tuo centro</li>
            <li>Modifica i nomi dei ruoli esistenti</li>
            <li>Attiva/Disattiva ruoli senza eliminarli</li>
            <li>Elimina ruoli non più utilizzati</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Gestione Categorie Servizi</h3>
          <p className="mb-2">
            Organizza i servizi in categorie personalizzate:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Crea nuove categorie</li>
            <li>Assegna colori distintivi</li>
            <li>Attiva/Disattiva categorie</li>
            <li>Le categorie sono collegate alle specializzazioni del personale</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Backup e Ripristino</h3>
          <div className="space-y-3 ml-4">
            <div>
              <p className="font-medium">Backup Automatici</p>
              <p className="text-sm">L'app crea automaticamente un backup giornaliero e conserva gli ultimi 7 giorni</p>
            </div>
            <div>
              <p className="font-medium">Backup Manuale</p>
              <p className="text-sm">Clicca "Esporta Dati" per scaricare un file JSON con tutti i dati</p>
            </div>
            <div>
              <p className="font-medium">Ripristino</p>
              <p className="text-sm">
                Puoi ripristinare da un backup automatico o importare un file JSON precedentemente esportato
              </p>
            </div>
          </div>

          <h3 className="font-semibold mb-2 mt-4">Protezione Dati</h3>
          <p className="mb-2">
            L'app richiede la persistenza dello storage al browser per evitare cancellazioni automatiche:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Protegge i dati dalla pulizia automatica del browser</li>
            <li>Mostra l'utilizzo dello spazio di archiviazione</li>
            <li>Monitora la quota disponibile</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Zona Pericolosa</h3>
          <p className="bg-red-50 border border-red-200 rounded p-3">
            <strong>⚠️ Attenzione:</strong> La funzione "Cancella Tutti i Dati" elimina permanentemente
            TUTTI i dati dell'applicazione. Questa azione è irreversibile! Assicurati di avere un backup
            prima di procedere.
          </p>
        </div>
      </Section>

      <Section id="faq" title="Domande Frequenti (FAQ)" icon={BookOpen}>
        <div className="space-y-4">
          <div>
            <p className="font-semibold mb-1">L'app funziona senza connessione internet?</p>
            <p className="text-sm">
              Sì, Sphyra Wellness Lab è progettata per funzionare completamente offline. Tutti i dati sono
              salvati localmente sul dispositivo. La connessione internet è necessaria solo se vuoi
              sincronizzare i dati con altri dispositivi tramite CouchDB.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">I miei dati sono al sicuro?</p>
            <p className="text-sm">
              I dati sono salvati localmente sul tuo dispositivo e non vengono inviati a server esterni
              (a meno che tu non configuri volontariamente la sincronizzazione CouchDB). L'app crea backup
              automatici giornalieri per proteggere i tuoi dati.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Posso usare l'app su più dispositivi?</p>
            <p className="text-sm">
              Sì, configurando la sincronizzazione con un server CouchDB nelle Impostazioni. In questo modo
              tutti i dispositivi collegati avranno sempre i dati aggiornati in tempo reale.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Cosa succede se cancello per errore un dato?</p>
            <p className="text-sm">
              Puoi ripristinare i dati da uno dei backup automatici (ultimi 7 giorni) o da un backup manuale
              se ne hai creato uno. Vai in Impostazioni → Backup e Ripristino.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Perché non riesco a eliminare un cliente/servizio/operatore?</p>
            <p className="text-sm">
              L'app protegge l'integrità dei dati impedendo l'eliminazione di entità con appuntamenti futuri
              associati. Devi prima cancellare o completare gli appuntamenti correlati.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Come faccio a cambiare lo stato di un appuntamento?</p>
            <p className="text-sm">
              Clicca sull'appuntamento nel calendario, si aprirà il modulo di modifica dove puoi cambiare
              lo stato da "Programmato" a "Confermato", "Completato", "Cancellato" o "Non Presentato".
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">I reminder vengono inviati automaticamente?</p>
            <p className="text-sm">
              No, l'app identifica gli appuntamenti che richiedono un reminder (nelle prossime 24h) ma
              l'invio deve essere confermato manualmente dalla sezione Reminder. Questo ti dà controllo
              completo sulle comunicazioni con i clienti.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Quanti dati può contenere l'app?</p>
            <p className="text-sm">
              L'app utilizza IndexedDB che può contenere grandi quantità di dati (generalmente diversi GB).
              Lo spazio utilizzato è monitorabile nella sezione Impostazioni. Per uso tipico di un centro
              estetico, lo spazio non sarà mai un problema.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Posso esportare i dati in Excel?</p>
            <p className="text-sm">
              Attualmente l'esportazione è in formato JSON. Puoi usare strumenti online o Excel stesso per
              convertire il JSON in formato foglio di calcolo. Funzionalità di export Excel diretto potrebbero
              essere aggiunte in futuro.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">L'app supporta più lingue?</p>
            <p className="text-sm">
              Attualmente l'app è disponibile solo in italiano. Il supporto multilingua potrebbe essere
              aggiunto nelle versioni future in base alle richieste degli utenti.
            </p>
          </div>
        </div>
      </Section>

      <Section id="tips" title="Suggerimenti e Best Practices" icon={BookOpen}>
        <div className="space-y-3">
          <div>
            <p className="font-semibold mb-1">📱 Installala come App</p>
            <p className="text-sm">
              Installa Sphyra Wellness Lab sul tuo dispositivo per un'esperienza simile a un'app nativa,
              con accesso rapido e modalità fullscreen.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">🔄 Abilita la Sincronizzazione</p>
            <p className="text-sm">
              Se usi più dispositivi (es. tablet alla reception e smartphone personale), configura
              la sincronizzazione CouchDB per avere sempre i dati allineati.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">💾 Backup Regolari</p>
            <p className="text-sm">
              Anche se l'app fa backup automatici giornalieri, è buona pratica fare un backup manuale
              prima di operazioni importanti o periodicamente (es. fine mese).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">🎨 Usa i Colori</p>
            <p className="text-sm">
              Assegna colori distintivi agli operatori e ai servizi per rendere il calendario più
              leggibile a colpo d'occhio.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">⚠️ Registra le Allergie</p>
            <p className="text-sm">
              Inserisci sempre le allergie dei clienti nell'anagrafica. Verranno evidenziate in rosso
              per garantire la sicurezza dei trattamenti.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">📊 Monitora le Statistiche</p>
            <p className="text-sm">
              Controlla regolarmente la sezione Statistiche per capire quali servizi funzionano meglio
              e dove puoi migliorare.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">🔔 Invia Reminder</p>
            <p className="text-sm">
              Invia reminder 24 ore prima degli appuntamenti per ridurre drasticamente i "no-show"
              e ottimizzare l'agenda.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">✅ Aggiorna gli Stati</p>
            <p className="text-sm">
              Mantieni aggiornati gli stati degli appuntamenti (da Programmato → Confermato → Completato)
              per avere statistiche accurate.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">💰 Registra i Pagamenti</p>
            <p className="text-sm">
              Registra sempre i pagamenti appena ricevuti per monitorare correttamente il fatturato
              e identificare appuntamenti non pagati.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">👥 Specializzazioni Personale</p>
            <p className="text-sm">
              Imposta correttamente le specializzazioni del personale per vedere solo gli operatori
              qualificati quando crei un appuntamento per un determinato servizio.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">📝 Usa le Note</p>
            <p className="text-sm">
              Sfrutta i campi note (clienti, appuntamenti, pagamenti) per annotare informazioni
              importanti che potrebbero essere utili in futuro.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">🔒 Protezione Inattività</p>
            <p className="text-sm">
              Se il dispositivo è in area pubblica, abilita il timeout di inattività nelle Impostazioni
              per proteggere la privacy dei dati dei clienti.
            </p>
          </div>
        </div>
      </Section>

      <Section id="troubleshooting" title="Risoluzione Problemi" icon={Settings}>
        <div className="space-y-4">
          <div>
            <p className="font-semibold mb-1">L'app è lenta o non risponde</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Prova a chiudere e riaprire l'app</li>
              <li>Svuota la cache del browser</li>
              <li>Assicurati di avere abbastanza spazio di archiviazione (controlla in Impostazioni)</li>
              <li>Se il problema persiste, considera di ripristinare da un backup recente</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">La sincronizzazione non funziona</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Verifica la connessione internet</li>
              <li>Controlla che l'URL del server CouchDB sia corretto</li>
              <li>Verifica username e password</li>
              <li>Assicurati che il server CouchDB sia raggiungibile e in esecuzione</li>
              <li>Prova a fermare e riavviare la sincronizzazione</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Non trovo un cliente/servizio che ho creato</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Controlla la barra di ricerca, potrebbe esserci un filtro attivo</li>
              <li>Verifica di essere nella sezione corretta</li>
              <li>Se hai ripristinato da un backup, assicurati di aver selezionato quello più recente</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Gli appuntamenti non appaiono nel calendario</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Verifica di essere nella data corretta</li>
              <li>Controlla che non ci siano filtri attivi</li>
              <li>Assicurati che l'appuntamento abbia data e orario validi</li>
              <li>Prova a cambiare vista (giorno/settimana/mese)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Ho perso dei dati</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Vai in Impostazioni → Backup e Ripristino</li>
              <li>Controlla i backup automatici disponibili (ultimi 7 giorni)</li>
              <li>Ripristina il backup più recente prima della perdita dati</li>
              <li>Se hai backup manuali, puoi importarli</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Il browser ha cancellato i dati automaticamente</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Vai in Impostazioni e clicca "Richiedi Persistenza Storage"</li>
              <li>Questo impedirà al browser di cancellare i dati in futuro</li>
              <li>Ripristina da un backup se disponibile</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Non riesco ad installare l'app</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Assicurati di usare un browser supportato (Chrome, Edge, Safari)</li>
              <li>Su desktop, cerca l'icona di installazione nella barra degli indirizzi</li>
              <li>Su mobile, usa il menu del browser (Aggiungi a Home / Aggiungi a schermata Home)</li>
              <li>Alcuni browser potrebbero richiedere HTTPS per l'installazione</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Le statistiche mostrano dati errati</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Verifica che tutti gli appuntamenti abbiano lo stato corretto</li>
              <li>Assicurati di aver registrato i pagamenti per gli appuntamenti completati</li>
              <li>Controlla che le date siano state inserite correttamente</li>
              <li>Prova a ricaricare la pagina</li>
            </ul>
          </div>

          <div className="mt-4 bg-pink-50 border border-pink-200 rounded p-4">
            <p className="font-semibold mb-2">🆘 Hai ancora problemi?</p>
            <p className="text-sm">
              Se nessuna delle soluzioni sopra funziona:
            </p>
            <ol className="list-decimal list-inside text-sm space-y-1 ml-4 mt-2">
              <li>Fai un backup manuale dei dati (se possibile)</li>
              <li>Prova a usare l'app in una finestra in incognito</li>
              <li>Aggiorna il browser all'ultima versione</li>
              <li>Come ultima risorsa, considera di reinstallare l'app</li>
            </ol>
          </div>
        </div>
      </Section>

      <div className="mt-8 p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
        <h3 className="font-semibold text-lg mb-2">📚 Versione Manuale</h3>
        <p className="text-sm text-gray-700 mb-2">
          Questo manuale viene aggiornato regolarmente con nuove funzionalità e miglioramenti.
        </p>
        <p className="text-sm text-gray-600">
          Ultima revisione: Novembre 2025
        </p>
      </div>
    </div>
  );
};

export default UserManual;
