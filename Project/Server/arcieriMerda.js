async function getKV(cls, key) {
	try {
		const response = await fetch("http://localhost:9999/api", {
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

async function addKV(cls, key, value) {
	try {
		const response = await fetch("http://localhost:9999/api", {
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

async function delKV(cls, key) {
	try {
		const response = await fetch("http://localhost:9999/api", {
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

async function getHistoryKV(cls, key) {
	try {
		const response = await fetch("http://localhost:9999/api", {
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

async function getNumKV(cls, key) {
	try {
		const response = await fetch("http://localhost:9999/api", {
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

async function getClasses() {
	try {
		const response = await fetch("http://localhost:9999/api", {
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

// 👇 ESPORTAZIONE
module.exports = {
	getKV,
	addKV,
	delKV,
	getHistoryKV,
	getClasses,
	getNumKV,
};
