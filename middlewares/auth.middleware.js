exports.harusLogin = (req, res, next) => {
  if (!req.session?.user) return res.redirect("/");
  next();
};

exports.harusSuperadmin = (req, res, next) => {
  const u = req.session?.user;
  if (!u) return res.redirect("/");
  if (u.peran !== "SUPERADMIN_TPM") return res.status(403).send("Forbidden");
  next();
};

exports.harusAdmin = (req, res, next) => {
  const u = req.session?.user;
  if (!u) return res.redirect("/");
  if (u.peran !== "ADMIN" && u.peran !== "SUPERADMIN_TPM") {
    return res.status(403).send("Forbidden");
  }
  next();
};

exports.harusTimPenilai = (req, res, next) => {
  const u = req.session?.user;
  if (!u) return res.redirect("/");
  if (u.peran !== "TIM_PENILAI") return res.status(403).send("Forbidden");
  next();
};
