//Questa funzione data una classe e una chiave ti tira fuori il value che può essere un qualunque JSON
async function getKV(cls, key) {
	try {
		const response = await fetch(process.env.MAPPING_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				cmd: "GetKV",
				class: cls,
				key: key,
			}),
		});

		if (!response.ok) {
			throw new Error("Fetch non andata a buon fine");
		}

		const json = await response.json();

		return json.answer; // <-- struttura corretta
	} catch (err) {
		console.error(err);
		throw err;
	}
}

//Aggiungi una coppia classe chiave con associato un qualsivoglia valore
async function addKV(cls, key, value) {
	try {
		const response = await fetch(process.env.MAPPING_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				cmd: "AddKV",
				class: cls,
				key: key,
				value: value,
			}),
		});

		if (!response.ok) {
			throw new Error("Fetch non andata a buon fine");
		}

		const json = await response.json();

		return json.answer; // <-- struttura corretta
	} catch (err) {
		console.error(err);
		throw err;
	}
}

//Elimina una coppia chiave valore
async function delKV(cls, key) {
	try {
		const response = await fetch(process.env.MAPPING_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				cmd: "DelKV",
				class: cls,
				key: key,
			}),
		});

		if (!response.ok) {
			throw new Error("Fetch non andata a buon fine");
		}

		const json = await response.json();

		return json.answer; // <-- struttura corretta
	} catch (err) {
		console.error(err);
		throw err;
	}
}

//Ritorna lo storico delle operazioni effettuate sulla coppia chiave-valore
async function getHistoryKV(cls, key) {
	try {
		const response = await fetch(process.env.MAPPING_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				cmd: "GetKeyHistory",
				class: cls,
				key: key,
			}),
		});

		if (!response.ok) {
			throw new Error("Fetch non andata a buon fine");
		}

		const json = await response.json();

		return json.answer; // <-- struttura corretta
	} catch (err) {
		console.error(err);
		throw err;
	}
}

//Ritorna il numero di chiavi chiamate in quel modo associate alla classe
async function getNumKV(cls, key) {
	try {
		const response = await fetch(process.env.MAPPING_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				cmd: "GetNumKeys",
				class: cls,
				key: key,
			}),
		});

		if (!response.ok) {
			throw new Error("Fetch non andata a buon fine");
		}

		const json = await response.json();

		return json.answer; // <-- struttura corretta
	} catch (err) {
		console.error(err);
		throw err;
	}
}

//Ritorna tutte le classi nel sistema
async function getClasses() {
	try {
		const response = await fetch(process.env.MAPPING_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				cmd: "GetClasses",
			}),
		});

		if (!response.ok) {
			throw new Error("Fetch non andata a buon fine");
		}

		const json = await response.json();

		return json.answer; // <-- struttura corretta
	} catch (err) {
		console.error(err);
		throw err;
	}
}

//Ritorna tutte le chiavi associate alla classe messa in input
async function getKeysCopy(cls) {
	try {
		const response = await fetch(process.env.MAPPING_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				cmd: "GetKeys",
				class: cls,
				key: "",
			}),
		});

		if (!response.ok) {
			throw new Error("Fetch non andata a buon fine");
		}

		const json = await response.json();

		return json.answer; // <-- struttura corretta
	} catch (err) {
		console.error(err);
		throw err;
	}
}

// 👇 ESPORTAZIONE
module.exports = {
	getKV,
	addKV,
	delKV,
	getHistoryKV,
	getClasses,
	getNumKV,
	getKeysCopy,
};
