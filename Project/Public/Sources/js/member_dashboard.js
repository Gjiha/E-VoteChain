// Funzione di supporto per formattare la data
function formatItalianDate(dateObject) {
	if (isNaN(dateObject.getTime())) return "Data non valida";

	const options = { day: "2-digit", month: "long", year: "numeric" };
	let formattedDate = dateObject.toLocaleDateString("it-IT", options);
	return formattedDate.replace(/\b\w/g, (char) => char.toUpperCase());
}

// --- NUOVO: Dizionario globale per mappare gli ID alle riunioni ---
window.meetingsMap = {};

// --- NUOVO: Funzione per il redirect alla pagina meeting.html ---
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
	// 1. Inizializziamo il profilo utente
	const userString = localStorage.getItem("user");
	let userEmail = null;

	if (userString) {
		const user = JSON.parse(userString);
		userEmail = user.email; // Assumendo che l'email sia salvata qui

		const userNameEl = document.getElementById("userName");
		const userInitialsEl = document.getElementById("userInitials");

		if (userNameEl) userNameEl.innerText = `${user.nome} ${user.cognome}`;
		if (userInitialsEl)
			userInitialsEl.innerText = (
				user.nome[0] + user.cognome[0]
			).toUpperCase();
	}

	// 2. Lanciamo il recupero dello storico passando l'email dell'utente
	if (userEmail) {
		fetchMeetingHistory(userEmail);
	} else {
		const historyList = document.querySelector(".history-list");
		if (historyList)
			historyList.innerHTML =
				'<li class="history-item">Utente non autenticato.</li>';
	}
});

async function fetchMeetingHistory(userEmail) {
	const historyList = document.querySelector(".history-list");
	if (!historyList) return;

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
						return null;
					}
				}

				// CONTROLLO CORRETTO SUI PARTECIPANTI
				const partecipanti = meetingData?.partecipanti || [];

				if (
					Array.isArray(partecipanti) &&
					partecipanti.includes(userEmail)
				) {
					meetingData.id = key;
					meetingData.timestamp = parseInt(
						key.replace("reunion_", ""),
						10,
					);
					return meetingData;
				} else {
					return null; // L'utente non partecipa a questa riunione
				}
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

		const latestMeetings = meetings
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 4);

		historyList.innerHTML = "";

		if (latestMeetings.length === 0) {
			historyList.innerHTML =
				'<li class="history-item">Nessuna partecipazione trovata.</li>';
			return;
		}

		latestMeetings.forEach((meeting) => {
			// --- NUOVO: Salviamo il meeting nella mappa globale ---
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
			li.style.cursor = "pointer"; // Rende palese che è cliccabile

			// --- NUOVO: Aggiungiamo il listener al click ---
			li.onclick = () => window.vaiADettaglioRiunione(meeting.id);

			// --- AGGIORNATO: Rimosso il link al PDF, inserito "Vedi dettagli" ---
			li.innerHTML = `
                <div class="history-date">${formatItalianDate(dateToFormat)}</div>
                <div class="history-name">${title}</div>
                <div style="font-size: 0.85em; color: var(--tv-green); margin-top: 4px; font-weight: 500;">Vedi dettagli &rarr;</div>
                <span class="status-badge ${badgeClass}" style="margin-top: 8px; display: inline-block;">${badgeText}</span>
            `;

			historyList.appendChild(li);
		});

		// --- LOGICA POP-UP RIUNIONE IN CORSO ---
		if (latestMeetings.length > 0) {
			const lastMeeting = latestMeetings[0]; // Prendiamo la riunione più recente in assoluto
			const now = new Date();
			const dataInizio = new Date(
				lastMeeting.dataInizio || lastMeeting.timestamp,
			);
			const dataFine = lastMeeting.dataFine
				? new Date(lastMeeting.dataFine)
				: null;

			// Se l'orario attuale è tra dataInizio e dataFine, mostriamo il pop-up
			if (dataInizio <= now && dataFine && dataFine > now) {
				showActiveMeetingPopup(lastMeeting);
			}
		}
	} catch (error) {
		console.error(
			"Errore globale durante il caricamento dello storico:",
			error,
		);
		if (historyList) {
			historyList.innerHTML =
				'<li class="history-item" style="color:red;">Impossibile caricare lo storico. Verifica il server.</li>';
		}
	}
}

// --- FUNZIONI PER IL POP-UP ---

// Funzione per aggiornare e mostrare il pop-up esistente nell'HTML
function showActiveMeetingPopup(meeting) {
	const popupContainer = document.getElementById("activeMeetingPopup");
	if (!popupContainer) return;

	// Formattiamo la data e l'ora per la card
	const dateObj = new Date(meeting.dataInizio || meeting.timestamp);
	const formattedDate = formatItalianDate(dateObj);
	const timeString = dateObj.toLocaleTimeString("it-IT", {
		hour: "2-digit",
		minute: "2-digit",
	});

	// Troviamo gli span vuoti nell'HTML e ci inseriamo i dati veri
	const titleEl = document.getElementById("popup-title");
	const dateEl = document.getElementById("popup-date");
	const idEl = document.getElementById("popup-id");

	if (titleEl) titleEl.innerText = meeting.titolo || `Riunione ${meeting.id}`;
	if (dateEl) dateEl.innerText = `${formattedDate} - Ore ${timeString}`;
	if (idEl) idEl.innerText = meeting.id;

	// Aggiorniamo il link del bottone "Accetta e Partecipa" passando l'ID della riunione
	const btnPartecipa = popupContainer.querySelector(".btn-primary");
	if (btnPartecipa) {
		// Rimuoviamo l'onclick messo nell'HTML per inserire dinamicamente la rotta corretta
		btnPartecipa.removeAttribute("onclick");
		btnPartecipa.onclick = () => {
			window.location.href = `voting_room.html?id=${meeting.id}`;
		};
	}

	// Rendiamo visibile il pop-up
	popupContainer.style.display = "flex";
}

// Funzione per chiudere il pop-up
function closePopup() {
	const popupContainer = document.getElementById("activeMeetingPopup");
	if (popupContainer) {
		popupContainer.style.display = "none";
	}
}
