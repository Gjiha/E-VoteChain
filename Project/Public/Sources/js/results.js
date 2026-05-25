document.addEventListener("DOMContentLoaded", () => {
	// 2. Lettura parametri URL (es. ?id=reunion_123&vote=1)
	const urlParams = new URLSearchParams(window.location.search);
	const meetingId = urlParams.get("id");
	const voteNumber = urlParams.get("vote");

	if (!meetingId || !voteNumber) {
		alert("Parametri mancanti.");
		window.history.back();
		return;
	}

	// 3. Recupero Dati dal LocalStorage
	const meetingString = localStorage.getItem("currentMeeting");
	const resultsString = localStorage.getItem("currentVoteResults");

	if (!meetingString || !resultsString) {
		alert("Dati della riunione o risultati non trovati nel browser.");
		window.history.back();
		return;
	}

	const meeting = JSON.parse(meetingString);
	const results = JSON.parse(resultsString);

	// Formattazione Data Fine
	let dataFineFormattata = "Data non impostata";
	if (meeting.dataFine) {
		const d = new Date(meeting.dataFine);
		dataFineFormattata = d.toLocaleString("it-IT", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// 4. Popolamento Intestazione
	document.getElementById("resTitle").innerText =
		meeting.titolo || meeting.id;
	document.getElementById("resVoteNum").innerText =
		`Votazione N° ${voteNumber}`;
	document.getElementById("resDate").innerText = dataFineFormattata;

	// Stile del Badge basato sullo status (positiva, negativa, zero)
	const badge = document.getElementById("resBadge");
	if (results.status === "positiva") {
		badge.innerText = "APPROVATA E CERTIFICATA";
		badge.className = "badge positiva";
	} else if (results.status === "negativa") {
		badge.innerText = "RESPINTA E CERTIFICATA";
		badge.className = "badge negativa";
	} else {
		badge.innerText = "CONCLUSA (PARITÀ/ASTENUTI)";
	}

	document.getElementById("resEsitoText").innerText =
		results.esito + ` (Somma Algebrica Quote: ${results.somma})`;

	// 5. Calcoli Matematici
	const v = results.dettagliVoti;
	const totaleVotanti = v.totaleVotanti || 0;

	// Calcolo Affluenza
	const totaleAventiDiritto = meeting.partecipanti
		? meeting.partecipanti.length
		: 0;
	let percAffluenza = 0;
	if (totaleAventiDiritto > 0) {
		percAffluenza = Math.round((totaleVotanti / totaleAventiDiritto) * 100);
	}

	document.getElementById("resAffluenza").innerText = `${percAffluenza}%`;
	document.getElementById("resTotalVotes").innerText = totaleVotanti;

	// Calcolo Percentuali Voti
	let percFav = 0,
		percCon = 0,
		percAst = 0;
	if (totaleVotanti > 0) {
		percFav = Math.round((v.favorevoli / totaleVotanti) * 100);
		percCon = Math.round((v.contrari / totaleVotanti) * 100);
		percAst = Math.round((v.astenuti / totaleVotanti) * 100);
	}

	// 6. Aggiornamento DOM delle Barre Grafico
	document.getElementById("textFav").innerText =
		`${percFav}% (${v.favorevoli} voti)`;
	document.getElementById("barFav").style.width = `${percFav}%`;

	document.getElementById("textCon").innerText =
		`${percCon}% (${v.contrari} voti)`;
	document.getElementById("barCon").style.width = `${percCon}%`;

	document.getElementById("textAst").innerText =
		`${percAst}% (${v.astenuti} voti)`;
	document.getElementById("barAst").style.width = `${percAst}%`;
});
