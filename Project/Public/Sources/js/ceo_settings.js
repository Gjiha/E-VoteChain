document.addEventListener("DOMContentLoaded", () => {
	const userString = localStorage.getItem("user");

	if (userString) {
		const user = JSON.parse(userString);

		// Popolamento Header
		document.getElementById("userNameHeader").innerText =
			user.nome + " " + user.cognome;
		document.getElementById("userInitials").innerText = (
			user.nome[0] + user.cognome[0]
		).toUpperCase();

		// Popolamento Card Impostazioni
		document.getElementById("displayNome").innerText =
			`${user.nome} ${user.cognome}`;
		document.getElementById("displayEmail").innerText = user.email;
		document.getElementById("displayWallet").innerText = user.id_wallet;
		document.getElementById("displayClasse").innerText = user.classe;
	} else {
		window.location.href = "login.html";
	}
});

function handleLogout() {
	localStorage.clear();
	window.location.href = "login.html";
}
