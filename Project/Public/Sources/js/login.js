async function handleLogin(e) {
	e.preventDefault();

	const walletInput = document.getElementById("walletId");
	const passwordInput = document.getElementById("password");
	const btnText = document.getElementById("btnText");
	const msg = document.getElementById("login-message");

	const walletValue = walletInput.value.trim();
	const pswValue = passwordInput.value;

	// Feedback visivo: disabilita pulsante o cambia testo
	btnText.innerText = "Verifica in corso...";
	msg.innerText = ""; // Pulisce messaggi precedenti

	try {
		const response = await fetch(
			"http://localhost:30000/api/v1/loginCheck",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id_wallet: walletValue,
					psw: pswValue,
				}),
			},
		);

		const result = await response.json();

		if (response.ok) {
			// LOGIN SUCCESSO
			msg.style.color = "green";
			msg.innerText = "Login effettuato! Reindirizzamento...";

			// Salviamo i dati dell'utente (opzionale) nel localStorage
			localStorage.setItem("user", JSON.stringify(result.data));

			// Esempio: reindirizza dopo 1 secondo
			const ruolo = result.data.classe.toLowerCase();

			setTimeout(() => {
				if (ruolo === "ceo") {
					window.location.href = "ceo_dashboard.html";
				} else {
					window.location.href = "member_dashboard.html";
				}
			}, 1000);
		} else {
			// LOGIN FALLITO (401, 404, ecc.)
			const bodyErrore = await response.text();
			console.log("RISPOSTA DEL SERVER (HTML):", bodyErrore);
		}
	} catch (error) {
		console.error("Errore fetch:", error);
		console.log(error);
		msg.style.color = "red";
		msg.innerText = "Impossibile collegarsi al server.";
	} finally {
		btnText.innerText = "Login";
	}
}
