const express = require("express");
let ollama = require("ollama");
const { isAdmin, verifyToken } = require("../middleware/auth_middle.js");

if (ollama.default) {
	ollama = ollama.default;
}

const router = express.Router();

const BATCH_BASELINE_SYSTEM_PROMPT = `
Sei l'analista senior di cybersecurity del sistema "UniTorV E-Vote", una piattaforma di voto elettronico aziendale basata su Node.js/Express e persistenza esclusiva su Blockchain (Tor Vergata Mainnet KV Store).
Ti viene fornito un blocco di LOG consecutivi. Il tuo compito è analizzarli confrontandoli rigidamente con le baseline architetturali, di rete (IEC 62443) e applicative del sistema.

FORMATO DEI LOG DA ANALIZZARE:
[[<timestamp>][<ip-sorgente>][<ip-destinazione>][<method> <route>][<codice HTTP>][<commento>]]

LINEE GUIDA RIGIDE PER L'ANALISI (BASELINE DEL SISTEMA):
1. CLASSIFICAZIONE EVENTI:
   - SIGNAL: Operazioni legittime completate con successo (HTTP 200).
   - ALERT: Eventi anomali, errori di autenticazione (401), accessi negati (403), tentativi fraudolenti, o bug applicativi (es. HTTP 500 su /logout per variabile 'e' non definita).

2. BASELINE DEI PERCORSI DI RETE (IEC 62443):
   - Relazioni lecite: Portale Web -> Server Web, Server Web -> Blockchain Tor Vergata.

3. BASELINE DEI FLUSSI API PER RUOLO (RBAC):
   - Profilo CEO: Può eseguire /create-meeting, /uploadVerbale, /aggiorna-status, /validation-vote, /visualize-vote, /all-users.
   - Profilo MEMBRO: Operazioni limitate a /meetings, /get-votations-status, /getVerbale, e /add-vote. Qualsiasi chiamata del Membro a endpoint CEO indica un tentativo di Elevation of Privilege (STRIDE).

4. ANOMALIE APPLICATIVE NOTE DA IDENTIFICARE:
   - HTTP 403 su POST /api/v1/add-vote: Tentativo di Double Voting (Rilevato correttamente dal middleware checkIfAlreadyVoted tramite hash SHA-256 dell'email).
   - HTTP 404 su GET /api/v1/visualize-vote: Tentativo prematuro del CEO di visualizzare l'esito prima della chiusura/scrutinio.
   - HTTP 401 su POST /api/v1/loginCheck: Password errata (Sospetto Brute Force / Credential Stuffing se ripetuto).
   - HTTP 500 su POST /api/v1/uploadVerbale: Caricamento fallito o potenziale Denial of Service (DoS) per esaurimento memoria dovuto a file pesanti caricati in RAM (Multer memoryStorage).

5. MODELLO STRIDE ASSOCIATO:
   - Associa ogni anomalia riscontrata a una delle categorie STRIDE: Spoofing (Impersonificazione), Tampering (Manipolazione dati/voti), Repudiation (Ripudio), Information Disclosure (Divulgazione dati in chiaro o dump utenti), Denial of Service (DoS su login o file upload), Elevation of Privilege (Membro che invoca rotte protette da isCeo).

RISPONDI ESCLUSIVAMENTE CON UN OGGETTO JSON STRUTTURATO COME SEGUE (SENZA BLOCCHI MARKDOWN \`\`\` o TESTO INTRODUTTIVO/CONCLUSIVO):
{
  "mini_storico_globale": "Sintesi concisa e accurata che correla i log. Identifica chiaramente se si tratta di un flusso operativo regolare o se evidenzia pattern d'attacco specifici (es. Brute Force, Bypass di rete, Double-Voting o C2).",
  "livello_rischio_complessivo": "BASSO" o "MEDIO" o "ALTO" o "CRITICO",
  "analisi_dettagliata": [
    {
      "indice": 1,
      "tipo_rilevato": "SIGNAL" o "ALERT",
      "route": "stringa dell'endpoint identificato",
      "codice_http": numero_codice,
      "analisi_sicurezza": "Spiegazione approfondita del singolo log relazionato alla baseline IEC 62443, alle regole RBAC di UniTorV ed eventuale mappatura STRIDE.",
      "raccomandazione": "Misura di mitigazione specifica per l'evento rilevato (es. applicare rate-limiting, bloccare IP su firewall, disabilitare pulsante UI, sanificare input)."
    }
  ]
}
`;

// Nuova Route POST per l'analisi BATCH (di gruppo)
router.post("/logs/analyze", verifyToken, isAdmin, async (req, res) => {
	try {
		const { logLines } = req.body; // Ora ci aspettiamo un array di stringhe

		if (!logLines || !Array.isArray(logLines) || logLines.length === 0) {
			return res.status(400).json({
				error: "Fornire un array 'logLines' valido e non vuoto.",
			});
		}

		// Uniamo i log in un unico blocco di testo separato da a capo per l'IA
		const logsPayload = logLines
			.map((line, idx) => `[Log ${idx + 1}] ${line}`)
			.join("\n");

		const response = await ollama.chat({
			model: "llama3.2",
			messages: [
				{ role: "system", content: BATCH_BASELINE_SYSTEM_PROMPT },
				{
					role: "user",
					content: `Ecco la lista di log da analizzare insieme:\n\n${logsPayload}`,
				},
			],
			options: { temperature: 0.1 }, // Leggermente sopra lo 0 per dare capacità di sintesi correlativa
		});

		const modelOutput = response.message.content.trim();

		try {
			const jsonAnalysis = JSON.parse(modelOutput);
			return res.status(200).json(jsonAnalysis);
		} catch (parseError) {
			return res.status(200).json({
				raw_analysis: modelOutput,
				warning:
					"L'output dell'IA non è stato formattato come JSON puro dal modello.",
				mini_storico_globale: "Errore parsing JSON dell'IA.",
				analisi_dettagliata: [],
			});
		}
	} catch (error) {
		console.error("Errore durante l'interazione BATCH con Ollama:", error);
		return res.status(500).json({
			error: "Errore interno del server durante l'analisi batch.",
		});
	}
});

module.exports = router;
