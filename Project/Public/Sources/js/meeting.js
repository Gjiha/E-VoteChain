// Rendi le funzioni accessibili globalmente per l'HTML
window.toggleVote = async function (voteId, nuovoStato) {};
window.accediVotazione = function (meetingId, voteId) {};
window.visualizzaRisultati = async function (meetingId, voteId) {}; // NUOVA FUNZIONE

document.addEventListener("DOMContentLoaded", async () => {
	// 1. Setup Utente e Token
	const userString = localStorage.getItem("user");
	const token = localStorage.getItem("token");

	if (!userString || !token) {
		window.location.href = "login.html";
		return;
	}

	const user = JSON.parse(userString);
	document.getElementById("userNameHeader").innerText =
		user.nome + " " + user.cognome;
	document.getElementById("userInitials").innerText = (
		user.nome[0] + user.cognome[0]
	).toUpperCase();

	// =========================================================
	// 2. VERIFICA RUOLO SICURA TRAMITE SERVER (JWT)
	// =========================================================
	let isCEO = false;
	try {
		const roleResponse = await fetch(
			"http://localhost:30000/api/v1/check-role",
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (roleResponse.status === 401 || roleResponse.status === 403) {
			alert("Sessione scaduta o non valida.");
			localStorage.clear();
			window.location.href = "login.html";
			return;
		}

		if (!roleResponse.ok) throw new Error("Errore API check-role");

		const roleData = await roleResponse.json();
		isCEO = roleData.isCEO;
	} catch (error) {
		console.error("Impossibile verificare il ruolo col server:", error);
		isCEO = false;
	}

	// 3. Caricamento Dati Riunione dal LocalStorage
	const meetingString = localStorage.getItem("currentMeeting");
	if (!meetingString) {
		alert("Nessuna riunione selezionata!");
		window.location.href = isCEO
			? "ceo_dashboard.html"
			: "member_dashboard.html";
		return;
	}

	const meeting = JSON.parse(meetingString);

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

	// Popolamento dei campi HTML generali
	document.getElementById("meetingTitle").innerText =
		meeting.titolo || "Riunione Senza Titolo";
	document.getElementById("mStartDate").innerText = formatDate(
		meeting.dataInizio,
	);
	document.getElementById("mEndDate").innerText = formatDate(
		meeting.dataFine,
	);
	document.getElementById("mVotesCount").innerText =
		meeting.numeroVotazioni || "0";
	document.getElementById("mParticipantsCount").innerText =
		meeting.partecipanti ? meeting.partecipanti.length : 0;

	const docLink = document.getElementById("mDocLink");
	if (meeting.verbale) {
		docLink.href = "http://localhost:30000" + meeting.verbale;
	} else {
		docLink.style.display = "none";
	}

	// =========================================================
	// Calcolo Status riunione e variabile per blocco comandi CEO
	// =========================================================
	const now = new Date();
	const start = new Date(meeting.dataInizio);
	const end = new Date(meeting.dataFine);
	const statusBadge = document.getElementById("meetingStatus");

	let isMeetingActive = false; // <-- VARIABILE CHIAVE PER I PERMESSI CEO

	if (now < start) {
		statusBadge.innerText = "Programmata";
		statusBadge.style.backgroundColor = "#fff3cd";
		statusBadge.style.color = "#856404";
	} else if (now >= start && now <= end) {
		statusBadge.innerText = "In Corso (Attiva)";
		statusBadge.style.backgroundColor = "#d4edda";
		statusBadge.style.color = "#155724";
		isMeetingActive = true;
	} else {
		statusBadge.innerText = "Conclusa";
		statusBadge.style.backgroundColor = "#e2e3e5";
		statusBadge.style.color = "#383d41";
	}

	// Popolamento lista Wallet
	const walletListContainer = document.getElementById("mWalletList");
	walletListContainer.innerHTML = "";
	if (meeting.partecipanti && meeting.partecipanti.length > 0) {
		meeting.partecipanti.forEach((wallet) => {
			const codeBlock = document.createElement("code");
			codeBlock.innerText = wallet;
			walletListContainer.appendChild(codeBlock);
		});
	} else {
		walletListContainer.innerText = "Nessun partecipante inserito.";
	}

	// =========================================================
	// 4. RECUPERO STATO VOTAZIONI DAL SERVER
	// =========================================================
	let votationsStatus = {};
	try {
		const statusResponse = await fetch(
			`http://localhost:30000/api/v1/get-votations-status?meetingId=${meeting.id}`,
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

	// =========================================================
	// 5. GENERAZIONE LISTA VOTAZIONI E BOTTONI
	// =========================================================
	const votesContainer = document.getElementById("mVotesList");
	votesContainer.innerHTML = "";

	const numVotazioni = parseInt(meeting.numeroVotazioni) || 0;

	if (numVotazioni === 0) {
		votesContainer.innerHTML =
			"<p style='color: var(--gray-text);'>Nessuna votazione prevista in questa assemblea.</p>";
	} else {
		for (let i = 1; i <= numVotazioni; i++) {
			const statusValue = votationsStatus[i];
			const isAperta = statusValue === true || statusValue === "true";
			const isChiusaDefinitiva = statusValue === "closed";

			const voteCard = document.createElement("div");
			voteCard.className = "vote-card";

			let statusText = "Non Aperta";
			let statusClass = "v-closed";

			if (isAperta) {
				statusText = "Aperta";
				statusClass = "v-open";
			} else if (isChiusaDefinitiva) {
				statusText = "Conclusa";
				statusClass = "v-closed";
			}

			let cardHTML = `
                <div class="vote-info">
                    <h4>Votazione ${i}</h4>
                    <span class="vote-status ${statusClass}">${statusText}</span>
                </div>
                <div class="vote-actions">
            `;

			if (isCEO) {
				// LOGICA CEO
				if (isAperta) {
					cardHTML += `<button class="btn btn-outline btn-sm" onclick="accediVotazione('${meeting.id}', ${i})">Accedi</button>`;
					if (isMeetingActive) {
						cardHTML += `<button class="btn btn-danger btn-sm" onclick="toggleVote(${i}, 'closed')">Chiudi</button>`;
					}
				} else if (isChiusaDefinitiva) {
					// SE CHIUSA: Bottone per visualizzare i risultati
					cardHTML += `<button class="btn btn-primary btn-sm" style="background-color: var(--black);" onclick="visualizzaRisultati('${meeting.id}', ${i})">Visualizza risultati</button>`;
				} else {
					if (isMeetingActive) {
						cardHTML += `<button class="btn btn-primary btn-sm" onclick="toggleVote(${i}, true)">Apri Votazione</button>`;
					} else {
						cardHTML += `<span class="vote-closed-text">Riunione non attiva (Apertura non consentita)</span>`;
					}
				}
			} else {
				// LOGICA MEMBRO NORMALE
				if (isAperta) {
					cardHTML += `<button class="btn btn-primary btn-sm" onclick="accediVotazione('${meeting.id}', ${i})">Accedi alla Votazione</button>`;
				} else if (isChiusaDefinitiva) {
					// SE CHIUSA: Bottone per visualizzare i risultati anche per il membro
					cardHTML += `<button class="btn btn-primary btn-sm" style="background-color: var(--black);" onclick="visualizzaRisultati('${meeting.id}', ${i})">Visualizza risultati</button>`;
				} else {
					cardHTML += `<span class="vote-closed-text">Votazione non ancora aperta</span>`;
				}
			}

			cardHTML += `</div>`;
			voteCard.innerHTML = cardHTML;
			votesContainer.appendChild(voteCard);
		}
	}

	window.toggleVote = async function (voteId, nuovoStato) {
		const statoPrecedente = votationsStatus[voteId];
		votationsStatus[voteId] = nuovoStato;

		try {
			const res = await fetch(
				"http://localhost:30000/api/v1/aggiorna-status",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						meetingId: meeting.id,
						votationsStatus: votationsStatus,
					}),
				},
			);

			if (!res.ok) throw new Error("Errore API aggiorna-status");

			if (nuovoStato === "closed") {
				console.log(
					"Chiusura confermata: Avvio scrutinio sulla blockchain...",
				);

				const valRes = await fetch(
					"http://localhost:30000/api/v1/validation-vote",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							meetingId: meeting.id,
							voteIndex: voteId,
						}),
					},
				);

				if (valRes.ok) {
					// Ora validation-vote non restituisce il JSON dei risultati,
					// quindi richiamiamo direttamente la fetch di visualizzazione per scaricare i dati
					await window.visualizzaRisultati(meeting.id, voteId);
				} else {
					console.warn(
						"Errore durante lo scrutinio:",
						await valRes.text(),
					);
					alert(
						"La votazione è stata chiusa, ma si è verificato un errore durante la generazione del risultato finale.",
					);
				}
			}

			window.location.reload();
		} catch (err) {
			console.error(err);
			alert(
				"Errore di connessione: Impossibile modificare lo stato della votazione.",
			);
			votationsStatus[voteId] = statoPrecedente;
		}
	};

	window.accediVotazione = function (meetingId, voteId) {
		window.location.href = `voting_room.html?id=${meetingId}&vote=${voteId}`;
	};

	// --- NUOVA FUNZIONE: Visualizza e Salva Risultati ---
	window.visualizzaRisultati = async function (meetingId, voteId) {
		try {
			const res = await fetch(
				"http://localhost:30000/api/v1/visualize-vote",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						meetingId: meetingId,
						voteIndex: voteId,
					}),
				},
			);

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(
					errorData.message || "Errore nel recupero dei risultati.",
				);
			}

			const data = await res.json();

			// Salva nel localStorage l'intero oggetto JSON dei risultati
			localStorage.setItem("currentVoteResults", JSON.stringify(data));

			// Naviga alla nuova pagina dei risultati
			window.location.href = `results.html?id=${meetingId}&vote=${voteId}`;
		} catch (error) {
			console.error(
				"Errore durante la visualizzazione dei risultati:",
				error,
			);
			alert(
				"Attenzione: Impossibile recuperare i risultati della votazione. " +
					error.message,
			);
		}
	};

	window.handleLogout = function () {
		localStorage.clear();
		window.location.href = "login.html";
	};
});
