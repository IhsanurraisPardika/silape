exports.getlogin = (req, res) => {
  res.render('login', {
    title: 'Login - SILAPE',
    message: 'Hello World!',
    appName: 'SILAPE'
  });
};
