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
		const response = await fetch("/api/v1/loginCheck", {
			method: "POST",
			credentials: "include", // FONDAMENTALE: permette di ricevere e salvare il cookie
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id_wallet: walletValue,
				psw: pswValue,
			}),
		});

		const result = await response.json();

		if (response.ok) {
			// LOGIN SUCCESSO
			msg.style.color = "green";
			msg.innerText = "Login effettuato! Reindirizzamento...";

			// Recuperiamo i dati in modo sicuro (dal server se ci sono)
			const userData = result.data;

			if (userData) {
				// Aggiorniamo il localStorage con i dati freschi
				localStorage.setItem("user", JSON.stringify(userData));

				// Normalizziamo il controllo della classe/ruolo per evitare altri errori
				const ruoloRaw = String(
					userData.classe || userData.ruolo || "",
				).toLowerCase();

				setTimeout(() => {
					if (ruoloRaw.includes("ceo")) {
						window.location.href = "ceo_dashboard.html";
					} else {
						window.location.href = "member_dashboard.html";
					}
				}, 1000);
			} else {
				msg.style.color = "red";
				msg.innerText =
					"Errore anomalo: Dati utente mancanti dal server.";
			}
		} else {
			// LOGIN FALLITO (Il server ha risposto con errore)
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
