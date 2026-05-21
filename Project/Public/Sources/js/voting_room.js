document.addEventListener("DOMContentLoaded", async () => {
	// 1. Setup Utente e Sicurezza base
	const userString = localStorage.getItem("user");
	const token = localStorage.getItem("token");

	if (!userString || !token) {
		window.location.href = "login.html";
		return;
	}

	const user = JSON.parse(userString);
	document.getElementById("userWalletDisplay").innerText =
		user.id_wallet || "Sconosciuto";

	// 2. Lettura parametri dall'URL (es. ?id=reunion_123&vote=1)
	const urlParams = new URLSearchParams(window.location.search);
	const meetingId = urlParams.get("id");
	const voteNumber = urlParams.get("vote");

	if (!meetingId || !voteNumber) {
		alert("Parametri di voto mancanti o errati.");
		window.history.back();
		return;
	}

	// --- INIZIO CONTROLLO STATO VOTAZIONE ---
	let votationsStatus = {};
	try {
		const statusResponse = await fetch(
			`http://10.172.10.74:30000/api/v1/get-votations-status?meetingId=${meetingId}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (statusResponse.ok) {
			const statusJson = await statusResponse.json();
			votationsStatus = statusJson.data || {};
		} else {
			console.warn("Impossibile recuperare lo stato delle votazioni");
		}
	} catch (e) {
		console.error("Errore fetch stato votazioni:", e);
	}

	// Controllo stringa o booleano a seconda di come il DB salva i dati
	if (
		votationsStatus[voteNumber] !== true &&
		votationsStatus[voteNumber] !== "true"
	) {
		alert("Accesso negato: questa votazione non è accessibile.");
		window.history.back();
		return; // FERMA L'ESECUZIONE DELLO SCRIPT
	}
	// --- FINE CONTROLLO STATO VOTAZIONE ---

	// 3. Popolamento Dati Riunione dal LocalStorage
	const meetingString = localStorage.getItem("currentMeeting");
	if (meetingString) {
		const meeting = JSON.parse(meetingString);

		// Verifica sicurezza extra: controlliamo se il meeting dell'URL corrisponde a quello in memoria
		if (meeting.id === meetingId) {
			document.getElementById("roomTitle").innerText =
				`Votazione N° ${voteNumber}`;
			document.getElementById("roomMeetingTitle").innerText =
				meeting.titolo || meeting.id;
			document.getElementById("roomVoteNumber").innerText = voteNumber;

			// Format Data Fine
			if (meeting.dataFine) {
				const endDate = new Date(meeting.dataFine);
				document.getElementById("roomEndDate").innerText =
					endDate.toLocaleString("it-IT", {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					});
			}

			// Mostra PDF se presente
			if (meeting.verbale) {
				const docBox = document.getElementById("roomDocBox");
				const docLink = document.getElementById("roomDocLink");
				docBox.style.display = "flex";
				docLink.href = "http://10.172.10.74:30000" + meeting.verbale;
			}
		}
	}

	// 4. Logica Selezione Voto
	let currentVote = null;
	const voteButtons = document.querySelectorAll(".vote-btn");
	const confirmBtn = document.getElementById("confirmBtn");

	voteButtons.forEach((btn) => {
		btn.addEventListener("click", function () {
			// Rimuovi la classe selected da tutti i bottoni
			voteButtons.forEach((b) => b.classList.remove("selected"));

			// Aggiungi la classe selected al bottone cliccato
			this.classList.add("selected");

			// Salva la scelta basandosi sull'ID del bottone ('favorevole', 'contrario' o 'astenuto')
			currentVote = this.id.replace("btn-", "");

			// Abilita il bottone di conferma
			confirmBtn.disabled = false;
		});
	});

	// 5. Logica Invio Voto (Chiamata API al Backend)
	confirmBtn.addEventListener("click", async () => {
		if (!currentVote) return;

		// Disabilitiamo il pulsante per evitare doppi click
		confirmBtn.disabled = true;
		confirmBtn.innerText = "Registrazione voto in corso...";

		const statusMsg = document.getElementById("statusMessage");
		statusMsg.style.color = "var(--gray-text)";
		statusMsg.innerText =
			"Trasmissione al server sicuro in corso. Attendi...";

		try {
			// Eseguiamo la chiamata all'API add-vote
			const response = await fetch(
				"http://10.172.10.74:30000/api/v1/add-vote",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`, // Il token autorizza e identifica l'utente
					},
					body: JSON.stringify({
						meetingId: meetingId,
						voteIndex: voteNumber,
						voto: currentVote,
					}),
				},
			);

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(
					errData.message || `Errore HTTP: ${response.status}`,
				);
			}

			// In caso di successo, aggiorniamo l'interfaccia
			statusMsg.style.color = "#2e7d32";
			statusMsg.innerText = `Voto "${currentVote.toUpperCase()}" registrato con successo!`;
			confirmBtn.innerText = "Voto Registrato ✔";
			confirmBtn.style.backgroundColor = "#2e7d32";

			// Riporta automaticamente l'utente indietro dopo 2 secondi
			setTimeout(() => {
				window.history.back();
			}, 2000);
		} catch (error) {
			console.error("Errore durante l'invio del voto:", error);
			statusMsg.style.color = "red";
			statusMsg.innerText =
				"Errore durante la registrazione: " + error.message;

			// In caso di errore, riabilitiamo il bottone così l'utente può riprovare
			confirmBtn.disabled = false;
			confirmBtn.innerText = "Firma Transazione e Vota";
		}
	});
});
