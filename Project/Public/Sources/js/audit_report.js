document.addEventListener("DOMContentLoaded", () => {
	// 1. Setup Utente (Header), recupero Ruolo/Email e TOKEN
	const userString = localStorage.getItem("user");
	const token = localStorage.getItem("token"); // <-- Recupero del JWT

	let userEmail = null;
	let userRole = null;

	// Se manca l'utente o il token, rimandiamo subito al login
	if (!userString || !token) {
		window.location.href = "login.html";
		return;
	}

	const user = JSON.parse(userString);
	userEmail = user.email;
	userRole = user.ruolo || user.classe || "";

	document.getElementById("userNameHeader").innerText =
		user.nome + " " + user.cognome;
	document.getElementById("userInitials").innerText = (
		user.nome[0] + user.cognome[0]
	).toUpperCase();

	// CONTROLLO RUOLO ROBUSTO
	const roleString = String(userRole).toUpperCase().trim();
	const isCEO = roleString === "CEO";

	console.log("Ruolo rilevato nel localStorage:", roleString);
	console.log("L'utente è identificato come CEO?", isCEO);

	// Aggiorniamo dinamicamente i tasti "Torna alla dashboard"
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

	// 2. Avvia il recupero passando l'email, il flag CEO e IL TOKEN
	fetchAllMeetingHistory(userEmail, isCEO, token);
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

// Dizionario globale per mappare gli ID
window.meetingsMap = {};

// Funzione richiamata al click del bottone nella tabella
window.vaiADettaglioRiunione = function (meetingId) {
	const meetingData = window.meetingsMap[meetingId];
	if (meetingData) {
		localStorage.setItem("currentMeeting", JSON.stringify(meetingData));
		window.location.href = "meeting.html";
	} else {
		alert("Errore: Dati della riunione non trovati.");
	}
};

async function fetchAllMeetingHistory(userEmail, isCEO, token) {
	const tableBody = document.getElementById("auditTableBody");
	const SERVER_URL = "http://localhost:30000";

	try {
		// --- CHIAMATA UNICA ALLA NUOVA ROTTA CON IL JWT ---
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
		const meetings = responseJson.data || [];

		// --- FINE CHIAMATA, INIZIO RENDER TABELLA ---
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
