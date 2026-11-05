ITS="""7698594339160624405 Nước tẩy trang L’Oreal Paris
7698261913729273108 Bộ gội xả L’Oreal Paris
7698261600951602484 Nước tẩy trang L’Oreal Paris
7697478864078933254 Dưỡng cơ thể AHA Paula Choice’s
7697479907252784404 Serum L’Oreal Paris
7697478257087679764 Sữa rửa mặt Laroche Posay
7697478739780766997 Serum Torriden
7697476882245192980 Combo gội xả L’Oreal Paris
7697143207590628628 Lăn khử mùi Vichy
7697142866572791060 Dưỡng da cơ thể AHA
7696824105726676230 Nước tẩy trang Laroche Posay
7696823762775313716 Dầu gội Dercos
7696432223259626773 Serum Lancome tím
7696431976420510977 Serum Lancome đen
7696063088671411476 Cushion YSL
7696062856743226645 Serum tím Lancome
7695668231570296070 Serum bạc Lancome
7695667955962760468 Serum đen Lancome
7695310382604291348 Son dưỡng D’alba
7695310134624439572 Kem chống nắng AHC"""
COGU="""7698590076665613588 Toner BHA 2% Obagi
7698424717237046549 Bộ gội xả L'Oreal Paris
7698230382105349396 Serum PDRN L'Oreal Paris
7698073795701116181 Bộ gội xả hồng L'Oreal
7697989165069225217 Kem dưỡng Peptide Paula's Choice
7697833053757951252 Serum Melasyl L'Oreal
7697635467755277569 Sữa rửa mặt dạng gel La Roche Posay
7697486230698642708 Serum HA Torriden
7696325216837831956 Kem body Paula's Choice AHA 10%
7696197650122558740 Kem chống nắng AHC Masters Tone Up
7696033044418923797 Toner BHA 2% Obagi
7695764982079819029 Kem mắt AHC
7695654546604920070 Toner BHA 2% Paula's Choice
7695454512294694164 Son 3CE Blur Water Tint
7695366461640035604 Sữa rửa mặt D Program
7694140508511178005 Kem chống nắng nâng tone AHC
7694140361140079893 Kem dưỡng B5 La Roche Posay
7693931708097383700 Nước tẩy trang Bioderma
7693768788340165908 Nước tẩy trang Bioderma da dầu
7693526622518906132 Dầu gội Dercos Vichy"""
def parse(s): return [tuple(l.split(' ',1)) for l in s.splitlines()]
NEW={'its.hannah.team':parse(ITS),'hannahteam.cogu':parse(COGU)}
MEGA="""7698655780886613268 Cặp gội xả L'Oreal Paris
7698366582858321153 Bộ gội xả L'Oreal Paris Glycolic Gloss
7698285007831436564 Nước tẩy trang L'Oreal Paris
7697998180910107924 Kem body 2% BHA Paula's Choice
7697914873753242900 Serum MelaB3 La Roche-Posay
7697618373714218260 Kem body Paula's Choice 10% AHA
7697547143338282260 Nước tẩy trang La Roche-Posay
7697256652835212564 Serum Paula's Choice 20% Niacinamide
7697179431730810132 Dầu gội giảm rụng Dercos
7696801446162877717 Dầu gội Dercos giảm gàu
7696511042947468565 Toner keo ong CNP
7696436872234454293 Serum Lancome Genifique Ultimate"""
NEW['hannah.mega.live']=parse(MEGA)
