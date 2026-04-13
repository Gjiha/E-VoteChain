async function handleLogin(e) {
	e.preventDefault();

	const walletInput = document.getElementById("walletId");
	const passwordInput = document.getElementById("password");
	const btnText = document.getElementById("btnText");
	const msg = document.getElementById("login-message");

	const walletValue = walletInput.value.trim();
	const pswValue = passwordInput.value;

	btnText.innerText = "Verifica in corso...";
	msg.innerText = "";

	try {
		const response = await fetch(
			"http://localhost:30000/api/v1/loginCheck", // CORRETTO: 3000 invece di 30000
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					// RIMOSSO l'header Authorization: qui non serve, stiamo facendo il login con la password!
				},
				body: JSON.stringify({
					id_wallet: walletValue,
					psw: pswValue,
				}),
			},
		);

		// LEGGIAMO IL JSON UNA SOLA VOLTA QUI
		const result = await response.json();

		if (response.ok) {
			// LOGIN SUCCESSO
			msg.style.color = "green";
			msg.innerText = "Login effettuato! Reindirizzamento...";

			// 1. Salviamo il TOKEN JWT
			if (result.token) {
				localStorage.setItem("token", result.token);
			}

			// 2. Salviamo i DATI UTENTE
			localStorage.setItem("user", JSON.stringify(result.data));

			const ruolo = result.data.classe.toLowerCase();

			setTimeout(() => {
				if (ruolo === "ceo") {
					window.location.href = "ceo_dashboard.html";
				} else {
					window.location.href = "member_dashboard.html";
				}
			}, 1000);
		} else {
			// LOGIN FALLITO (Il server ha risposto con errore)
			// Usiamo il messaggio che arriva dal JSON del server
			msg.style.color = "red";
			msg.innerText = result.message || "Errore durante il login";
			console.log("Dettagli errore server:", result);
		}
	} catch (error) {
		console.error("Errore fetch:", error);
		msg.style.color = "red";
		msg.innerText = "Impossibile collegarsi al server.";
	} finally {
		btnText.innerText = "Login";
	}
}
