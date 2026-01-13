exports.index = (req, res) => {
  // Render the inputPenilaian view (UI list of offices)
  res.render('inputPenilaian', {
    user: 'IHSANURRAIS PARDIKA'
  })
}

exports.daftar = (req, res) => {
  res.render('daftarPenilaian', {
    user: 'IHSANURRAIS PARDIKA'
  })
}
