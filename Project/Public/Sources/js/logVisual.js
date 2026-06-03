// Variabili globali per mantenere lo stato
let currentLogs = [];
let isDescending = true; // Di default mostriamo i più recenti in alto
let currentFilter = "All"; // Traccia quale filtro è attualmente attivo

/**
 * Estrae i dati dalla stringa formato custom e salva la stringa grezza originale per Ollama
 */
function parseLogString(type, logString) {
	const innerContent = logString.slice(2, -2);
	const parts = innerContent.split("][");

	// Creiamo l'oggetto Date reale per i calcoli di ordinamento
	const rawDate = parts[0] ? new Date(parts[0]) : new Date(0);

	return {
		type: type, // "Alert" o "Signal"
		timestamp: parts[0] ? rawDate.toLocaleString() : "N/A",
		rawDate: rawDate, // Proprietà usata solo per ordinare
		sourceIp: parts[1] || "-",
		destIp: parts[2] || "-",
		route: parts[3] || "-",
		code: parts[4] || "-",
		comment: parts[5] || "-",
		rawString: logString, // Salviamo la stringa originale intatta per l'IA
	};
}

/**
 * Recupera i dati dal Backend Node.js tramite la rotta API esposta
 */
async function fetchLogsFromBackend() {
	try {
		const response = await fetch("/api/v1/logs/history");
		if (!response.ok) {
			throw new Error(`Errore HTTP: ${response.status}`);
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Errore nel recupero dei log dal backend:", error);
		throw error;
	}
}

/**
 * Ordina l'array in base allo stato attuale (crescente/decrescente)
 */
function applySort() {
	currentLogs.sort((a, b) => {
		return isDescending
			? b.rawDate - a.rawDate // Dal più recente al più vecchio
			: a.rawDate - b.rawDate; // Dal più vecchio al più recente
	});
}

/**
 * Inverte l'ordinamento alla pressione del tasto
 */
function toggleSort() {
	isDescending = !isDescending; // Inverte lo stato

	const btnSort = document.getElementById("btn-sort");
	if (btnSort) {
		btnSort.innerHTML = isDescending ? "⬇️ Più recenti" : "⬆️ Più vecchi";
	}

	applySort();
	filterLogs(currentFilter);
}

/**
 * Carica i log, li analizza e aggiorna la tabella
 */
async function loadLogs() {
	const tbody = document.getElementById("log-table-body");
	if (!tbody) return;

	// Colspan impostato a 7 per includere la nuova colonna delle checkbox
	tbody.innerHTML =
		'<tr><td colspan="7" class="loading">Sincronizzazione con la blockchain...</td></tr>';

	try {
		const rawData = await fetchLogsFromBackend();

		currentLogs = rawData.map((item) =>
			parseLogString(item.type, item.raw),
		);

		applySort();
		filterLogs(currentFilter);
	} catch (error) {
		tbody.innerHTML = `<tr><td colspan="7" style="color: var(--alert-color); text-align: center;">Errore nel caricamento dei log: Impossibile contattare il server.</td></tr>`;
	}
}

/**
 * Disegna le righe HTML della tabella con l'aggiunta delle caselle di spunta
 */
function renderTable(logsToRender) {
	const tbody = document.getElementById("log-table-body");
	if (!tbody) return;

	tbody.innerHTML = "";

	if (logsToRender.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="7" class="loading">Nessun log trovato.</td></tr>';
		return;
	}

	logsToRender.forEach((log) => {
		const tr = document.createElement("tr");

		const codeColor =
			parseInt(log.code) >= 400
				? "var(--alert-color)"
				: "var(--signal-color)";
		const badgeClass = log.type.toLowerCase();

		// Costruiamo la riga includendo la checkbox come prima colonna
		tr.innerHTML = `
			<td><input type="checkbox" class="log-checkbox"></td>
			<td><span class="badge ${badgeClass}">${log.type}</span></td>
			<td>${log.timestamp}</td>
			<td><code>${log.sourceIp}</code> ➔ <code>${log.destIp}</code></td>
			<td><code>${log.route}</code></td>
			<td style="color: ${codeColor}; font-weight: bold;">${log.code}</td>
			<td>${log.comment}</td>
		`;

		// Salviamo la stringa originale dentro il dataset della checkbox
		const checkbox = tr.querySelector(".log-checkbox");
		if (checkbox) {
			checkbox.dataset.raw = log.rawString;
		}

		tbody.appendChild(tr);
	});
}

/**
 * Filtra i log mostrati a schermo
 */
function filterLogs(type) {
	currentFilter = type; // Salva la scelta dell'utente

	document.querySelectorAll(".controls button").forEach((btn) => {
		if (
			btn.id.startsWith("btn-all") ||
			btn.id.startsWith("btn-alert") ||
			btn.id.startsWith("btn-signal")
		) {
			btn.classList.remove("active");
		}
	});

	const targetBtn = document.getElementById(`btn-${type.toLowerCase()}`);
	if (targetBtn) targetBtn.classList.add("active");

	if (type === "All") {
		renderTable(currentLogs);
	} else {
		const filtered = currentLogs.filter((log) => log.type === type);
		renderTable(filtered);
	}
}

/**
 * Invia TUTTI i log spuntati insieme in un'unica richiesta (Analisi Collettiva / Storico)
 */
async function analyzeSelectedLogs() {
	const checkedBoxes = document.querySelectorAll(".log-checkbox:checked");

	if (checkedBoxes.length === 0) {
		alert(
			"Seleziona almeno un log inserendo la spunta prima di avviare l'analisi collettiva.",
		);
		return;
	}

	const btnAnalyze = document.getElementById("btn-analyze");
	if (btnAnalyze) {
		btnAnalyze.disabled = true;
		btnAnalyze.innerHTML = "🧠 Analisi di gruppo in corso...";
	}

	// Estraiamo tutte le stringhe grezze dei log selezionati in un array unico
	const selectedLogLines = Array.from(checkedBoxes).map(
		(box) => box.dataset.raw,
	);

	try {
		// Singola chiamata POST inviando l'intero blocco al server
		const response = await fetch("/api/v1/logs/analyze", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ logLines: selectedLogLines }),
		});

		if (!response.ok) {
			throw new Error(`Errore Server HTTP: ${response.status}`);
		}

		const result = await response.json();

		// Mostriamo il pop-up strutturato passando l'oggetto JSON di Ollama
		showAnalysisModal(result);
	} catch (error) {
		console.error("Errore durante la richiesta di analisi batch:", error);
		alert(
			"Impossibile completare l'analisi dei log. Verifica la connessione con il server Ollama.",
		);
	} finally {
		if (btnAnalyze) {
			btnAnalyze.disabled = false;
			btnAnalyze.innerHTML = "🧠 Analizza log";
		}
	}
}

