import jwt from "jsonwebtoken";

export function auth(req, res, next) {
    const header = req.headers.authorization || "";
    const [type, token] = header.split("");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload; // { sub, email, role }
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}