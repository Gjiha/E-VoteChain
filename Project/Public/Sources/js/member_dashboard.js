document.addEventListener("DOMContentLoaded", () => {
	fetchMeetingHistory();
});

async function fetchMeetingHistory() {
	const historyList = document.querySelector(".history-list");

	// Abbiamo impostato la classe esatta che ci hai mostrato nel JSON
	const TARGET_CLASS = "Reunion";
	// Base URL del tuo server per i download
	const SERVER_URL = "http://localhost:30000";

	try {
		// 1. Chiamiamo getKeysCopy per avere la lista delle chiavi
		const keysResponse = await fetch(
			`${SERVER_URL}/api/v1/getKeysCopy?class=${TARGET_CLASS}`,
		);

		if (!keysResponse.ok) {
			throw new Error(`Errore recupero chiavi: ${keysResponse.status}`);
		}

		const keysJson = await keysResponse.json();
		const rawKeys = keysJson.data?.keys || [];

		// Filtriamo le chiavi: prendiamo la stringa interna e ignoriamo la root "0x"
		const validKeys = rawKeys
			.map((k) => k[0])
			.filter((k) => k && k.startsWith("reunion_"));

		if (validKeys.length === 0) {
			historyList.innerHTML =
				'<li class="history-item">Nessuna riunione in archivio.</li>';
			return;
		}

		// 2. Creiamo un array di "Promesse" per recuperare i valori in parallelo
		const meetingPromises = validKeys.map(async (key) => {
			try {
				const kvResponse = await fetch(
					`${SERVER_URL}/api/v1/getKv?class=${TARGET_CLASS}&key=${key}`,
				);
				if (!kvResponse.ok) return null;

				const kvJson = await kvResponse.json();

				// Estrapoliamo il blocco 'value' che contiene i veri dati
				let meetingData = kvJson.data?.value || kvJson.answer?.value;

				if (typeof meetingData === "string") {
					try {
						meetingData = JSON.parse(meetingData);
					} catch (e) {
						console.warn("Impossibile parsare JSON per", key);
					}
				}

				if (meetingData) {
					meetingData.id = key;
					meetingData.timestamp = parseInt(
						key.replace("reunion_", ""),
						10,
					);
				}

				return meetingData;
			} catch (err) {
				console.error(
					`Errore recupero dati per la chiave ${key}:`,
					err,
				);
				return null;
			}
		});

		// 3. Eseguiamo tutte le fetch in parallelo
		let meetings = await Promise.all(meetingPromises);

		// 4. Puliamo l'array dai valori nulli
		meetings = meetings.filter((m) => m !== null);

		// 5. Ordiniamo dalla più recente alla più vecchia e prendiamo le prime 4
		const latestMeetings = meetings
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 4);

		historyList.innerHTML = "";

		if (latestMeetings.length === 0) {
			historyList.innerHTML =
				'<li class="history-item">Nessuna riunione valida in archivio.</li>';
			return;
		}

		// 6. Generiamo l'HTML con i dati REALI dal JSON
		latestMeetings.forEach((meeting) => {
			// Estrapoliamo i campi mappandoli con quelli del tuo JSON
			const title = meeting.titolo || `Riunione ${meeting.id}`;
			const dateToFormat = meeting.dataInizio
				? new Date(meeting.dataInizio)
				: new Date(meeting.timestamp);

			// --- LOGICA DELLO STATO E DEL VERBALE ---
			let badgeClass = "status-closed";
			let badgeText = "Archiviata";
			let verbaleLinkHTML = ""; // Partiamo dal presupposto che non ci sia il link

			const hasVerbale = meeting.verbale && meeting.verbale.trim() !== "";

			// Se c'è un verbale caricato, è sicuramente Conclusa & Verificata
			if (hasVerbale) {
				badgeClass = "status-verified";
				badgeText = "Conclusa & Verificata";

				// Creiamo l'URL completo attaccando l'host del server al path (es. http://localhost:30000/uploads/...)
				// Usiamo target="_blank" per aprire il PDF in una nuova scheda
				const fullVerbaleUrl = `${SERVER_URL}${meeting.verbale}`;
				verbaleLinkHTML = `<a href="${fullVerbaleUrl}" target="_blank" class="verbale-link" style="font-size: 0.85em; text-decoration: underline; color: #0056b3; margin-top: 4px; display: inline-block;">Visualizza verbale</a>`;
			}
			// Altrimenti, controlliamo se la riunione è ancora in corso/da farsi in base alle date
			else if (meeting.dataFine) {
				const now = new Date();
				const dataFine = new Date(meeting.dataFine);
				if (dataFine > now) {
					badgeClass = "status-active";
					badgeText = "Programmata / In Corso";
				}
			}

			// Creazione dell'elemento HTML
			const li = document.createElement("li");
			li.className = "history-item";

			// Inseriamo l'HTML. verbaleLinkHTML sarà vuoto se non c'è il verbale, altrimenti mostrerà il tag <a>
			li.innerHTML = `
                <div class="history-date">${formatItalianDate(dateToFormat)}</div>
                <div class="history-name">${title}</div>
                ${verbaleLinkHTML}
                <span class="status-badge ${badgeClass}" style="margin-top: 8px; display: inline-block;">${badgeText}</span>
            `;

			historyList.appendChild(li);
		});
	} catch (error) {
		console.error(
			"Errore globale durante il caricamento dello storico:",
			error,
		);
		historyList.innerHTML =
			'<li class="history-item" style="color:red;">Impossibile caricare lo storico. Verifica il server.</li>';
	}
}
