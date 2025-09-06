import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { DocumentTextIcon } from '../../components/Icons';

export const metadata: Metadata = {
  title: 'Termini di Servizio - Semantic Interlinker 25',
  description: 'Termini e Condizioni per l\'utilizzo dell\'applicazione Semantic Interlinker 25.',
};

const TermsPage = () => {
  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <header className="text-center py-10">
          <div className="flex justify-center items-center gap-4">
            <DocumentTextIcon className="w-12 h-12 text-blue-600" />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Termini di Servizio</h1>
              <p className="text-slate-500 mt-2 text-lg">Ultimo aggiornamento: 25 Luglio 2024</p>
            </div>
          </div>
        </header>

        <main className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-12 prose prose-slate max-w-none">
          <p>
            Benvenuto su Semantic Interlinker 25 (il "Servizio"). Questi termini di servizio ("Termini") regolano l'accesso e l'utilizzo del nostro Servizio. Accedendo o utilizzando il Servizio, accetti di essere vincolato da questi Termini.
          </p>

          <h2>1. Descrizione del Servizio</h2>
          <p>
            Semantic Interlinker 25 è un'applicazione software che si connette ai tuoi account Google Search Console e Google Analytics (con il tuo esplicito consenso) per analizzare il tuo sito web e fornire suggerimenti basati sull'intelligenza artificiale per l'ottimizzazione dei link interni e della strategia di contenuto.
          </p>

          <h2>2. Utilizzo del Servizio</h2>
          <p>
            Accetti di utilizzare il Servizio in conformità con tutte le leggi e i regolamenti applicabili. Sei l'unico responsabile della gestione e della sicurezza del tuo Account Google e delle azioni intraprese sulla base dei suggerimenti forniti dal Servizio.
          </p>
          
          <h2>3. Proprietà Intellettuale</h2>
          <p>
            Il Servizio e tutti i suoi contenuti originali, le sue caratteristiche e le sue funzionalità sono e rimarranno di proprietà esclusiva di SEO Cagliari e dei suoi licenziatari.
          </p>

          <h2>4. Esclusione di Garanzia</h2>
          <p>
            Il Servizio è fornito "COSÌ COM'È", senza garanzie di alcun tipo, esplicite o implicite. I suggerimenti forniti dall'intelligenza artificiale sono di natura consultiva e non costituiscono una garanzia di risultati specifici in termini di posizionamento sui motori di ricerca o di performance del sito. L'efficacia delle strategie SEO dipende da molteplici fattori al di fuori del nostro controllo.
          </p>

          <h2>5. Limitazione di Responsabilità</h2>
          <p>
            In nessun caso SEO Cagliari, né i suoi direttori, dipendenti o partner, saranno responsabili per eventuali danni indiretti, incidentali, speciali, consequenziali o punitivi, inclusi, senza limitazione, la perdita di profitti, dati, avviamento o altre perdite intangibili, derivanti da (i) il tuo accesso o utilizzo o incapacità di accedere o utilizzare il Servizio; (ii) qualsiasi condotta o contenuto di terze parti sul Servizio.
          </p>
          
          <h2>6. Legge Applicabile</h2>
          <p>
            Questi Termini saranno regolati e interpretati in conformità con le leggi della Repubblica Italiana, senza riguardo alle disposizioni sui conflitti di legge.
          </p>

          <h2>7. Modifiche ai Termini</h2>
          <p>
            Ci riserviamo il diritto, a nostra esclusiva discrezione, di modificare o sostituire questi Termini in qualsiasi momento. Ti informeremo di eventuali modifiche pubblicando i nuovi Termini su questa pagina.
          </p>
          
          <h2>8. Contatti</h2>
          <p>
            Per qualsiasi domanda su questi Termini, ti preghiamo di contattarci all'indirizzo email: <a href="mailto:info@seo-cagliari.it">info@seo-cagliari.it</a>.
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

export default TermsPage;
