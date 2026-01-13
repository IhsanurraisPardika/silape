exports.harusLogin = (req, res, next) => {
  if (!req.session?.user) return res.redirect("/login");
  next();
};

exports.harusSuperadmin = (req, res, next) => {
  if (!req.session?.user) return res.redirect("/login");
  if (req.session.user.peran !== "SUPERADMIN_TPM") {
    return res.status(403).send("Forbidden: bukan superadmin");
  }
  next();
};
