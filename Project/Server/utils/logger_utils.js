const formatLog = (req, statusCode, comment) => {
	const timestamp = new Date().toISOString();
	const ipSorgente = req.ip || req.socket?.remoteAddress || "Unknown";
	const ipDestinazione = req.socket?.localAddress || "Unknown";
	const actionRoute = `${req.method} ${req.originalUrl || req.url}`;
	return `[${timestamp}][${ipSorgente}][${ipDestinazione}][${actionRoute}][${statusCode}][${comment}]`;
};

module.exports = { formatLog };
