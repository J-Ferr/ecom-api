export function errorHandler(err, req, res, next) {
    console.error(err);

    // Handle common Postgres errors
    if (err?.code === "23505") {
        return res.status(409).json({ error: "Duplicate value" });
    }

    res.status(500).json({ error: "Server error" });
}