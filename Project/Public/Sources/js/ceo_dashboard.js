// Dizionario globale per mappare gli ID alle riunioni
window.meetingsMap = {};

// Funzione per il redirect, identica a quella usata in audit_report
window.vaiADettaglioRiunione = function (meetingId) {
	const meetingData = window.meetingsMap[meetingId];
	if (meetingData) {
		localStorage.setItem("currentMeeting", JSON.stringify(meetingData));
		window.location.href = "meeting.html";
	} else {
		alert("Errore: Dati della riunione non trovati.");
	}
};

document.addEventListener("DOMContentLoaded", () => {
	fetchMeetingHistory();
});

async function fetchMeetingHistory() {
	const historyList = document.querySelector(".history-list");

	const TARGET_CLASS = "Reunion";
	const SERVER_URL = "http://localhost:30000";

	try {
		const keysResponse = await fetch(
			`${SERVER_URL}/api/v1/getKeysCopy?class=${TARGET_CLASS}`,
		);

		if (!keysResponse.ok) {
			throw new Error(`Errore recupero chiavi: ${keysResponse.status}`);
		}

		const keysJson = await keysResponse.json();
		const rawKeys = keysJson.data?.keys || [];

		const validKeys = rawKeys
			.map((k) => k[0])
			.filter((k) => k && k.startsWith("reunion_"));

		if (validKeys.length === 0) {
			historyList.innerHTML =
				'<li class="history-item">Nessuna riunione in archivio.</li>';
			return;
		}

		const meetingPromises = validKeys.map(async (key) => {
			try {
				const kvResponse = await fetch(
					`${SERVER_URL}/api/v1/getKv?class=${TARGET_CLASS}&key=${key}`,
				);
				if (!kvResponse.ok) return null;

				const kvJson = await kvResponse.json();

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

		let meetings = await Promise.all(meetingPromises);

		meetings = meetings.filter((m) => m !== null);

		// Ordiniamo dalla più recente alla più vecchia e prendiamo le prime 4
		const latestMeetings = meetings
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 4);

		historyList.innerHTML = "";

		if (latestMeetings.length === 0) {
			historyList.innerHTML =
				'<li class="history-item">Nessuna riunione valida in archivio.</li>';
			return;
		}

		latestMeetings.forEach((meeting) => {
			// 1. Salviamo il meeting nella mappa globale
			window.meetingsMap[meeting.id] = meeting;

			const title = meeting.titolo || `Riunione ${meeting.id}`;
			const dateToFormat = meeting.dataInizio
				? new Date(meeting.dataInizio)
				: new Date(meeting.timestamp);

			let badgeClass = "status-closed";
			let badgeText = "Archiviata";

			const hasVerbale = meeting.verbale && meeting.verbale.trim() !== "";

			if (hasVerbale) {
				badgeClass = "status-verified";
				badgeText = "Conclusa & Verificata";
			} else if (meeting.dataFine) {
				const now = new Date();
				const dataFine = new Date(meeting.dataFine);
				if (dataFine > now) {
					badgeClass = "status-active";
					badgeText = "Programmata / In Corso";
				}
			}

			const li = document.createElement("li");
			li.className = "history-item";

			// 2. Rendiamo l'intero elemento cliccabile collegandolo alla funzione
			li.onclick = () => window.vaiADettaglioRiunione(meeting.id);

			// 3. Modifichiamo l'HTML interno per mostrare la dicitura "Vedi dettagli"
			li.innerHTML = `
                <div class="history-date">${formatItalianDate(dateToFormat)}</div>
                <div class="history-name">${title}</div>
                <div style="font-size: 0.85em; color: var(--tv-green); margin-top: 4px; font-weight: 500;">Vedi dettagli &rarr;</div>
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

document.addEventListener("DOMContentLoaded", () => {
	const userString = localStorage.getItem("user");

	if (userString) {
		const user = JSON.parse(userString);

		// Controllo aggiuntivo per evitare errori se gli elementi non esistono nella pagina
		const userNameEl = document.getElementById("userName");
		const userInitialsEl = document.getElementById("userInitials");

		if (userNameEl) userNameEl.innerText = `${user.nome} ${user.cognome}`;
		if (userInitialsEl)
			userInitialsEl.innerText = (
				user.nome[0] + user.cognome[0]
			).toUpperCase();
	}
});

function formatItalianDate(dateObject) {
	if (isNaN(dateObject.getTime())) return "Data non valida";

	const options = { day: "2-digit", month: "long", year: "numeric" };
	let formattedDate = dateObject.toLocaleDateString("it-IT", options);
	return formattedDate.replace(/\b\w/g, (char) => char.toUpperCase());
}