/**
 * Genera e visualizza la finestra pop-up (Modal) ben strutturata con i dati dell'IA
 */
function showAnalysisModal(data) {
	let modal = document.getElementById("ia-analysis-modal");
	if (!modal) {
		modal = document.createElement("div");
		modal.id = "ia-analysis-modal";
		modal.className = "modal-overlay";
		document.body.appendChild(modal);
	}

	// Colore dinamico basato sul rischio globale rilevato dall'IA
	let riskColor = "#2ecc71"; // Verde (Basso)
	if (
		data.livello_rischio_complessivo === "ALTO" ||
		data.livello_rischio_complessivo === "CRITICO"
	) {
		riskColor = "#e74c3c"; // Rosso
	} else if (data.livello_rischio_complessivo === "MEDIO") {
		riskColor = "#f39c12"; // Arancione
	}

	// Costruiamo i blocchi dei singoli log analizzati
	let dettagliHtml = "";
	if (data.analisi_dettagliata && data.analisi_dettagliata.length > 0) {
		data.analisi_dettagliata.forEach((item) => {
			const badgeClass = item.tipo_rilevato
				? item.tipo_rilevato.toLowerCase()
				: "signal";
			dettagliHtml += `
				<div class="modal-log-item">
					<div class="log-item-header">
						<span class="badge ${badgeClass}">Log #${item.indice || "?"} - ${item.tipo_rilevato}</span>
						<code>${item.route || "-"} (HTTP ${item.codice_http || "-"})</code>
					</div>
					<p><strong>Analisi STRIDE / Baseline:</strong> ${item.analisi_sicurezza || "N/A"}</p>
					<p style="color: #f39c12; margin-top: 5px;"><strong>Raccomandazione:</strong> ${item.raccomandazione || "N/A"}</p>
				</div>
			`;
		});
	} else if (data.raw_analysis) {
		dettagliHtml = `<pre style="background: #000; color: #00ff00; padding: 10px; overflow-x: auto; border-radius: 4px;">${data.raw_analysis}</pre>`;
	}

	// Struttura HTML del pop-up
	modal.innerHTML = `
		<div class="modal-content">
			<div class="modal-header">
				<h2 style="margin:0; font-size:1.3rem;">🧠 Report Analisi Collettiva IA</h2>
				<span class="close-modal-btn" style="font-size:1.8rem; cursor:pointer;" onclick="closeAnalysisModal()">&times;</span>
			</div>
			<div class="modal-body" style="padding:20px; overflow-y:auto; flex:1;">
				<div style="background: #25252d; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid ${riskColor}">
					<h3 style="margin-top:0; color: #3498db; font-size:1.05rem;">Mini Storico & Correlazione Eventi:</h3>
					<p style="font-size:0.95rem; line-height:1.4; color:#ddd;">${data.mini_storico_globale || "Nessuna correlazione generata."}</p>
					<div style="margin-top: 10px; font-weight: bold; font-size: 0.9rem;">
						Rischio Complessivo: <span style="background-color: ${riskColor}; padding: 3px 8px; border-radius: 4px; color: #fff; font-size: 0.8rem; margin-left: 5px;">${data.livello_rischio_complessivo || "NON DEFINITO"}</span>
					</div>
				</div>
				
				<h3 style="font-size:1.1rem; margin-bottom:10px;">Dettaglio Eventi Selezionati</h3>
				<div style="display:flex; flex-direction:column; gap:15px;">
					${dettagliHtml}
				</div>
			</div>
			<div class="modal-footer" style="padding:12px 20px; background:#2c2c35; display:flex; justify-content:flex-end; border-top:1px solid #3a3a45;">
				<button style="background:#34495e; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:bold;" onclick="closeAnalysisModal()">Chiudi Report</button>
			</div>
		</div>
	`;

	modal.style.display = "flex";
}

/**
 * Chiude la finestra pop-up dell'analisi
 */
function closeAnalysisModal() {
	const modal = document.getElementById("ia-analysis-modal");
	if (modal) {
		modal.style.display = "none";
	}
}

// Inizializzazione sicura degli eventi al caricamento della pagina
window.addEventListener("load", loadLogs);
