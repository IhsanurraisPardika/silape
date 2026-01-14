exports.index = (req, res) => {
  // Render the inputPenilaian view (UI list of offices)
  res.render('Penilaian', {
    user: 'IHSANURRAIS PARDIKA'
  })
}

exports.daftar = (req, res) => {
  res.render('Penilaian', {
    user: 'IHSANURRAIS PARDIKA'
  })
}
