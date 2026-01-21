// middlewares/auth.middleware.js

function normalizeRole(role) {
  if (!role) return null;

  // support format lama (kalau masih nyangkut di DB/session)
  if (role === "SUPERADMIN_TPM") return "SUPERADMINTPM";
  if (role === "TIM_PENILAI") return "TIMPENILAI";

  return role; // format baru
}

function forbidden(res, message) {
  // kalau kamu punya views/error.ejs gunakan render, kalau tidak fallback send
  try {
    return res.status(403).render("error", {
      title: "Akses Ditolak",
      message: message || "Anda tidak memiliki izin untuk mengakses halaman ini.",
    });
  } catch (e) {
    return res.status(403).send("Forbidden");
  }
}

function requireAuth(req, res, next) {
  if (!req.session?.user?.email) return res.redirect("/login");
  // normalisasi session role sekali lewat
  req.session.user.peran = normalizeRole(req.session.user.peran);
  next();
}

function requireRole(...allowedRoles) {
  const allowed = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.session?.user?.email) return res.redirect("/login");

    const role = normalizeRole(req.session.user.peran);
    if (!role) return res.redirect("/login");

    if (!allowed.includes(role)) {
      return forbidden(res);
    }

    // update session biar konsisten
    req.session.user.peran = role;
    next();
  };
}

// role guards
const requireSuperAdmin = requireRole("SUPERADMINTPM");
const requireAdmin = requireRole("SUPERADMINTPM", "ADMIN");
const requireTimPenilai = requireRole("TIMPENILAI");

// alias nama lama (biar route lama tidak jebol)
const harusSuperadmin = requireSuperAdmin;
const harusAdmin = requireAdmin;
const harusTimPenilai = requireTimPenilai;
const harusLogin = requireAuth;

module.exports = {
  normalizeRole,
  requireAuth,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireTimPenilai,
  harusSuperadmin,
  harusAdmin,
  harusTimPenilai,
  harusLogin,
};
