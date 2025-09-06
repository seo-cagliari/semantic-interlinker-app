import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { ShieldCheckIcon } from '../../components/Icons';

export const metadata: Metadata = {
  title: 'Privacy Policy - Semantic Interlinker 25',
  description: 'Informativa sulla Privacy per l\'applicazione Semantic Interlinker 25.',
};

const PrivacyPage = () => {
  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <header className="text-center py-10">
          <div className="flex justify-center items-center gap-4">
            <ShieldCheckIcon className="w-12 h-12 text-blue-600" />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Informativa sulla Privacy</h1>
              <p className="text-slate-500 mt-2 text-lg">Ultimo aggiornamento: 25 Luglio 2024</p>
            </div>
          </div>
        </header>

        <main className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-12 prose prose-slate max-w-none">
          <p>
            Benvenuto su Semantic Interlinker 25 (l'"Applicazione"). Questa informativa sulla privacy descrive come raccogliamo, utilizziamo e gestiamo i tuoi dati quando utilizzi la nostra Applicazione, in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR) e la normativa italiana.
          </p>

          <h2>1. Titolare del Trattamento</h2>
          <p>
            Il titolare del trattamento dei dati è SEO Cagliari, con sede a Cagliari, Italia. Per qualsiasi domanda relativa a questa policy, puoi contattarci all'indirizzo email: <a href="mailto:info@seo-cagliari.it">info@seo-cagliari.it</a>.
          </p>

          <h2>2. Dati Raccolti e Finalità</h2>
          <p>
            L'Applicazione accede ai dati provenienti da due fonti principali, esclusivamente dopo il tuo esplicito consenso tramite il protocollo di autenticazione sicuro OAuth 2.0 di Google:
          </p>
          <ul>
            <li>
              <strong>Google Search Console:</strong> Accediamo in sola lettura ai dati relativi ai siti di tua proprietà, incluse query di ricerca, pagine, click, impressioni, CTR e posizioni. Questi dati sono fondamentali per analizzare le performance del tuo sito e generare suggerimenti di link interni.
            </li>
            <li>
              <strong>Google Analytics 4:</strong> Accediamo in sola lettura ai dati aggregati relativi al comportamento degli utenti sul tuo sito, come sessioni, tasso di engagement e conversioni per pagina. Questi dati ci aiutano a formulare suggerimenti strategici che tengano conto degli obiettivi di business.
            </li>
          </ul>
          <p>
            <strong>Finalità del trattamento:</strong> I dati vengono utilizzati al solo scopo di fornire le funzionalità principali dell'Applicazione, ovvero l'analisi SEO e la generazione di suggerimenti per l'ottimizzazione dei link interni.
          </p>

          <h2>3. Modalità di Trattamento e Conservazione dei Dati</h2>
          <p>
            La sicurezza e la privacy dei tuoi dati sono la nostra massima priorità. La nostra architettura è progettata per minimizzare la gestione dei dati:
          </p>
          <ul>
            <li>
              <strong>Nessun Salvataggio su Server Remoti:</strong> L'Applicazione <strong>NON</strong> salva, memorizza o trasferisce i dati provenienti da Google Search Console o Google Analytics sui nostri server o su database esterni. Tutta l'elaborazione avviene in tempo reale.
            </li>
            <li>
              <strong>Token di Autenticazione:</strong> I token di accesso OAuth di Google vengono memorizzati in modo sicuro in cookie <code>httpOnly</code> nel tuo browser per gestire la sessione di autenticazione.
            </li>
            <li>
              <strong>Report di Analisi:</strong> I report generati vengono salvati esclusivamente nel <code>localStorage</code> del tuo browser. Questo ti permette di riaccedere alle analisi precedenti senza doverle rieseguire, ma i dati rimangono sul tuo dispositivo e non sono accessibili a noi.
            </li>
          </ul>

          <h2>4. Diritti dell'Interessato (Art. 15-22 GDPR)</h2>
          <p>
            In qualità di utente, hai il diritto di:
          </p>
          <ul>
            <li>Accedere ai tuoi dati.</li>
            <li>Richiedere la rettifica o la cancellazione degli stessi.</li>
            <li>Opporti al trattamento o richiederne la limitazione.</li>
            <li>Revocare il consenso in qualsiasi momento.</li>
          </ul>
          <p>
            Puoi revocare l'accesso dell'Applicazione ai tuoi dati Google in qualsiasi momento dalla pagina di gestione della sicurezza del tuo Account Google: <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">https://myaccount.google.com/permissions</a>. Puoi cancellare i report salvati svuotando la cache e i dati del tuo browser.
          </p>
          
          <h2>5. Conformità con le Norme delle API di Google</h2>
          <p>
            L'uso delle informazioni ricevute dalle API di Google da parte di Semantic Interlinker 25 aderirà alle <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Norme sui dati utente dei servizi API di Google</a>, compresi i requisiti di uso limitato.
          </p>

          <h2>6. Modifiche a questa Informativa</h2>
          <p>
            Ci riserviamo il diritto di modificare questa informativa sulla privacy. Qualsiasi modifica sarà pubblicata su questa pagina.
          </p>

          <div className="mt-12 text-center">
            <Link href="/" className="text-blue-600 font-semibold hover:underline">
              &larr; Torna alla Home Page
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPage;
