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
	// 1. Inizializziamo il profilo utente e il TOKEN
	const userString = localStorage.getItem("user");
	const token = localStorage.getItem("token");

	if (!userString || !token) {
		window.location.href = "login.html";
		return;
	}

	const user = JSON.parse(userString);

	// Controllo aggiuntivo per evitare errori
	const userNameEl = document.getElementById("userName");
	const userInitialsEl = document.getElementById("userInitials");

	if (userNameEl) userNameEl.innerText = `${user.nome} ${user.cognome}`;
	if (userInitialsEl)
		userInitialsEl.innerText = (
			user.nome[0] + user.cognome[0]
		).toUpperCase();

	// 2. Lanciamo il recupero dello storico passando il token
	fetchMeetingHistory(token);
});

async function fetchMeetingHistory(token) {
	const historyList = document.querySelector(".history-list");
	if (!historyList) return;

	const SERVER_URL = "http://localhost:30000";

	try {
		// CHIAMATA UNICA ALLA NUOVA API SICURA
		const response = await fetch(`${SERVER_URL}/api/v1/meetings`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		// Gestione token scaduto o non valido
		if (response.status === 401 || response.status === 403) {
			alert("Sessione scaduta. Effettua nuovamente il login.");
			localStorage.clear();
			window.location.href = "login.html";
			return;
		}

		if (!response.ok) {
			throw new Error(`Errore recupero dati: ${response.status}`);
		}

		const responseJson = await response.json();
		let meetings = responseJson.data || [];

		// Ordiniamo dalla più recente alla più vecchia e prendiamo le prime 4
		const latestMeetings = meetings
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 4);

		historyList.innerHTML = "";

		if (latestMeetings.length === 0) {
			historyList.innerHTML =
				'<li class="history-item">Nessuna riunione in archivio.</li>';
			return;
		}

		latestMeetings.forEach((meeting) => {
			// 1. Salviamo il meeting nella mappa globale
			window.meetingsMap[meeting.id] = meeting;

			const title = meeting.titolo || `Riunione ${meeting.id}`;
			const dateToFormat = meeting.dataInizio
				? new Date(meeting.dataInizio)
				: new Date(meeting.timestamp);

			let badgeClass = "status-verified";
			let badgeText = "Conclusa & Verificata";
			if (meeting.dataFine) {
				const now = new Date();
				const dataFine = new Date(meeting.dataFine);
				const dataInizio = new Date(meeting.dataInizio);
				if (dataFine > now && dataInizio < now) {
					badgeClass = "status-inProgress";
					badgeText = "In Corso";
				} else if (dataFine > now && dataInizio > now) {
					badgeClass = "status-active";
					badgeText = "Programmata";
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

		// --- LOGICA POP-UP RIUNIONE IN CORSO ---
		const now = new Date();
		const activeMeeting = meetings.find((meeting) => {
			const dataInizio = new Date(
				meeting.dataInizio || meeting.timestamp,
			);
			const dataFine = meeting.dataFine
				? new Date(meeting.dataFine)
				: null;

			// Ritorna true se l'orario attuale è tra l'inizio e la fine
			return dataInizio <= now && dataFine && dataFine > now;
		});

		// Se abbiamo trovato una riunione attiva, mostriamo il popup
		if (activeMeeting) {
			showActiveMeetingPopup(activeMeeting);
		}
	} catch (error) {
		console.error(
			"Errore globale durante il caricamento dello storico:",
			error,
		);
		historyList.innerHTML =
			'<li class="history-item" style="color:red;">Impossibile caricare lo storico. Verifica il server.</li>';
	}
}

function formatItalianDate(dateObject) {
	if (isNaN(dateObject.getTime())) return "Data non valida";

	const options = { day: "2-digit", month: "long", year: "numeric" };
	let formattedDate = dateObject.toLocaleDateString("it-IT", options);
	return formattedDate.replace(/\b\w/g, (char) => char.toUpperCase());
}

// --- FUNZIONI PER IL POP-UP ---

function showActiveMeetingPopup(meeting) {
	const popupContainer = document.getElementById("activeMeetingPopup");
	if (!popupContainer) return;

	const dateObj = new Date(meeting.dataInizio || meeting.timestamp);
	const formattedDate = formatItalianDate(dateObj);
	const timeString = dateObj.toLocaleTimeString("it-IT", {
		hour: "2-digit",
		minute: "2-digit",
	});

	const titleEl = document.getElementById("popup-title");
	const dateEl = document.getElementById("popup-date");
	const idEl = document.getElementById("popup-id");

	if (titleEl) titleEl.innerText = meeting.titolo || `Riunione ${meeting.id}`;
	if (dateEl) dateEl.innerText = `${formattedDate} - Ore ${timeString}`;
	if (idEl) idEl.innerText = meeting.id;

	const btnPartecipa = popupContainer.querySelector(".btn-primary");
	if (btnPartecipa) {
		btnPartecipa.removeAttribute("onclick");
		btnPartecipa.onclick = () => {
			window.vaiADettaglioRiunione(meeting.id);
		};
	}

	// Rendiamo visibile il pop-up
	popupContainer.style.display = "block";
}

function closePopup() {
	const popupContainer = document.getElementById("activeMeetingPopup");
	if (popupContainer) {
		popupContainer.style.display = "none";
	}
}
