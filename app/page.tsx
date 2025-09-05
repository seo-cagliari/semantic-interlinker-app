'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BrainCircuitIcon, LinkIcon, LoadingSpinnerIcon, CheckCircleIcon } from '../components/Icons';

const LandingPage = () => {
  const [formState, setFormState] = useState({ name: '', email: '', site: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // In una vera app, i dati verrebbero inviati a un endpoint API.
    // Per ora, simuliamo l'invio.
    console.log('Registration Request:', formState);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1000);
  };

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center py-10">
          <div className="flex justify-center items-center gap-4">
            <BrainCircuitIcon className="w-12 h-12 text-blue-600" />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Semantic-Interlinker-25</h1>
              <p className="text-slate-500 mt-2 text-lg">Suggerimenti di Link Interni basati su AI per WordPress</p>
            </div>
          </div>
        </header>

        <main>
          <div className="text-center bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">Trasforma la tua SEO con l'Interlinking Semantico.</h2>
            <p className="max-w-3xl mx-auto mt-4 text-slate-600 text-lg">
              Semantic-Interlinker-25 analizza il tuo sito WordPress, scopre le connessioni nascoste e ti fornisce suggerimenti strategici basati sull'AI per dominare la SERP.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-bold text-lg py-4 px-8 rounded-lg hover:bg-slate-700 transition-transform hover:scale-105"
            >
              <LinkIcon className="w-6 h-6" />
              Inizia l'Analisi Gratuita
            </Link>
            <p className="text-xs text-slate-400 mt-3">Nessuna registrazione richiesta per la prima analisi.</p>
          </div>

          <div className="my-16 text-center max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-800">Un Progetto Nato dall'Esperienza sul Campo</h3>
            <p className="mt-3 text-slate-600">
              Questo strumento è stato ideato e sviluppato dal team di <a href="https://seo-cagliari.it/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">SEO Cagliari</a>, un'agenzia specializzata in strategie SEO avanzate. La nostra missione è tradurre la complessità della SEO in strumenti pratici ed efficaci che portino risultati concreti. Per maggiori informazioni sulla nostra agenzia, visita il nostro sito.
            </p>
          </div>
          
          <div className="my-16 bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-12">
            <div className="max-w-xl mx-auto text-center">
              <h3 className="text-2xl font-bold text-slate-800">Accesso Esclusivo alla Piattaforma Completa</h3>
              <p className="mt-2 text-slate-600">Stiamo preparando una versione avanzata con funzionalità di gestione e monitoraggio. Inserisci i tuoi dati per richiedere la registrazione e sarai tra i primi ad essere informato.</p>
              
              {isSubmitted ? (
                <div className="mt-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center gap-3 animate-fade-in-up">
                  <CheckCircleIcon className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Richiesta Inviata!</p>
                    <p className="text-sm">Grazie! Abbiamo ricevuto la tua richiesta e la valuteremo al più presto.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="mt-6 text-left space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome</label>
                    <input type="text" name="name" id="name" required value={formState.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                   <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
                    <input type="email" name="email" id="email" required value={formState.email} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                   <div>
                    <label htmlFor="site" className="block text-sm font-medium text-slate-700">Sito Web</label>
                    <input type="url" name="site" id="site" required value={formState.site} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="https://esempio.com" />
                  </div>
                  <div className="text-center pt-2">
                     <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                      >
                       {isSubmitting ? <LoadingSpinnerIcon className="w-5 h-5" /> : null}
                       Invia Richiesta
                      </button>
                  </div>
                  <p className="text-xs text-slate-500 text-center pt-2">Rispettiamo la tua privacy. La tua richiesta sarà soggetta ad approvazione per garantire la qualità del servizio.</p>
                </form>
              )}
            </div>
          </div>
        </main>
        
        <footer className="text-center py-8 border-t border-slate-200 mt-8">
            <p className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} Semantic-Interlinker-25. Un progetto di SEO Cagliari.
            </p>
             <p className="text-xs text-slate-400 mt-2">
                <a href="#privacy" className="hover:underline">Privacy Policy</a> &middot; <a href="#terms" className="hover:underline">Termini di Servizio</a>
            </p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;