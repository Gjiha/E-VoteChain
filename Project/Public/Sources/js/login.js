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
			credentials: "include",
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
			msg.style.color = "green";
			msg.innerText = "Login effettuato! Reindirizzamento...";

			const userData = result.data;

			if (userData) {
				localStorage.setItem("user", JSON.stringify(userData));

				const ruoloRaw = String(
					userData.classe || userData.ruolo || "",
				).toLowerCase();

				// --- MODIFICA QUI: Aggiunto il controllo per l'ADMIN ---
				setTimeout(() => {
					if (ruoloRaw.includes("admin")) {
						window.location.href = "logVisual.html";
					} else if (ruoloRaw.includes("ceo")) {
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
