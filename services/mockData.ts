
import { Report } from '../types';

export const mockReport: Report = {
  site: "example-wordpress.com",
  generated_at: new Date().toISOString(),
  summary: {
    pages_scanned: 1000,
    indexable_pages: 850,
    suggestions_total: 3,
    high_priority: 2
  },
  suggestions: [
    {
      "suggestion_id": "S-a1b2c3d4",
      "source_url": "/blog/digital-marketing-trends-2025/",
      "target_url": "/servizi/creazione-siti-web-cagliari/",
      "proposed_anchor": "realizzazione di siti web professionali a Cagliari",
      "anchor_variants": ["creazione di siti web a Cagliari", "servizi web professionali", "agenzia web a Cagliari"],
      "insertion_hint": {
        "block_type": "after_h2",
        "position_hint": "after:'Importanza della Presenza Online'",
        "reason": "Il paragrafo discute la necessità per le aziende di avere un sito efficace, un ponte naturale verso il servizio."
      },
      "semantic_rationale": {
        "topic_match": "La fonte discute le strategie di marketing digitale, mentre la destinazione offre un servizio fondamentale per queste strategie (siti web).",
        "entities_in_common": ["Siti Web", "Marketing Digitale", "Aziende Locali", "Cagliari"]
      },
      "risk_checks": {
        "target_status": 200,
        "target_indexable": true,
        "canonical_ok": true,
        "dup_anchor_in_block": false
      },
      "score": 0.88,
      "notes": "Alta priorità. La pagina sorgente ha un buon traffico organico.",
      "apply_mode": "draft_patch"
    },
    {
      "suggestion_id": "S-e5f6g7h8",
      "source_url": "/portfolio/sito-ecommerce-gioielleria/",
      "target_url": "/blog/ottimizzazione-seo-per-ecommerce/",
      "proposed_anchor": "strategie di ottimizzazione SEO per e-commerce",
      "anchor_variants": ["SEO per negozi online", "migliorare la visibilità di un e-commerce"],
      "insertion_hint": {
        "block_type": "paragraph",
        "position_hint": "paragraph_index:3",
        "reason": "Il paragrafo descrive le sfide affrontate nel progetto, collegandosi naturalmente a un articolo che offre soluzioni (SEO)."
      },
      "semantic_rationale": {
        "topic_match": "La pagina sorgente è un case study di un e-commerce; la pagina di destinazione è una guida sulla SEO per e-commerce, offrendo approfondimento.",
        "entities_in_common": ["E-commerce", "SEO", "Traffico Organico", "Conversioni"]
      },
      "risk_checks": {
        "target_status": 200,
        "target_indexable": true,
        "canonical_ok": true,
        "dup_anchor_in_block": false
      },
      "score": 0.75,
      "notes": "Buona opportunità per dimostrare competenza e guidare l'utente verso contenuti informativi.",
      "apply_mode": "draft_patch"
    },
    {
      "suggestion_id": "S-i9j0k1l2",
      "source_url": "/chi-siamo/",
      "target_url": "/contatti/",
      "proposed_anchor": "contattaci per una consulenza",
      "anchor_variants": ["mettiti in contatto con noi", "richiedi un preventivo"],
      "insertion_hint": {
        "block_type": "paragraph",
        "position_hint": "paragraph_index:5",
        "reason": "Alla fine della presentazione del team, è naturale invitare l'utente al contatto."
      },
      "semantic_rationale": {
        "topic_match": "La pagina 'Chi Siamo' introduce l'agenzia, e la pagina 'Contatti' è il passo successivo logico per l'utente interessato.",
        "entities_in_common": ["Agenzia Web", "Consulenza"]
      },
      "risk_checks": {
        "target_status": 200,
        "target_indexable": true,
        "canonical_ok": true,
        "dup_anchor_in_block": false
      },
      "score": 0.65,
      "notes": "Link di navigazione standard, utile per il flusso utente.",
      "apply_mode": "draft_patch"
    }
  ],
  notes: "Analisi completata con successo. Si raccomanda revisione manuale prima di applicare le bozze."
};