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
            L'applicazione utilizza un database PostgreSQL e può essere installata su qualsiasi
            dispositivo (smartphone, tablet, computer) come un'app nativa.
          </p>

          <h3 className="font-semibold text-lg mb-2">Caratteristiche Principali</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Database PostgreSQL:</strong> Tutti i dati sono salvati in modo sicuro su database PostgreSQL con accesso tramite REST API</li>
            <li><strong>Sistema di Autenticazione:</strong> Login con username e password, due ruoli (RESPONSABILE/UTENTE) con permessi differenziati</li>
            <li><strong>Gestione Completa:</strong> Appuntamenti, clienti, servizi, personale, pagamenti, statistiche tutto in un'unica applicazione</li>
            <li><strong>Calendario Avanzato:</strong> 3 viste (Giorno, Settimana, Mese), orari 6:00-22:00, drag & drop, auto-scroll all'ora corrente</li>
            <li><strong>Reminder Email Automatici:</strong> Invio automatico o manuale con file .ics calendario, link di conferma e cron job configurabile</li>
            <li><strong>Filtri "Solo Oggi":</strong> Visualizzazione rapida di clienti, servizi e personale coinvolti negli appuntamenti del giorno</li>
            <li><strong>Statistiche Avanzate:</strong> Dashboard con metriche, grafici colorati, top servizi/categorie, performance personale</li>
            <li><strong>Sistema di Logging:</strong> Visualizzatore logs con 5 livelli, filtri, export JSON e permessi per ruolo</li>
            <li><strong>Controlli Intelligenti:</strong> Validazioni automatiche, formattazione telefono, controllo conflitti appuntamenti</li>
            <li><strong>Installabile come PWA:</strong> Può essere installata come app nativa su smartphone, tablet e desktop</li>
            <li><strong>Responsive Design:</strong> Si adatta perfettamente a qualsiasi dispositivo e dimensione schermo</li>
            <li><strong>Dashboard Auto-refresh:</strong> Aggiornamento automatico ogni 30 secondi per visualizzare sempre dati aggiornati</li>
          </ul>

          <h3 className="font-semibold text-lg mb-2 mt-4">Aree Funzionali dell'Applicazione</h3>
          <p className="mb-2">
            Sphyra Wellness Lab è organizzata in sezioni specifiche per gestire ogni aspetto del tuo centro:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4 mt-3">
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">📊 Dashboard</p>
              <p className="text-sm">Panoramica giornaliera con statistiche in tempo reale e prossimi appuntamenti</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">📅 Calendario</p>
              <p className="text-sm">Gestione appuntamenti con 3 viste, drag & drop e controllo conflitti</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">👥 Clienti</p>
              <p className="text-sm">Anagrafica completa con allergie, storico appuntamenti e filtro "Solo Oggi"</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">✂️ Servizi</p>
              <p className="text-sm">Catalogo trattamenti con categorie, prezzi, durate e colori personalizzati</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">👔 Personale</p>
              <p className="text-sm">Gestione team con specializzazioni, ruoli e disponibilità</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">💳 Pagamenti</p>
              <p className="text-sm">Tracciamento incassi, fatturato totale e storico completo</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">🔔 Reminder</p>
              <p className="text-sm">Sistema email automatico con file .ics e link di conferma</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">📈 Statistiche</p>
              <p className="text-sm">Report dettagliati, grafici, top servizi e performance personale</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">🔐 Login</p>
              <p className="text-sm">Autenticazione sicura con ruoli RESPONSABILE/UTENTE</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-pink-600">⚙️ Impostazioni</p>
              <p className="text-sm">Configurazione completa: utenti, logs, categorie servizi, ruoli personale e reminder</p>
            </div>
          </div>

          <h3 className="font-semibold text-lg mb-2 mt-6">Installazione come App</h3>
          <p className="mb-2">
            Per installare Sphyra Wellness Lab sul tuo dispositivo:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Desktop (Chrome/Edge):</strong> Clicca sull'icona di installazione nella barra degli indirizzi</li>
            <li><strong>Android:</strong> Tocca "Aggiungi a schermata Home" dal menu del browser</li>
            <li><strong>iOS:</strong> Tocca il pulsante Condividi e seleziona "Aggiungi a Home"</li>
          </ul>

          <h3 className="font-semibold text-lg mb-2 mt-6">Primo Accesso</h3>
          <p className="mb-2">
            All'apertura dell'applicazione ti verrà richiesto di effettuare il login:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Se è la prima volta, un utente RESPONSABILE predefinito potrebbe essere già configurato</li>
            <li>Dopo il login, i RESPONSABILI possono creare altri utenti dalla sezione Impostazioni → Tab Utenti</li>
            <li>Gli utenti RESPONSABILE hanno accesso completo, gli UTENTE hanno permessi limitati</li>
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
            <li><strong>Appuntamenti Oggi:</strong> Numero totale di appuntamenti programmati per oggi (clicca per andare alla vista giornaliera)</li>
            <li><strong>Clienti Unici Oggi:</strong> Numero di clienti diversi con appuntamenti oggi</li>
            <li><strong>Servizi Erogati Oggi:</strong> Numero di servizi diversi prenotati per oggi</li>
            <li><strong>Personale Oggi:</strong> Numero di operatori impegnati negli appuntamenti di oggi</li>
            <li><strong>Prossimi Appuntamenti:</strong> Lista dei prossimi 5 appuntamenti in ordine cronologico</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Azioni Rapide</h3>
          <p className="mb-2">
            Dalla Dashboard puoi accedere rapidamente a:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Visualizzare i dettagli di un appuntamento (cliccando sulla card)</li>
            <li>Vedere se i reminder sono stati inviati (icona campanella)</li>
            <li>Andare direttamente alla vista giornaliera (cliccando su "Appuntamenti Oggi")</li>
            <li>Navigare alle diverse sezioni dell'applicazione</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Aggiornamento Automatico</h3>
          <p>
            La Dashboard si aggiorna automaticamente ogni 30 secondi per mostrare sempre le informazioni più recenti
            senza dover ricaricare manualmente la pagina.
          </p>
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
              <p className="text-sm">Mostra tutti gli appuntamenti di un singolo giorno in formato timeline con orari dalle 6:00 alle 22:00.
              Quando visualizzi il giorno corrente, il calendario scorre automaticamente all'ora attuale per facilitare la navigazione.</p>
            </div>
            <div>
              <p className="font-medium">Vista Settimana</p>
              <p className="text-sm">Visualizza 7 giorni consecutivi per una pianificazione settimanale con orari dalle 6:00 alle 22:00</p>
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
            <li><strong>Controllo Conflitti:</strong> Il sistema avvisa automaticamente se stai creando un appuntamento in sovrapposizione con uno esistente (stesso cliente o stesso operatore)</li>
            <li><strong>Colorazione:</strong> Gli appuntamenti sono colorati in base allo stato e all'operatore</li>
            <li><strong>Modifica Rapida:</strong> Clicca su un appuntamento per modificarlo o aggiornarne lo stato</li>
            <li><strong>Calcolo Automatico:</strong> L'ora di fine viene calcolata automaticamente in base alla durata del servizio</li>
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

          <h3 className="font-semibold mb-2 mt-4">Filtro "Solo Oggi"</h3>
          <p>
            Attiva il filtro "Solo Oggi" per visualizzare rapidamente solo i clienti che hanno appuntamenti nella giornata corrente.
            Questa funzione è particolarmente utile per preparare i trattamenti o consultare rapidamente le informazioni dei clienti del giorno.
          </p>

          <h3 className="font-semibold mb-2 mt-4">Validazioni e Formattazione Automatica</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Email:</strong> Il sistema valida automaticamente il formato dell'indirizzo email</li>
            <li><strong>Telefono:</strong> Il numero di telefono viene formattato automaticamente mentre digiti per facilitare la lettura</li>
            <li><strong>Allergie:</strong> Se presenti, vengono evidenziate in rosso nelle card dei clienti per massima visibilità</li>
          </ul>

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

          <h3 className="font-semibold mb-2 mt-4">Filtro "Solo Oggi"</h3>
          <p>
            Il filtro "Solo Oggi" mostra solo i servizi che sono stati prenotati negli appuntamenti della giornata corrente.
            Utile per vedere rapidamente quali trattamenti verranno erogati oggi.
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

          <h3 className="font-semibold mb-2 mt-4">Filtro "Solo Oggi"</h3>
          <p className="mb-2">
            Attiva il filtro "Solo Oggi" per visualizzare solo il personale che ha appuntamenti programmati nella giornata corrente.
            Utile per vedere quali operatori sono impegnati oggi.
          </p>

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
                <li><strong>Email</strong> (completamente funzionante con file .ics calendario allegato)</li>
                <li>SMS (placeholder, non ancora implementato)</li>
                <li>WhatsApp (placeholder, non ancora implementato)</li>
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
          <p className="mb-2">Hai due opzioni per inviare i reminder via email:</p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li><strong>Invio Singolo:</strong> Trova l'appuntamento nella lista e clicca sul pulsante Email</li>
            <li><strong>Invio Massivo:</strong> Clicca il pulsante "Invia Tutti i Reminder Email" per inviare reminder a tutti gli appuntamenti nelle prossime 24 ore che non hanno ancora ricevuto un reminder</li>
          </ol>

          <h3 className="font-semibold mb-2 mt-4">Contenuto Email Reminder</h3>
          <p className="mb-2">Ogni email reminder include:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Dettagli completi dell'appuntamento (data, ora, servizio)</li>
            <li><strong>Link di conferma:</strong> Il cliente può confermare l'appuntamento cliccando sul link</li>
            <li><strong>File .ics allegato:</strong> Permette di aggiungere l'appuntamento al proprio calendario con un click</li>
            <li>Token di sicurezza univoco per ogni appuntamento</li>
          </ul>
          <p className="mt-2 text-sm italic">
            Quando il cliente clicca sul link di conferma, lo stato dell'appuntamento cambia automaticamente in "Confermato".
          </p>

          <h3 className="font-semibold mb-2 mt-4">Reminder Automatici</h3>
          <p className="mb-2">
            Puoi configurare l'invio automatico dei reminder dalla sezione <strong>Impostazioni → Configurazione → Impostazioni Reminder</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Attiva/Disattiva reminder automatici</li>
            <li>Imposta l'orario di invio (ora e minuti)</li>
            <li>Configura quanti giorni prima dell'appuntamento inviare il reminder</li>
            <li>Verifica lo stato del server email (health check automatico)</li>
          </ul>

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
            <li><strong>Top 5 Categorie:</strong> I tipi di servizio più richiesti con grafici a barre, conteggio e fatturato per categoria</li>
            <li><strong>Top 5 Servizi:</strong> I trattamenti più popolari con revenue generata per ciascuno</li>
            <li><strong>Performance Personale:</strong> Numero di appuntamenti completati per ogni operatore con tasso di completamento e grafici colorati</li>
            <li><strong>Distribuzione Stati:</strong> Cards colorate distinte per ogni stato (programmati, confermati, completati, cancellati, no-show) con conteggi e percentuali</li>
            <li><strong>Riepilogo Mensile:</strong> Appuntamenti del mese corrente e fatturato mensile con valore medio per appuntamento</li>
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

      <Section id="login" title="Login e Autenticazione" icon={UserCircle}>
        <div>
          <p className="mb-4">
            Sphyra Wellness Lab include un sistema di autenticazione utenti per proteggere l'accesso ai dati sensibili
            e differenziare i permessi.
          </p>

          <h3 className="font-semibold mb-2">Accesso all'Applicazione</h3>
          <p className="mb-2">
            All'apertura dell'applicazione viene richiesto di effettuare il login con:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Username:</strong> Nome utente univoco</li>
            <li><strong>Password:</strong> Password sicura (hash SHA-256)</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Ruoli Utente</h3>
          <p className="mb-2">L'applicazione supporta due ruoli con permessi differenziati:</p>
          <div className="space-y-3 ml-4">
            <div>
              <p className="font-medium">RESPONSABILE</p>
              <p className="text-sm">Accesso completo a tutte le funzionalità, inclusa la gestione utenti, configurazioni avanzate, cancellazione dati e accesso completo ai logs</p>
            </div>
            <div>
              <p className="font-medium">UTENTE</p>
              <p className="text-sm">Accesso alle funzionalità operative quotidiane (appuntamenti, clienti, servizi, pagamenti) con restrizioni su impostazioni critiche e sola visualizzazione dei logs</p>
            </div>
          </div>

          <h3 className="font-semibold mb-2 mt-4">Gestione Utenti</h3>
          <p className="mb-2">
            I Responsabili possono gestire gli utenti dalla sezione <strong>Impostazioni → Tab Utenti</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Creare nuovi utenti con username e password</li>
            <li>Assegnare ruoli (RESPONSABILE / UTENTE)</li>
            <li>Attivare/Disattivare utenti temporaneamente</li>
            <li>Modificare password utenti</li>
            <li>Eliminare utenti non più necessari</li>
          </ul>

          <h3 className="font-semibold mb-2 mt-4">Sicurezza</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Password Criptate:</strong> Le password vengono salvate con hash SHA-256, mai in chiaro</li>
            <li><strong>Sessioni JWT:</strong> Utilizzo di JSON Web Token per gestire le sessioni in sicurezza</li>
            <li><strong>Timeout Inattività:</strong> Protezione automatica dopo periodo di inattività (configurabile)</li>
            <li><strong>Permessi Granulari:</strong> Ogni ruolo ha accesso solo alle funzioni autorizzate</li>
          </ul>
        </div>
      </Section>

      <Section id="settings" title="Impostazioni" icon={Settings}>
        <div>
          <p className="mb-4">
            Personalizza l'applicazione e configura funzionalità avanzate. La sezione Impostazioni è organizzata in tab:
            <strong> Generali, Configurazione, Utenti e Avanzate</strong>.
          </p>

          <h3 className="font-semibold text-lg mb-3 text-pink-600">Tab: Generali</h3>

          <h3 className="font-semibold mb-2">Timeout Inattività</h3>
          <p className="mb-2">
            Imposta un tempo di inattività (0-30 minuti) dopo il quale viene mostrata una schermata di protezione.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Utile se il dispositivo è accessibile al pubblico</li>
            <li>Impostare a 0 per disabilitare</li>
          </ul>

          <h3 className="font-semibold text-lg mb-3 mt-6 text-pink-600">Tab: Configurazione</h3>

          <h3 className="font-semibold mb-2">Gestione Ruoli Personale</h3>
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

          <h3 className="font-semibold mb-2 mt-4">Impostazioni Reminder</h3>
          <p className="mb-2">
            Configura il sistema di reminder automatici per l'invio via email:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Health Check Server:</strong> Verifica automatica dello stato del server email (indicatore verde/rosso)</li>
            <li><strong>Attiva Reminder Automatici:</strong> Abilita/disabilita l'invio automatico giornaliero</li>
            <li><strong>Orario Invio:</strong> Imposta ora e minuti per l'invio automatico (es. 10:00)</li>
            <li><strong>Giorni Prima:</strong> Configura quanti giorni prima dell'appuntamento inviare il reminder (default 1 giorno)</li>
            <li><strong>Configurazione Cron Job:</strong> Gestione automatica del job schedulato sul server</li>
          </ul>
          <p className="mt-2 text-sm italic">
            I reminder automatici richiedono che il server backend sia in esecuzione e configurato correttamente.
          </p>

          <h3 className="font-semibold text-lg mb-3 mt-6 text-pink-600">Tab: Utenti</h3>

          <h3 className="font-semibold mb-2">Gestione Utenti (solo RESPONSABILE)</h3>
          <p className="mb-2">
            Gestisci gli utenti che possono accedere all'applicazione. Questa funzione è disponibile solo per gli utenti con ruolo RESPONSABILE.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Creazione Utenti:</strong> Aggiungi nuovi utenti con username univoco e password sicura</li>
            <li><strong>Assegnazione Ruoli:</strong> Scegli tra RESPONSABILE (accesso completo) e UTENTE (accesso limitato)</li>
            <li><strong>Modifica Utenti:</strong> Aggiorna username, password o ruolo di utenti esistenti</li>
            <li><strong>Attivazione/Disattivazione:</strong> Disabilita temporaneamente un utente senza eliminarlo</li>
            <li><strong>Eliminazione Utenti:</strong> Rimuovi definitivamente utenti non più necessari</li>
          </ul>
          <p className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
            <strong>💡 Nota:</strong> Le password vengono sempre salvate con hash SHA-256 per garantire massima sicurezza.
          </p>

          <h3 className="font-semibold text-lg mb-3 mt-6 text-pink-600">Tab: Avanzate</h3>

          <h3 className="font-semibold mb-2">Visualizzatore Logs</h3>
          <p className="mb-2">
            Il sistema di logging registra tutti gli eventi dell'applicazione per facilitare il debug e il monitoraggio.
          </p>

          <h4 className="font-medium mb-2 mt-3">Livelli di Log:</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>ERROR:</strong> Errori critici che impediscono il funzionamento</li>
            <li><strong>WARN:</strong> Avvisi su situazioni anomale ma gestibili</li>
            <li><strong>INFO:</strong> Informazioni su operazioni importanti</li>
            <li><strong>LOG:</strong> Eventi normali dell'applicazione</li>
            <li><strong>DEBUG:</strong> Dettagli tecnici per sviluppatori</li>
          </ul>

          <h4 className="font-medium mb-2 mt-3">Funzionalità:</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Filtri per Livello:</strong> Visualizza solo i log del livello selezionato</li>
            <li><strong>Timestamp Dettagliati:</strong> Ogni log include data e ora precisa</li>
            <li><strong>Dettagli Espandibili:</strong> Clicca su un log per vedere informazioni complete</li>
            <li><strong>Export JSON:</strong> Esporta tutti i logs in formato JSON per analisi esterne</li>
            <li><strong>Cancellazione Logs:</strong> Elimina tutti i log per liberare spazio</li>
            <li><strong>Limite FIFO:</strong> Mantiene automaticamente gli ultimi 1000 log (First In, First Out)</li>
          </ul>

          <h4 className="font-medium mb-2 mt-3">Permessi:</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>RESPONSABILE:</strong> Accesso completo (visualizzazione, export, cancellazione)</li>
            <li><strong>UTENTE:</strong> Solo visualizzazione logs (no export, no cancellazione)</li>
          </ul>

          <p className="mt-2 text-sm italic">
            I logs sono utili per identificare problemi, monitorare le operazioni e comprendere il comportamento dell'applicazione.
          </p>
        </div>
      </Section>

      <Section id="faq" title="Domande Frequenti (FAQ)" icon={BookOpen}>
        <div className="space-y-4">
          <div>
            <p className="font-semibold mb-1">L'app richiede connessione internet?</p>
            <p className="text-sm">
              Sì, l'applicazione richiede connessione internet per comunicare con il server PostgreSQL tramite REST API.
              Tutti i dati sono salvati in modo sicuro sul database server per garantire affidabilità e accessibilità.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">I miei dati sono al sicuro?</p>
            <p className="text-sm">
              Sì, i dati sono salvati in modo sicuro su database PostgreSQL con autenticazione JWT.
              Solo gli utenti autorizzati possono accedere ai dati tramite login con username e password.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Posso usare l'app su più dispositivi?</p>
            <p className="text-sm">
              Sì, puoi usare l'app su qualsiasi dispositivo con accesso al server. I dati sono sincronizzati
              automaticamente poiché risiedono sul database PostgreSQL centrale accessibile da tutti i dispositivi.
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
              Sì, se configurati nelle Impostazioni Reminder. Puoi attivare l'invio automatico giornaliero
              impostando l'orario e i giorni prima dell'appuntamento. Il sistema invierà le email automaticamente
              tramite cron job. Puoi anche inviare reminder manualmente dalla sezione Reminder.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">L'app supporta più lingue?</p>
            <p className="text-sm">
              Attualmente l'app è disponibile solo in italiano. Il supporto multilingua potrebbe essere
              aggiunto nelle versioni future in base alle richieste degli utenti.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Come funzionano i reminder automatici?</p>
            <p className="text-sm">
              I reminder automatici inviano email ai clienti all'orario configurato nelle Impostazioni Reminder.
              Il sistema controlla gli appuntamenti e invia reminder X giorni prima (configurabile).
              Richiede che il server backend sia in esecuzione.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Che differenza c'è tra RESPONSABILE e UTENTE?</p>
            <p className="text-sm">
              Il RESPONSABILE ha accesso completo a tutte le funzioni, inclusa gestione utenti, configurazioni
              avanzate e cancellazione dati. L'UTENTE può gestire le operazioni quotidiane (appuntamenti, clienti,
              servizi, pagamenti) ma ha restrizioni su impostazioni critiche e può solo visualizzare i logs.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Cosa contiene il file .ics allegato alle email?</p>
            <p className="text-sm">
              Il file .ics è un file calendario standard che il cliente può aprire con un doppio click per
              aggiungere automaticamente l'appuntamento al proprio calendario (Google Calendar, Outlook, Apple
              Calendar, ecc.). Contiene data, ora, durata e dettagli del servizio.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">Dove trovo i logs dell'applicazione?</p>
            <p className="text-sm">
              I logs si trovano in Impostazioni → Tab Avanzate → Visualizzatore Logs. Puoi filtrare per livello
              (ERROR, WARN, INFO, LOG, DEBUG), visualizzare dettagli ed esportarli in JSON. I RESPONSABILI possono
              anche cancellare i logs.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">A cosa serve il filtro "Solo Oggi"?</p>
            <p className="text-sm">
              Il filtro "Solo Oggi" è disponibile nelle sezioni Clienti, Servizi e Personale. Mostra rapidamente
              solo le entità coinvolte negli appuntamenti della giornata corrente, facilitando la preparazione
              e la gestione operativa quotidiana.
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

          <div>
            <p className="font-semibold mb-1">📧 Configura i Reminder Automatici</p>
            <p className="text-sm">
              Configura l'invio automatico dei reminder nelle Impostazioni per risparmiare tempo. Il sistema
              invierà automaticamente le email ai clienti all'orario da te scelto senza intervento manuale.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">🔍 Usa il Filtro "Solo Oggi"</p>
            <p className="text-sm">
              All'inizio della giornata lavorativa, usa il filtro "Solo Oggi" in Clienti, Servizi e Personale
              per avere una panoramica rapida di chi/cosa sarà coinvolto oggi. Facilita la preparazione dei materiali.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">📊 Monitora i Logs</p>
            <p className="text-sm">
              Se riscontri problemi o comportamenti anomali, consulta i logs nella sezione Avanzate.
              I logs contengono informazioni dettagliate utili per identificare e risolvere i problemi.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">👥 Gestisci i Permessi Utente</p>
            <p className="text-sm">
              Assegna il ruolo UTENTE al personale operativo e riserva il ruolo RESPONSABILE solo a chi deve
              gestire configurazioni critiche. Questo riduce il rischio di modifiche accidentali alle impostazioni.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">📅 File .ics per i Clienti</p>
            <p className="text-sm">
              Spiega ai clienti che possono aggiungere l'appuntamento al loro calendario aprendo il file .ics
              allegato all'email reminder. Questo riduce ulteriormente i "no-show".
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">⏰ Auto-scroll nel Calendario</p>
            <p className="text-sm">
              Quando apri la vista giornaliera per il giorno corrente, il calendario scorre automaticamente
              all'ora attuale. Sfrutta questa funzionalità per vedere immediatamente i prossimi appuntamenti.
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
              <li>Verifica la connessione internet al server</li>
              <li>Controlla i logs nella sezione Avanzate per identificare eventuali errori</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Non trovo un cliente/servizio che ho creato</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Controlla la barra di ricerca, potrebbe esserci un filtro attivo</li>
              <li>Verifica di essere nella sezione corretta</li>
              <li>Ricarica la pagina per assicurarti di vedere i dati più aggiornati dal server</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Gli appuntamenti non appaiono nel calendario</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Verifica di essere nella data corretta</li>
              <li>Controlla che non ci siano filtri attivi</li>
              <li>Assicurati che l'appuntamento abbia data e orario validi</li>
              <li>Prova a cambiare vista (giorno/settimana/mese)</li>
              <li>Ricarica la pagina per assicurarti di vedere i dati più recenti dal server</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Non riesco a connettermi al server</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Verifica la connessione internet</li>
              <li>Controlla che il server backend sia in esecuzione</li>
              <li>Verifica che l'URL del server sia corretto</li>
              <li>Consulta i logs per identificare eventuali errori di connessione</li>
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
              <li>Consulta i logs nella sezione Avanzate per identificare errori specifici</li>
              <li>Prova a usare l'app in una finestra in incognito</li>
              <li>Aggiorna il browser all'ultima versione</li>
              <li>Verifica che il server backend sia accessibile e funzionante</li>
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
        <p className="text-sm text-gray-600 mb-3">
          Ultima revisione: Dicembre 2025
        </p>
        <div className="text-sm text-gray-700 bg-white rounded p-3">
          <p className="font-medium mb-2">Architettura attuale:</p>
          <ul className="list-disc list-inside space-y-1 text-xs mb-3">
            <li><strong>Database PostgreSQL:</strong> Migrazione completa da CouchDB/PouchDB a PostgreSQL con REST API</li>
            <li><strong>Autenticazione JWT:</strong> Sistema di autenticazione sicuro con token</li>
            <li><strong>Backend Node.js + Express:</strong> Server API con Prisma ORM</li>
            <li><strong>Frontend React + TypeScript:</strong> Progressive Web App moderna e responsive</li>
          </ul>
          <p className="font-medium mb-2">Funzionalità principali:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Sistema di autenticazione utenti con ruoli RESPONSABILE/UTENTE</li>
            <li>Gestione utenti completa nel tab Impostazioni</li>
            <li>Visualizzatore logs con 5 livelli e funzioni di export</li>
            <li>Calendario esteso: orari 6:00-22:00 con auto-scroll all'ora corrente</li>
            <li>Filtro "Solo Oggi" per Clienti, Servizi e Personale</li>
            <li>Reminder automatici configurabili con cron job</li>
            <li>File .ics calendario allegato alle email reminder</li>
            <li>Invio massivo reminder con un click</li>
            <li>Dashboard con auto-refresh ogni 30 secondi</li>
            <li>Link diretto dalla Dashboard alla vista giornaliera</li>
            <li>Controllo conflitti appuntamenti avanzato</li>
            <li>Statistiche dettagliate con grafici colorati</li>
            <li>Validazioni e formattazione automatica telefono</li>
            <li>Health check server email automatico</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserManual;
