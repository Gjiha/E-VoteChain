document.addEventListener("DOMContentLoaded", () => {
	// 1. Setup Utente (Header)
	const userString = localStorage.getItem("user");
	if (userString) {
		const user = JSON.parse(userString);
		document.getElementById("userNameHeader").innerText =
			user.nome + " " + user.cognome;
		document.getElementById("userInitials").innerText = (
			user.nome[0] + user.cognome[0]
		).toUpperCase();
	} else {
		window.location.href = "login.html";
		return; // Blocca l'esecuzione se l'utente non è loggato
	}

	// 2. Caricamento Dati Riunione Dinamica
	const meetingString = localStorage.getItem("currentMeeting");

	if (!meetingString) {
		// Se non c'è nessuna riunione nel localStorage, torna alla dashboard
		alert("Nessuna riunione selezionata!");
		window.location.href = "ceo_dashboard.html";
		return;
	}

	const meeting = JSON.parse(meetingString);

	// Funzione helper per formattare la data (da "2026-03-10T10:00" a "10/03/2026, 10:00")
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleString("it-IT", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Popolamento dei campi HTML
	document.getElementById("meetingTitle").innerText =
		meeting.titolo || "Riunione Senza Titolo";
	document.getElementById("mStartDate").innerText = formatDate(
		meeting.dataInizio,
	);
	document.getElementById("mEndDate").innerText = formatDate(
		meeting.dataFine,
	);
	document.getElementById("mVotesCount").innerText =
		meeting.numeroVotazioni || "N/D";
	document.getElementById("mParticipantsCount").innerText =
		meeting.partecipanti ? meeting.partecipanti.length : 0;

	// Configurazione link al PDF
	const docLink = document.getElementById("mDocLink");
	if (meeting.verbale) {
		// Presumendo che il server restituisca un path valido, es: "http://localhost:30000/uploads/file.pdf"
		// Se restituisce solo il nome file, concatenalo all'URL base.
		docLink.href = "http://localhost:30000/" + meeting.verbale;
	} else {
		docLink.style.display = "none";
	}

	// Calcolo dello Status della riunione (Attiva, Programmata, Conclusa)
	const now = new Date();
	const start = new Date(meeting.dataInizio);
	const end = new Date(meeting.dataFine);
	const statusBadge = document.getElementById("meetingStatus");

	if (now < start) {
		statusBadge.innerText = "Programmata";
		statusBadge.style.backgroundColor = "#fff3cd"; // Giallo
		statusBadge.style.color = "#856404";
	} else if (now >= start && now <= end) {
		statusBadge.innerText = "In Corso (Attiva)";
		statusBadge.style.backgroundColor = "#d4edda"; // Verde
		statusBadge.style.color = "#155724";
	} else {
		statusBadge.innerText = "Conclusa";
		statusBadge.style.backgroundColor = "#e2e3e5"; // Grigio
		statusBadge.style.color = "#383d41";
	}

	// Popolamento lista Wallet
	const walletListContainer = document.getElementById("mWalletList");
	walletListContainer.innerHTML = ""; // Svuota il contenitore

	if (meeting.partecipanti && meeting.partecipanti.length > 0) {
		meeting.partecipanti.forEach((wallet) => {
			const codeBlock = document.createElement("code");
			codeBlock.innerText = wallet;
			walletListContainer.appendChild(codeBlock);
		});
	} else {
		walletListContainer.innerText = "Nessun partecipante inserito.";
	}
});
