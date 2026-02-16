const getLanding = (req, res) => {
    res.render("landing", {
        title: "Selamat Datang di SILAPE",
        path: "/",
        user: req.session.user || null,
    });
};

module.exports = {
    getLanding,
};
