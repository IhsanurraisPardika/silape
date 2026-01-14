exports.index = (req, res) => {
  const data = [
    {
      tanggal: '6 Juli 2025',
      kantor: 'KANTOR SALES AREA SUMBAR<br>LT.2 KANTOR PUSAT',
      rata: 78.5,
      status: 'Approval',
      detailUrl: '#'
    },
    {
      tanggal: '15 Juli 2025',
      kantor: 'KANTOR USM',
      rata: null,
      status: 'Proccess',
      detailUrl: '#'
    }
  ];

  res.render('daftarPenilaian', { data });
};