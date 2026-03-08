document.addEventListener("DOMContentLoaded", () => {
	// 1. Setup Utente (Header) e recupero Ruolo/Email
	const userString = localStorage.getItem("user");
	let userEmail = null;
	let userRole = null;

	if (userString) {
		const user = JSON.parse(userString);
		userEmail = user.email;
		userRole = user.ruolo || user.role; // Assumendo che il ruolo sia salvato qui

		document.getElementById("userNameHeader").innerText =
			user.nome + " " + user.cognome;
		document.getElementById("userInitials").innerText = (
			user.nome[0] + user.cognome[0]
		).toUpperCase();
	} else {
		window.location.href = "login.html";
		return;
	}

	const isCEO = userRole && userRole.toUpperCase() === "CEO";

	// Aggiorniamo dinamicamente i tasti "Torna alla dashboard" per evitare vicoli ciechi
	const dashboardLink = isCEO
		? "ceo_dashboard.html"
		: "member_dashboard.html";
	const backBtn = document.querySelector(".back-btn");
	if (backBtn) backBtn.href = dashboardLink;
	const sidebarDashboardBtn = document.querySelector(
		".history-item[onclick*='dashboard']",
	);
	if (sidebarDashboardBtn)
		sidebarDashboardBtn.setAttribute(
			"onclick",
			`window.location.href='${dashboardLink}'`,
		);

	// 2. Avvia il recupero di tutte le riunioni passando i parametri
	fetchAllMeetingHistory(userEmail, isCEO);
});

// Funzione di supporto per formattare la data
function formatItalianDate(date) {
	return date.toLocaleString("it-IT", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// Dizionario globale per mappare gli ID alle riunioni ed evitare problemi con gli apici nell'HTML
window.meetingsMap = {};

// Funzione richiamata al click del bottone nella tabella
window.vaiADettaglioRiunione = function (meetingId) {
	const meetingData = window.meetingsMap[meetingId];
	if (meetingData) {
		// Salviamo l'INTERO oggetto riunione nel localStorage per passarlo a meeting.html
		localStorage.setItem("currentMeeting", JSON.stringify(meetingData));
		window.location.href = "meeting.html";
	} else {
		alert("Errore: Dati della riunione non trovati.");
	}
};

async function fetchAllMeetingHistory(userEmail, isCEO) {
	const tableBody = document.getElementById("auditTableBody");
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
			tableBody.innerHTML =
				'<tr><td colspan="5" style="text-align:center;">Nessuna riunione in archivio.</td></tr>';
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
						return null; // Aggiunto per evitare errori bloccanti
					}
				}

				// --- CONTROLLO FILTRO: RUOLO E EMAIL ---
				const partecipanti = meetingData?.partecipanti || [];
				const isUserParticipant =
					Array.isArray(partecipanti) &&
					partecipanti.includes(userEmail);

				// Mostriamo la riunione solo se sei CEO oppure se sei presente nei partecipanti
				if (isCEO || isUserParticipant) {
					meetingData.id = key;
					meetingData.timestamp = parseInt(
						key.replace("reunion_", ""),
						10,
					);
					return meetingData;
				} else {
					return null; // Ignoriamo la riunione
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

		// Ordiniamo dalla più recente alla più vecchia
		meetings.sort((a, b) => b.timestamp - a.timestamp);

		tableBody.innerHTML = "";

		if (meetings.length === 0) {
			const emptyMsg = isCEO
				? "Nessuna riunione in archivio."
				: "Nessuna partecipazione trovata.";
			tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${emptyMsg}</td></tr>`;
			return;
		}

		meetings.forEach((meeting) => {
			// Salviamo il meeting nella mappa globale usando il suo ID
			window.meetingsMap[meeting.id] = meeting;

			const title = meeting.titolo || `Riunione ${meeting.id}`;
			const dateToFormat = meeting.dataInizio
				? new Date(meeting.dataInizio)
				: new Date(meeting.timestamp);
			const numPartecipanti = meeting.partecipanti
				? meeting.partecipanti.length
				: 0;

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

			// Bottone che richiama la nostra funzione JS per il redirect
			const actionButtonHTML = `<button onclick="vaiADettaglioRiunione('${meeting.id}')" class="btn-action">Dettagli</button>`;

			const tr = document.createElement("tr");

			tr.innerHTML = `
                <td style="font-weight: 500;">${formatItalianDate(dateToFormat)}</td>
                <td style="font-weight: bold; color: var(--black);">${title}</td>
                <td>${numPartecipanti} ammessi</td>
                <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
                <td>${actionButtonHTML}</td>
            `;

			tableBody.appendChild(tr);
		});
	} catch (error) {
		console.error(
			"Errore globale durante il caricamento dello storico:",
			error,
		);
		tableBody.innerHTML =
			'<tr><td colspan="5" style="text-align:center; color:red;">Impossibile caricare l\'archivio dal server.</td></tr>';
	}
}
