# Köklerden Göklere: Elektrik ve Elektronik
## Eğitmen Rehberi (5. Hafta)

Bu rehber `Koklerden_Goklere_Sunum.html` sunumunun konuşmacı notlarından otomatik olarak üretilmiştir. Aynı notlar sunum sırasında konuşmacı penceresinde (P tuşu) görünür.

Dersin ilkesi: **her şey bilimsel olarak kanıtlanmış bilgiye dayanır, hiçbir şey denenmez.** Priz ve vücut konusu ölçülmüş verilerle (IEC 60479-1) anlatılır; öğrencilere hiçbir şekilde deneme önerilmez.

Sunum 95 slayttır ve tek bir ders saatine sığmak zorunda değildir. Sayfa sayısı değil, her sayfada durup anlatabildiğimiz önemlidir; ders iki ya da üç oturuma bölünebilir. Akış: **Elektrik → Devre → PCB → Sensör → Bilgisayar**.

---

## Sunumu açmak

1. Klasörü `lib` alt klasörüyle birlikte kopyalayın. İnternet gerekmez.
2. `Koklerden_Goklere_Sunum.html` dosyasını Chrome veya Edge ile açın.
3. Projeksiyona bağlıyken `Win + P` ile **Uzat** modunu seçin; sunum penceresini projeksiyona taşıyıp `F` ile tam ekran yapın.
4. `P` ile konuşmacı notlarını ayrı pencerede açın ve kendi ekranınızda tutun.

| Tuş | İşlev |
|---|---|
| Sağ ok, Page Down, boşluk | Sonraki slayt |
| Sol ok, Page Up | Önceki slayt |
| Home / End | İlk / son slayt |
| G | Slayt haritası (bölümlere göre atlama) |
| P | Konuşmacı penceresi (notlar, süre, sıradaki slayt) |
| F | Tam ekran |
| Q | 3B görsel kalitesini düşük (çok akıcı) / otomatik arasında değiştirir; bilgisayar zorlanıyorsa kullanın |

**3B görseller:** fareyle sürükleyerek çevirin, tekerlekle yaklaşın, çift tıklayarak başlangıç görünümüne dönün. Dokunulmadığında her görsel kendi kendini anlatan bir döngüde çalışır; bir sürgüye ya da düğmeye bastığınızda kontrol sizde olur. Slayta yeniden geldiğinizde görsel baştan başlar.

**Hesap kutuları:** sürgüler değiştikçe gerçek hesap (× ÷ − +) canlı güncellenir. Öğrencilere önce sonucu tahmin ettirin, sonra sürgüyle doğrulayın.

**Simülasyon laboratuvarı:** bazı slaytların altındaki bağlantılar `Elektronik_ve_Bilgisayar_Simulasyonu.html` dosyasındaki ilgili modülü yeni sekmede açar (ölçek yolculuğu, malzemenin içi, kablonun içi, pilin içi, devre ve Ohm, vücut ve akım, sinyal).

---

## Slayt notları

### Giriş

#### 01. Kapak

**Açılış.** Elinizdeki telefon, kumdan elde edilen silisyumdan, camdan ve bakır gibi metallerden yapılmış cansız bir nesne. Nasıl oluyor da bir mesajı neredeyse anında dünyanın öbür ucuna ulaştırıyor? Bu derslerde, bu sorunun cevabına giden bütün basamakları göreceğiz.

**Akış:** Elektrik → Devre → PCB → Sensör → Bilgisayar. Algoritma ve kodlama sonraki derslerin konusu; sonda yalnızca kapısını aralayacağız.

**Kullanım:** 3B görselleri fareyle sürükleyip çevirebilir, tekerlekle yaklaşabilirsiniz; çift tıklama görünümü sıfırlar. Sürgüler ve düğmeler canlıdır; hesap kutuları anında güncellenir. G tuşu slayt haritasını, P tuşu bu notları açar.

**Arka plan:** artı ve eksi yük arasındaki elektrik alan çizgileri; akan noktalar alanın yönünü gösterir (artıdan eksiye).

#### 02. Fizik nedir?

**Bu slaytta:** fizik doğanın nasıl işlediğini anlamaya çalışan bilimdir: ölçer, sayılarla anlatır, sonucu önceden hesaplar. Fizik doğanın dilidir; matematik bu dilin dilbilgisidir.

**Ölçmek:** şimşeği gördükten sonra gök gürültüsüne kadar geçen süreyi sayarız. Işık 1 km'yi yaklaşık 3,3 mikrosaniyede geçer, yani şimşeği hemen görürüz. Ses 20 °C havada saniyede yaklaşık 343 m gider.

**Hesaplamak:** ses 1 km'yi yaklaşık 3 saniyede geçer (1.000 ÷ 343 ≈ 2,9). Saniyeyi 3'e bölünce kilometreyi buluruz. 2 km'de ses 5,8 s'de gelir; kural 5,8 ÷ 3 ≈ 1,9 km verir: kural yaklaşık bir kestirmedir. **Öngörmek:** aynı kural her fırtınada işler; doğa tutarlıdır.

**Sınıfa soru:** Arada 9 saniye varsa fırtına ne kadar uzakta? **Cevap:** 9 ÷ 3 ≈ 3 km. Düğmelerle 1, 2 ve 3 km'yi deneyin; sınıfla birlikte saniyeleri sayabilirsiniz.

**Şimşek de elektriktir:** bulutta biriken yükler havayı delip yere atlar; dev bir kıvılcımdır.

**Güvenlik:** Gök gürültüsünü duyabiliyorsanız yıldırım size ulaşabilecek kadar yakındır. Saniyeleri kapalı bir binanın ya da aracın içinden sayın; fırtınada açık alanda, tek başına ağaçların altında ya da suda kalınmaz.

**Geçiş:** Fizik sayılarla konuşur; şimdi elektrik dünyasında karşımıza çıkan dört işlemi ve mantığı sırayla görelim.

#### 03. Doğanın matematiği

Elektrik dünyasında dört işlem ve mantık her yerdedir. Animasyon beş sahneyi sırayla gösterir (her biri yaklaşık 10 saniye); altyazı ekrandaki sahneyi anlatır. Hepsini ezberlemeyeceğiz; ne anlattıklarını okuyacağız.

**Toplama:** arka arkaya (seri) bağlanan iki pilin gerilimi toplanır: 1,5 V + 1,5 V = 3,0 V. Üç pil olsaydı 4,5 V olurdu.

**Çıkarma:** akım, iki nokta arasında gerilim farkı varsa akar. Kuşun iki ayağı da aynı teldedir: 10.000 − 10.000 = 0. **Sınıfa soru:** Telin üstündeki kuş 10.000 volta dokunuyorsa neden zarar görmez? **Cevap:** İki ayağı arasında gerilim farkı yoktur.

**Mutlaka ekleyin:** Kuş yalnızca tek bir tele dokunduğu ve başka hiçbir şeye değmediği için güvendedir. Kanadı aynı anda ikinci bir tele ya da direğe değen büyük kuşlar (leylek gibi) bu yüzden çarpılarak ölür. Yerde, merdivende ya da direkte duran bir insan tele dokunursa eli 10.000 V'ta, ayakları 0 V'ta olur: fark 10.000 V. Akım vücuttan toprağa geçer ve bu ölümcüldür. Bunu kesinlikle denemeyin: yüksek gerilim hattına dokunmak bile gerekmez, çok yaklaşıldığında elektrik havadan atlayabilir (ark). Hatlardan, direklerden ve yere düşmüş tellerden uzak durulur.

**Çarpma:** güç = gerilim × akım: 5 V × 3 A = 15 W; şarj aletinin saniyede aktardığı enerji. Görsel zaman ölçekli değildir.

**Bölme:** akım = gerilim ÷ direnç (Ohm yasası): 9 V ÷ 450 Ω = 0,02 A. Direnç iki katına çıkarsa akım yarıya iner. Akış hızlandırılmıştır.

**Mantık:** A kapağın kapalı olup olmadığını (1 = kapalı), B düğmeye basılıp basılmadığını (1 = basıldı), Q makinenin çalışıp çalışmadığını gösterir; Q sonucun, yani çıkışın adıdır. Kapak açıkken düğmeye basılırsa 0 VE 1 = 0, tambur dönmez. VE, yalnızca iki koşul da 1 olduğunda 1 verir. VEYA ve DEĞİL Bilgisayar bölümünde gelecek.

V volt, A amper, W watt, Ω ohm: hepsini birazdan tek tek tanıyacağız.

**Geçiş:** Şimdi tüm yolculuğun haritasına bakalım.

#### 04. Her şey elektrikle

**Bilimsel arka plan.** Moleküldeki atomları bir arada tutan kimyasal bağlar elektriksel etkileşimdir (H₂'de iki proton iki elektronu paylaşır). Retinadaki çubuk ve koni hücreleri ışığı elektrik sinyaline çevirir. Miyelinli sinir liflerinde sinyal Ranvier boğumundan boğumuna atlar ve 100 m/s'yi aşabilir. Kalbin ritmini sinoatriyal düğüm başlatır.

**Sınıfa soru:** Elektrik olmasaydı hangisi çalışmazdı: telefon mu, siz mi? **Cevap:** İkisi de.

#### 05. Köklerden göklere

Beş durağı kısaca okuyun. Kökler atomdur; gökler uydular ve haberleşmedir. Her durak bir öncekine dayanır: elektrik olmadan devre, devre olmadan bilgisayar olmaz.

PCB'yi adıyla söyleyin: baskılı devre kartı; parçaları taşıyan ve bakır yollarla birbirine bağlayan kart.

Bu slayt dersin haritasıdır; uzun bir ders olduğu için gerekirse ikinci derse kaldığınız yerden devam edebilirsiniz (G tuşu ile slayt haritası).

### 1 · Elektrik

#### 06. Atomun içine yolculuk

**Bu slaytta:** Yolculuk kendiliğinden oynar ve tekrarlanır: kablo (10⁻² m), tek bir bakır tel (10⁻⁴ m), kristal taneleri (10⁻⁶ m), atom dizisi (10⁻⁹ m), tek atom (10⁻¹⁰ m), çekirdek (10⁻¹⁴ m). Alttaki cümle ekrandaki durağı anlatır; sağdaki çubuk üssü gösterir.

**Okuma:** 10⁻⁴ m = 0,0001 m: 1 rakamı virgülden sonraki 4. basamaktadır. Üs bir azalınca boyut 10 kat küçülür. Bir saç telinin kalınlığına yüz binlerce atom sığar.

**Atom dizisi:** Bakır küreler, en dıştaki elektronunu ortak kullanıma bırakmış bakır atomlarıdır (bakır iyonu). Mavi noktalar serbest elektronlardır (elektron denizi). Ayrıntısı “Elektronlar atomdan nasıl kopar?” slaytında.

**Bakır atomu:** 29 proton, çoğunlukla 34 nötron (bakır-63), 29 elektron; katmanlara 2, 8, 18 ve 1 elektron dağılır (iç elektronlar 2 + 8 + 18 = 28). Çekirdek atomdan on binlerce kat küçüktür.

**Sınıfa soru:** Atom bir futbol stadyumu kadar olsaydı çekirdek ne kadar olurdu? **Cevap:** Ortadaki bir nohut kadar; gerisi elektronların bulunabileceği boşluktur.

**Sınıfa soru:** Çekirdekteki protonlar birbirini itiyorsa çekirdek neden dağılmaz? **Cevap:** Güçlü nükleer kuvvet proton ve nötronları bir arada tutar; çekirdek boyutunda elektriksel itmeden çok daha güçlüdür. Ayrıntısı lisede.

**Geçiş:** Şimdi atomu sade çizimle ve gerçeğe daha yakın bulutla karşılaştıralım.

#### 07. Atom ve elektron

**Bu slaytta:** Önce halkalı basit model (Bohr, 1913), sonra olasılık bulutu kendiliğinden sırayla gösterilir. Karbon: 6 proton, 6 nötron, 6 elektron; proton ve elektron sayısı eşit olduğu için atom yüksüzdür.

**Modelin sınırı:** Kuantum mekaniğine göre elektronun belirli bir yörüngesi yoktur; bulunma olasılığı çekirdeğin çevresinde bulut gibi dağılır. Bulutun yoğun olduğu yerde elektronu bulma ihtimali yüksektir.

**Proton:** Sayısı atomun kimliğidir: karbonda 6, bakırda 29. **Elektron:** protondan yaklaşık 1.836 kat hafiftir; yükü −1,602 × 10⁻¹⁹ C (C: coulomb, yükün birimi); metallerde elektriği taşıyan odur.

**1s, 2s, 2p ne demek?** Baştaki sayı katman, harf bölgenin biçimidir: s küre, p iki loblu halter. Üstteki sayı elektron sayısıdır: 1s² 2s² 2p² → 2 + 2 + 2 = 6. İki 2p elektronu ayrı iki p bölgesine yerleşir.

**Sınıfa soru:** Bir elektronu görebilir miyiz? **Cevap:** Hayır; çok küçüktür ve görmek için kullanacağımız ışık bile onu yerinden oynatır. Bulut, nerede bulunabileceğinin haritasıdır.

**Geçiş:** Yüklü parçacıklar birbirine nasıl kuvvet uygular? Bunu bir deneyle görelim.

#### 08. Elektrik nedir? Yük ve kuvvet

**Bu slaytta:** Önce zıt yüklü, sonra aynı yüklü küreler kendiliğinden yaklaşıp uzaklaşır. Cam ayaklar yalıtkandır; yük küreden kaçamaz. Kaydırıcıya dokunulursa mesafe elle ayarlanır (4 cm’de kuvvet 1 birim; 2 cm’de 4 birim; 8 cm’de 0,25 birim).

**Coulomb yasası:** İki yük arasındaki kuvvet yüklerin çarpımıyla doğru, uzaklığın karesiyle ters orantılıdır (F = k × q₁ × q₂ ÷ d²). Mesafe yarıya inince kuvvet 4 katına, üçte birine inince 9 katına çıkar. Zıt yükler çeker, aynı yükler iter.

**Elektrik:** Yüklerin itip çekmesinden doğan olayların hepsi; yükler bir yöne akınca akım olur. Yük çevresindeki boşluğu etkiler: elektrik alanı. Alan çizgileri artıdan eksiye gider ve sıklaştıkça kuvvet büyür.

**Günlük hayat:** Saça sürtülen tarak kâğıt parçalarını çeker; kazağı çıkarırken duyulan çıtırtılar küçük kıvılcımlardır. Sürtünmeyle elektron bir cisimden ötekine geçince cisim yüklenir. 1 coulomb yaklaşık 6,24 milyar milyar elektronun yüküdür.

**Sınıfa soru:** Elektronlar neden çekirdeğin üzerine düşmez? **Cevap:** Elektron belirli bir noktada duramaz, bulut gibi yayılır; ayrıntısı lisede.

**Geçiş:** Peki elektronlar atomdan nasıl kopar?

#### 09. Statik elektrik: sürtünme, kıvılcım, yıldırım

**Bu slaytta:** animasyon beş görünümü kendi kendine sırayla gezer (her biri yaklaşık 8 saniye): sürtünme, çekim, nem, kıvılcım, şimşek. Ortak fikir: yük önce ayrılır, sonra bir iletken yol bulunca boşalır. Her şey ölçeksiz, basitleştirilmiş bir modeldir.

**Bağlantı:** “Yük ve kuvvet” slaytında tarak ile kâğıt parçalarını, kazağı çıkarırken duyulan çıtırtıyı söylemiştik; burası nedenini açıklar. Aynı yükler iter, zıt yükler çeker; kuvvet uzaklıkla hızla azalır; yük birimi coulomb.

**1 · Sürtünme:** Cisimler çoğunlukla yüksüzdür (her atomda eşit sayıda proton ve elektron). İki madde sürtülünce elektronlarını daha gevşek tutan madde ötekine elektron verir. Protonlar çekirdekte sıkıca bağlıdır; yer değiştiren hep elektrondur. Saç ile plastik balonda saç elektron verir (artı olur), balon alır (eksi olur). Yük yoktan var olmaz, yok olmaz: bir yerde eksi fazlalaşmışsa başka yerde o kadar artı fazlalaşmıştır (yükün korunumu). Hangi maddenin elektronu ne kadar kolay verdiğini gösteren sıraya triboelektrik dizi denir; sonuç nem ve yüzey temizliğine göre değişir.

**2 · Çekim:** Eksi yüklü balon yüksüz kâğıttaki elektronları kendinden azıcık uzağa iter: balona bakan yüz artı, uzak yüz eksi olur (kutuplanma). Kâğıdın toplam yükü hâlâ sıfırdır. Kuvvet uzaklıkla hızla azaldığı için yakın artı yük uzak eksi yükten daha güçlü çekilir; net kuvvet balona doğrudur. Duvara yapışan balon da aynıdır. Kâğıt balona değince eksi yük alıp bazen fırlayıp uzaklaşır: aynı işaretli yükler iter.

**3 · Nem:** Metalde elektronlar serbesttir, yük hemen toprağa kaçar. Plastik, saç, kuru kâğıtta yük ayrıldığı yerde kalır; “statik” adı buradan gelir. Nemli havada yüzeyde görünmeyen ince bir su tabakası oluşur; içindeki erimiş tuzlar az da olsa iletir ve yük bu tabakadan havaya kaçar. Kışın hava kuru olduğu için kazak çıtırtısı ve kapı kolundaki kıvılcım daha sık görülür. Elektronikte aynı olaya ESD (elektrostatik boşalma) denir; küçük bir kıvılcım bile entegreleri bozabilir, bu yüzden atölyede antistatik bileklik kullanılır.

**4 · Kıvılcım:** Elektrik alanı E = V ÷ d. Kuru hava yaklaşık 3.000 V/mm alanda iletken olur (serbest elektronlar hızlanır, çığ oluşur). 3 mm aralıkta yaklaşık 3.000 × 3 ≈ 9.000 V gerekir; bu bir kestirmedir, gerçek değer aralığa, neme ve uç şekline bağlıdır (sivri uçta hava daha düşük gerilimde iletken olur). Binlerce volt neden zararsız? Vücutta biriken yük çok azdır (yaklaşık bir mikrocoulomb mertebesi) ve boşalma saniyenin milyonda biri gibi çok kısa sürer; toplam enerji milijoule düzeyindedir. Tehlikeyi gerilim tek başına değil yük miktarı ve süre belirler. Benzetme: yüksekten düşen tek bir damla ile aynı yükseklikten akan nehir. Prizdeki 230 V bu değerden çok düşüktür ama ölümcüldür, çünkü orada yük sürekli akar.

**5 · Şimşek:** Fırtına bulutunda buz kristalleri ve iri buz taneleri çarpışır ve yük ayrılır: üst kısım artı, alt kısım eksi olur. Bulut altındaki yer artı yüklenir. Bulut ile yer arasındaki gerilim milyonlarca volta çıkınca hava dayanamaz. Önce zayıf, dallı bir iletken yol basamak basamak yere ilerler (basamaklı öncü); yol tamamlanınca yerden buluta doğru çok büyük bir akım geçer, ışığı gördüğümüz parlak ana atım budur. Tipik tepe akımı yaklaşık 30.000 A kadardır ve çok kısa sürer; toplam yük birkaç ile yaklaşık yirmi coulomb arasındadır. Kapı kolu kıvılcımında yük bir coulombun milyonda biri kadar olduğundan yıldırım milyonlarca kat büyük bir boşalmadır; bu yüzden ölümcüldür.

**Gök gürültüsü:** Akımın geçtiği ince kanaldaki hava çok kısa sürede on binlerce dereceye (kabaca 30.000 °C, Güneş yüzeyinin yaklaşık beş katı) ısınır ve patlarcasına genişler; bu basınç dalgası ses olarak ulaşır. Işık neredeyse anında gelir, ses saniyede yaklaşık 343 m ilerler: 1.000 ÷ 343 ≈ 2,9 s, yani kabaca her 3 saniye 1 km.

**Sınıfa soru 1:** Balonu saça sürttükten sonra saç telleri balona doğru kalkar. Neden? **Cevap:** Saç elektron verip artı, balon alıp eksi yüklü olur; zıt yükler çeker.

**Sınıfa soru 2:** Kışın kazağı çıkarırken çıtırtı var, yazın yok. Neden? **Cevap:** Yazın nemli havada yüzeydeki su tabakası yükü havaya kaçırır, birikmez; kışın kuru havada yük kalır ve boşalırken çıtırtı yapar.

**Güvenlik:** Fırtınada açık alanda, yüksek ağaçların altında, havuzda ya da denizde durulmaz; kapalı bir binaya ya da metal gövdeli arabaya sığınılır. Şimşek ile gürültü arası 30 saniyeden kısaysa tehlike yakındır. Balon, saç ve kâğıt gösterileri sınıfta güvenlidir. Prizle ya da yüksek gerilim üreten düzeneklerle statik elektrik denenmez; kıvılcım ve yıldırım yalnızca anlatılır.

**Geçiş:** Burada elektronların bir cisimden ötekine geçtiğini gördük; sonraki slaytta elektronların atomdan nasıl koptuğuna ve metalde serbest dolaşan elektronların akımı nasıl taşıdığına bakacağız.

#### 10. Elektronlar atomdan nasıl kopar?

**Bu slaytta:** Atomlar kendiliğinden yaklaşır ve ayrılır. Bakırın en dıştaki tek elektronu çekirdeğe zayıf bağlıdır: 28 iç elektron 29 protonun çekimini büyük ölçüde perdeler (29 − 28 = 1, basit model). Atomlar yaklaşınca dış elektron bulutları üst üste biner; elektron komşuya geçer ve bütün kristale aittir.

**İyon:** Elektron kaybeden atom artı (Cu⁺) yüklü olur; buna iyon denir. Her serbest elektronun karşılığında geride bir artı iyon kaldığı için metal yüksüzdür. Serbest elektronlara elektron denizi denir; bu bağa metalik bağ.

**Sayı:** 1 cm³ bakırda yaklaşık 8,5 × 10²² serbest elektron vardır. Diğer yollar: sürtünme (statik elektrik), ışık (fotoelektrik olay) ve ısı da elektron koparabilir.

**Sınıfa soru:** Serbest elektronlar kristalden neden kaçmaz? **Cevap:** Artı yüklü iyonlar onları içeride tutar; dışarı çıkmak için ek enerji gerekir.

#### 11. İletken, yalıtkan, yarı iletken

**Bu slaytta:** animasyon kendi kendine üç malzemeyi sırayla gösterir: bakır, plastik, silisyum. Her birinde önce gerilim yok, sonra gerilim var; silisyumda sonunda ısıtılır. Mavi noktalar elektron, turuncu küreler bakır iyonu (Cu⁺), turuncu halkalar boşluk (bağdaki eksik elektron). Gösterimde kayma hızı abartılmıştır.

**Tabloyu okuyun (periyodik tablo ayrı slaytta):** solda ve ortada metaller, sağ üstte ametaller, aralarında yarı metaller. Hidrojen sol üstte durur ama ametaldir. Soy gazlar bağ kurmaz, onlar da yalıtkandır. Bu derslerde geçenler: H, Li, B, C, N, O, Na, Al, Si, P, S, Cl, K, Cu, Zn, Ge, Ag, Au.

**Metal · iletken:** dış katmanda az elektron vardır ve kolayca serbest kalır (bakır, alüminyum, gümüş, altın); elektron denizi iletir. **Ametal · çoğunlukla yalıtkan:** elektronlar kovalent bağlarda kilitli (hidrojen, oksijen, azot, kükürt). Karbon istisnadır: elmas yalıtkan, kalem ucundaki grafit iletkendir. **Yarı metal · yarı iletken:** ısıtılınca bağından kopan elektron artar, daha iyi iletir: silisyum ve germanyum. Bilgisayarlar burada doğdu.

**Turuncu halkalar:** oda sıcaklığında bile ısı silisyumda çok az elektronu bağından koparır. Kopan elektronun bağda bıraktığı eksiğe boşluk denir; komşu bağdaki elektron atlayınca boşluk yer değiştirir. Ayrıntısı “Yarı iletken nedir?” slaytında.

**Sınıfa soru:** Kabloların dışı neden plastik? **Cevap:** Kablo plastiği (çoğunlukla PVC) karbon, hidrojen ve klor atomlarından kurulu zincirlerdir; hepsi ametaldir, serbest elektron yoktur. İçerideki bakır akımı taşır, plastik bizi korur.

**Sınıfa soru:** Kurşun kalem ucu neden iletir? **Cevap:** Grafitte her karbon yalnızca üç komşusuyla bağ kurar; dördüncü elektron katmanlar boyunca serbest dolaşır. Elmasta dördü de bağdadır.

**Geçiş:** Tırnak hangi gruba giriyor? Bir sonraki slaytta bakalım.

#### 12. Tırnağınız neden iletmez?

**Bu slaytta:** animasyon önce kuru, sonra ıslak keratini gösterir. Kuru: elektronlar bağlarda kilitli, serbest yük yok, ampermetrenin ibresi sıfırda. Islak: terdeki tuz suda Na⁺ (turuncu) ve Cl⁻ (mavi) iyonlarına ayrılır; su filmi iki elektrodu birleştirince Na⁺ eksi elektroda, Cl⁻ artı elektroda gider ve ibre sapar. Su moleküllerinin artı ucu (H) eksi elektroda, eksi ucu (O) artı elektroda döner; H–O–H açısı 104,5°dir.

**Keratin:** tırnak ve saç keratindir: karbon, hidrojen, oksijen, azot ve kükürt; beşi de ametaldir. İki α-sarmal zinciri sarı S–S (disülfit) köprüsü bağlar; tırnağa sertliğini verir. Keratin element değil moleküldür. (Kitin böceklerin dış iskeletinde ve mantarlarda bulunur.)

**Önemli uyarı:** Bu bilgi asla “tırnakla elektriğe dokunmak güvenlidir” anlamına gelmez. Tırnak incedir, üstü nemlidir, hemen altında deri vardır; iyon taşıyan su akıma yol açar.

**Sınıfa soru:** Saf su elektriği iletir mi? **Cevap:** Çok az. Suyu iletken yapan, içinde çözünmüş tuzlardır. Dokunmatik ekran slaytında yeniden karşımıza çıkacak.

**Geçiş:** Yalıtkan, iletken, yarı iletken tamam; şimdi yarı iletkenin içine, katkılamaya girelim.

#### 13. Akım nedir?

**Bu slaytta:** akım = yük ÷ zaman. Animasyon kendi kendine çalışır: önce akım yok (elektronlar rastgele hareket eder, kesitten net geçiş olmaz), sonra 1 A, sonra 2 A. Sayaç her tur başında sıfırlanır; altyazı ve formül anlık akıma göre değişir.

**Tanım:** 1 amper = saniyede 1 coulomb yük. Bir elektronun yükü 1,602 × 10⁻¹⁹ C olduğu için 1 C ÷ (1,602 × 10⁻¹⁹ C) ≈ 6,24 × 10¹⁸ elektron eder (yaklaşık 6,24 milyar milyar). Sayaçtaki mavi noktalar çok küçültülmüştür.

**Benzetme:** bir köprüden saniyede geçen araç sayısı. Ölçtüğümüz tek bir aracın hızı değil, bir saniyede geçen araç sayısıdır.

**Yön:** elektronlar eksiden artıya gider; akımın yönü tarihsel bir anlaşmayla artıdan eksiye çizilir (bakır renkli ok). Görselde ortak kayma abartılmıştır; rastgele hareket gerçekte çok daha hızlıdır (bakırda saniyede yaklaşık 1.600 km).

**Günlük hayat:** telefon şarjı 1–3 A, LED 0,02 A, su ısıtıcısı yaklaşık 9 A.

**Geçiş:** Elektronları hangi etki harekete geçiriyor? Sıradaki slayt: gerilim.

#### 14. Enerji nedir? Güneş'ten lambaya

**Bu slaytta:** Güneş'ten çıkan ışık denizi ısıtır, su buharlaşır, bulut oluşur ve yağmur yüksekteki baraj gölünü doldurur. Altta enerjinin o anki biçimi yazar: güneş ışığı, ısı ve buharlaşma, potansiyel enerji.

**Enerji nedir?** Enerji, iş yapabilme yeteneğidir: hareket ettirmek, ısıtmak, aydınlatmak enerji ister. Yoktan var edilemez, yok edilemez; yalnızca biçim değiştirir (enerjinin korunumu; Mayer, Joule ve Helmholtz, 1840'lar).

**Joule:** Birimi joule (J). 100 g'lık bir elmayı 1 m yukarı kaldırmak yaklaşık 1 J enerji ister (0,1 kg × 9,8 m/s² × 1 m ≈ 1 J). Bu enerjilerin okuldaki adları: yükseklik (potansiyel) enerjisi ve hareket (kinetik) enerjisi.

**Zincir (ilk yarı):** Güneş'in çekirdeğindeki füzyon ışık üretir → ışık denizi ısıtır, su buharlaşır → yağmur yüksek bir barajı doldurur (yükseklik enerjisi).

**Sınıfa soru:** Barajdaki suyun enerjisi aslında nereden gelir? **Cevap:** Güneş'ten; Güneş suyu buharlaştırıp yükseğe taşımıştır.

**Bu slaytta:** Baraj gölünden düşen su türbini döndürür (kinetik enerji), jeneratör elektrik üretir (Faraday, 1831), elektrik hatla eve gelir ve lamba onu ışığa ve ısıya çevirir.

**Zincir (ikinci yarı):** su türbini döndürür (hareket enerjisi) → jeneratörde dönen mıknatıs bobinde akım oluşturur (Faraday, 1831) → elektrik evimize gelir → lamba onu ışığa ve ısıya çevirir.

**Jeneratör:** Santralde bir mıknatıs, tel sargının (bobinin) içinde döner. Değişen manyetik etki teldeki elektronları bir ileri bir geri iter; prizdeki alternatif akım böyle doğar. Güneş paneli dışında çoğu santral bu ilkeyle çalışır.

**“Çoğu zaman” dememizin nedeni:** nükleer ve jeotermal santrallerin enerjisi Güneş'ten gelmez; atom çekirdeğinden ve yerin içindeki ısıdan gelir.

**Elektrik enerjisi:** yükler gerilim farkı boyunca ilerlerken kazandıkları enerjidir. Her coulomb yük, gerilim kadar joule taşır (bir sonraki konu).

**Sınıfa soru:** Lamba ışık verirken enerji kayboluyor mu? **Cevap:** Hayır. Elektrik enerjisi ışığa ve ısıya dönüşür; ışık da duvarlarda ve eşyalarda soğurulunca ısıya döner. Sonunda enerjinin neredeyse tamamı ısı olarak odada kalır; hiçbiri yok olmaz.

**Geçiş:** Elektriğin bu yolculuğunu bir de santralden prize doğru, gerilim değerleriyle inceleyeceğiz.

#### 15. Gerilim nedir?

**Bu slaytta:** animasyon kendi kendine çalışır: gerilim yokken elektronlar yalnızca rastgele hareket eder; sonra gerilim 12 V'a kadar yükselir ve ortak kayma hızlanır; sonra azalır. Gerilim yoksa net akış yoktur.

**Önemli fikir:** Elektronlar her zaman hareket eder: oda sıcaklığında rastgele, çok hızlı (bakırda saniyede yaklaşık 1.600 km) ama her yöne eşit. Gerilim bu rastgele harekete küçük bir ortak kayma ekler; akım bu kaymadır.

**Gri oklar:** elektrik alanını gösterir: artı yükü iteceği yön, yani artıdan eksiye. Elektronlar eksi yüklü olduğu için okların tersine, artı uca doğru kayar. Görseldeki kayma hızı abartılıdır.

**Hesap:** tel direnci 10 Ω varsayıldı: I = V ÷ R. Gerçek sürüklenme hızı v = I ÷ (n · e · A); n ≈ 8,5 × 10²⁸ /m³, e = 1,6 × 10⁻¹⁹ C, A = 1 mm². Bu telde 1 amperde yaklaşık 0,07 mm/s.

**Volt:** 1 V = 1 J ÷ 1 C: pil her coulomb yüke 9 V'ta 9 J, 1,5 V'ta 1,5 J verir. Benzetme: su, iki nokta arasında yükseklik farkı varsa akar; yük de gerilim varsa hareket eder.

**Sınıfa soru:** Gerilimi iki katına çıkarırsak akım ne olur? **Cevap:** Direnç aynı kalırsa akım da iki katına çıkar.

**Geçiş:** Aynı gerilimde bazı teller daha az akım geçirir. Neden? Sıradaki slayt: direnç.

#### 16. Elektronlar bir yöne, akım öbür yöne

**Bu slaytta:** Aynı devrede dört görünüm sırayla gösterilir: elektronların hareketi, elektrik alanı ile akım yönü, Franklin'in tahmini ve hepsi birlikte. Sorulacak soru: hangisi hangi yöne gider?

**Üç ayrı şey:** (1) Elektronların gerçek hareketi: eksi yüklüdürler, pilin eksi ucundan artı ucuna giderler. (2) Elektrik alanı: artı bir deneme yükünün itileceği yönü gösterir, yani artıdan eksiye. (3) Akım yönü: alanla aynı yön, artıdan eksiye. Elektronlar eksi olduğu için alana ters yönde itilir; bu yüzden elektronlar akım yönünün tersine gider. İki yön birbiriyle çelişmez; aynı olayı iki farklı şeyi izleyerek anlatırlar.

**“Hata kimin?”** Sık duyulan “Coulomb'un hatası” doğru değil. Coulomb (1785) yalnızca iki yük arasındaki kuvvetin yasasını buldu. Artı ve eksi adlarını 1747'de Benjamin Franklin verdi. O zamanlar elektriğin, cisimlerden cisimlere akan tek bir akışkan olduğu sanılıyordu. Franklin camı ipeğe sürtünce camda biriken yüke “artı” dedi ve akışkanın artıdan eksiye aktığını varsaydı: iki seçenekten birini seçti. Elektronu 1897'de J. J. Thomson buldu; metallerde akan şeyin eksi yüklü olduğu ortaya çıktı. Yani Franklin'in tahmini bu durumda tutmadı. Ama o zamana kadar bütün kitaplar, formüller ve şemalar bu yönle yazılmıştı. Hata kimseye ait değil; sadece yarım bilgiyle atılmış bir adımdı.

**Franklin'in tahmini görünümü:** metalde artı yükler sağa gitse de, eksi yükler sola gitse de devrenin dışından bakınca aynı şey olur: ampermetre aynı değeri okur, lamba aynı yanar. Bu yüzden iki tarif de devre için eşdeğerdir.

**Hızlar:** Görseldeki elektron hızı abartılıdır; gerçek sürüklenme hızı çok yavaştır. Gri oklardaki dalga, itişin (alanın) kablo boyunca çok hızlı yayıldığını gösterir.

**Sınıfa soru:** Elektronlar yavaş yürüyorsa lamba nasıl hemen yanıyor? **Cevap:** Kablo baştan sona elektronla doludur; itiş (elektrik alanı) kablo boyunca çok hızlı yayılır ve bütün elektronlar neredeyse aynı anda kaymaya başlar. Hızlı olan elektronlar değil, itiştir.

**Geçiş:** Sırada, madem iki yön de doğru, neden hâlâ eski yönü kullandığımız var.

#### 17. Neden hâlâ eski yönü kullanıyoruz?

Önceki slaytı özetleyin: üç şey var, hiçbiri yanlış değil. “Franklin yanlış yaptı” demek yerine “o zaman elektron bilinmiyordu” deyin. Kısa bir soru sorun: “Bir kapıdan sağa giden eksi yük ile sola giden artı yük aynı şey midir?” Cevap: Kapının öbür tarafındaki yük sayısı iki durumda da aynı değişir; devre için aynıdırlar.

**Teknik not:** metallerde taşıyıcı elektronlardır; elektrolitlerde (tuzlu su, pil içi) hem artı hem eksi iyonlar taşır; yarı iletkenlerde elektron ve boşluk birlikte taşır; plazmada ikisi birden. “Gerçek yön” dediğimiz şey bu yüzden maddeye göre değişir; uzlaşım yön hepsi için ortak bir dildir.

Bu slaytı sonraki konulara bağlayın: diyot ve LED sembolündeki ok akımın geçebildiği (artıdan eksiye) yönü gösterir; LED'in uzun bacağı artı uçtur.

#### 18. Pilin gerilimi nereden gelir?

**Bu slaytta:** Bir AA pil dönerek durur, sonra çeyrek kesiti açılır. Dıştan içe doğru: çelik gövde (artı toplayıcı), mangan dioksit, ayırıcı, çinko tozu jeli ve ortada pirinç toplayıcı çivi (eksi ucu). Boyutlar: 50,5 mm × Ø 14,5 mm.

**Ana fikir:** Pil elektrik depolamaz. Kimyasal enerji depolar ve gerektiğinde elektrik enerjisine çevirir.

**Alkalin pil (AA):** eksi tarafta çinko tozu jeli, artı tarafta mangan dioksit, aralarında iyonları geçiren bir ayırıcı ve potasyum hidroksit elektroliti vardır. Çinko elektron vermeye isteklidir: pilin eksi ucu. Mangan dioksit elektron almaya isteklidir: pilin artı ucu. Bu istek farkı 1,5 V'luk itişi yaratır.

**Neden 1,5 V?** Bu iki maddenin kimyası bu kadar itiş üretir. Daha yüksek gerilim için hücreler arka arkaya dizilir.

**Tarih:** 1800'de Volta çinko ve bakır diskleri tuzlu suya batırılmış kartonlarla üst üste dizdi: ilk pil.

**Bu slaytta:** Pil lambaya bağlanır, lamba yanar. Büyüteçte kesit görünür: çinko (gri) elektron verip çinko oksite (beyaz) dönüşür, hidroksit iyonları ayırıcıdan geçer, elektronlar dış devreden dolaşır. Çubuk kalan çinkoyu gösterir (hızlandırılmış).

**Tepkime:** Zn + 2 OH⁻ → ZnO + H₂O + 2 e⁻. Çinko elektron verir; elektronlar dış devreden lambanın içinden geçip mangan dioksit tarafına varır.

**Devre:** Ayırıcı elektronu geçirmez, yalnız iyonlar geçer; bu yüzden elektronlar dış yoldan, lambanın içinden dolaşmak zorundadır.

**Biten pil:** Elektronlar tükenmez; tepkimeye girecek çinko tükenir.

**Sınıfa soru:** Şarj edilebilir pil şarj olurken ne olur? **Cevap:** Dışarıdan verilen elektrik, kimyasal tepkimeyi tersine çevirir; enerji yeniden kimyasal olarak depolanır.

**Bu slaytta:** 9 V'luk pilin kılıfı kalkar, içindeki altı küçük hücre sıraya dizilir ve birer birer 1,5 V eklenir; toplam 9 V olur.

**Neden?** Bu kimya hücre başına 1,5 V üretir. Daha yüksek gerilim için hücreler arka arkaya dizilir: 6 × 1,5 V = 9 V.

**Gözlem:** Bir hücrenin artısı sonrakinin eksisine bağlanır; böylece itişler üst üste biner.

**Geçiş:** Sırada devreden geçen akımı ve direnci konuşacağız.

#### 19. Direnç nedir?

**Bu slaytta:** animasyon kendi kendine çalışır: önce tel uzar (direnç artar, daha çok çarpışma, daha çok ısınma), sonra kısalır; sonra kesit büyür ve küçülür. Çarpışmalar turuncu parlamalarla görünür; çarpılan iyon kızarır, komşularına ısı yayılır. Isınma çubukları direnci izler. Altyazı hangi değişikliğin gösterildiğini söyler.

**Neden direnç?** Kristaldeki iyonlar sıcaklıkla titreşir; elektronlar bu titreşimlere çarparak yön değiştirir. Uzun tel daha çok çarpışma demektir (direnç artar); kalın tel elektronlara daha çok yol açar (direnç azalır). Direnç ∝ uzunluk ÷ kesit.

**Kesit:** telin kesik yüzü. Çapı 2 katına çıkan telin kesit alanı 2 × 2 = 4 katına çıkar. Aynı akım ince telden geçerken elektronlar daha hızlı kayar.

**Isı:** çarpışmalarda elektronların kazandığı enerji iyonlara geçer ve metal ısınır. Isıtıcılar bunu bilerek kullanır; kablolar bu yüzden yeterince kalın seçilir.

**Birim ve malzeme:** Ohm (Ω): LED devresinde birkaç yüz Ω, kuru deride yaklaşık 100.000 Ω. Direnç telin cinsine de bağlıdır (R = ρ × uzunluk ÷ kesit alanı); nikel-krom tel bakırdan yaklaşık 65 kat fazla direnç gösterir, ütü ve ısıtıcılarda bu yüzden kullanılır.

**Sınıfa soru:** Su ısıtıcısı gibi güçlü cihazlar neden ince bir uzatma kablosuna takılmaz? **Cevap:** Güçlü cihaz büyük akım çeker; ince kablonun direnci yüksektir, ısı ise akımın karesiyle artar (P = I² × R). Kablo aşırı ısınır, kılıfı erir, yangın çıkabilir. Bunu denemeyiz.

**Geçiş:** Şimdiye kadar akım tek yönlüydü. Sıradaki slayt: prizdeki akım nasıl farklı?

#### 20. Ohm yasası: doğanın bölme işlemi

**Bu slaytta:** Güç kaynağı, direnç ve ampermetre birlikte çalışır. Önce gerilim yarıya iner ve akım yarıya iner; sonra direnç iki katına çıkar ve akım yine yarıya iner. İbre biraz aşıp yerine oturur, gerçek bir ampermetre gibi. Sürgüleri siz oynatırsanız gösterim sizi izler.

**Ohm yasası:** I = V ÷ R. Aynı ilişki V = I × R ve R = V ÷ I olarak da yazılır. Örnek: 9 V ÷ 450 Ω = 0,02 A = 20 mA. Direnci ikiye katlayın (900 Ω): akım yarıya iner (10 mA).

**Harfler:** I akım (amper), V gerilim (volt), R direnç (ohm). I, Fransızca intensité du courant (akım şiddeti) sözünden gelir. 1 A = 1.000 mA; bu yüzden 0,02 A = 20 mA.

**Sınır:** Ohm yasası metal teller ve dirençler için, sıcaklık değişmedikçe geçerlidir. LED ve diyot gibi yarı iletkenler bu düz orantıya uymaz; LED belli bir eşik geriliminden sonra yanar. Bu yüzden LED'li devrede LED'in yaklaşık 2 V'unu ayrıca çıkarırız.

**Renk bantları:** Dirençler yalnızca hazır değerlerde üretilir. Görseldeki direnç, sürgüdeki değere en yakın hazır değerin renklerini taşır (450 Ω için 470 Ω). Hesap sürgüdeki değerle yapılır; renk kodunu ilerideki "Direnci yakından tanıyalım" slaytında okuyacağız. Mavi noktalar yavaşlatılmış elektronlardır.

**Sınıfa soru:** Devrede lamba ya da direnç gibi bir yük hiç olmasaydı ne olurdu (yalnızca düşünce deneyi)? **Cevap:** R çok küçülür, I = V ÷ R çok büyür. Kabloların ve pilin küçücük direnci bu büyük akımla ısınır: buna kısa devre denir. Direnç, akımı kontrol etmenin aracıdır.

**Öğrencilere:** Sonucu önce tahmin ettirin, sonra sürgüyle ve ampermetreyle doğrulayın.

**Geçiş:** Sırada akımın neden bir döngü istediği var.

#### 21. Güç ve enerji: doğanın çarpma işlemi

**Bu slaytta:** Eski tip (Ferraris) elektrik sayacına bir cihaz bağlıdır. Cihaz değiştikçe disk hızı değişir: LED ampul 9 W, eski tip ampul 60 W, ısıtıcı 2.000 W. Düğmelerle cihazı siz seçebilirsiniz; disk ibre gibi yavaşça hızlanır ve yavaşlar (eylemsizlik).

**Güç:** P = V × I. Watt: saniyede aktarılan enerji. 1 W = saniyede 1 joule. Eski tip ampulde 230 V × 0,26 A ≈ 60 W.

**Neden ×?** 9 V'luk pil geçen her 1 C'a 9 J verir. Saniyede 2 C (2 A) geçerse 2 × 9 = 18 J/s = 18 W.

**Sınıfa soru:** Isıtıcı 2.000 W, LED 9 W: disk hangisinde daha hızlı döner ve yaklaşık kaç kat? **Cevap:** Isıtıcıda; 2.000 ÷ 9 ≈ 220 kat.

**Bu slaytta:** Aynı sayaçta kWh göstergesi sayar. Gösterim hızlandırılmıştır: 1 saniye = 1 saat. Süre yazısı kaç saat geçtiğini, formül satırı o ana kadar harcanan enerjiyi gösterir.

**E = P × t:** Faturadaki kilovatsaat, 1.000 watt'lık bir cihazın bir saatte harcadığı enerjidir. Örnek: eski tip ampul 60 W × 6 saat = 360 Wh = 0,36 kWh.

**Sınıfa soru:** 2.000 W'lık ısıtıcı 3 saat çalışırsa kaç kWh harcar? **Cevap:** 2.000 W × 3 h = 6.000 Wh = 6 kWh.

**Geçiş:** Bu enerji eve nasıl geliyor? Santralden prize yolculuğa bakalım.

#### 22. Akkor lamba nasıl çalışır?

**Bu slaytta:** animasyon beş görünümü sırayla kendi kendine gezer: lamba kesiti, tel, çarpışma, renk, karşılaştırma. Mavi noktalar elektrondur ve yavaşlatılmıştır; tel, iyonlar ve elektronlar okunsun diye çok büyütülmüştür (ölçekli değil). Sıcaklıklar modelden alınmış yaklaşık değerlerdir.

**Bağlantı:** “Direnç nedir?” slaydında elektronların metalin titreyen iyonlarına çarptığını ve enerjilerinin ısıya dönüştüğünü gördük. “Güç ve enerji” slaydında 60 W’lık eski tip (akkor, telli) ampulle 9 W’lık LED ampulü karşılaştırdık. Bu slayt aynı şeyin ampulün içinde nasıl göründüğünü gösterir. LED’in nasıl ışık verdiğini bu derslerde daha sonra göreceğiz; burada LED’in içine girmiyoruz.

**Kısa tarih:** 1879’da Joseph Swan (İngiltere) ve Thomas Edison (ABD) kullanışlı elektrik ampulünü geliştirdi; ilk ampullerin teli karbondu. Tungsten tel 1900’lerin başında yaygınlaştı.

**Lamba kesiti:** Cam balon teli korur. Balonun içi argon ve azot gazı karışımıyla doludur (bazı küçük ampullerde vakum). Filaman, yani tungsten tel çok ince ve bükülü bükülü sarılmıştır. Destek telleri filamanı havada tutar; cam ayak besleme tellerini taşır ve balonu tabana bağlar; iki besleme teli vidalı tabanın iki kontağına (kontak ucu ve vida yanı) ayrı ayrı bağlıdır ve birbirine değmez. Akım bir kontaktan girer, filamandan geçer, öbüründen çıkar: her devrede olduğu gibi bir halka. Evdeki akım saniyede 100 kez yön değiştirir (alternatif akım) ama telli ampul için yön önemsizdir.

**Tel neden ısınır?** Filamanın direnci büyüktür. P = V × I = I × I × R. 60 W’lık ampul için I = 60 ÷ 230 ≈ 0,26 A; sıcakken R = 230 ÷ 0,26 ≈ 880 Ω; ısı gücü 0,26 × 0,26 × 880 ≈ 60 W. Elektronlar tungsten iyonlarına çarpar, enerjilerinin bir kısmı iyonlara geçer ve iyonlar daha şiddetli titreşir: telin daha sıcak olması budur. Akım büyükse çarpışma ve ısı da büyüktür.

**Kalın kablo neden parlamaz?** Aynı akım (0,26 A) hem telden hem kablodan geçer, çünkü devre bir halkadır; akım hiçbir yerde azalmaz. Fark dirençtedir: bir metrelik, 0,75 mm² kesitli bakır kablonun direnci yaklaşık 0,02 Ω’dur, ısı gücü yaklaşık 0,001 W, yani ihmal edilebilir. Filaman hem ince hem uzundur; direnç büyüktür. Tel görünümünde elektronlar kalın kabloda geniş bir yoldan, ince telde dar bir yoldan geçer.

**Tel neden bükülü bükülü?** Direnç yüksek olsun diye tel uzun olmalıdır (düzleştirilse onlarca santimetre olurdu). Telin sarmalının da sarmal yapılması uzun teli küçük balona sığdırır; komşu sarımlar birbirini ısıtır ve gaza kaybedilen ısı azalır. Sarmal sayıları ölçekli değildir.

**Neden parlar, rengi neden değişir?** Sıcak her cisim ışık yayar (ısıl ışıma): ocakta kızaran demir, mum alevi, Güneş. Oda sıcaklığındaki cisimler yalnızca gözle görünmeyen kızılötesi yayar. Yaklaşık 600-700 °C’den sonra koyu kırmızı görünür ışık başlar; sıcaklık arttıkça renk kırmızıdan turuncuya, sarıya ve beyaza kayar. Animasyondaki yaklaşık değerler: 50 V’ta yaklaşık 800 °C (koyu kırmızı), 120 V’ta yaklaşık 1.800 °C (turuncu-sarı), 230 V’ta yaklaşık 2.500 °C (sarımsı beyaz). Gerçek ampulde sayılar biraz değişir; sıralama ve fikir doğrudur.

**Neden tungsten?** Erime noktası metaller arasında en yüksek olanıdır (3.422 °C); demir yaklaşık 1.540 °C’de, bakır 1.085 °C’de erir. Tel 2.500 °C’de çalıştığı için bu şarttır.

**Enerjinin çoğu neden ısı?** 2.500 °C’de telin yaydığı ışığın büyük kısmı kızılötesidir. Telli ampulde harcanan enerjinin yalnızca yaklaşık %5’i görünür ışıktır: 60 W’ta yaklaşık 3 W ışık, 57 W ısı. 9 W’lık LED yaklaşık aynı ışığı verir: ışık yine yaklaşık 3 W, ısı yaklaşık 6 W. LED önce bir teli ısıtmadan ışık yapar; aynı ışık için çok daha az enerji harcar ve daha serindir. 60 ÷ 9 ≈ 6,7 kat.

**Balonun içi neden gaz dolu ya da havasız?** Sıcak tungsten havadaki oksijenle hemen yanar. Bu yüzden balonda oksijen yoktur: ya vakum ya argon-azot. Gaz ayrıca tungstenin buharlaşmasını yavaşlatır; tel daha sıcak çalışır ve ömrü uzar. Gazın ısıyı dışarı taşıması bunun bedelidir, sarmal bu kaybı azaltır.

**Tel neden sonunda kopar?** 2.500 °C’de tungsten çok yavaş buharlaşır; atomlar camın iç yüzüne yapışır (eski ampullerin kararması). Tel her yerde aynı hızda incelmez: bir yer biraz ince olursa orada direnç büyük olur, I × I × R ile daha çok ısı çıkar, daha hızlı buharlaşır ve daha da incelir. Bu kendini hızlandıran süreç teli en ince yerinden koparır. Telli ampulün tipik ömrü yaklaşık 1.000 saattir.

**Neden çoğu kez açarken yanar?** Tungstenin direnci sıcaklıkla güçlü artar: soğukken sıcak hâlinin yaklaşık 10’da biridir (yaklaşık 88 Ω). Anahtarı açınca akım 230 ÷ 88 ≈ 2,6 A olur, normal akımın yaklaşık 10 katı; tel ısındıkça akım 0,26 A’e düşer. Bu ilk büyük akım zaten incelmiş zayıf noktayı zorlar. “Her zaman” değil, “çoğu kez” deriz.

**Aynı fikir başka nerede?** Ekmek kızartma makinesi, elektrikli soba, saç kurutma makinesi, ütü, su ısıtıcı: ısıtıcı direnç telleri (çoğunlukla nikel-krom; erime noktası yaklaşık 1.400 °C ve koruyucu oksit tabakası oluşturur). Sigorta da aynı fikirle çalışır: ince tel normal akımda ısınmaz, akım çok artarsa I × I × R ısısı hızla büyür (akım 2 katına çıkarsa ısı 4 katına), tel erir ve devre kesilir.

**Güvenlik:** Yanan ya da yeni sönmüş telli ampulün camı çok sıcaktır; dokunulmaz. Ampul takılırken ya da sökülürken elektrik kesilmiş (tercihen sigorta kapalı) ve ampul soğumuş olmalıdır; elektrik varken yuvaya parmak ya da metal nesne sokulmaz. Kırık cam keskindir; önce elektrik kesilir. Burada denenecek bir deney yoktur; 230 V ile deney yapılmaz.

**Sınıfa soru 1:** Kablo da aynı akımı taşıyor; neden kablo parlamıyor da tel parlıyor? **Cevap:** Akım aynıdır ama direnç çok farklıdır (yaklaşık 880 Ω ile 0,02 Ω); ısı I × I × R olduğundan yalnızca filamanda çıkar.

**Sınıfa soru 2:** Ampuller neden çoğu kez açarken yanar? **Cevap:** Soğuk telin direnci yaklaşık 10 kat küçüktür; açılış anındaki büyük akım zaten incelmiş zayıf noktayı koparır.

**Öğrenci soruları:** “Tel ısınınca neden erimiyor?” Erime noktası 3.422 °C, tel yaklaşık 2.500 °C’de çalışır. “Gazda yanmaz mı?” Balonda oksijen yok. “LED neden serin?” Teli ısıtarak ışık yapmaz; yine de biraz ısınır.

**Geçiş:** Geri: “Direnç nedir?” ve “Güç ve enerji”. İleri: LED ve yarı iletken konuları ile sigorta ve koruma konuları.

#### 23. Mıknatıs ve elektrik

**Bu slaytta:** animasyon altı görünümü sırayla kendi kendine gezer (her biri yaklaşık 8 saniye): mıknatıs, akımlı tel, bobin, indükleme, jeneratör, motor. Öğrenciler yüklerin itip çektiğini, elektrik alanını, akımı, gerilimi ve gücü biliyor; mıknatısı görmediler. Jeneratörün mıknatıs ve bobinle çalıştığını, transformatörün alternatif gerilimi değiştirdiğini ve radyo dalgalarında “manyetik alan” sözünü yalnızca duydular. Bu slayt eksik parçayı tamamlar: elektrik ve mıknatıslık iki ayrı konu değil, tek olayın iki yüzüdür. Görseldeki her şey ölçeksiz, basitleştirilmiş bir modeldir.

**1 · Mıknatıs ve manyetik alan:** Mıknatıs, demir, nikel ve kobalt gibi maddeleri çeker. Her mıknatısın iki ucu vardır: kuzey (N) ve güney (S). Aynı kutuplar iter, farklı kutuplar çeker (elektrik yüklerindeki gibi), ama yükler tek başına bulunabilir, kutuplar bulunamaz: mıknatısı ortadan kırınca iki küçük mıknatıs olur ve her birinin yine N ve S ucu vardır. Manyetik alan, mıknatısın çevresinde başka bir mıknatısa kuvvet uygulayan bölgedir. Çizgiler dışarıda kuzeyden çıkıp güneye girer, içeride güneyden kuzeye döner (kapalı halkalar); çizgi sıklığı güçlü alanı gösterir. Pusula iğnesi küçük bir mıknatıstır, kırmızı ucu alanın yönünü gösterir; Dünya da dev bir mıknatıs gibi davrandığı için pusula kuzeyi gösterir. Sınıfta okul tipi küçük mıknatıs kullanın; güçlü mıknatıslar parmağı sıkıştırabilir.

**2 · Akım mıknatıs gibi davranır (Oersted, 1820):** Ders sırasında akım geçen telin yanındaki pusula iğnesi saptı; elektrik ile mıknatıslık arasındaki ilk kanıt budur. Tel akım taşırken çevresinde, tele dik düzlemde halkalar biçiminde alan oluşur; uzaklaştıkça zayıflar. Akım kesilince iğne Dünya’nın alanına döner. Duran yük yalnızca elektrik alanı yapar; hareket eden yük, yani akım, ayrıca manyetik alan yapar. **Sağ el kuralı:** başparmak akımın (konvansiyonel, artıdan eksiye) yönünü gösterirse kıvrılan dört parmak alanın yönünü gösterir. Solda üstten bakış (akım size doğru, alan saat yönünün tersine), sağda yandan görünüş vardır.

**3 · Bobin ve elektromıknatıs:** Tek telin alanı zayıftır. Teli silindire sararsak her sarımın alanı bobinin içinde aynı yöne bakıp toplanır; dışarıda çubuk mıknatıs gibi dağılır. Bobin için sağ el kuralı: dört parmak akımın dolandığı yönü gösterirse başparmak kuzey ucunu gösterir. Alan sarım sayısı ve akımla artar (animasyonda sarım 1, 3, 6 olunca ataş sayısı artar). İçine yumuşak demir koyunca demirdeki küçük mıknatıs bölgeleri aynı yöne dizilir ve alan kat kat güçlenir. Asıl üstünlük kapatılabilmesidir: akımı kesince ataşlar düşer. Hurdalıktaki vinç, kapı zili, röle, hoparlör, MR cihazı elektromıknatıs kullanır. Ataş sayıları örnek ölçektir, gerçek değer değildir.

**4 · Değişen alan gerilim oluşturur (Faraday, 1831):** Mıknatısı bobine yaklaştırıp uzaklaştırınca bobine bağlı ölçü aleti saptı. Mıknatıs duruyorsa, bobinin hemen yanında bile olsa, gerilim yoktur; gerilimi yaratan mıknatısın kendisi değil, bobinden geçen alanın değişmesidir. Yaklaşırken bir yöne, uzaklaşırken ters yöne sapar. Mıknatıs ne kadar hızlı hareket ederse ve sarım ne kadar çoksa gerilim o kadar büyür. Kadranda sıfır ortadadır; “0,4 V” gibi değerler örnektir. Bobin devredeyse gerilim akım da yürütür; bu akım mıknatısın hareketine karşı koyar (Lenz kuralı): elimiz enerji harcar, elektrik enerjisi bedava çıkmaz.

**5 · Jeneratör ve alternatif akım:** Mıknatısı bobinin yanında döndürünce kuzey ucu bobine bakarken alan bir yönde, güney ucu bakarken ters yönde geçer; gerilim bir yarım turda artı, sonrakinde eksi olur ve grafik sinüs dalgası çizer: alternatif akım. Bir tur bir tam salınımdır. Şebekede saniyede 50 tur (50 Hz) vardır: bir tur 1 ÷ 50 = 0,02 s = 20 ms. Animasyon gözle izlenebilsin diye çok yavaştır. Santralde mıknatısı su, buhar ya da rüzgâr türbini döndürür; her santral bir “mıknatıs döndürme” düzeneğidir. Bisiklet dinamosu da aynı fikirdir.

**6 · Motor, jeneratörün tersi:** Mıknatısın alanındaki telden akım geçirirsek tel hem alana hem akıma dik bir kuvvet hisseder. Halkanın iki kenarında akım zıt yönde olduğundan bir kenar yukarı, öbürü aşağı itilir ve halka döner. Yarım tur sonra kenarlar yer değiştirir; komütatör (yarım halkalar ve fırçalar) akımın yönünü tam o anda çevirir, böylece dönüş sürer. Gerçek motorlarda yüzlerce sarım, demir çekirdek ve çok kutup vardır. Motorun milini elle döndürürsek devre jeneratör gibi gerilim üretir; elektrikli araçlar frenlerken bunu kullanır.

**Geri bağlantı:** Transformatör: birinci bobindeki alternatif akım değişen alan yapar, ikinci bobin bunu yakalayıp gerilim üretir; pilin sabit akımı sabit alan yapar ve gerilim doğurmaz, bu yüzden transformatör doğru akımla çalışmaz. Kaçak akım rölesinin halkası da bir bobindir: gidiş ve dönüş akımları eşitse alanlar birbirini götürür, kaçak varsa halkada alan kalır ve röle keser. Hoparlör motor gibi çalışır. Kablosuz şarjda tabandaki bobinin değişen alanını telefondaki bobin yakalar. Anten, çok hızlı değişen akımla hem elektrik hem manyetik alan yayar.

**Tek olayın iki yüzü:** Akım manyetik alan yapar (Oersted, 1820); değişen manyetik alan gerilim yapar (Faraday, 1831); akım ve manyetik alan birlikte kuvvet doğurur (motor). 1865’te Maxwell bunları denklemlerde birleştirdi ve değişen elektrik alanın manyetik alan, değişen manyetik alanın elektrik alan yaptığını göstererek ışığın ve radyo dalgalarının elektromanyetik dalga olduğunu buldu.

**Sınıfa soru 1:** Prizdeki elektrik neden alternatif akım olarak doğar? **Cevap:** Jeneratörde mıknatıs döner; alanın yönü yarım turda bir değişir, gerilim de yarım turda bir işaret değiştirir.

**Sınıfa soru 2:** Mıknatısı bobinin yanında hareketsiz tutarsak lamba yanar mı? **Cevap:** Hayır; gerilimi alanın kendisi değil değişmesi oluşturur. Bu yüzden jeneratör sürekli döndürülür.

**Sınıfa soru 3:** Elektromıknatıs nasıl güçlenir? **Cevap:** Sarım sayısını artırarak, akımı artırarak ya da demir çekirdek koyarak.

**Güvenlik:** Anlatılanlar pil, küçük mıknatıs ve ince telle yapılan deneylerdir. Prizdeki gerilimle bobin ya da tel denenmez. Güçlü mıknatıslar parmağı sıkıştırabilir ve küçük çocuklara verilmemelidir.

**Geçiş:** Sonraki slayt “Doğru ve alternatif akım”: jeneratörün neden alternatif akım ürettiğini ve pilin neden tek yönlü akım verdiğini bildiğimize göre iki akımın grafiğini yan yana göreceğiz.

#### 24. Dalga nedir? Genlik, frekans, periyot

**Bu slaytta:** animasyon beş görünümü sırayla kendi kendine gezer (her biri 8-9 saniye): genlik, frekans, periyot, dalga boyu, frekans ölçeği. Köşedeki “yavaşlatılmış · basitleştirilmiş” etiketi önemlidir: gerçek frekanslar çok daha yüksektir, grafikteki zaman penceresi örnektir.

**Bağlantı:** Öğrenciler gerilimi, akımı ve mıknatıs-bobin jeneratörünü biliyor; Hz yazısını yalnızca şarj aletinin etiketinde gördüler. Bu slayt, sonraki “Doğru ve alternatif akım” slaydında 50 Hz’in ne demek olduğunu bilerek başlamamızı sağlar.

**Salınım ve dalga:** Salınım, bir şeyin denge noktası çevresinde düzenli gidip gelmesidir: sarkaç, gitar teli, kalp atışı, jeneratördeki gerilim. Zamana karşı çizince dalga biçimli bir eğri çıkar; en güzel örneği sinüs dalgasıdır. Dalga iki yerde karşımıza çıkar: bir noktadaki değerin zamanla değişmesi (grafik) ve titreşimin uzayda yayılması (ses, ışık, radyo). İlk üç görünüm birincisini, “dalga boyu” görünümü ikincisini gösterir.

**Genlik:** Dalganın orta çizgiden en uzak noktasına uzaklığıdır (tepe değeri). Gerilim dalgasında birimi volttur; sürgü 1 iken tepe 5 V’tur, 0,6 iken 3,0 V. Genlik dalganın şiddetini belirler: ses yükselir, ışık parlar, sinyal güçlenir. Frekansı değiştirmez: ses yükselince sesin tizliği değişmez.

**Frekans:** Bir saniyedeki tam salınım sayısıdır, f ile gösterilir, birimi hertzdir (Hz; adını radyo dalgalarını ilk üreten Heinrich Hertz’den alır). Yüksek frekans seste tiz, düşük frekans pes duyulur. 1 kHz = 1.000 Hz, 1 MHz = 1.000.000 Hz, 1 GHz = 1.000.000.000 Hz, 1 THz = 10¹² Hz. Görselde numaralı yuvarlaklar 1 saniyelik pencerede her tam salınımı sayar.

**Periyot:** Bir tam salınımın süresidir, T ile gösterilir, birimi saniyedir (küçük süreler için ms ve µs). Frekans ve periyot birbirinin tersidir: T = 1 ÷ f, f = 1 ÷ T. 4 Hz için T = 0,25 s; 2 Hz için 0,5 s. 3, 6 ya da 7 Hz’de bölme tam çıkmaz, görsel “≈” gösterir. **50 Hz = 20 ms:** şebeke saniyede 50 salınım yapar; T = 1 ÷ 50 = 0,02 s. Jeneratörde bir salınım mıknatısın bir tam turudur.

**Dalga boyu:** Uzayda yayılan dalganın ardışık iki tepesi arasındaki uzaklıktır, λ (lambda) ile gösterilir, birimi metredir. Dalga bir saniyede f kez salınır ve her salınımda λ kadar ilerler: v = λ × f, λ = v ÷ f. Ses (20 °C havada) yaklaşık 343 m/s ile gider; la notası 440 Hz için λ = 343 ÷ 440 ≈ 0,78 m. Radyo dalgası, Wi-Fi ve ışık elektromanyetik dalgadır; boşlukta ışık hızıyla gider (yaklaşık 300.000.000 m/s; tam değer 299.792.458 m/s). Wi-Fi 2,4 GHz için λ = 300.000.000 ÷ 2.400.000.000 = 0,125 m = 12,5 cm. Görselde iki satır aynı uzunluk ölçeğiyle çizilmiştir (ses dalgası uzun, Wi-Fi dalgası kısa); kayma hızları ölçeksizdir, yalnızca radyonun çok daha hızlı olduğunu hissettirir: ışık sesten yaklaşık 875.000 kat hızlıdır, şimşeği hemen görüp gök gürültüsünü geç duymamızın nedeni de budur.

**Ölçek:** Frekanslar o kadar geniş bir aralıkta değişir ki cetvelde her çentik bir öncekinin 10 katıdır (logaritmik ölçek). Sırayla: kalp atışı yaklaşık 1 Hz (T = 1 s); priz 50 Hz (T = 20 ms); la notası 440 Hz (T ≈ 2,3 ms); insan kulağı yaklaşık 20 Hz – 20 kHz duyar (ince mavi bant); ultrasonik mesafe sensörü 40 kHz (T = 25 µs, λ ≈ 8,6 mm; kulağın duyamadığı ses); FM radyo yaklaşık 100 MHz (λ = 3 m); Wi-Fi 2,4 GHz (λ = 12,5 cm); işlemci saati 3 GHz (T ≈ 0,33 ns; yayılan dalga değil, devrenin içindeki düzenli tık); görünür ışık yaklaşık 400-750 THz (turuncu ışık 500 THz, λ = 600 nm). Işığın rengi frekansına bağlıdır: kırmızı yaklaşık 430 THz, mor yaklaşık 750 THz. Ekranda yalnızca altı örnek sırayla vurgulanır; FM radyo, işlemci saati ve ışığın renk aralığı konuşmada anlatılır.

**İleri bağlantılar:** Doğru ve alternatif akım (şebeke 50 Hz, yön saniyede 100 kez değişir; “etkin değer” kavramına burada girmeyin, 230 V etkin değerdir ve tepesi yaklaşık 325 V’tur, o slaytta anlatın); ultrasonik sensör (40 kHz’lik kısa ses atımı, uzaklık = ses hızı × süre ÷ 2); işlemci saati (3 GHz = saniyede 3 milyar tık, her tık yaklaşık 0,33 ns; bu sürede ışık bile yalnızca yaklaşık 10 cm gider); kablosuz haberleşme (anten boyu dalga boyuyla ilişkilidir, frekans yükseldikçe dalga boyu kısalır); ışığın rengi.

**Sınıfa soru 1:** Frekans iki katına çıkarsa periyot ne olur? **Cevap:** Yarıya iner (T = 1 ÷ f): 2 Hz için 0,5 s, 4 Hz için 0,25 s.

**Sınıfa soru 2:** Ses ile radyo dalgası aynı frekansta olsaydı hangisinin dalga boyu kısa olurdu? **Cevap:** Sesin; λ = v ÷ f ve ses çok daha yavaştır. Gerçekte iki dalganın frekansı aynı değildir; soru yalnızca λ = v ÷ f ilişkisini sınar.

**Güvenlik:** Denenecek bir deney yoktur; priz yalnızca sayısal bir örnek olarak geçer. Prizle ilgili hiçbir şeyin denenmediğini sınıfa ayrıca söyleyin.

**Geçiş:** Artık 50 Hz’in saniyede 50 tam salınım, yani periyodu 20 ms olan bir dalga olduğunu biliyoruz. Sonraki slaytta pilin tek yönlü akımıyla şebekenin alternatif akımının grafiğini yan yana göreceğiz.

#### 25. Doğru ve alternatif akım

**Bu slaytta:** animasyon önce doğru akımı (pil), sonra alternatif akımı (priz) gösterir ve döngüyle tekrar eder. DC'de gerilim sabittir ve elektronlar hep aynı yöne kayar. AC'de gerilim sinüs biçiminde artı ve eksi arasında gidip gelir; elektronlar kesikli halkayla gösterilen yerlerinin çevresinde ileri geri salınır, net yer değiştirme sıfırdır. Görselde AC 1 Hz'e yavaşlatılmıştır.

**DC:** pil, telefon, bilgisayarın içi, güneş paneli. **AC:** evlerdeki prizler, şehir şebekesi.

**Sayılar:** 50 Hz = saniyede 50 tam salınım, yani 50 × 2 = 100 yön değişimi. Bir salınım 1 ÷ 50 = 0,02 s = 20 ms sürer; grafikte 60 ms'de 3 salınım görünür. 230 V etkin değerdir: aynı ısıtmayı yapan sabit gerilim. Tepe değer bunun yaklaşık 1,414 katıdır (√2): 230 × 1,414 ≈ 325 V.

**Türkiye ve Hz:** Türkiye'de ve Avrupa'da şebeke 50 Hz'dir; ABD ve Japonya'nın bir bölümünde 60 Hz kullanılır. Lambanın ışığı akımın yönüne değil gücüne bağlıdır ve güç her yarım salınımda sıfıra iner; yani ışık saniyede 100 kez güçlenip zayıflar. Akkor lambada tel o kadar çabuk soğumaz, ışık neredeyse sabit kalır. Bazı LED ve floresan lambalarda bu 100 Hz titreme (flicker) daha belirgindir. Göz yaklaşık 60 ila 90 Hz üstündeki titremeyi ayırt edemez; ama telefon kamerasıyla bakınca ekranda koyu bantlar görülebilir. Aynı fikir, ekranların yenileme hızının neden önemli olduğunu açıklar: bunu bilgisayar bölümünde “Çözünürlük ve yenileme hızı” slaydında göreceğiz.

**Neden AC?** Transformatörler yalnızca değişen akımla çalışır; gerilimi kolayca yükseltip düşürürler. Bunu “Santralden prizinize” slaytında göreceğiz.

**Neden ileri geri?** Jeneratörde mıknatıs bobinin içinde döner. Mıknatısın kuzey kutbu bobine yaklaşırken elektronları bir yöne, uzaklaşırken öbür yöne iter. İki kutuplu bir jeneratör saniyede 50 tur dönerek 50 Hz üretir.

**Sınıfa soru:** Akım saniyede 100 kez yön değiştiriyorsa lamba neden titremiyor? **Cevap:** Göz bu hızı ayırt edemez; akkor lambanın teli de o kısa sürede soğumaz.

**Geçiş:** Elektronlar bu kadar yavaşsa lamba neden anında yanıyor? Sıradaki slayt.

#### 26. Elektrik nasıl yol alır?

**Bu slaytta:** animasyon kendi kendine çalışır: anahtar kapanır, turuncu enerji cephesi kabloda koşar ve lamba yanar; elektronlar ise kabloda yerlerinde titreşir, yalnızca ortak olarak minicik ilerler. Sayaçlar: geçen süre, elektronların yolu (0,05 mm/s), enerjinin alabileceği yol (200.000 km/s).

**Lambayı yakan şey**, santralden koşarak gelen elektronlar değildir. Kablo baştan sona elektronla doludur; anahtar kapanınca itiş ışık hızının yaklaşık üçte ikisiyle yayılır, bütün elektronlar neredeyse aynı anda kaymaya başlar.

**Hesap:** I = n · e · A · v. Bakırda n ≈ 8,5 × 10²⁸ /m³. 1 A ve 1,5 mm² kesitte v ≈ 0,05 mm/s, yani saatte yaklaşık 18 cm. Enerji elektromanyetik alanla taşınır; kablolarda yayılma hızı ışık hızının %50–99'u arasıdır, tipik değer üçte iki.

**Sayaçlar gerçek zamanlıdır:** 2 saniyede elektronlar 0,1 mm ilerlerken enerji 400.000 km yol alabilir; bu, Ay'ın uzaklığından (384.400 km) fazladır. Görselde enerji cephesi 100 milyon kat yavaşlatılmıştır.

**Sınıfa soru:** Santralden çıkan elektronlar evinize kaç günde ulaşır? **Cevap:** Hiç ulaşmaz. Evdeki elektronlar zaten kablonun içindedir; prizdeki alternatif akımda yerlerinde ileri geri salınırlar. Santralden gelen şey enerjidir.

#### 27. Santralden prizinize

**Bu slaytta:** Enerji santralden çıkıp yükseltici trafoya, iletim hattına, trafo merkezine, mahalle trafosuna ve oradan evlere gider. Parlayan noktalar enerjinin yoludur. Kutular o anda enerjinin bulunduğu aşamadaki gerilimi gösterir.

**Yolculuk:** santraldeki jeneratör 10–25 kV üretir → yükseltici transformatör 154–400 kV'a çıkarır → iletim hatları → trafo merkezinde 34,5 kV'a düşer → mahalledeki dağıtım transformatörü 400/230 V'a indirir → evinizin prizi.

**400 / 230 V:** mahalle hattında üç faz teli ve bir nötr teli vardır. İki faz teli arasındaki gerilim 400 V, bir faz teli ile nötr arasındaki gerilim 230 V'tur. Evlere 230 V girer.

**Trafo (transformatör):** alternatif akımda gerilimi yükselten ya da düşüren cihaz. Demir bir çekirdeğe sarılmış iki tel sargıdan oluşur; birinci sargıdaki değişen akımın manyetik etkisi ikinci sargıda gerilim oluşturur. Sarım sayılarının oranı gerilimlerin oranıdır.

**Hız:** Enerji elektromanyetik alanla taşınır; kablolarda yayılma hızı ışık hızının yaklaşık %50–99'u arasıdır, tipik değer üçte iki civarı. Sayaçlar gerçek zamanlıdır: 2 saniyede elektronlar 0,1 mm ilerlerken enerji 400.000 km yol alabilir.

**Sınıfa soru:** Santralden çıkan elektronlar evinize kaç günde ulaşır? **Cevap:** Hiç ulaşmaz. Evdeki elektronlar zaten kablonun içindedir; prizdeki alternatif akımda yerlerinde ileri geri salınırlar. Santralden gelen şey enerjidir.

**Bu slaytta:** Aynı güç için akım, her aşamada şeritle gösterilir: yükseltici trafodan sonra 1 A'e düşer, mahalle trafosundan sonra yine yükselir (kalınlık ölçeksizdir).

**Matematik:** Güç = gerilim × akım. Aynı gücü 1.000 kat daha yüksek gerilimle taşırsak akım 1.000 kat küçülür. Örnek: 100 kW güç, 230 V'ta 100.000 ÷ 230 ≈ 435 A; 23.000 V'ta 100.000 ÷ 23.000 ≈ 4,35 A.

**Neden karesi?** Kablonun direnci R ise iki ucu arasında V = I × R kadar gerilim düşer; kabloda ısıya dönüşen güç P = V × I = (I × R) × I = I × I × R olur. Buradaki V, hattın 400.000 V'u değil, kablonun kendi üzerindeki küçük gerilim düşümüdür. Akım iki kez çarpıldığı için 1.000 kat daha az akım, 1.000 × 1.000 = 1.000.000 kat daha az ısı kaybı demektir.

**Basitleştirme:** Formülde hesabı basit tutmak için mahalle hattının 400 V'unu kullandık; amaç yalnızca “gerilim düşünce akım artar” ilişkisini göstermektir.

**Sınıfa soru:** Yüksek gerilim hatlarına neden asla yaklaşılmaz? **Cevap:** Yüz binlerce voltluk gerilim havayı bile delip ark oluşturabilir; dokunmak bile gerekmez.

#### 28. Birimler: şarj aleti etiketi

**Bu slaytta:** USB-C şarj adaptörünün etiketinde “5 V” vurgulanır; kablonun ucundan telefona doğru oklar itilir.

**Etiket:** Giriş 100–240 V ~ 50/60 Hz: dünyadaki bütün prizlerde çalışır. Çıkış 5 V ⎓ 3 A: telefona doğru akım verir. 5 V × 3 A = 15 W. “~” alternatif akımın, düz ve kesik çizgi (⎓) doğru akımın işaretidir.

**Birimlerin kökeni:** V Volta (itiş), A Ampère (akış), Ω Ohm (engel), W Watt (güç), Hz Hertz (saniyedeki tekrar sayısı).

**Güvenlik:** Öğrencilere evdeki şarj aletlerinin etiketini yalnızca okumalarını önerin. Şarj aletleri açılmaz: fişten çekildikten sonra bile içindeki kondansatör bir süre yük tutabilir.

**Sınıfa soru:** Prizdeki 230 V'u telefon neden doğrudan kullanamaz? **Cevap:** Telefonun pili ve devresi 5 V ister; adaptör gerilimi düşürüp doğru akıma çevirir.

**Bu slaytta:** Etikette “3 A” vurgulanır; kablodan geçen yük noktalar halinde akar.

**Günlük hayat:** telefon şarjı 1–3 A, LED 0,02 A, su ısıtıcısı yaklaşık 9 A.

**Bu slaytta:** Etikette “15 W” vurgulanır; telefondaki şarj yüzdesi yükselir (hızlandırılmış).

**Sınıfa soru:** 5 V ve 2 A veren bir adaptör kaç watt verir? **Cevap:** 5 × 2 = 10 W.

**Bu slaytta:** Etikette “50 Hz” vurgulanır; giriş tarafında prizdeki dalga yavaşlatılmış olarak çizilir (gerçekte saniyede 50 kez).

**Bu slaytta:** Adaptörün kabuğu açılır, iç devre kartı görünür (yalnızca gösterim; gerçek adaptörler asla açılmaz).

**İç yapısı (soldan sağa):** önce diyotlar prizdeki alternatif akımı doğru akıma çevirir; büyük kondansatör (kısa süreliğine yük biriktiren küçük bir depo) dalgalanmayı düzeltir. Sonra küçük bir çip bu akımı saniyede on binlerce kez açıp kapatır; böylece akım yeniden değişen hale gelir ve transformatör çalışabilir. Küçük transformatör gerilimi düşürür; çıkıştaki diyot ve kondansatör telefona düzgün 5 V doğru gerilim verir.

**Geçiş:** Elektrik şebekeden bu adaptöre nasıl geliyor? Santralden prize yolculuk.

#### 29. Sinir hücresindeki sinyal

**Bu slaytta:** Sinir hücresinin zarındaki gerilim: dinlenirken yaklaşık −70 mV, sinyal geldiğinde kısa süre +30 mV civarına çıkar (aksiyon potansiyeli). Grafik gerçekte yaklaşık 2 ms sürer; gösterim yavaşlatılmıştır. Na⁺ iyonları içeri girer (yükselme), sonra K⁺ iyonları dışarı çıkar (düşme).

**Kısa bilgi:** Vücudun yaklaşık %60’ı sudur; suda çözünmüş Na⁺, K⁺ ve Cl⁻ iyonları akım taşır. Derinin en dış katmanı kuruyken yüksek direnç gösterir, ıslanınca direnci çok düşer. Dışarıdan gelen akım vücudun kendi sinyallerinin üzerine biner; en hassas organ kalptir. Prizin 230 V’u, kalbin 0,001 V’luk sinyalinden 230.000 kat büyüktür.

**Sınıfa soru:** Banyoda elektrikli alet kullanmak neden tehlikelidir? **Cevap:** Islak deri direnci düşürür; aynı gerilim çok daha büyük bir akım geçirir (I = V ÷ R).

**Geçiş:** Şimdi aynı fikri kalpte görelim: kalp de her atışta küçük bir elektrik sinyali üretir.

#### 30. Kalbin elektrik sinyali

**Bu slaytta:** EKG kâğıdı: küçük kareler 1 mm, büyük kareler 5 mm; kâğıt 25 mm/s hızla akar, 10 mm = 1 mV. Soldaki kutu 1 mV’luk ayar darbesidir. P dalgası kulakçıkların, QRS karıncıkların uyarılmasıdır, T dalgası toparlanmadır. İki R tepesi arası 0,83 s; 60 s ÷ 0,83 s ≈ 72 atım/dk.

**Neden önemli:** Kalbin deriden ölçülen sinyali yaklaşık 1 mV’tur. Prizden gelen akım bu küçük sinyalin üzerine bindiğinde kalp ritmini bozabilir; bu yüzden en hassas organ kalptir.

**Sınıfa soru:** Kalp dakikada 72 kez atıyorsa EKG’de iki R tepesi arası ne kadar olur? **Cevap:** 60 ÷ 72 ≈ 0,83 s.

**Geçiş:** Bir sonraki slaytta, elektrik vücuttan geçerse ne olduğunu bilimsel verilerle göreceğiz; deneme yapılmaz.

#### 31. Prize elimi sokarsam?

**Bu slayt bilimdir, deney değil.** Hiçbir şekilde denenmeyeceğini net ve sakin bir dille söyleyin. Animasyon sırayla pil, akü ve priz durumlarını gösterir; düğmelerle öğrenci kaynağı kendisi seçebilir.

**Hesap:** 230 V ÷ 1.000–2.000 Ω ≈ 115–230 mA. Yaklaşık 10 mA’de kaslar kasılır ve el bırakamaz. 30 mA civarında solunum güçleşir. 50 mA ve üzerinde, özellikle akım göğüs boyunca geçerse kalp ritmi bozulabilir; 115–230 mA bu sınırın 2 ila 5 katıdır.

**Neden pil zararsız?** 1,5 V ÷ 100.000 Ω = 0,015 mA: hissedilmez bile. Kuru derinin direnci düşük gerilimde yaklaşık 100 kΩ’dur; 230 V derinin koruyucu dış katmanını aşar ve elden ele direnç 1–2 kΩ’a düşer. Pil ve akü doğru akım verir; görseldeki bölgeler 50 Hz alternatif akım içindir ve doğru akımda aynı etkiler için daha büyük akım gerekir. Hiçbir koruma cihazı prize dokunmayı güvenli yapmaz.

**Faz ve nötr:** Prizin iki deliğinden biri toprağa göre 230 V’tadır (faz), öteki yaklaşık 0 V’tadır (nötr). Yerde duran biri faza dokunursa döngü toprak üzerinden tamamlanır; teldeki kuş toprağa bağlı olmadığı için güvendedir.

**Denemeyin:** Bu hesap bir deney değildir. Akımın şiddeti kadar süresi de önemlidir: saniyenin onda biri ile birkaç saniye aynı değildir.

**Sınıfa soru:** Öldüren voltaj mı, akım mı? **Cevap:** Zarar veren, vücuttan geçen akımdır; o akımı yaratan gerilimdir: I = V ÷ R.

**Geçiş:** Peki bizi bu akımdan ne korur? Sıradaki slaytlarda mühendislik çözümlerine bakacağız.

#### 32. Sigorta

**Bu slaytta:** Otomatik sigorta (C16, 16 A). Cihazlar tek tek açılır ve akım artar. 16 A aşılınca bimetal şerit (iki farklı metalin birleşimi) ısınıp bükülür, mandalı serbest bırakır, kol düşer ve devre açılır. Animasyon hızlandırılmıştır.

**Önemli:** Sigorta kabloyu ısınmaktan ve yangından korur; insanı korumaz: 16 A, 30 mA’in yaklaşık 530 katıdır.

**Gerçekte denenmez:** Bir sigortayı bilerek aşırı yüklemeyin ve kendi başınıza hiçbir şey denemeyin.

**Sınıfa soru:** Sigorta neden bir insanı korumaz? **Cevap:** Atması için gereken akım (16 A), insan için tehlikeli sınırdan (yaklaşık 50 mA) çok büyüktür.

**Geçiş:** İnsanı koruyan cihaz bir sonraki slayttaki kaçak akım rölesidir.

#### 33. Kaçak akım rölesi

**Bu slaytta:** Faz ve nötr kablosu aynı halka çekirdekten geçer. Akımlar eşitken zıt yönlü alanlar birbirini götürür. Akım toprağa (örneğin bir insandan) kaçarsa dönen akım azalır, fark çekirdeği mıknatıslar; sarım bir elektromıknatısı çalıştırır ve kontaklar açılır. Fark 30 mA’e ulaşınca devre hemen kesilir. Animasyon yavaşlatılmıştır.

**Önemli:** Bu cihaz kaçak akımı çok küçük bir değerde yakalar; ama hiçbir koruma cihazı prize dokunmayı güvenli yapmaz.

**Gerçekte denenmez:** Kaçak akım rölesini kurcalamayın ve kaçak akım oluşturmaya çalışmayın.

**Sınıfa soru:** Röle neden yalnızca farka bakar? **Cevap:** Normalde giden ve dönen akım eşittir; fark, akımın başka bir yoldan (toprağa) kaçtığını gösterir.

**Geçiş:** Sonra, arıza olduğunda akıma kolay bir yol veren toprak hattını inceleyeceğiz.

#### 34. Topraklama

**Bu slaytta:** Metal gövdeli bir çamaşır makinesi, üç damarlı kablo (kahverengi faz, mavi nötr, yeşil-sarı toprak) ve topraklı priz. Arıza: faz teli gövdeye değer. Toprak hattı akıma kolay bir yol verir; akım insandan değil, bu telden toprağa akar ve sigorta ya da kaçak akım rölesi devreyi hemen keser. Animasyon yavaşlatılmıştır.

**Önemli:** Topraklama gövdeyi toprakla aynı gerilimde tutar ve koruma cihazının atmasını sağlar. Cihazın toprak ucunu kesmek ya da fişi değiştirmek tehlikelidir.

**Gerçekte denenmez:** Arıza yalnızca animasyondur; hiçbir cihazda arıza oluşturulmaz, hiçbir kablo ya da fiş açılmaz.

**Sınıfa soru:** Toprak teli olmasaydı arıza anında gövdeye dokunan kişiye ne olurdu? **Cevap:** Akım o kişiden toprağa akardı.

**Geçiş:** Bu üç koruma birlikte çalışır: sigorta kabloyu, kaçak akım rölesi insanı, topraklama ise akımın yolunu korur.

### 2 · Devre

#### 35. Elektrik bir döngü ister

**Bu slaytta:** Gösterim kendi kendine üç durumu sırayla anlatır. (1) Kapalı devre: anahtar kapanır, elektronlar pilin eksi ucundan çıkıp lambadan geçer ve artı uca döner; lamba yanar. (2) Açık devre: anahtar açılır, akım her yerde birden durur ve lamba söner. (3) Kısa devre: çıplak bir tel lambayı atlar, akım çok büyür, tel kızarır ve sigorta eriyip devreyi açar. Hareket yavaşlatılmıştır.

**Döngü:** Pil yükleri yaratmaz, yalnızca onları iter. Yükler dış devreyi dolaşıp pile geri dönmelidir. Lambada yük tükenmez, enerji tükenir. Yol bir yerden koparsa (anahtar açık, kopuk kablo) akım her yerde aynı anda durur; pil yepyeni olsa bile.

**Akım yönü:** 18. yüzyılda Franklin akımı artıdan eksiye akan bir şey saymıştı. Elektron 1897'de keşfedilince asıl hareketin eksiden artıya olduğu anlaşıldı ama gelenek değişmedi. Şemalardaki ok geleneksel yönü gösterir.

**Dikkat:** "Açık devre" akımsızdır; lambayı "açmak" ise yakmaktır. 1 = akım geçiyor, 0 = geçmiyor.

**Kısa devre güvenliği:** Gösterim yalnızca ekrandadır. Gerçekte bir pilin iki ucunu tel ya da metal bir nesneyle (anahtar, bozuk para) birleştirmek tel ve pili ısıtır; yanık ve yangın tehlikesi vardır. I = V ÷ R: R çok küçülünce I çok büyür. Evde sigorta ve otomatik şalter bu yüzden vardır.

**Sınıfa soru:** Kuş tele konduğunda neden devre oluşmaz? **Cevap:** İki ayağı da aynı teldedir (10.000 V − 10.000 V = 0), dönüş yolu ve gerilim farkı yoktur. Yerde duran bir insan tele dokunursa döngü vücut ve toprak üzerinden tamamlanır; bu ölümcüldür.

**Geçiş:** Devreleri kağıtta anlatmak için ortak semboller kullanırız.

#### 36. Kısa devre, kıvılcım ve iyonlaşma

**Bu slaytta:** animasyon üç sahneyi sırayla oynatır (her biri yaklaşık 9 saniye): önce kısa devre, sonra kontaklar ayrılırken çakan kıvılcım, en sonda havanın neden bir an iletken olduğu (iyonlaşma ve çığ). Altyazı her sahnede kendiliğinden değişir. Öğrenciler döngüyü (Elektrik bir döngü ister), I = V ÷ R'yi, P = I × I × R ısınmasını, ince ve kalın telin direncini, sigortayı (Bizi koruyan mühendislik) ve statik elektrikte yaklaşık 3.000 V/mm hava delinmesini bilir; bu slayt hepsini birbirine bağlar.

**Kısa devre nedir?** Akımın yükü (lamba, direnç, cihaz) atlayıp pilin iki ucunu çok küçük dirençli bir yolla birleştirmesidir. Normal devrede 9 V ÷ 450 Ω = 0,02 A = 20 mA akar. Aynı pile direnci yaklaşık 0,5 Ω olan kalın bir tel bağlanırsa I = V ÷ R = 9 ÷ 0,5 = 18 A olur: 900 kat fazla (örnek değerler; gerçek pilde iç direnç akımı sınırlar ve gerilim düşer; bu yüzden yük pratikte neredeyse hiç akım almaz). Direnç akımı kontrol eden şeydi; yük atlanınca kontrol kalkar, akımı yalnızca kaynağın kendi iç direnci ve tellerin direnci sınırlar.

**Neden olur?** Dört yaygın neden: hasarlı ya da erimiş yalıtım (iki çıplak tel birbirine değer), su (nem ve musluk suyu iletkendir), yanlış bağlantı (artı ile eksi uç doğrudan birleşir), metal nesne (tornavida, madeni para, kolye iki ucu birleştirir).

**Neden tel ısınır?** Isı gücü P = I × I × R. Akım 18 A olunca P = 18 × 18 × 0,5 = 162 ≈ 160 W: küçücük bir tel parçasında açığa çıkan güç bu kadardır. Akım kareyle girdiği için akım 10 kat artarsa ısı 100 kat artar. Animasyonda tel önce gri kalır, yaklaşık 150 °C'de yalıtım yumuşar ve erir, sonra tel kor kırmızısı olur (sıcaklıklar örnektir). Yalıtım yanınca teller çıplak kalır ve yangın çıkabilir.

**Sigorta ve otomat (şalter):** Şebekede kısa devre akımı yüzlerce amperdir (230 V ÷ 0,5 Ω = 460 A, örnek). Sigortanın teli erir, otomat kontaklarını açar; bu birkaç milisaniye içinde olur. 16 A'lik sigorta kabloyu ve yangını korur, insanı korumaz: insanı kaçak akım rölesi korur. Animasyonda sigorta sahnenin sonunda açar ve akım 0 A olur; gerçek açma süresi çok daha kısadır, görsel yavaşlatılmıştır.

**Kıvılcım nedir?** Havanın anlık delinmesidir. Hava yalıtkandır ama elektrik alanı E = V ÷ d (gerilim bölü aralık) yaklaşık 3.000 V/mm eşiğini aşarsa delinir. Kontaklar ayrılırken aralık d çok küçüktür, bu yüzden alan çok büyüktür: örnek olarak 230 V ÷ 0,02 mm = 11.500 V/mm. Aralık büyüdükçe alan düşer (230 ÷ 0,20 = 1.150 V/mm) ve kıvılcım söner. Kısaca: aralık küçük + gerilim yüksek → alan yüksek → kıvılcım. Statik slayttaki kapı kolunda çakan kıvılcım aynı olaydır. Gerçek anahtarda yük bobin içeriyorsa (motor, transformatör) akım aniden kesilmek istemez ve kıvılcım daha güçlü olur.

**Yalıtkan olan hava nasıl iletken olur?** Havada her zaman birkaç serbest elektron vardır (doğal radyoaktivite, kozmik ışın). Güçlü alanda böyle bir elektron + elektroda doğru hızlanır; yeterli hıza gelince bir N₂ ya da O₂ molekülüne çarpıp ondan bir elektron koparır (iyonlaşma). Geriye artı yüklü bir iyon kalır, iki serbest elektron olur. İki elektron yine hızlanıp çarpışır: 1 → 2 → 4 → 8 → 16 diye sayı katlanır; buna çığ denir. Elektron ve iyon dolu, sıcak ve parlayan bu kanala plazma denir; iyi iletir. Animasyon çığı yalnızca üç adımda gösterir; gerçekte milyarlarca elektron vardır ve moleküller çok daha küçüktür (ölçekli değil). Elektrik alanı artıdan eksiye çizilir, elektron ise ters yönde (artı elektroda) gider.

**Sınıfa soru:** Neden prizden fiş çekerken bazen çıt sesi duyulur? **Cevap:** Fiş pimleri prizden ayrılırken aralık çok küçüktür ve cihaz bobin içerebilir (akımı sürdürmek ister); alan eşiği aşar ve kontaklar arasında küçük bir kıvılcım çakar. Bu yüzden büyük cihazlar önce kapatılır, sonra çıkarılır.

**Sınıfa soru:** Neden ince bir tel kısa devrede önce erir? **Cevap:** Aynı akımda ince telin birim uzunluk başına direnci büyüktür; P = I × I × R olduğundan ısı daha çok çıkar, ince tel ısıyı atacak yüzeyi de az olduğu için daha çabuk ısınır.

**Güvenlik notu:** Kısa devre, kıvılcım ve ark gerçekte asla denenmez: pili, prizi, uzatma kablosunu ya da şarj aletini kısa devre yapmayın, metal nesneyi prize sokmayın, ıslak elle elektrikle uğraşmayın. Kısa devre olan pil kızarır, sızdırır, yanabilir ya da patlayabilir. Slayttaki sayılar örnektir.

**İleriye bağlantı:** Kıvılcım sürerse ark olur (sonraki slayt). Aynı fikir diyot ve LED slaytlarında da döner: bir malzeme belli bir eşiğin üstünde iletken olur.

**Geçiş:** Kıvılcım bir an sürer; peki kaynak akım vermeye devam ederse? Sıradaki slayt arkı ve şimşeği anlatır.

#### 37. Ark ve şimşek

**Bu slaytta:** animasyon sırayla üç sahne gösterir: sürekli yanan ark, arkın söndürülmesi (alternatif akımın sıfır noktası ve kesicinin ark odası), şimşek. Altyazı sahneyle birlikte değişir. Önceki slayttaki kıvılcımın devamıdır.

**Kıvılcım ile ark farkı:** Kıvılcım havanın anlık delinmesidir, kısa sürer; kaynak ya da alan zayıflayınca söner. Ark ise akım vermeye devam eden bir kaynakla sürdürülen delinmedir: kanal kalıcı olur. Pil ya da şebeke gibi güçlü bir kaynak varsa ve aralık çok büyük değilse kıvılcım arka dönüşür.

**Ark neden yanmaya devam eder?** Akım kanaldan geçerken kanalı ısıtır; sıcaklık binlerce °C'ye çıkar (kaynak arkı yaklaşık 6.000 °C, örnek). O sıcaklıkta moleküller çarpışarak sürekli iyonlaşır, kanal elektron ve iyon dolu plazma olur ve iyi iletir. İyi iletken kanalda küçük bir gerilim bile büyük akımı sürer: ark gerilimi yalnızca onlarca volttur (yaklaşık 20–40 V, örnek), akım ise onlarca ya da yüzlerce amperdir. Kısaca: akım kanalı sıcak tutar, sıcak kanal akımı iyi iletir; döngü kendi kendini sürdürür. Sıcak gaz yükseldiği için ark yukarı doğru kıvrılır.

**Ark nasıl söner?** Doğru akımda (DC) akım hiç sıfıra inmez, ark inatla yanar. Alternatif akımda (AC, 50 Hz) akım saniyede 2 × 50 = 100 kez sıfırdan geçer; sıfır anında kanal bir an soğur ve ark daha kolay söner. Kesicilerde (otomat, şalter) ark odası (kıvılcım söndürme odası) vardır: ark bir yığın ince metal plakaya itilir, plakalar arkı birçok kısa arka böler, metal ısıyı alır, kanal soğur ve ark söner. Animasyonda plakalar arasındaki parçalar sönükleşir ve ark söner (çok yavaşlatılmış).

**Ark bilinçli kullanılır:** ark kaynağı, kaynak elektrodu ile iş parçası arasında yanan kontrollü bir arktır; binlerce °C'lik ısıyla metali eritip birleştirir. Kaynak arkına çıplak gözle bakılmaz (morötesi ışık gözü yakar), koruyucu maske gerekir; öğrenciler bunu denemez.

**Şimşek: hava yalıtkan değil miydi?** Hava yalıtkandır; ama alan yeterince büyürse iyonlaşır ve iletken bir kanal olur. Bulutta buz parçacıkları çarpışarak yükü ayırır: alt kısım eksi, üst kısım artı (basitleştirilmiş), zeminde zıt yük birikir. Alan yeterince büyüyünce önce zayıf bir kanal, kademeli öncü, kısa adımlarla ve duraklarla dallanarak buluttan iner. Yerden, sivri ve yüksek cisimlerden (direk, ağaç, bina) ona doğru yukarı bir akıntı yükselir. İkisi buluşunca kanal tamamlanır ve zeminden buluta doğru çok parlak bir geri dönüş darbesi geçer: asıl gördüğümüz ışık budur. Kanal yaklaşık 30.000 °C'ye ısınır, akım yaklaşık 30.000 A olur (tipik değerler, çok değişir). Isınan hava patlarcasına genişler: gök gürültüsü. Animasyon yavaşlatılmıştır; gerçek geri dönüş darbesi saniyenin çok küçük bir bölümü sürer.

**Gök gürültüsü hesabı (2. slayttan):** ışık hemen görülür, ses 343 m/s ile gelir. 1 km için 1.000 ÷ 343 ≈ 2,9 s; saniyeyi 3'e bölünce yaklaşık kilometre çıkar.

**Sınıfa soru:** Şimşek ile ark aynı şey mi? **Cevap:** Aynı fizik: yalıtkan havanın iyonlaşıp iletken plazma kanalına dönmesi. Şimşek bulutun yükünün boşalmasıyla oluşan çok kısa süren dev bir arktır; ark kaynağı pil ya da şebeke gibi sürekli veren bir kaynakla beslenir.

**Sınıfa soru:** Alternatif akımda ark neden daha kolay söner? **Cevap:** Akım saniyede 100 kez sıfırdan geçer; o anda kanalı ısıtan akım kalmaz, kanal soğur.

**Güvenlik notu:** Hiçbir kısa devre, kıvılcım ya da ark gerçekte denenmez. Kaynak arkına çıplak gözle bakılmaz. Fırtınada açık alanda, ağaç altında ya da suda kalınmaz; kapalı bir binaya ya da araca girilir. Gök gürültüsü duyuluyorsa yıldırım ulaşabilecek mesafededir.

**İleriye bağlantı:** Diyot ve LED slaytlarında yine bir eşik ve tek yönlü iletim fikrine döneriz.

#### 38. Devre şemasının dili

**Bu slaytta:** Altı parça (pil, direnç, LED, diyot, anahtar, lamba) sırayla dönüp kendi sembolünü gösterir. Sonra semboller yerlerine kayarak pil, anahtar, direnç ve LED'den oluşan kapalı bir devre şeması çizer; anahtar kapanınca mavi noktalar (elektronlar) dolaşır ve LED yanar.

**Semboller:** pil (uzun çizgi artı, kısa çizgi eksi), direnç (dikdörtgen ya da zikzak), LED (üçgen ve çizgi, dışarı çıkan iki ok), diyot (üçgen ve çizgi: okun yönü akımın geçebildiği yön), anahtar (açılan bir çizgi), lamba (daire içinde çarpı).

**Yön:** Mavi noktalar elektronlardır ve LED sembolündeki üçgenin tersine, eksiden artıya ilerler. Üçgen, artıdan eksiye çizilen geleneksel akım yönünü gösterir; ikisi aynı olayı iki farklı anlaşmayla anlatır. Direnç sembolünün dikdörtgen (IEC) ve zikzak (ANSI) biçimleri vardır.

**Evrensel dil:** Mühendisler dünyanın her yerinde ortak sembollerle konuşur: Türkiye'de çizilen bir şema Japonya'da okunabilir.

**Geçiş:** Şimdi bu devreyi bir deney tahtasında gerçekten kuracağız.

#### 39. Voltmetre, ampermetre, ohmmetre

**Bu slaytta:** Aynı devre (9 V pil, 450 Ω direnç) üzerinde üç aletin nereye bağlandığı sırayla gösterilir: voltmetre direncin iki ucuna paralel, ampermetre devreye seri, ohmmetre ise parçayı devreden ayırıp kendi küçük pilini kullanır; sonra multimetrenin kadranı tek tek konumları gösterir. Ekrandaki sayılar yerine oturur: 9,00 V, 20,0 mA, 450 Ω.

**Konu:** Gerilim, akım ve direnci artık biliyoruz; peki bir devrede bunları nasıl ölçeriz? Üç ayrı alet vardır: voltmetre gerilimi (volt, V), ampermetre akımı (amper, A; küçük akımlar için miliamper, mA), ohmmetre direnci (ohm, Ω) ölçer. Üçü de aynı büyüklükleri Ohm yasasıyla (U = I × R) birbirine bağlar; görseldeki devre bunun için sabit tutuldu: 9 V'luk pil ve 450 Ω'luk bir direnç. Akım = 9 V ÷ 450 Ω = 0,02 A = 20 mA. Turuncu noktalar akımın geleneksel yönünü (artıdan eksiye) gösterir. Elektronlar ters yöne gider; bu anlaşmayı “Elektronlar bir yöne, akım öbür yöne” slaytında konuşmuştuk.

**Voltmetre (paralel):** Gerilim iki nokta arasındaki farktır (“Gerilim nedir?” slaytında gördük). Bu yüzden voltmetrenin iki ucu, ölçmek istediğimiz parçanın iki ucuna dokunur. Devreyi bozmadan yan tarafa, “paralel” bağlanır; devre kapalı kalır, akım akmaya devam eder. Görselde kırmızı uç direncin artı tarafındaki ucuna, siyah uç eksi tarafındaki ucuna değiyor; ekran 9,00 V gösteriyor. Voltmetrenin içinde çok büyük bir direnç vardır (yaklaşık 10 MΩ = 10.000.000 Ω). Neden? Voltmetre paralel bağlandığı için kendi içinden de bir miktar akım geçer; bu akım ne kadar küçükse ölçtüğümüz devreyi o kadar az bozarız. 10 MΩ'luk bir alet 450 Ω'luk dirençle paralel olunca bileşik direnç 449,98 Ω olur: fark %0,005'ten küçüktür, yok sayılabilir.

**Ampermetre (seri):** Akım, bir noktadan saniyede geçen yük miktarıdır. Seri bir devrede akım her yerde aynıdır (“Elektrik bir döngü ister” slaytı). Akımı ölçmek için o yükün hepsini aletten geçirmemiz gerekir; bu yüzden devre bir yerinden açılır ve ampermetre araya girer, yani “seri” bağlanır. Görselde üstteki tel kesildi, alet araya girdi; ekran 20,0 mA gösteriyor. Ampermetre devrenin bir parçası olduğu için kendi direnci devrenin toplam direncine eklenir; bu yüzden ampermetrenin direnci çok küçüktür (burada yaklaşık 1 Ω alındı; gerçek aletlerde bu değer ölçüm aralığına göre değişir).

**İç dirençler neden önemli? Sayılarla:** (1) Ampermetre: 1 Ω'luk bir alet 450 Ω'luk devreye girince toplam direnç 451 Ω olur. Akım 9 V ÷ 451 Ω = 19,96 mA'dir; alet yokken 20 mA idi. Fark yaklaşık %0,2; yani alet ölçülen şeyi neredeyse hiç değiştirmiyor. Aletin direnci 45 Ω olsaydı akım 9 V ÷ 495 Ω ≈ 18,2 mA'e düşerdi (yaklaşık %9 sapma): alet yanlış bir değer gösterirdi. (2) Voltmetre: iki direnç seri olsun, 450 Ω + 450 Ω, 9 V pil; her direnç 4,5 V alır. Voltmetrenin direnci küçük olsaydı, örneğin 450 Ω, ölçtüğümüz dirençle paralel olup 225 Ω oluşturur; toplam 225 Ω + 450 Ω = 675 Ω, voltmetre 9 V × 225 ÷ 675 = 3 V gösterir. Gerçek değer 4,5 V iken 3 V okuruz: alet yaptığı ölçümle devreyi değiştirmiş olur. 10 MΩ olduğunda bu hata yok sayılacak kadar küçüktür. Kural: voltmetre “çok büyük direnç”, ampermetre “çok küçük direnç” taşır.

**Ohmmetre (devre kapalı değil, parça ayrı):** Ohmmetrenin içinde küçük bir pil vardır. Parçanın uçlarına dokunduğunda kendi küçük akımını gönderir, ortaya çıkan gerilimi ve akımı ölçer, oranından direnci hesaplar (R = U ÷ I) ve ekranda 450 Ω gösterir. İki şey gerekir. (1) Devrenin gücü kapalı olmalıdır; dışarıdan bir pil varsa o da gerilim uygular, ölçüm şaşar, alet bozulabilir. (2) Parça devreden ayrılmalıdır (en az bir ucu sökülür); çünkü devrede ona paralel başka yollar varsa ohmmetre onları da “görür” ve gerçek değerden daha küçük bir direnç okur. Görselde pil çıkarıldı, direnç devreden ayrıldı, uçlar doğrudan direncin üzerinde. Uçlardaki ve direncin yanındaki beyaz noktalar aletin kendi küçük ölçüm akımıdır.

**Yanlış bağlantı (sembolik uyarı, ekranda otomatik oynamaz):** Ampermetreyi pile paralel bağlamak, pilin iki ucunu neredeyse sıfır dirençli bir telle birleştirmek demektir (kısa devre). Ohm yasası: 9 V ÷ 1 Ω = 9 A; devredeki 20 mA'in 450 katı. Pil ve teller aşırı ısınır, aletin içindeki sigorta atar. “Yanlış bağlantı” görünümü yalnızca “neden ampermetre seri” sorusunun yanıtını göstermek için vardır (anlatım sırasında öğretmen isterse açılır); gerçekte denenmez, sınıfta hiçbir pil ya da ölçü aletiyle denenmeyecek. Ampermetre akımı “içinden geçirerek” ölçer; bu yüzden gerilimi olan iki nokta arasına asla koyulmaz. Ohmmetre ve diyot testi kipleri de güç olan devrede kullanılmaz; çünkü o kiplerde alet kendi küçük akımını gönderir.

**Multimetre:** Gerilim, akım ve direnci tek aletle ölçen alettir (voltmetre + ampermetre + ohmmetre). Gösterimin son bölümünde multimetrenin kadranı görünür; kadran sırayla her konumu gösterir. Simgeler: V ve üstünde düz çizgi + kesik çizgi (V⎓): doğru gerilim (DC); pil, adaptör çıkışı, USB. V ve dalga (V~): alternatif gerilim (AC); yönü sürekli değişen gerilim. A: akım. Ω: direnç. Üçgen ve çizgi: diyot testi; alet diyoda ileri yönde küçük bir akım gönderir ve üzerindeki gerilimi gösterir (silisyum diyotta yaklaşık 0,6 V; LED'de daha büyük, renge göre değişir); yön tersse ekran “açık devre” (taşma) gösterir. Ses dalgası simgesi: süreklilik; iki uç arasında iletken bir yol (çok küçük direnç) varsa alet bip sesi verir, bir telin kopuk olup olmadığını anlamak için kullanılır. Üç giriş (jak) vardır: COM (siyah, ortak uç, her ölçümde burada) ; VΩ (kırmızı, gerilim, direnç, diyot, süreklilik) ; mA/A (kırmızı, akım ölçerken; içinde sigorta vardır). Kural: akım ölçmeden önce kırmızı ucu mA/A girişine, ölçümden sonra tekrar VΩ girişine takarız. Aksi hâlde kırmızı uç mA/A girişindeyken gerilim ölçmeye kalkmak, aleti kısa devre yapar ve sigortayı attırır.

**Güvenlik:** (1) Pil: Sınıfta gerilim ve akım ölçümü yalnızca 9 V ve altındaki pillerle, öğretmen gözetiminde yapılır. Ampermetre asla pilin ya da bir güç kaynağının uçlarına doğrudan bağlanmaz; ampermetre her zaman bir yük (direnç, lamba, LED) ile seridir. Pilin uçlarını bir telle birleştirmek de gerçekte denenmez. (2) Direnç ölçerken önce gücü kapat, sonra ölç. (3) Şebeke (priz, 230 V): öğrenciler asla ölçmez. Prizin, şarj aletinin ya da ev tesisatının gerilimini yalnızca yetkili elektrikçi, uygun ölçü aletiyle ölçer. Ölçü aletlerinin üstünde CAT I, II, III, IV gibi bir “ölçüm kategorisi” yazar: aletin kullanılacağı yerdeki ani gerilim yükselmelerine dayanıklılığını gösterir (kategori yükseldikçe alet daha büyük ani yükselmelere dayanır); kategorisi bilinmeyen bir aletle şebeke ölçülmez. Multimetre görselindeki “prizi yalnızca elektrikçi ölçer” uyarısı bu yüzdendir; kadrandaki V~ konumunu sınıfta pil, adaptör ya da küçük trafo gibi düşük gerilimli kaynaklarda görürüz, prizde değil.

**Neden ekrandaki sayılar tam bu sayılar?** 9,00 V pilin açık devre gerilimi olarak alındı; 20,0 mA, 9 V ÷ 450 Ω'dan; 450 Ω direncin değeri. Ampermetre 1 Ω eklediği için ekranda 19,96 mA çıkardı ama üç basamaklı ekran bunu 20,0 mA diye yuvarlar. Gerçek aletler de ekran basamağıyla sınırlıdır. Pil ve direnç gerçekte tam bu değerlerde olmaz; üretim toleransı vardır.

**Bağlantı:** Geri: Ohm yasası (U = I × R), “Elektrik bir döngü ister” (seri devre) ve “Devre şemasının dili” (semboller) slaytları. İleri: “Direnci yakından tanıyalım” slaytında dirençlerin değerlerini ölçmeyi, “Diyot” ve “LED nasıl ışık saçar?” slaytlarında diyot testi konumunun anlamını (ileri yönde yaklaşık 0,6 V) göreceğiz; “Seri ve paralel” slaytında bu slaytta öğrendiğimiz bağlama biçimlerinin kuralını sayılarla inceleyeceğiz.

**Sınıfa soru:** Voltmetreyi yanlışlıkla devreye seri bağlasak ne olur? **Cevap:** Voltmetrenin iç direnci 10 MΩ olduğu için devrenin toplam direnci çok büyür; akım 9 V ÷ (10.000.000 Ω + 450 Ω) ≈ 0,9 µA gibi uçuk bir değere düşer (yani akım neredeyse durur). Voltmetre “büyük direnç” olduğu için pilin geriliminin neredeyse tamamı onun üzerine düşer ve yaklaşık 9 V gösterir; direnç ise çalışmaz. Aleti seri bağlamak zarar vermez ama ölçüm işe yaramaz. Aynı hatayı ampermetreyle (paralel) yapsak kısa devre olurdu: bu yüzden iki hatadan ampermetre daha tehlikelidir.

**Sınıfa soru:** Ohmmetreyle direnç ölçerken parçayı devrede bırakıp yalnızca pili çıkarsak yeter mi? **Cevap:** Çoğu zaman yetmez. Güç kapatılmış olsa da parçaya paralel başka yollar (başka dirençler, diyotlar, kondansatörler) varsa ohmmetre aynı anda onlardan da akım geçirir ve gerçek değerden küçük bir direnç okur. Doğru ölçüm için parçanın en az bir ucu devreden sökülür; görselde direnç tümüyle ayrılarak gösterildi.

#### 40. Direnci yakından tanıyalım

**Bu slaytta:** Direnç yavaşça döner ve renk halkaları okunur: önce kırmızı-kırmızı-kahverengi (220 Ω), ardından kahverengi-siyah-kırmızı (1 kΩ). Sonra direncin boyası bir kama biçiminde açılır; içte seramik çubuk, karbon film, metal kapaklar ve spiral kesik görünür. Gösterim bir süre sonra baştan başlar.

**Okuma:** 1. ve 2. halka iki rakam, yan yana yazılır (2, 2 → 22). 3. halka çarpandır (kahverengi = ×10). 22 × 10 = 220 Ω. Renk sırası: siyah 0, kahverengi 1, kırmızı 2, turuncu 3, sarı 4, yeşil 5, mavi 6, mor 7, gri 8, beyaz 9.

**Tolerans (4. halka):** altın ± %5. 220 Ω için 220 × 0,05 = 11, yani gerçek değer 209–231 Ω arasındadır.

**İçi:** seramik bir çubuğun üzerine ince bir karbon ya da metal film kaplanır; bu filme lazerle spiral bir kesik açılır. Kesik ne kadar uzunsa akımın yolu o kadar uzar ve direnç büyür. Üstü boya ile kaplanır. Gerçek gövde yalnızca 6,3 mm'dir; film kalınlığı çizimde abartılmıştır.

**Hazır değerler:** 100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820 Ω gibi sıralı değerler vardır; hesapladığımız değer arada kalırsa bir üst değeri seçeriz.

**Sınıfa soru:** Sarı, mor, kırmızı, altın halkalı direnç kaç ohm? **Cevap:** 47 × 100 = 4.700 Ω = 4,7 kΩ.

**Geçiş:** Şimdi bu direnci tahtaya takıp ilk devremizi kuracağız.

#### 41. Kondansatör

**Bu slaytta:** Pil, anahtar, iki plaka (aralarında yalıtkan) ve lamba var. Gösteri üç aşamada ilerler: dolum (anahtar pilde), bekleme (anahtar boşta), boşalma (anahtar lambada). Plakalar arasındaki gerilim sayısı ekranda değişir.

**Kondansatör nedir?** Kısa süreliğine yük biriktiren küçük bir depodur. İki iletken plaka, aralarında yalıtkan. Pile bağlanınca pilin gerilimi elektronları bir plakaya iter, öbüründen çeker; plakalar arasında bir elektrik alanı oluşur (gri oklar). Pil çıkarılırsa yük plakalarda kalır. Bir lamba bağlanırsa elektronlar lamba üzerinden geri akar ve lamba kısa süre yanar.

**Plakalar ve kapasite:** Bir plakada elektron birikir (−), öbüründen elektron çekilir (+). Aradaki yalıtkandan elektron geçemez. Kapasite, 1 volt başına tutulabilen yüktür; plaka büyükse ve yalıtkan inceyse kapasite büyür. Birimi farad (F); elektronikte milifarad (mF) ve mikrofarad (µF) görürüz.

**Hesap:** yük = kapasite × gerilim. 1 mF × 9 V = 9 mC. Büyük kapasite ya da büyük direnç dolumu yavaşlatır. Görseldeki süreler ders için hızlandırılmıştır.

**Neden pilden farklı?** Pil kimyasal enerji depolar ve uzun süre, neredeyse sabit gerilimle verir. Kondansatör enerjiyi elektrik alanında depolar; çok hızlı dolar ve boşalır ama az enerji tutar.

**Günlük hayat:** şarj aletinde diyotların çıkardığı dalgalı akımı düzeltir (Birimler slaytındaki “İç yapısı”). RAM'de her bit minik bir kondansatördür: yüklüyse 1, boşsa 0; yük sızdığı için sürekli tazelenir. Kapasitif dokunmatik ekranda parmak, plaka gibi davranıp alanı değiştirir.

**Güvenlik:** büyük kondansatörler fiş çekildikten sonra da yük tutabilir; bu yüzden şarj aletleri ve cihazlar açılmaz.

**Sınıfa soru:** Plakalar arasında yalıtkan varken akım nasıl “geçiyor” gibi görünür? **Cevap:** Elektronlar yalıtkandan geçmez. Bir plakaya elektron girer, öbüründen çıkar; dış devrede akım vardır, yalıtkanın içinde ise yoktur. Plakalar dolunca akım durur.

**Geçiş:** Sırada yarı iletkenler: yalıtkanla iletken arasındaki malzeme.

#### 42. Yarı iletken nedir?

**Bu slaytta:** animasyon sırayla saf silisyum, n tipi (fosfor) ve p tipi (bor) gösterir; n ve p tipinde ikinci yarıda gerilim uygulanır. Mavi bulutlar bağdaki elektron çiftleri, turuncu halkalar boşluk. Saf silisyumda ısı çok seyrek olarak bir elektronu koparır; gerçekte trilyonlarca atomda yaklaşık bir çift.

**Sayılar:** silisyumda dış elektron 4; fosforda 5 → 5 − 4 = 1 elektron serbest kalır (n: negatif). Borda 3 → 4 − 3 = 1 bağ eksik kalır, buna boşluk denir (p: pozitif).

**Boşluk (hol):** sinemadaki boş koltuk gibi kayar: komşu elektron boşluğa atlar, boşluk ters yöne ilerler. Akımı taşıyan elektron ve boşluklara taşıyıcı denir.

**Büyük resim:** n ve p tipi silisyumu birleştirince diyot ve transistör doğar. LED de aynı p–n fikriyle çalışır; ama ışık için silisyum değil galyum içeren yarı iletkenler kullanılır.

**Geçiş:** Yarı iletkenler çiplerde ve ekranlarda çalışır; günlük hayatta sıradaki örneklerden biri dokunmatik ekran.

#### 43. Diyot

**Bu slaytta:** animasyon üç durumu sırayla gösterir: gerilim yok (denge), ters yön, ileri yön. Solda p tipi (turuncu halkalar: boşluk), sağda n tipi (mavi toplar: elektron); ortadaki gri bant engel bölgesidir. Ekran sayacı pilin uygulanan gerilimini gösterir; p tarafı pilin artısına bağlanınca “ileri yön” olur.

**Engel bölgesi:** sınırın yakınında n tarafındaki serbest elektronlar p tarafındaki boşlukları doldurur. Geride hareket edemeyen yüklü atomlar kalır ve yaklaşık 0,6–0,7 V'luk bir engel oluşur (silisyum). Katkılı silisyumun bütünü yüksüzdür: p'deki eksi yük hareketsiz bor atomlarında, n'deki artı yük fosfor atomlarındadır; “p” ve “n” adları hareketli taşıyıcıyı (boşluk, elektron) anlatır.

**İleri yön:** dışarıdan bu engelden büyük gerilim uygulanınca taşıyıcılar sınırı aşar, akım hızla artar. **Ters yön:** engel genişler, neredeyse hiç akım geçmez. Sınırda elektron boşluğu doldurduğunda (birleşme) silisyumda enerji ısı olarak açığa çıkar; LED'de ise ışık olur, bir sonraki slayt.

**Şarj aletindeki dört diyot (köprü doğrultucu):** dört diyot bir kare biçiminde bağlanır. Prizdeki akım bir yöne akarken iki diyot, ters yöne akarken diğer iki diyot iletir; her iki durumda da çıkıştaki akım aynı yönde kalır. Böylece saniyede 100 kez yön değiştiren akım tek yönlü, dalgalı bir akıma dönüşür. Ardından bir kondansatör dalgalanmayı düzeltir. Birimler slaytında verdiğimiz sözün cevabı budur.

**Neden direnç?** Engel aşılınca diyotun kendi direnci çok küçüktür; akımı sınırlayan bir direnç koymazsak akım hızla büyür. LED'in yanına direnç bu yüzden konur.

**Sınıfa soru:** Bir LED'i ters takarsak neden yanmaz? **Cevap:** LED de bir diyottur; ters yönde akım geçmez.

**Geçiş:** Diyot akımı tek yöne geçiriyorsa, geçerken enerjisini ışık olarak veren bir diyot da olabilir: LED.

#### 44. LED nasıl ışık saçar?

**Bu slaytta:** animasyon LED çipinin büyütülmüş kesitini gösterir: altta n tipi (mavi toplar: elektron), üstte p tipi (turuncu halkalar: boşluk). Elektron ve boşluk birleşim bölgesinde buluşur, parlak bir çakma olur ve rengi LED'in rengiyle aynı olan bir foton yukarı doğru uçar. Kırmızı, yeşil ve mavi sırayla gösterilir; düğmelerle istediğiniz renge geçebilirsiniz. Gösterim yavaşlatılmıştır; gerçekte saniyede milyarlarca birleşme olur.

**Işığın kaynağı:** LED bir diyottur. n tarafından gelen elektronlar sınırda p tarafındaki boşluklarla birleşir. Elektron boşluğa düşerken enerji kaybeder; bu enerji bir ışık parçacığı, yani foton olarak çıkar. Silisyumda aynı birleşme enerjiyi neredeyse tamamen ısıya çevirir; bu yüzden LED'ler başka yarı iletkenlerden yapılır.

**Enerji düzeyleri (ekranda yok, anlatırken çizebilirsiniz):** serbestçe dolaşabilen elektronlar üstteki iletim bandında, bağlardaki elektronlar ve boşluklar alttaki değerlik bandındadır. İki bant arasındaki fark enerji aralığıdır (yasak enerji aralığı). Elektron boşluğa düşünce bu farkı bir foton olarak verir. Enerji aralığı büyüdükçe ışık kırmızıdan maviye kayar.

**Doğanın bölme işlemi (tek denklem):** fotonun enerjisi (elektronvolt) ≈ 1240 ÷ dalga boyu (nanometre). Kırmızı 630 nm: 1240 ÷ 630 ≈ 2,0 eV; yeşil 525 nm: yaklaşık 2,4 eV; mavi 465 nm: yaklaşık 2,7 eV. 1240, ışık hızından ve Planck sabitinden gelen sabit bir sayıdır. Bu yüzden kırmızı LED en az yaklaşık 2 V ister; mavi LED pratikte yaklaşık 3 V ister.

**Birimler:** dalga boyu, iki dalga tepesi arasındaki uzaklıktır ve rengi belirler; 630 nm metrenin milyarda biridir. 1 eV, bir elektronun 1 voltluk itişle kazandığı enerjidir.

**Malzeme:** kırmızı için AlGaInP, yeşil ve mavi için InGaN. Silisyumun enerji aralığı yalnızca 1,12 eV olduğundan 1240 ÷ 1,12 ≈ 1.100 nm, yani gözün göremediği kızılötesi olurdu.

**Beyaz LED ve Nobel:** beyaz LED, mavi LED ile sarı ışık veren bir kaplamanın birleşimidir. 2014'te mavi LED'i geliştiren Isamu Akasaki, Hiroshi Amano ve Shuji Nakamura Nobel Fizik Ödülü aldı; beyaz LED aydınlatma bu buluşla mümkün oldu.

**Sınıfa soru:** Neden LED'ler akkor ampule göre çok az ısınır? **Cevap:** Enerjiyi doğrudan ışığa çevirir; akkor ampul önce teli ısıtır.

**Geçiş:** Çipin kendisi tuz tanesinden küçük; sonraki slaytta gerçek bir 5 mm LED'in içine bakıyoruz.

#### 45. LED'i yakından tanıyalım

**Bu slaytta:** 5 mm'lik gerçek bir LED büyütülmüş görünür. Animasyon önce bütün LED'i (bacaklar, düz kenar, mercek) gösterir; sonra epoksi kubbeyi yukarı kaldırarak içindeki parçaları ortaya çıkarır ve yeniden birleştirir. Işık, çipten çıkıp kubbenin merceğinde toplanır.

**Uzun bacak:** anot (+), pilin artı ucuna bağlanır. **Kısa bacak:** katot (−), pilin eksi ucuna bağlanır; gövdedeki düz kenar da bu taraftadır.

**Çanak (yansıtıcı):** katot bacağının ucundaki küçük çanak, çipin ışığını yukarı yansıtır. Epoksi kubbe bir mercek gibi ışığı toplar: kubbe olmasa ışık geniş bir açıyla dağılırdı.

**Çip ve altın tel:** çanağa yarı iletken çip yapıştırılır (yaklaşık 0,25 mm, bir tuz tanesinden küçük). Çipin üstü, anot bacağına saç telinden ince bir altın telle bağlanır; tel akımı çipin üstüne taşır. Hepsi şeffaf epoksi içine dökülür.

**Sınıfa soru:** Bacakları kesilmiş bir LED'in hangi tarafının katot olduğunu nasıl anlarız? **Cevap:** Gövdenin düz kenarına ya da içteki büyük çanağa bakarak.

**Geçiş:** Dışarıdan bu kadar küçük bir çip ışık veriyorsa, aynı fikri birkaç milyar kez küçültünce ne olur? Sıradaki slaytta transistöre geçiyoruz.

#### 46. Güneş hücresi: ışık elektriğe nasıl dönüşür?

**Bu slaytta:** Güneş hücresi LED'in tersidir. Önce ışık: yeterli enerjili foton silisyumda bir elektron-boşluk çifti açar (450 nm, 650 nm, 1000 nm yeter; 1500 nm yetmez). Sonra alan: birleşimdeki yerleşik alan elektronu n tarafına, boşluğu p tarafına iter ve geri birleşmelerine izin vermez. Son olarak devre: elektron kablodan lambaya gider, enerjisini bırakır ve p tarafına dönüp bir boşlukla birleşir. Sonraki slayt: hücreleri art arda bağlayıp panel yapmak ve LED ile karşılaştırma.

**Bağ:** Bu derslerde yarı iletkeni, n tipi ve p tipi silisyumu ve birleşimdeki yerleşik engeli gördük; LED'de elektron ile boşluğun birleşip foton çıkardığını da. Güneş hücresi aynı yapının ters yönde çalışmasıdır: LED'de elektrik girer, ışık çıkar; güneş hücresinde ışık girer, elektrik çıkar.

**Işık elektriği nasıl üretir?** (1) Foton hücreye çarpar. (2) Silisyum atomlarına bağlı bir elektron, fotonun enerjisini alırsa bağından kurtulur ve serbest kalır. Geride bir boşluk (elektronun bıraktığı yer) kalır. İkisine birden elektron-boşluk çifti deriz. (3) Birleşimdeki yerleşik elektrik alanı elektronu n tarafına, boşluğu p tarafına iter. Bu alan, birleşimin iki yanında hareketsiz kalan iyonların (n tarafında artı, p tarafında eksi) kurduğu alandır; LED slaytındaki engel de aynıydı. (4) Elektronlar ön kontaktan kabloya çıkar, lambada ya da motorda enerjilerini bırakır, arka kontaktan p tarafına döner ve orada bir boşlukla birleşir. Yani devre kapalıdır: elektron kaybolmaz, çember tamamlanır. Akımın kabul edilen yönü (bakır ok) elektronların tersidir, yani artıdan eksiye.

**Foton yeterli mi? (kısa ve basit)** Silisyumda elektronun serbest kalması için gereken en küçük enerji yaklaşık 1,12 eV'tur (bu aralığa bant aralığı ya da yasak aralık denir; LED slaytındaki iletim ve değerlik bandı arasındaki fark). Foton enerjisi E = 1240 ÷ dalga boyu (nm) formülüyle bulunur. Eşik dalga boyu: 1240 ÷ 1,12 ≈ 1.100 nm. 450 nm mavi ışık: 1240 ÷ 450 ≈ 2,76 eV, yeter. 650 nm kırmızı: yaklaşık 1,91 eV, yeter. 1.000 nm kızılötesi: yaklaşık 1,24 eV, yeter. 1.500 nm kızılötesi: yaklaşık 0,83 eV, yetmez; foton hücreden geçer ya da ısıya döner. Enerjisi eşikten çok büyük bir foton da yalnızca bir çift açar; fazlası ısıya gider (görselde iletim bandının içine çıkan ok). Bu iki kayıp, panellerin neden ışığın tamamını elektriğe çeviremediğinin ana nedenlerindendir; yansıma ve elektronla boşluğun yolda birleşmesi de kayıp getirir. Ticari silisyum panellerde ışığın yaklaşık %15-22'si elektriğe dönüşür (genel bir aralıktır, marka değil); tek birleşimli bir hücre için kuramsal sınır yaklaşık %30 dolayındadır.

**Boşluk neden önemli?** Silisyumda akım yalnızca serbest elektronlar değildir. Elektron kopunca arkasında bir boşluk kalır; komşu atomun bir elektronu bu boşluğa atlar, boşluk bir adım ötede açılır. Böylece boşluk artı yüklüymüş gibi hareket eder. Elektron ve boşluk birlikte ayrılmazsa ışığın verdiği enerji hemen yeniden birleşerek ısıya dönerdi. Alan onları iki ayrı yöne sürdüğü için devreden iş yapan akım geçer. p tarafındaki boşluklar, dönen elektronların nereye oturacağını da belirler.

**Neden bir hücre yalnızca yaklaşık 0,5-0,6 V?** Gerilimi büyük ölçüde malzemenin bant aralığı belirler (silisyumda 1,12 eV ise gerilim 1,12 V'u aşamaz; pratikte yaklaşık yarısı). Işık şiddeti gerilimi çok az değiştirir (ışık 5 kat azalsa hücre geriliminde yaklaşık %8-10 düşüş olur); asıl değişen akımdır. Volt tanımını hatırlayalım: 1 V = 1 J ÷ 1 C. Hücre geçen her coulomb yüke yaklaşık 0,5 J verir. Bir hücre tek başına çoğu lambayı yakmaz; bu yüzden hücreleri art arda bağlarız.

#### 47. Hücrelerden panele: seri bağlama ve gerçek çıkış

**Bu slaytta:** Bir hücre yaklaşık 0,5 V verir; bu yüzden hücreler art arda (seri) bağlanır ve gerilimler toplanır: 6 hücre 3 V, 36 hücre 18 V, 60 hücreli bir panel yaklaşık 30 V. Işık azalınca akım azalır ama gerilim neredeyse aynı kalır; gece akım yoktur. Sonra LED ile yan yana bakılır: aynı p-n yapısı, ters yönde çalışır. Gösterimde ışık kendiliğinden azalıp artar; akım çubuğu bunu izler.

**Seri ve paralel:** Seri bağlamada gerilimler toplanır, akım aynı kalır: 6 × 0,5 V = 3 V, 36 × 0,5 V = 18 V, 60 × 0,5 V ≈ 30 V (yaklaşık; çalışma gerilimi, yüksüz gerilim biraz daha yüksektir). Paralel bağlamada gerilim aynı kalır, akımlar toplanır; daha çok akım gerekiyorsa paralel gruplar kullanılır. Gerçek paneller çoğu zaman 60, 72 gibi sayıda hücrenin seri dizilmesiyle yapılır.

**Işık artınca ne olur, gece neden hiçbir şey olmaz?** Işık şiddeti arttıkça daha çok foton gelir, daha çok çift açılır, akım aşağı yukarı orantılı artar; gerilim neredeyse sabit kalır. Gece (ya da kapalı bir odada) foton yok, çift yok, akım yok. Ay ışığı çok zayıf olduğu için akım ihmal edilecek kadar küçüktür. Sürgüyü sıfıra getirince hem akım hem gerilim sıfıra iner; %5 ışıkta bile gerilim, tam ışıktakinin yaklaşık %85'i kadardır.

**Çıkış doğru akımdır (DC):** Panel hep aynı yönde akım verir. Şebeke elektriği ise alternatif akımdır (AC, yönü saniyede 100 kez değişir, Türkiye'de 50 Hz). Evdeki aletleri ve şebekeyi besleyecek panel sistemlerinde bu yüzden evirici (invertör) bulunur: doğru akımı alternatif akıma çevirir. Küçük cihazlarda (hesap makinesi, bahçe lambası) doğru akım doğrudan kullanılır.

**Uydular ve hesap makineleri:** Uzayda gece-gündüz bulut engeli yok, güneş ışığı güçlüdür; yakıt taşımak yerine ışığı elektriğe çevirmek hem hafif hem uzun ömürlüdür ve hareketli parça yoktur. Bu yüzden uyduların kanatları güneş panelidir (Göklere slaytında gördüğümüz Türksat gibi haberleşme uyduları da böyledir). Hesap makinesi çok az güç ister; oda ışığı bile o güce yeter, pil gerekmez.

**Güvenlik:** Güneş varken paneller her zaman gerilim üretir; kabloların fişini çekmek ya da anahtarı kapatmak yetmez, çünkü ışık düştüğü sürece panel enerjilidir. Yalnızca birkaç hücrelik küçük panellerde gerilim zararsızdır; bir çatı paneli dizisinde onlarca ya da yüzlerce volt olabilir ve ölümcül olabilir. Açıkta kalan kabloya dokunmak, kablo kesmek ya da paneli kendi başımıza sökmek gerçekte denenmez; panel işleri yetkili kişilerce yapılır. Sınıfta kullanılacak yalnızca düşük gerilimli minik güneş hücreleridir.

**Sınıfa soru 1:** 12 V'luk bir aküyü şarj etmek için hücre başına yaklaşık 0,5 V verilirse en az kaç hücre seri bağlamak gerekir? **Cevap:** 12 ÷ 0,5 = 24 hücre (gerçekte kayıplar ve şarj için daha yüksek gerilim gerektiğinden daha çok hücre kullanılır).

**Sınıfa soru 2:** Güneş panelinin üstünü kalın bir battaniyeyle kapatırsak neden akım durur, ama sadece bulutlu havada akım sıfır olmaz? **Cevap:** Battaniye ışığı tamamen durdurur: foton yok, elektron-boşluk çifti yok. Bulut ışığı yalnızca azaltır; daha az foton daha az çift demektir, akım düşer ama kesilmez, gerilim ise neredeyse aynı kalır.

#### 48. Seri ve paralel bağlantı

**Bu slaytta:** Solda seri, sağda paralel bağlı iki lamba vardır. Önce ikisi de takılıdır; sonra birer lamba sökülür. Seride yol kesilir ve iki lamba da söner; paralelde diğer lamba yanmaya devam eder. Düğmelerle kendiniz de deneyebilirsiniz.

**Seri:** tek yol. Aynı akım bütün parçalardan geçer; gerilim paylaşılır (4,5 V + 4,5 V = 9 V). Biri koparsa hepsi söner. Seride her lamba yarı gerilim ve yarı akım alır: güç ½ × ½ = ¼. Bu yüzden sönük yanar. Toplam direnç 450 + 450 = 900 Ω; akım 9 ÷ 900 = 0,01 A.

**Paralel:** ayrı kollar. Her kol pilin tam gerilimini alır; kollardaki akımlar toplanır (I = I₁ + I₂). Biri koparsa diğerleri çalışmaya devam eder. Her kol 9 V alır: 9 ÷ 450 = 0,02 A; iki kol 0,04 A. Toplam akım arttı: toplam direnç 225 Ω'a düştü.

**Sınıfa soru:** Evde buzdolabı bozulunca neden televizyon da kapanmaz? **Cevap:** Prizler paralel bağlıdır; her biri ayrı bir koldur.

**Geçiş:** Şimdi LED'li ilk devremizi tahtada kuralım.

#### 49. İlk devremizi kuralım

**Bu slaytta:** Devre adım adım kurulur ve her adımda kamera yaklaşır: boş tahta, LED, direnç, kablo, pil, akım. Altyazı o anki adımı söyler. Sonunda elektronlar akar ve LED yanar; sonra tahta boşalır ve gösterim yeniden başlar. "LED'i ters tak" ve "Direnci çıkar" düğmeleri yalnızca ekranda deneme içindir.

**Breadboard:** lehimsiz deney tahtası. Ortadaki her 5'li sıra içeriden bir metal kıskaçla bağlıdır; kenardaki uzun hatlar artı ve eksi beslemedir. Delik aralığı 2,54 mm'dir.

**Hesap:** LED yaklaşık 2 V ister; 9 V'luk pilde kalan 7 V direncin üzerinde düşmelidir (çıkarma). LED'den 20 mA geçsin istiyoruz: R = 7 V ÷ 0,02 A = 350 Ω (bölme). 350 Ω'a en yakın standart değerler 330 Ω ve 390 Ω'dur. 330 Ω ile akım 7 ÷ 330 ≈ 21 mA olur ve 20 mA sınırını aşar; bu yüzden bir üst değer olan 390 Ω seçilir: I = 7 ÷ 390 ≈ 18 mA. Kural: direnç seçerken bir üst değere yuvarlanır.

**Seri parçalar gerilimi paylaşır:** LED 2 V alır, dirence 9 V − 2 V = 7 V kalır.

**Denemeler:** LED'i ters takın: diyot geçirmez, yanmaz. Direnci çıkarın: akım çok büyür, LED bozulur. Gerçekte de aynen böyle olur; bu yüzden direnç her zaman takılır.

**Geçiş:** LED yandı; şimdi doğanın başka alanlarına bakabiliriz.

#### 50. Transistör

**Bu slaytta:** animasyon bir MOSFET'in kesitini gösterir. Önce kapıda gerilim yoktur: kaynak (S) ve akaç (D) arasında kanal yoktur, LED sönüktür. Sonra kapıya 3,3 V verilir: kapıdaki artı yük boşlukları aşağı iter, elektronları kapının altına çeker; elektronlar kanalı soldan sağa doldurur ve LED yanar. Sonra gerilim kalkar, kanal boşalır, LED söner. Görsel ölçekli değildir ve basitleştirilmiştir.

**Üç uç:** kaynak (S), kapı (G) ve akaç (savak, D). Kapıya gerilim verilince S ile D arasında kanal oluşur, akım geçer. Anahtarın hareketli parçası yoktur; akımı elektrikle geçirir ya da durdurur. Bir telefon işlemcisinde on milyarlarcası vardır.

**MOSFET** (metal–oksit–yarı iletken alan etkili transistör): kaynak (S) ve akaç (D) adlı iki n tipi bölge, p tipi silisyum tabanın içindedir; aralarında akım geçemez. Kapı (G), silisyumdan çok ince bir silisyum dioksit (SiO₂, camın da ana maddesi) tabakasıyla yalıtılmıştır. Kapıya artı gerilim verilince kapıdaki artı yük, oksidin hemen altındaki boşlukları aşağı iter ve elektronları oraya çeker. Bu elektronlar iki n bölgesini birleştiren ince bir kanal oluşturur: anahtar kapanır, akım geçer.

**Kapı:** ince bir yalıtkan tabakayla kanaldan ayrılmıştır; kapıdan akım geçmez, yalnızca elektrik alanıyla kanalı açar. Kapıya 3,3 V verince LED yanar, 0 V verince söner. LED, 330 Ω'luk dirençle ve +5 V ile akaç ucuna bağlıdır (kablolar ekranın üstünden çıkar).

**Neden önemli?** Küçük bir gerilim büyük bir akımı kontrol eder ve bu anahtar saniyede milyarlarca kez açılıp kapanabilir. Bilgisayarın 1 ve 0'ları budur. Bugünkü çiplerde bu anahtar yalnızca birkaç on nanometre büyüklüğündedir.

**1 ve 0:** bu derslerde 1 = akım geçiyor (anahtar kapalı, kanal var), 0 = akım geçmiyor (kanal yok).

**Mucitler:** ilk transistör (1947): John Bardeen, Walter Brattain ve William Shockley; 1956 Nobel Fizik Ödülü. Görseldeki MOSFET'i 1959'da Mohamed Atalla ve Dawon Kahng geliştirdi; bugünkü çiplerdeki transistörlerin neredeyse hepsi bu türdendir.

**Geçiş:** Bu anahtarlarla mantık kapıları, toplayıcılar ve sonunda bir işlemci kurulur; ilerleyen slaytlarda bunu göreceğiz.

### 3 · PCB

#### 51. Breadboard'dan PCB'ye

**Bu slaytta:** animasyon aynı devrenin breadboard'dan baskılı devre kartına (PCB) dönüşmesini adım adım gösterir: kablolar bakır yola dönüşür, yeşil lehim maskesi örtülür, parçalar yerleşir, bacaklar alttan lehimlenir, pil bağlanır ve LED yanar. Alttaki yazı her adımı söyler; kendiliğinden döner.

**Neden PCB?** Breadboard denemek için harikadır ama kablolar gevşer, devre çok yer kaplar ve her seferinde elle kurulur. PCB'de kabloların yerini bakır yollar alır; parçalar lehimlenir. Kart küçük ve sağlamdır; fabrikada birebir aynısından binlercesi üretilebilir.

**Eşleşme:** kablo → bakır yol; breadboard deliği → lehim pedi; lehim (eriyip donan kalay alaşımı) → parçayı bakıra bağlayan kalıcı bağlantı.

**Sınıfa soru:** Evinizdeki hangi cihazlarda PCB vardır? **Cevap:** Neredeyse hepsinde: telefon, kumanda, çamaşır makinesi, oyuncaklar, şarj aleti.

**Geçiş:** Sırada kartın içine bakıyoruz: bakır yollar kat kat nasıl dizilir?

#### 52. PCB'nin katmanları

**Bu slaytta:** kart önce bütün hâlde görünür; sonra katmanlarına ayrılır (lehim maskesi, bakır yol katmanları, FR-4 çekirdek). Bir akım atımı üst yoldan via'ya iner ve alt katmandaki bakır düzleme yayılır. Animasyon kendiliğinden bütün ve ayrık görünümler arasında gider.

**Ne görüyoruz?** PCB, üzerine ince bakır yollar işlenmiş, cam elyafından yalıtkan bir plakadır. Karmaşık kartlarda bu yollar kat kat dizilir.

**Bakır:** kabloların yerini alan yollar; yaklaşık 35 µm kalınlıktadır, bir saç telinin yarısı kadar.

**Lehim maskesi:** yeşil kaplama; bakırı oksitlenmekten ve kısa devreden korur.

**Via:** katmanları birbirine bağlayan, içi bakır kaplı küçük delik.

**Neden katman?** Aynı katmanda iki yol kesişirse kısa devre olur. Kesişmesi gereken yollar ayrı katmanlardan geçer.

**Malzeme:** çekirdek FR-4 adlı, epoksiyle sertleştirilmiş cam elyafı bir levhadır; yalıtkandır.

**Üretim:** bakırın istenmeyen kısımları kimyasal olarak aşındırılır ve geriye yollar kalır. Delikler delinir, iç yüzeyleri bakırla kaplanır (via). Üstüne yeşil lehim maskesi ve beyaz yazılar (serigrafi: parçaların adları ve yerleri) basılır.

**Sınıfa soru:** Kart neden çoğunlukla yeşildir? **Cevap:** Rengi veren lehim maskesidir; yeşil gelenekseldir ve üretimde kontrolü kolaylaştırır. Mavi, kırmızı ya da siyah kartlar da vardır.

**Geçiş:** Sırada bütün bu ilkelerin gerçek bir kartta nasıl bir araya geldiğini göreceğiz.

#### 53. GND nedir?

**Bu slaytta:** Gösteri, GND'yi sırayla C, B ve A noktasına taşır; son aşamada GND'den toprağa bir tel çeker. Sağdaki kutuda deniz seviyesi benzetmesi vardır: sıfır çizgisi (deniz) yer değiştirir, basamaklar arasındaki 4,5 V'luk fark değişmez. Düğmelerle GND'yi siz de seçebilirsiniz.

**Konu:** Bu derslerde gerilimi pilin iki ucu arasındaki fark olarak gördük. Aynı mantık devrenin her yerinde geçerlidir: gerilim her zaman iki nokta arasındaki farktır. Tek bir noktanın “gerilimi” demek, hangi noktaya göre olduğunu söylemeden eksiktir. Bu yüzden devrede bir noktayı “sıfır volt” diye seçeriz ve ona GND (ground, devre toprağı) deriz. Öbür noktaların gerilimi, GND'ye göre ölçülen değerdir.

**Görseli okuma:** 9 V'luk pil ve eşit iki direnç (R1 ve R2, 1.000 Ω; renk halkaları kahverengi, siyah, kırmızı) bir döngü oluşturur. A pilin artı ucu, B iki direncin arası, C pilin eksi ucudur. Akım: 9 V ÷ (1.000 Ω + 1.000 Ω) = 4,5 mA. Her direncin üzerinde 4,5 mA × 1.000 Ω = 4,5 V düşer. Turuncu noktalar akımın geleneksel yönünü (artıdan eksiye) gösterir. “GND = C” seçilirse A 9 V, B 4,5 V, C 0 V olur. “GND = B” seçilirse A +4,5 V, B 0 V, C −4,5 V olur. “GND = A” seçilirse A 0 V, B −4,5 V, C −9 V olur. Direnç gerilimleri (R1 üzerinde 4,5 V, R2 üzerinde 4,5 V) ve akım (4,5 mA) hiçbir seçimde değişmez; çünkü iki noktanın farkı, sıfırı nereye koyduğumuzdan bağımsızdır.

**Deniz seviyesi benzetmesi:** Bir dağın yüksekliğini “1.000 metre” diye söylerken aslında “deniz seviyesinden 1.000 metre yukarıda” demek isteriz. İki zirve arasındaki fark ise sıfırı nereye koyarsak koyalım aynıdır. Gerilimde deniz seviyesinin karşılığı GND'dir. Sağdaki kutuda A, B, C üç basamaktır; sıfır çizgisini (denizi) başka basamağa taşıyınca basamakların sayıları değişir, aralarındaki yükseklik farkı değişmez. GND'nin altında kalan noktalar eksi gerilimdedir, tıpkı deniz seviyesinin altındaki bir çukur gibi.

**Neden referans gerekir?** Voltmetrenin iki ucu vardır; biri GND'ye, biri ölçülen noktaya dokunur. Tek bir uçla gerilim ölçülemez, çünkü gerilim bir fark ve tek noktada fark yoktur. Kırmızı uç artı ucun tarafındaysa ekranda artı, eksi ucun tarafındaysa eksi sayı görürüz.

**Kart üzerindeki 3,3 V:** Bir kartta “3,3 V” yazan noktanın anlamı, o noktanın GND'ye göre 3,3 V yüksekte olduğudur. ESP32 gibi bir işlemcinin 1 olarak gördüğü seviye, GND'ye göre yaklaşık 3,3 V'tur; 0 ise GND'ye çok yakın (yaklaşık 0 V) seviyedir. Kartta her parça aynı GND'yi paylaşır; böylece hepsi aynı sıfır noktasına göre konuşur. Sonraki slaytlarda bu ortak noktanın kart üzerinde bakır bir katman olduğunu göreceğiz.

**Pilli cihazlarda GND:** Pilli bir cihazda GND, pilin eksi ucuna verdiğimiz addır; bu gelenektir. Toprağa (yere) bağlı değildir. Böyle bir devre “yüzer” (toprağa göre serbest). Gösterinin son aşamasında GND'den yere bir tel çizilir: bu telden akım geçmez (0 mA), çünkü akımın dönebileceği kapalı bir yol yoktur. Akım ve bütün gerilimler aynı kalır. Bunu gerçekte denemeye gerek yoktur; toprak bağlantısı bu devrenin hiçbir değerini değiştirmez.

**Türkçede “toprak” iki ayrı fikir:** (1) Devre toprağı (GND): devrede sıfır volt seçtiğimiz referans ve akımın pile geri döndüğü ortak yol. (2) Koruma topraklaması (PE): binada toprağa gömülü bir iletkene giden güvenlik hattı; fişteki toprak ucu. Bu iki sembol (ve şasi, yani cihazın metal gövdesi) çoğu zaman benzer çizilir; hangisi olduğu yanındaki etiketten ve devrenin türünden anlaşılır. Şebekeden beslenen cihazlarda (2) ve (1) bazen birbirine bağlanır; pilli cihazlarda bağlanmaz. Bir sonraki slayt gerçek toprağı anlatıyor: “Evdeki toprak gerçekten toprak mı?”.

**Güvenlik:** Burada yalnızca 9 V'luk pil modeli konuşulur. Prize, şarj aletine ya da şebekeye bağlı hiçbir devrede GND'ye, toprağa veya bir metal parçaya dokunarak ölçüm yapılmaz; pilin uçlarını birbirine bağlamak da gerçekte denenmez.

**Sınıfa soru:** Pil takılı bir telefonu elinize aldığınızda telefon toprağa bağlı mı? **Cevap:** Hayır. Telefonun GND'si pilin eksi ucuna bağlı ortak bir bakır yoldur; yere giden bir teli yoktur. Elinizle yere bir yol olsa bile, devre kapalı bir döngü oluşturmadığı için o yoldan akım akmaz; tıpkı görseldeki 0 mA'lık tel gibi. Telefon “yüzer” bir devredir.

**Sınıfa soru:** GND'yi B noktasına taşıdık; R1 üzerindeki gerilim değişti mi? **Cevap:** Değişmedi, 4,5 V. A 4,5 V, B 0 V; fark yine 4,5 V. Değişen yalnızca “sıfırı nereye koyduğumuz”.

**Geçiş:** Sırada, “toprak” sözünün ikinci anlamı: evdeki toprak gerçekten toprağa mı bağlı?

#### 54. GND ve toprak: iki ayrı fikir

**Bu slaytta:** Önce iki “toprak” yan yana gösterilir: soldaki pilli devrenin GND'si (pilin eksi ucu, yere bağlı değil) ve sağdaki koruma topraklaması (metal gövdeyi gerçek toprağa bağlayan PE teli). Sonra dört kartla “neden toprak seçildi?” sorusu cevaplanır.

**Önceki slayta bağ:** GND slaytında gerilimin hep bir referansa göre ölçüldüğünü, referansa “0 V” dediğimizi gördük. Türkçede “toprak” sözü iki ayrı şey için kullanılır: devre toprağı (GND, referans ve dönüş yolu) ve koruma topraklaması (priz ve metal gövdelerin gerçek toprağa bağlanması).

**GND ile farkı:** Pille çalışan bir telefonda ya da el fenerinde “GND”, pilin eksi tarafıdır. Bu devre toprağı gezegene bağlı değildir (“yüzer”). Prizden çalışan bir cihazda ise çoğu zaman devre toprağı ile koruma toprağı bir noktada birleştirilir; ama bu bir zorunluluk değil, tasarım seçimidir. Özetle: GND bir referans ve dönüş yoludur, toprak (PE) bir güvenlik bağlantısıdır; aynı kelimeyle anılsalar da ayrı işleri vardır. Nötr tel toprak gibi davranır ama aynı şey değildir: nötr, çalışma akımını taşıyan bir iletkendir; PE ise normalde akım taşımaz.

**Neden toprak seçildi?** (1) Her yerde vardır; uzak bir iletken kurmak gerekmez. (2) Çok büyüktür; yük içinde yayılır ve potansiyeli neredeyse değişmez, bu yüzden iyi bir ortak referanstır. (3) Nemli toprak iletir; çünkü suyun içinde iyonlar vardır, kuru toprak daha kötü iletir. (4) Tarihsel: 19. yüzyılda telgraf hatlarında dönüş teli yerine toprak kullanılırdı. Ortak referans, birbirine dokunabilecek metal parçalar arasında tehlikeli gerilim farkı oluşmasını da engeller.

**Güvenlik:** Prizlere, kablolara, topraklamaya dokunulmaz, makineler açılmaz. Bu slayt yalnızca bilgi içindir.

**Sınıfa soru:** Bir fenerin içindeki pilli devrenin GND'si toprağa bağlı mıdır? **Cevap:** Hayır; yalnızca pilin eksi ucudur. Prizden çalışan çamaşır makinesinin metal gövdesi ise PE teli aracılığıyla gerçek toprağa bağlıdır.

**Geçiş:** Sırada koruma topraklaması: bir arıza olunca prizdeki toprak teli ne işe yarar?

#### 55. Evdeki toprak

**Bu slaytta:** Evet: prizdeki toprak teli, gömülü bir bakır çubuğa gider. Gösteri üç aşamada ilerler: normal çalışma, arıza (faz teli gövdeye değer) ve yıldırım (paratoner).

**Prizdeki toprak teli nedir?** Türkiye'deki Schuko prizlerde iki yuvarlak delik faz ve nötr içindir; prizin iki yanındaki metal kıskaçlar (yan kontaklar) toprak bağlantısıdır. Bu kontaklardan çıkan yeşil-sarı renkli tele PE (koruma iletkeni) denir. PE teli, binanın altına gömülü bir bakır çubuğa, bakır levhaya ya da temelin demirlerine bağlanır.

**Gerçekten toprağa mı bağlı?** Evet. Çubuk ya da levha nemli toprağın içindedir; bakırla toprak arasındaki bağlantının bir direnci vardır. Bu direnç mümkün olduğunca küçük tutulur; ne kadar küçük gerektiğini yönetmelikler ve bina tesisatı belirler, sınıfta bir sayı vermeye gerek yok. Not: bazı şebeke düzenlerinde (TT, TN gibi adlarla anılır) toprağın arıza akımına ne kadar katıldığı değişir; kimi yerde dönüş yolunun büyük kısmı bina içindeki bir bağlantıdan geçer. Slayttaki sade model, akımın toprak üzerinden döndüğü durumu gösterir.

**Normal çalışma:** Çamaşır makinesi faz ve nötr telinden çalışır. Şebeke akımı alternatiftir, yani elektronlar ileri geri titreşir (görselde bu yüzden noktalar gidip gelir). Toprak telinden akım geçmez, metal gövde yaklaşık 0 V'ta kalır. Toprak teli normalde akım taşımaz; arızada akıma kolay bir yol açar. Nötr çalışma akımını taşır; toprak teli yalnızca güvenliktir.

**Arızada ne olur?** Bir kablonun yalıtımı yıpranıp faz teli metal gövdeye değdiğini düşünelim. Toprak teli yoksa gövde faz gerilimine yakın bir gerilimde kalır ve dokunan kişiden akım geçebilir. Toprak teli varsa faz teli, gövde, PE teli yoluyla düşük dirençli bir yol bulur; çok büyük bir akım akar, sigorta ya da kaçak akım rölesi devreyi keser. Bu sırada gövde ile yer arasındaki gerilim küçük kalır, dokunan kişi güvendedir. Görseldeki süreler sembolik ve hızlandırılmıştır; gerçekte bu olay çok kısa sürer. **Güvenlik:** bu hiçbir zaman denenmez; prizlere, kablolara, topraklamaya dokunulmaz, makineler açılmaz.

**Trafo tarafı:** Mahalledeki dağıtım trafosunun ikincil sargısında nötr noktası da toprağa bağlanır (görselde direğin yanındaki çubuk). Yani toprak, şebekenin de referansının bir parçasıdır.

**Yıldırım:** Benjamin Franklin 1750'li yıllarda paratoneri (yıldırımsavar) önerdi: çatıdaki sivri metal çubuk, yıldırım yükünü kalın bir iletkenle toprağa indirir. Toprak bu yükü her yöne yayar ve yutar; çok büyük olduğu için potansiyeli neredeyse değişmez. Yıldırım sırasında dışarıda durulmaz, bu bir gösteri değil bilgidir.

**Sınıfa soru:** Prizden çalışan çamaşır makinesinin metal gövdesi toprağa bağlı mıdır, neden? **Cevap:** Evet, PE teli aracılığıyla; böylece bir arıza olsa bile gövde tehlikeli bir gerilimde kalmaz.

**Geçiş:** Devre kartlarının içinde de büyük bir bakır katman GND'ye bağlanır: PCB'deki toprak katmanı. Orada akımın dönüş yolunu ve neden “toprak düzlemi” denildiğini göreceğiz.

#### 56. PCB'deki toprak katmanı

**Bu slaytta:** Animasyon kendiliğinden dört görünümü sırayla gezer: katmanlar, dönüş yolu, ortak sıfır, gürültü (katman yokken ve varken). Alttaki cümle her görünümde değişir. Elle bir şey yapmak gerekmez.

**Konu:** Önceki iki slaytta GND'yi "sıfır dediğimiz nokta" olarak, toprağı da evdeki koruma bağlantısı olarak gördük. Bu slayt, GND'nin gerçek bir kartın içinde nasıl göründüğünü gösterir: kartın ortasında, baştan sona tek parça bakır olan bir katman. Bu katmana "toprak katmanı" ya da İngilizce "ground plane" denir. Slayttaki karttaki katmanlar "PCB'nin katmanları" slaydındaki ile aynıdır: üstte parçalar ve yollar, içeride bakır katmanlar, altta yine yollar.

**1. Katmanlar:** Katmanlar birbirinden ayrılmış gösterilir. Üstte bileşenler (siyah çip, küçük direnç) ve bir sinyal yolu var. Ortadaki turuncu levha GND katmanıdır: delikli ya da şeritli değil, neredeyse bütün kartı kaplayan tek parça bakır. Altta ikinci bir yol katmanı var. Katmanların arasında yalıtkan FR-4 (cam elyaf ve reçine) bulunur. Gerçek bakır tabakası yalnızca yaklaşık 35 µm kalındır; yani bir saç telinin yarısından da ince. Slaytta kalınlıklar ve aralıklar okunsun diye çok büyütüldü, bu yüzden "ölçekli değil" yazıyor.

**2. Dönüş yolu:** Akım hep bir halka çizmek zorundadır. Pilden çıkıp parçaya giden akım, parçadan sonra mutlaka pile geri dönmelidir; halka kapanmazsa akım akmaz (devre ve akım halkası konuları). Üstteki mavi noktalar gidişi, GND katmanındaki bakır renkli noktalar dönüşü gösterir. Bileşenin GND ayağı, via denilen içi bakır kaplı delikle aşağıdaki katmana bağlanır. Hızlı değişen sinyallerde dönüş akımı katmanın içinde rastgele dağılmaz; gidiş yolunun hemen altından, onu izleyerek geri döner, çünkü akım için en kolay yol en küçük halkayı çizen yoldur. Ekrandaki ince kapalı çizgi bu halkadır. Yavaş (doğru akım) durumunda dönüş akımı katmanın geniş bir bölgesine yayılır; yani "hemen altından" ifadesi hızlı sinyaller için geçerlidir. Bu bilgi öğrenciler için ayrıntıdır, soru gelirse söylenebilir.

**3. Ortak sıfır:** Üç parçanın her birinin GND ayağı bir via ile aynı bakır katmana bağlıdır. Her parçanın 3,3 V ucu ile GND arasına voltmetre koyduğumuzda üçü de 3,3 V gösterir; çünkü hepsi gerilimi aynı sıfır noktasına göre ölçer (3,3 V − 0 V = 3,3 V). Eski "GND nedir" slaydındaki deniz seviyesi benzetmesi burada geçerli: yükseklikleri hep aynı deniz seviyesinden ölçüyoruz. Her parça kendi GND teline sahip olsaydı bu teller uzun, ince ve farklı dirençli olurdu; sıfır noktası parçadan parçaya kayardı. Tek katman bunu çözer.

**4. Gürültü:** İki durum art arda gösterilir. Katman yoksa dönüş teli kartın etrafından uzun bir yol izler ve büyük bir halka oluşur. Halka büyükse çevreden gelen elektromanyetik gürültüyü (telefon, motor, Wi-Fi gibi kaynaklar) yakalar ve devrenin kendi hızlı sinyalleri de çevreye gürültü yayar. Katman varsa dönüş yolun hemen altından gider, halka çok küçük olur; hem yakalama hem yayma azalır. Küçük halka, GND katmanının en önemli faydasıdır.

**Katmanın diğer faydaları:** (1) Ortak sıfır noktası. (2) Çok düşük direnç: geniş ve kalın bakır, ince bir telden çok daha az dirençlidir, bu yüzden üzerinde gerilim kaybı ve ısınma ihmal edilebilir. (3) Kalkan: üst ve alt katmandaki yolları birbirinden ayırır; yollar arası karışmayı azaltır. (4) Isı dağıtma: sıcak bir çipin ısısı geniş bakıra yayılır.

**Önemli:** Pille çalışan cihazlardaki (telefon, saat, kumanda, Deneyap kartı) toprak katmanı gerçek toprağa bağlı değildir. Bu, önceki slaytta konuştuğumuz iki ayrı "toprak" fikrinden devre toprağıdır (GND): referans ve dönüş yolu. Evdeki koruma topraklaması (yeşil-sarı kablo) ayrı bir güvenlik bağlantısıdır. Fiş prizli bazı cihazlarda (bilgisayar kasası gibi) bu ikisi bilinçli olarak birleştirilebilir; pilli cihazlarda birleşmez.

**Sınıfa soru:** Telefonun içinde toprak katmanı toprağa mı bağlı? **Cevap:** Hayır. Telefon pille çalışır ve yere ayrı bir bağlantısı yoktur. Katman yalnızca telefonun kendi sıfır noktasıdır: pilin eksi ucuyla aynı noktadır. Telefonu yere bırakmak ya da elimize almak bu katmanı değiştirmez.

**Öğrencilerin aklına gelebilecek sorular:** "Katman neden bakır?" Bakır çok iyi bir iletkendir ve kartın yolları zaten bakırdan yapılır; bir katmanı yol çizmek yerine tümüyle bakır bırakmak yeterlidir. "Via ne işe yarar?" Üstteki parçanın GND ayağını katmana en kısa yoldan bağlar; ayak ile katman arasına uzun yol yerine kısa bir bakır boru girer. "Her şeyi GND'ye neden bağlıyoruz?" Hepsi aynı sıfırdan ölçsün ve akım dönebilsin diye. "Akım pile ya da şarj aletine nereden döner?" Katmandan, kartın güç girişindeki GND bağlantısına ve oradan pilin eksi ucuna ya da USB kablosunun GND teline.

**Gerçekte denenmez:** Slayttaki hiçbir şey denenecek bir deney değildir; kartın kenarlarına, özellikle şarj olan ya da şişmiş pillere, bakır yüzeylere bir telle dokunarak kısa devre yapılmaz.

**Bağlantı:** Geri: "GND nedir?" ve "Evdeki toprak gerçekten toprak mı?" slaytları. İleri: bir sonraki slaytta USB-C kablosunun içine bakacağız; kablodaki GND telleri kartın bu toprak katmanına ulaşır, VBUS teli de pilin ya da şarj aletinin artı ucundan gelen 5 V'u getirir.

#### 57. USB-C kablosunun içinde ne var?

**Bu slaytta:** Kabloya adım adım yaklaşıyoruz: bütün kablo, kesit, fiş. Kesitte güç telleri (kalın kırmızı VBUS ve siyah GND) ile veri çifti (yeşil D+ ve beyaz D−) ayrı görülür; fişte 24 kontak renk gruplarıyla gösterilir. Bir sonraki slayt fişin tek bir sırasına yaklaşıp her kontağın ne yaptığını gösterir.

**Konu:** Önceki slaytta GND'nin "sıfır dediğimiz nokta" olduğunu ve kartın içinde bütün bir bakır katman olarak durduğunu gördük. Şimdi aynı fikri kartın dışına taşıyoruz: bir USB-C kablosunun içinde kimin ne işe yaradığına bakıyoruz. Bu slayt üç durak arasında yaklaşır: kablo, kesit, konnektör; sonra başa döner. Sol üstteki başlık hangi durakta olduğumuzu gösterir. Görsel kılavuz çizim gibi basitleştirilmiştir ("ölçekli değil · basitleştirilmiş model"); bu yüzden teller ve fiş gerçeğinden kat kat büyük, oranlar da yaklaşık çizilmiştir.

**Kablo durağı:** Bir şarj adaptörü ile bir geliştirme kartını bağlayan tipik bir USB-C kablosu. Kablonun dışı düz bir plastik boru gibi görünür, ama içinde birkaç ince tel vardır. Turuncu halka, bir sonraki adımda yaklaşacağımız kesit düzlemini gösterir. Bu bir çizim: gerçek bir kabloyu kesmek zorunda değiliz.

**Kesit durağı:** Kablo bir noktadan enine kesilmiş gibi gösterilir. Dıştan içe: (1) dış kılıf, yalıtkan plastik koruma. (2) Örgülü blendaj: ince metal tellerden örülmüş zırh; dışarıdan gelen elektriksel gürültüyü (telefon, motor, Wi-Fi gibi kaynakları) içerideki tellerden uzak tutar. (3) Drain teli: blendaja değen çıplak ince tel; blendajı GND'ye bağlayan yoldur. (4) Kalın kırmızı tel VBUS: 5 V'luk artı taraf, akımın cihaza gidiş yolu. (5) Kalın siyah tel GND: 0 V, yani referans; akımın kaynağa döndüğü yol. Gidiş ve dönüş birlikte bir halka kurar; akım hep bir halka çizmek zorundadır (devre ve akım halkası konuları). Teller kalındır çünkü şarj akımı büyüktür; ince telin direnci yüksek olur, hem ısınır hem de gerilim kaybeder. (6) Yeşil D+ ve beyaz D− telleri birbirine bükülmüş tek çift olarak veri taşır. İki tel zıt işaretli gerilimler taşır ve alıcı yalnızca ikisinin farkına (D+ − D−) bakar. Dışarıdan gelen gürültü iki tele aynı miktarda bindiği için fark alınınca silinir; bükmek de gürültünün iki tele eşit binmesini sağlar. Detayını bir sonraki slaytlarda göreceğiz. (7) İnce CC teli: kablonun hangi yönde takıldığını ve ne kadar güç verileceğini anlaştıran kontrol teli. (8) Gri çiftler: yüksek hızlı veri hatları; hepsi bir blendajla sarılıdır ve yalnızca bazı kablolarda bulunur. Çizimde kaç çift olduğuna takılmayın: kabloya göre değişir. Önemli: yalnızca şarj için yapılmış kablolarda sadece VBUS, GND ve CC bulunur; bu yüzden bazı kablolar ince, bazıları kalındır ve "şarj eder ama bilgisayarla veri alışverişi yapmaz" olabilir. Kırmızı ve siyahın sayısı da tipik bir kabloya göre çizilmiştir; bazı kablolarda daha fazla olabilir. Renkler de üreticiye göre değişebilir; bu slayttaki renkler bu derslerde anlaşmamız için seçilmiştir.

**Konnektör durağı:** Kablonun ucundaki fiş. Dışta metal kabuk, arkada plastik gövde ve kablo. Kabuğun içinde iki sıra kontak vardır: üstte 12, altta 12, toplam 24. Renkler gruplara göre: GND dört, VBUS dört, CC iki, D+ ve D− dört, SBU iki (yan bant uçları; bu derslerde ayrıntısına girmiyoruz), hızlı veri çiftleri sekiz kontak. Fiş ters takılsa da çalışır; çünkü iki sıra yarım tur çevrilince aynı uçları aynı yere getirecek şekilde dizilmiştir. Cihaz fişin hangi yönde takıldığını CC ucundan anlar (aşağıdaki Pin bölümünde). Bir süre sonra fiş yarım tur dönerek bunu gösterir; iki durumda da aynı renkli kontaklar aynı yerde görünür. Ayrıntı: gerçek fişte kontaklar kabuğun içindedir; çıkıntılı "dil" soketin (dişi tarafın) içinde durur. Ayrıca gerçek bir fişte iki CC ucundan yalnızca biri CC olarak, diğeri ise kabloya elektrik vermek için kullanılır (VCONN). Slaytta ikisi de CC rengiyle gösterilir; model basitleştirilmiştir.

**Sınıfa soru:** Neden bir USB kablosunda iki değil dört GND ucu var? **Cevap:** İki sebep var. Birincisi akım dönüşü: dört kontak paralel çalışınca akım aralarında bölünür, her kontak daha az akım taşır, ısınma ve gerilim kaybı azalır; ince bir kontaktan geçecek akım dört kontağa yayılır. İkincisi fiş ters takılabildiği için her iki sırada da GND'nin bulunması gerekir: her sırada iki GND ucu vardır (A1, A12 ve B1, B12).

**Gerçekte denenmez:** Şarj adaptörleri, kablolar ve piller bu amaçla açılmaz, kablo kesilmez. Şarj adaptörünün içinde şebeke gerilimi vardır ve çok tehlikelidir. Kabloyu kesip bakmak da şarj eden bir kabloda kısa devreye ve yangına yol açabilir. Bu slayttaki kesit bir çizimdir; gerçeği görmek için internetteki röntgen ya da kesit fotoğraflarına bakılır.

**Geçiş:** Fişin içindeki kontaklardan bir sırayı büyütüp her birinin görevine bakalım.

#### 58. Her kontak ne iş yapar?

**Bu slaytta:** Fiştaki bir sıra kontak büyütülmüş. Animasyon üç görevi sırayla vurgular: güç (VBUS ve GND, voltmetre 5 V gösterir), CC (yön ve güç anlaşması), D+ ve D− (veri çifti). Kontaklar arası mesafe gerçekte yaklaşık 0,5 mm; çizim büyütülmüştür.

**Pin durağı:** Kontaklardan yalnızca bir sıra gösteriliyor ve uçlar numaralanmış: A1 GND, A4 VBUS, A5 CC1, A6 D+, A7 D−, A12 GND. Kontaklar arası mesafe yaklaşık 0,5 mm'dir; çok küçük olduğu için çizim büyütülmüştür. Sağdaki voltmetre iki ucu şöyle bağlar: kırmızı uç VBUS'a (A4), siyah uç GND'ye (A1). Ekran 5 V gösterir: VBUS − GND = 5 V. Yani 5 V dediğimiz şey tek bir telin gerilimi değil, iki tel arasındaki farktır ve ölçü hep GND'ye göredir ("5 V, GND'ye göre ölçülür"). GND'nin tanımı: GND, devrenin sıfır volt referansıdır; akımın kaynağa döndüğü yoldur. Deniz seviyesi benzetmesini hatırlatın: yükseklikleri deniz seviyesinden ölçeriz, gerilimleri GND'den. VBUS'ın varsayılan değeri 5 V'tur; daha yüksek gerilimler ancak CC ucundan anlaşma yapıldıktan sonra verilir. Bu yüzden CC ucu "yönü ve gücü anlaşan tel" olarak anlatılmıştır.

**Geliştirme kartındaki USB-C:** Kartlarda (Deneyap Kart gibi) çoğunlukla 16 uçlu, yalnızca USB 2.0 destekleyen basit USB-C soketi bulunur: VBUS, GND, CC1, CC2, D+, D−, SBU ve kabuk uçları. CC1 ve CC2'nin her biri ile GND arasına 5,1 kΩ'luk bir direnç bağlıdır; şarj aleti bu direnci görünce karşısındaki cihazın standart bir cihaz olduğunu anlar ve 5 V verir. Bu direnç olmasa modern bir USB-C şarj aleti kabloya hiç gerilim vermeyebilir. Karta gelen 5 V iki yere gider: kartın üzerindeki regülatör bu 5 V'tan 3,3 V üretir (işlemci ve sensörler 3,3 V ile çalışır); D+ ve D− ise USB-seri çevirici çipe gider, o çip bilgisayarın USB dilini ESP32'nin sade seri hattına (TX ve RX) çevirir. Bu parçaları bir sonraki slaytta kartın üzerinde adım adım göreceğiz. Güç ve yüksek akım taşıyan bazı kablolarda fişin içine e-marker adlı küçük bir çip konur; kablonun ne kadar akım taşıyabileceğini bildirir. Kısaca bilsin, ayrıntısına girmeyelim.

**Öğrencilerin aklına gelebilecek sorular:** "GND teli neden ayrı bir tel, kablonun dışı ya da blendaj dönmüyor mu?" Akım dönüşü için GND teli vardır; blendaj dönüş yolu olarak tasarlanmamıştır, görevi gürültüyü tutmaktır. "Kablo kırmızı ve siyah olunca hangisi artı?" Kırmızı VBUS 5 V'tur, siyah GND 0 V'tur; renkler bu slayttaki anlaşmadır, bütün üreticiler aynı renkleri kullanmaz.

**Gerçekte denenmez:** Şarj adaptörleri, kablolar ve piller bu amaçla açılmaz, kablo kesilmez. Şarj adaptörünün içinde şebeke gerilimi vardır ve çok tehlikelidir. Kabloyu kesip bakmak da şarj eden bir kabloda kısa devreye ve yangına yol açabilir. Bu slayttaki kesit bir çizimdir; gerçeği görmek için internetteki röntgen ya da kesit fotoğraflarına bakılır.

**Bağlantı:** Geri: kablo, kesit ve fiş. İleri: "Geliştirme kartı (ESP32)" slaydında USB-C soketini, CC uçlarındaki 5,1 kΩ dirençleri, USB-seri çeviriciyi ve 3,3 V regülatörü kartın üzerinde bulacağız.

#### 59. Geliştirme kartı

**Bu slaytta:** animasyon kartı kendiliğinden gezer; her parçada yaklaşık dört saniye durur ve alttaki yazı o parçanın adını ve işini söyler. Sıra enerjinin ve verinin izlediği yola göredir: USB, USB çipi, regülatör, işlemci, kristal, anten, düğmeler, pinler, GND, LED, kondansatör ve dirençler. Önceki slaytlarda GND'yi, PCB'nin katmanlarını ve USB-C kablosunun içini gördük; bu slayt hepsini gerçek bir karta yerleştirir. Kart genel bir ESP32 tabanlı geliştirme kartıdır; Deneyap Kart gibi kartlar da aynı mantıkla yapılır.

**1 · USB:** Kablo kartın tek dış bağlantısıdır. Soket 16 uçludur: VBUS (5 V), GND, CC1 ve CC2, D+ ve D−, birkaç yardımcı uç ve metal gövde. Kartı bilgisayara takınca hem güç hem veri aynı kablodan gelir.

**2 · USB-seri çevirici:** Bilgisayar USB dilini konuşur (D+ ve D− çifti). ESP32 ise TX ve RX adlı sade bir seri hattı konuşur. Aradaki küçük çip tercümandır. Program yükleme ve ekrana yazdırılan mesajlar bu yoldan geçer.

**3 · Regülatör:** VBUS'tan gelen 5 V girer, 3,3 V çıkar; bu 3,3 V hem ESP32'yi hem de 3V3 pinini besler. Aradaki 5 − 3,3 = 1,7 V regülatörün üzerinde kalır ve ısıya dönüşür: kart yaklaşık 0,2 A çekerse 1,7 V × 0,2 A = 0,34 W eder. Regülatörün ısınmasının nedeni budur.

**4 · İşlemci (ESP32 modülü):** Metal kutunun altında çipler vardır. Çipin içinde iki çekirdek bulunur ve en çok saniyede 240 milyon tık (240 MHz) hızla çalışır. 520 KB RAM, işlemcinin o an üzerinde çalıştığı sayıları tutar. Program ise ayrı bir flaş belleğinde, bu kartta 4 MB'lık bir çipte durur. Çipin içinde Wi-Fi ve Bluetooth radyosu da vardır; antene bu radyo bağlıdır. İşlemcinin içine Bilgisayar bölümünde gireceğiz.

**5 · Kristal:** Kuvars parçası elektrik verilince çok düzenli titreşir (saniyede 40 milyon kez, 40 MHz). Devre bu titreşimi sayarak düzenli saat tıkları üretir; ESP32 bu 40 MHz'i çarparak kendi hızına çıkarır. Saat işlemcinin metronomudur: her işlem bir tıkta ilerler. Bu kartta kristal modülün kutusunun içindedir.

**6 · Anten:** PCB üzerindeki zikzak bir bakır yoldur. Akımı 2,4 GHz'lik radyo dalgasına çevirip yayar; gelen dalgayı da tekrar elektrik sinyaline çevirir. Antenin altında ve çevresinde bakır olmaz; yoksa sinyal zayıflar.

**7 · Düğmeler:** EN düğmesi kartı kısa süre durdurup programı baştan başlatır (reset). BOOT düğmesi, kart açılırken basılı tutulursa işlemciyi yeni program yükleme kipine sokar. Birçok kart bu işi USB çipiyle otomatik yaptığı için BOOT'a nadiren basılır.

**8 · Pinler:** Kartın kenarındaki delikli bakır halkalara pin sıraları lehimlenmiştir. 3V3 pini 3,3 V verir, GND pini 0 V noktasıdır, GPIO pinleri programın seçtiği gibi 0 ya da 3,3 V verir veya dışarıdan gelen 0 ya da 3,3 V'u okur. Pinler 2,54 mm aralıklıdır; kablolar ve breadboard bu aralığa göre yapılır. Sensörler bu pinlere bağlanır.

**9 · GND:** GND pinleri kartın farklı yerlerinde durur ama hepsi PCB'deki bakır toprak katmanına bağlıdır; aynı bakır ağdır, aynı sıfır noktasıdır. Bağladığınız her şeyin GND'si kartın GND'sine bağlanmazsa gerilimler aynı sıfıra göre ölçülmez. Bu GND, evdeki koruma toprağı değildir. Çok GND pini olmasının nedeni de budur: hangisine bağlarsak bağlayalım aynı sıfır noktasına bağlanırız ve dönüş yolu kısa kalır.

**10 · LED:** Küçük bir dirençten geçen akımla yanar. Yandığında kartın elektrik aldığını anlarız.

**11 · Kondansatör ve dirençler:** Regülatörün girişindeki ve çıkışındaki, ayrıca çiplerin yanındaki küçük kondansatörler gerilimdeki ani dalgalanmaları süzer; çip bir an çok akım çektiğinde yedek kaynak gibi davranırlar. USB soketindeki CC uçlarında 5,1 kΩ'luk iki direnç vardır: şarj aleti bu direnci görünce kartın 5 V isteyen bir cihaz olduğunu anlar ve 5 V verir.

**Güç yolu:** VBUS 5 V → regülatör → 3,3 V → ESP32 ve 3V3 pini (LED'e de ulaşır). Akım GND üzerinden USB kablosuna geri döner; devre bir döngüdür.

**Veri yolu:** bilgisayar → D+/D− → USB-seri çevirici çip → TX/RX → ESP32. Yanıt aynı yoldan geri gider.

**Program nerede?** Yazdığımız program flaş belleğe yüklenir. Flaş, güç kesilince içeriğini korur. RAM ise çalışma masasıdır; güç gidince içindekiler silinir. Kartı bilgisayardan çekip tekrar takınca programın yeniden çalışmasının nedeni budur.

**Sınıfa soru:** USB'den 5 V geliyor, işlemci 3,3 V ile çalışıyor. Aradaki 1,7 V nereye gidiyor? **Cevap:** Regülatörün üzerinde kalır ve ısıya dönüşür; 0,2 A'de 1,7 V × 0,2 A = 0,34 W'tır.

**Sınıfa soru:** Kartı bilgisayardan çıkardık. Program silinir mi? **Cevap:** Hayır, program flaş bellekte durur. Silinen RAM'deki geçici sayılardır.

**Deneyap Kart:** ESP32 tabanlı yerli bir geliştirme kartıdır; Wi-Fi ve Bluetooth içerir. Bu slaytta gösterilen kart genel bir ESP32 kartıdır; parçaların yerleri üreticiden üreticiye değişir.

**Geçiş:** Kartın pinlerine bağlanan sensörlere geçiyoruz: sensör nedir?

### 4 · Sensör

#### 60. Sensör nedir?

**Bu slaytta:** animasyon telefondaki sensörleri sırayla, her birini ilkesiyle gösterir: kamera, mikrofon, ivmeölçer, ışık, yakınlık, dokunmatik ekran ve GPS. Alttaki yazı o anda görünen sensörü söyler.

**Tanım:** sensör; ışık, ses, hareket, sıcaklık gibi fiziksel bir büyüklüğü elektrik sinyaline çeviren parçadır. Her sensör bir dönüştürücüdür.

**Cebinizde:** bir akıllı telefonda bir düzineden fazla sensör bulunur.

**Ortak dil:** her sensör ölçtüğü şeyi elektrik sinyaline çevirir: bir gerilim, bir direnç değişimi ya da bir zaman darbesi. Kart bunu sayıya çevirir. Kamera ışığı, mikrofon ses basıncını, ivmeölçer hareketi elektrik sinyaline çevirir.

**Örnekler:** telefonu yan çevirince ekranın dönmesi ivmeölçer, görüşmede kulağa yaklaşınca ekranın kapanması yakınlık sensörü, karanlıkta ekranın kısılması ışık sensörü sayesindedir.

**Sınıfa soru:** Telefonu yan çevirince ekran neden döner? **Cevap:** İvmeölçer yerçekiminin hangi yönde olduğunu ölçer; telefon yönü bundan anlar.

**Geçiş:** Sırada tek bir sensöre yakından bakıyoruz: sesle mesafe ölçen sensör.

#### 61. Analog ve dijital

**Bu slaytta:** Aynı top, aynı yolculuk: solda rampada, sağda merdivende. Gösterim seviye sayısını 2, 4, 8 ve 16 yaparak kendi kendine ilerler. Rampada top her yükseklikte durabilir (analog); merdivende yalnızca basamaklarda durur (dijital). Seviye arttıkça merdiven rampaya benzer.

**Zemin de bir seviyedir:** 0 m yüksekliği de sayılır. 8 seviyeli merdivende 7 blok ve zemin vardır.

**Bit:** 2 basamak 1 bit, 4 basamak 2 bit, 8 basamak 3 bit (2 × 2 × 2), 16 basamak 4 bit. Her bit basamak sayısını ikiye katlar.

**Örnekler:** İbreli saat analog, rakamlı saat dijital. Plak analog, müzik dosyası dijital.

**Sonraki slayt:** Gerçek dünyadaki analog bir büyüklüğü, ışığı ve sıcaklığı, nasıl elektrik gerilimine çevirdiğimize bakacağız.

#### 62. Gürültü nedir?

**Bu slaytta:** animasyon beş görünümü sırayla kendi kendine gezer (her biri yaklaşık 8 saniye): sinyal, gürültü, kaynaklar, ortalama, dijital. Gürültü miktarı ve ortalama sayısı kendiliğinden değişir. “Gürültü” kelimesini ses olarak biliyoruz; elektronikte aynı kelime, telde ölçtüğümüz gerilimin üstüne binen küçük, rastgele, istemediğimiz değişimi anlatır. Bir sensör telinde ses yoktur; yalnızca voltmetrenin değeri titrer (hoparlörde bu cızırtı olarak duyulabilir). Önceki slayttaki analog sinyal düzgün bir çizgiydi; gerçek tellerde çizgi her zaman biraz kırışıktır.

**Sinyal ve gürültü görünümü:** mavi çizgi sensörün verdiği gerilim, kesikli gri çizgi olması gereken “gerçek” değerdir; aradaki fark gürültüdür. Görsel, farkı görebilmeniz için dikey ekseni 1,50-1,80 V aralığına büyütür; gerçek sensör 0-3,3 V arasında çalışır, yani gürültü gerçekte çok daha küçük görünür.

**Gerçek sayılar:** ESP32 gibi bir kartın ADC’sinde gürültü çoğu zaman yaklaşık ±0,02 V civarındadır (karta ve ortama göre değişir). 0,02 ÷ 3,3 × 4.095 ≈ 25: 1,65 V ölçerken kart 2.048 yerine yaklaşık 2.023 ile 2.073 arasında dalgalanan sayılar okur. Animasyonda 0,30 düzeyi bu değeri, 1,00 düzeyi ±0,067 V’u gösterir.

**Gürültü nereden gelir?** (1) Isı: her iletkende titreşen iyonlar ve serbest elektronlar rastgele hareket eder; sıcaklıkla artar ve hiçbir iletkende sıfır olmaz (ısıl gürültü). (2) Motor ve anahtar: açılıp kapanan akım çevreye elektromanyetik dalga yayar. (3) Radyo dalgaları: telefon, Wi-Fi, Bluetooth; sensör teli küçük bir anten gibi bunları yakalar. (4) Yan yana kablo: komşu telin değişen akımı yandaki tele geçer. Isıl gürültü maddenin kendisinden geldiği için tamamen yok edilemez; amaç sinyali gürültüden yeterince büyük tutmaktır: sinyal 1,65 V, gürültü 0,02 V ise sinyal yaklaşık 83 kat büyüktür.

**ADC’ye etkisi:** ADC gerilimi sayıya çevirirken gürültüyü de sayar. 12 bitlik ADC’nin bir basamağı yaklaşık 0,8 mV, gürültü yaklaşık 20 mV’tur; sayının son birkaç basamağı anlamsızdır. Bu yüzden ölçüm tekrarlanıp ortalaması alınır.

**Ortalama:** gürültü rastgele olduğu için bir okuma gerçek değerin biraz üstünde, bir sonrakisi biraz altındadır. N okumayı toplayıp N’ye bölünce artı ve eksi sapmalar birbirini götürür; gürültü yaklaşık √N kat küçülür: 10 okumada √10 ≈ 3,2 kat, 100 okumada 10 kat (±0,02 V yaklaşık ±0,002 V). Bedeli zamandır: 100 okuma 100 kat daha uzun sürer, sensörler yavaş değiştiği için çoğu zaman sorun değildir.

**Donanımla azaltma:** sensör teli ile GND arasına kondansatör (hızlı titreşimler GND’ye kaçar, yavaş gerçek sinyal geçer; RC süzgeci kondansatör slaytında); bükümlü çift (dışarıdan gelen gürültü iki tele de aynı etkiyi yapar ve fark alınınca silinir; USB-C kablosundaki D+ ve D− bu yüzden bükülü gider); zırh (GND’ye bağlı metal örgü); sensör telini kısa tutmak, motor ve anahtardan uzak tutmak, güç kablosundan ayırmak.

**Dijital neden daha güvenli?** Dijital sinyalde iki durum ve aralarında bir eşik vardır: 3,3 ÷ 2 = 1,65 V. Gürültü sinyali eşiği geçecek kadar itmedikçe kart 1’i 1, 0’ı 0 okur; bilgi aynen geri gelir. Analogda küçük gürültü bile sayıyı değiştirir. Görselde dijital kısmın gürültüsü bilerek gerçekte olduğundan çok büyük çizilmiştir (en çok ±2,2 V); gürültü ±1,65 V’u aşınca bazı bitler ters okunur ve “bit yanlış” sayacı çalışır.

**Sınıfa soru 1:** Telefonu sensör kablosunun yanına koyup arama yapınca okuma neden bozulabilir? **Cevap:** Telefon radyo dalgası yayar; sensör teli bunu anten gibi yakalar ve gerilime rastgele bir değişim ekler. Kabloyu kısaltmak, bükümlü ya da zırhlı kablo kullanmak ve telefonu uzaklaştırmak etkiyi azaltır.

**Sınıfa soru 2:** Bir ışık sensörünü 100 kez okuyup ortalamasını alırsak gürültü kaç kat küçülür? **Cevap:** √100 = 10 kat.

**Güvenlik:** Burada şebeke gerilimiyle denenecek bir şey yoktur. Motor gürültüsü anlatılırken yalnızca pille çalışan küçük bir fırçalı motor kullanılabilir.

**Geçiş:** Önceki slaytta analog ve dijitali ayırmıştık. Sonraki iki slayt buna dayanır: analog sensörler (gerilim gürültüyle birlikte gelir) ve analogdan sayıya (ADC gürültüyü de sayar).

#### 63. Analog sensörler

**Bu slaytta:** Gösterim sırayla ışık sensörünü (LDR), sıcaklık sensörünü (NTC) ve potansiyometreyi gösterir. Sensörün direnci değişince iki direncin paylaştığı gerilim değişir. Kutuların yüksekliği gerilim payını gösterir: büyük direnç büyük pay alır. Çıkış gerilimi (Vout) iki kutunun arasından alınır ve sağdaki çubuğun seviyesidir. Kaydırıcıyı tutarsanız otomatik gösterim durur ve değeri siz belirlersiniz.

**LDR (ışığa duyarlı direnç):** Kadmiyum sülfür (CdS) şeridi. Işık fotonları elektronları bağlarından koparır; serbest elektron arttıkça direnç düşer. Karanlıkta yüzlerce kiloohm, aydınlıkta birkaç kiloohm.

**NTC termistör:** Yarı iletken bir seramik; ısındıkça daha çok taşıyıcı serbest kalır, direnci azalır (silisyum slaytını hatırlayın).

**Potansiyometre:** Düğmeyle ayarlanan, üç uçlu değişken dirençtir.

**Gerilim bölücü (iki adım):** (1) Seri bağlı: toplam direnç = Rsensör + 10 kΩ; akım I = 3,3 ÷ (Rsensör + 10 kΩ). (2) Vout, 10 kΩ'un üzerinde okunur: Vout = I × 10 kΩ (Ohm). Birleştirince Vout = 3,3 V × 10 kΩ ÷ (Rsensör + 10 kΩ). Seri bağlantıyı hatırlayın: iki direnç 3,3 V'u paylaşır.

**Örnek:** Karanlıkta LDR 100 kΩ ise I = 3,3 ÷ 110 kΩ = 0,03 mA ve Vout = 0,03 mA × 10 kΩ = 0,3 V. Aydınlıkta LDR 1 kΩ ise Vout = 3,3 × 10 ÷ 11 = 3,0 V. Işık arttı, gerilim arttı.

**Sonraki slayt:** Kart bu gerilimi nasıl bir sayıya çevirir?

#### 64. Analogdan sayıya

**Bu slaytta:** Kart, sensörden gelen gerilimi ölçer ve 0 ile 4.095 arasında bir sayıya çevirir. Bu işi ADC denen devre yapar. Gösterimde gerilim yükselirken merdivenin basamakları dolar, sayı büyür; tam yarıda (1,65 V) sayı 2.048 olur. Kaydırıcıyla gerilimi siz de değiştirebilirsiniz.

**12 bit:** 12 tane 2'yi çarparsak (2 × 2 × … × 2) 4.096 eder. 0'dan saydığımız için sayılar 0 ile 4.095 arasındadır.

**Kartlar:** Deneyap Kart gibi ESP32 tabanlı kartlar 12 bit, Arduino Uno 10 bit (0–1.023) ölçer.

**Hesap:** sayı = Vout ÷ 3,3 V × 4.095. 1,65 V (tam yarı) → yaklaşık 2.048. Bir basamak 3,3 V ÷ 4.096 ≈ 0,8 mV'tur: kart bundan küçük farkları ayırt edemez.

**Nasıl çevrilir?** Kart gerilimi yarıyla karşılaştırır: büyükse 1, küçükse 0 yazar; kalan aralığı yeniden ikiye böler. 12 karşılaştırma 12 bit verir. Örnek: 1,65 V tam ortadır: ilk bit 1, geri kalanlar 0 → 1000 0000 0000 = 2.048.

**Bağlantı:** Önceki slayttaki ışık sensörünün gerilimi bu sayıya dönüşür; programcı artık "ışık 2.048" gibi bir sayıyla çalışır.

**Gerçek kart:** Burada ideal bir ADC görüyoruz. Gerçek ESP32'nin ölçümü tam doğrusal değildir: 0 V'a ve 3,3 V'a çok yakın gerilimlerde sapar, çipten çipe de küçük farklar olur. Kartta analogRead ile okuduğunuz sayı buradaki ideal değerden biraz farklı çıkabilir; bu bir hata değil, gerçek ölçümün doğasıdır.

**Sonraki bölüm:** Artık her şey sayı. Bilgisayar bu sayılarla nasıl işlem yapar?

#### 65. Op-amp: küçük sinyali büyütmek

**Bu slaytta:** Üç adım. (1) Sorun: mikrofon yalnızca yaklaşık 5 mV verir; ADC 0 – 3,3 V bekler ve bu sinyal ADC'de yalnızca yaklaşık 6 basamaktır. (2) Çözüm: yükselteç. Çıkıştan − girişe iki direnç bağlanır (geri besleme); kazancı çip değil dirençler belirler, kazanç = 1 + Rf ÷ Rg. Kazanç 1, 10, 100 sırayla gösterilir ve 5 mV sinyal ADC'de 6, 62, 620 basamağa çıkar. (3) Sınırlama: çıkış besleme geriliminden büyük olamaz; giriş × kazanç 3,3 V'u aşınca dalganın tepeleri yassılır (kırpılma). Op-amp'in içi anlatılmaz; kara kutu olarak girişleri ve çıkışıyla tanınır. Sonraki slayt: aynı çipin geri besleme olmadan nasıl karar verdiği.

**Konu:** Sensör bölümünde bir sorunla karşılaşıyoruz: ADC 0 – 3,3 V arasındaki gerilimi 0 – 4.095 arasında bir sayıya çevirir, ama her sensör o kadar büyük bir gerilim vermez. Mikrofon gibi bazı sensörler yalnızca birkaç milivolt (1 mV = 0,001 V) verir. Bu slayt, küçük gerilimi büyütmek için kullanılan elemanı tanıtır: işlemsel yükselteç, kısaca op-amp (İngilizce operational amplifier). Bu derslerde op-amp'in içindeki devreyi öğrenmeyeceğiz (içinde yaklaşık yirmi transistör vardır); onu bir kara kutu gibi, girişleri ve çıkışıyla tanıyacağız.

**Sorun bölümü:** Mikrofonun sinyali yaklaşık 5 mV tepe değerindedir. ADC'nin bir basamağı 3,3 V ÷ 4.095 ≈ 0,8 mV'tur. Hesap: 5 mV ÷ 3,3 V × 4.095 = 0,005 ÷ 3,3 × 4.095 ≈ 6. Yani mikrofondaki tüm ses değişimi ADC'de yalnızca yaklaşık 6 sayılık bir oynamaya dönüşür; üstelik Gürültü nedir? slaytında gördüğümüz gürültü (örnekte yaklaşık 20 mV) bundan çok daha büyüktür, sinyal gürültüde kaybolur. Sağdaki büyüteç kutusu aynı sinyali yakından gösterir: sinyal var, ama ADC'nin ölçeğinde çizgi gibi görünür. Çözüm: sinyali ADC'ye vermeden önce büyütmek. Bunu yapan elemana yükselteç denir.

**Op-amp nedir?** Üçgen biçiminde sembolle çizilen bir çiptir. Üç şeyi vardır. (1) İki giriş: üstteki + girişi (evirmeyen), alttaki − girişi (eviren). (2) Bir çıkış: üçgenin sivri ucu. (3) İki güç ucu: V+ (burada 3,3 V) ve GND. Görselde güç uçları üçgenin üstünden ve altından çıkar. Güç uçları genellikle şemalarda çizilmez ama çip onlardan beslenir; çıkışın alabileceği gerilim de bu iki uçla sınırlıdır. Op-amp'in yaptığı iş: iki girişi arasındaki farkı (V+ − V−) alır, çok büyük bir sayıyla çarpar ve çıkışa verir. Yalnızca farka bakar: iki giriş de 2 V ise fark 0'dır ve çıkış değişmez. Bu çarpana kazanç (gain) denir: kazanç 10 ise çıkış girişin 10 katıdır, kazanç 100 ise 100 katıdır. Gerçek bir op-amp'in kendi başına kazancı çok büyüktür (binlerce, yüz binlerce kat); bu ayrıntıyı karşılaştırıcıda kullanacağız.

**Yükselteç bölümü (geri besleme):** Kazancı tek başına çok büyük bırakmak istemiyoruz; 5 mV'u 100 kat büyütmek istiyoruz, bir milyon kat değil. Bunun için çıkıştan − girişe bir geri besleme yaparız: çıkıştaki gerilimin bir kısmı geri döner. Çıkış ile − girişi arasına bir direnç (Rf), − girişi ile GND arasına bir direnç (Rg) koyarız. Giriş sinyali + girişine verilir. Bu bağlantıya evirmeyen yükselteç denir ve kazancı yalnızca iki dirençten gelir: kazanç = 1 + Rf ÷ Rg. Örnek: Rg = 1 kΩ, Rf = 99 kΩ ise kazanç = 1 + 99 ÷ 1 = 100. Rf = 9 kΩ ise kazanç = 1 + 9 ÷ 1 = 10. Rf = 0 Ω (düz tel) ise kazanç = 1 + 0 ÷ 1 = 1, yani çıkış girişle aynıdır. Gösterimde 1, 10 ve 100 kazancı sırayla görünür. Neden böyle çalıştığını (op-amp'in kendini nasıl dengelediğini) bu derslerde türetmiyoruz; önemli olan sonuçtur: çıkışı büyük yapan çip, ama büyüklüğü seçen iki dirençtir. Böylece kazanç çipten çipe değişmez, sıcaklıkla oynamaz ve kararlıdır. Geri beslemenin sade anlatımı: çıkış çok büyürse geri dönen kısım − girişi de yükseltir, fark küçülür ve çıkış büyümeyi bırakır; çıkış, istenen kazançta durur.

**ADC bağlantısı:** 5 mV × 100 = 500 mV = 0,5 V. ADC için: 0,5 ÷ 3,3 × 4.095 ≈ 620 sayı. Yükseltmeden önceki 6 sayı ile karşılaştırın: aynı mikrofon artık ADC'nin ölçeğini görünür biçimde kullanıyor ve 5 mV'luk sinyal yaklaşık 620 basamağa yayılıyor. Kazanç 10 ise 50 mV ve yaklaşık 62 sayı olur; kazanç 1 ise yine 6 sayı kalır. Görseldeki sağ çubuk ADC'nin ölçeğidir; çubuğun dolan kısmı o andaki gerilimi, kesikli çizgi tepe değerini gösterir. Bu fikir bir sonraki slaytlarla bağlanır: sensörün küçük gerilimini bu şekilde büyütüp ADC'ye veririz.

**Sınırlama bölümü (kırpılma):** Çıkış, besleme geriliminin dışına çıkamaz. Bir op-amp enerjisini V+ ve GND uçlarından alır; bu iki gerilimin ötesinde bir değer üretecek enerji yoktur. Burada besleme 3,3 V olduğu için çıkış 0 V ile 3,3 V arasında kalır. Gösterimde giriş yavaşça büyür; kazanç 100 iken 40 mV × 100 = 4 V olması gerekir, ama çıkış 3,3 V'ta yassı bir çizgi olur: buna kırpılma denir. Kesikli çizgi, kırpılmasaydı sinyalin nasıl görüneceğini gösterir. Kırpılan kısımdaki bilgi geri gelmez: dalganın tepesi kaybolur. Ses yükselteçlerinde bu bozulma olarak duyulur; ölçümde ise sensörün gerçek değeri yerine hep 3,3 V okunur. Çözüm: kazancı küçültmek ya da girişi azaltmak. Kazancı 1 ya da 10 yaparsanız kırpılma olmaz. Basitleştirme: sinyal 0 V'un üstünde çizilmiştir; gerçek mikrofon devrelerinde sinyal, besleme ortasında (burada yaklaşık 1,65 V) bir seviye çevresinde salınır ve üstten de alttan da kırpılabilir.

**Gürültü de büyür:** Yükselteç, girişe ne gelirse onu büyütür: sinyali de, gürültüyü de. Girişteki gürültü 0,1 mV ise 100 kat büyümüş hâli 10 mV olur. Bu yüzden sensöre yakın, kısa kablolu ve temiz bir yükselteç tasarımı önemlidir (Gürültü nedir? slaydında kısa, bükümlü kablo ve süzgeç gördük). Yükseltecin amacı sinyali gürültüden önce büyütmektir: yükselteçten sonra eklenen gürültü ise büyümez; bu yüzden sinyali gürültü eklenmeden önce büyütmek daha iyidir.

**Op-amp nerelerde saklı?** Telefonun mikrofonunda ve kulaklık çıkışında (sesi büyütür), ışık, sıcaklık, basınç ve gaz sensörü kartlarında (sensörün küçük gerilimini ADC'ye uygun hâle getirir), akıllı saat ve spor bilekliklerindeki nabız sensöründe, ses yükselteçlerinde ve hoparlör sürücülerinde, süzgeçlerde (belli frekansları geçiren ya da tutan devreler), şarj devrelerinde pil gerilimini ölçen kısımlarda. Çoğu zaman bu işi çok küçük bir çip yapar; birçok sensör kartında analog bölümün hemen hemen hepsi op-amp'tir. Sensör kartı üzerinde bir LM358, LM393 (karşılaştırıcı), MCP6002 gibi bir yazı gördüğünüzde bu slayttaki elemanı görüyorsunuz demektir. Bir sonraki slaytlarda ışık, mesafe ve sıcaklık sensörlerine bakarken analog kısımdaki yükselteçleri anımsayın.

**Sınıfa soru 1:** Mikrofonun verdiği 5 mV'u 10 kat büyütürsek ADC kaç sayı okur? 100 kat büyütürsek? **Cevap:** 10 kat: 50 mV ÷ 3,3 V × 4.095 ≈ 62 sayı. 100 kat: 0,5 V ÷ 3,3 V × 4.095 ≈ 620 sayı. Kazanç büyüdükçe sinyal ADC'nin ölçeğini daha çok kullanır; ama çıkış 3,3 V'u aşacak kadar büyütmemeliyiz.

**Sınıfa soru 2:** Rg = 1 kΩ, Rf = 49 kΩ olsaydı kazanç ne olurdu? Girişe 20 mV verirsek çıkış ne olurdu? **Cevap:** Kazanç = 1 + 49 ÷ 1 = 50. 20 mV × 50 = 1.000 mV = 1 V. Bu 3,3 V'un altında olduğu için kırpılma olmaz.

**Güvenlik notu:** Bu slayttaki devreler yalnızca 3,3 V ya da pil gerilimiyle denenir; şebeke gerilimiyle hiçbir şey denenmez. Op-amp ve dirençlerle deney yapılacaksa güç uçlarının doğru bağlandığı kontrol edilir (V+ ile GND ters bağlanırsa çip zarar görebilir).

#### 66. Op-amp geri besleme olmadan: karşılaştırıcı

**Bu slaytta:** Op-amp'e geri besleme yapmazsak kazancı çok büyük olduğu için çıkış hemen bir uca gider: + girişi eşikten (− girişi, burada 0,5 V) büyükse çıkış 3,3 V (1), küçükse 0 V (0). Işığa duyarlı direnç (LDR) bölücüsünün gerilimi yavaşça değişir; çıkış eşiği geçtiği anda lamba yanar ya da söner. Yani op-amp burada bir karar verir; sokak lambası bunun günlük örneğidir. Bir önceki slayt geri beslemeli yükseltecti; bu slayt geri beslemesiz karşılaştırıcıdır.

**Karşılaştırıcı bölümü:** Op-amp'e hiçbir geri besleme yapmazsak kazanç çok büyük olduğu için çıkış hemen bir uca gider: V+ girişi V− girişinden büyükse çıkış besleme gerilimine (3,3 V, yani 1) gider; küçükse 0 V'a (yani 0) iner. Aradaki küçük bir fark bile yeter, çünkü fark × çok büyük kazanç hemen besleme sınırını aşar. Yani op-amp burada bir karar verir: hangi giriş daha büyük? Çıkış analog değil, 1 ya da 0'dır: dijital bir cevap. Görselde + girişine LDR'li bir gerilim bölücü bağlı (LDR ışığa duyarlı dirençtir; karanlıkta direnci büyür, bölücüde alt direnç büyüdüğü için V+ yükselir), − girişine ayarlı direnç (potansiyometre) bağlı: bu bir eşik gerilimidir, burada 0,5 V. Örnek: 0,8 V > 0,5 V olduğu için çıkış 1 olur ve lamba yanar; 0,2 V < 0,5 V ise çıkış 0, lamba söner. Kaydırıcı sensör gerilimini 0 – 1 V arasında değiştirir. Gerçek op-amp çıkışı besleme gerilimine tam değil, çok yakın bir değere gider; burada basitleştirdik. Her seferinde yeni bir çip almak gerekmez: bu iş için hazır karşılaştırıcı çipleri de vardır ve içlerindeki fikir aynıdır.

**Sokak lambası bağlantısı:** Sokak lambası karanlık basınca yanar, aydınlanınca söner. Bunu yapan şey tam olarak karşılaştırıcıdır: sensör gerilimi eşiğin bir tarafındaysa 1, öbür tarafındaysa 0. Görseldeki devrede LDR karanlıkta V+'yı yükselttiği için lamba karanlıkta yanar. Bir sonraki bölümlerde algoritmayı anlatırken aynı karar “eğer karanlıksa lambayı yak” diye yazılımda da görülecek: karşılaştırıcı bunun donanımdaki karşılığıdır, yazılımdaki hâli bir if (eğer) koşuludur.

**Bağlantı:** Önceki slaytlar: ADC (gerilimin sayıya dönüşmesi, 0 – 3,3 V → 0 – 4.095), Gürültü nedir? (istenmeyen değişim), gerilim bölücü (LDR devresi). Sonraki: Mesafe sensörü slaydı; sensörler ve kartlar arasındaki gerilim ve sayı ilişkisi orada sürüyor.

**Sınıfa soru 3:** Karşılaştırıcıda neden geri besleme gerekmez? **Cevap:** Çünkü ondan bir sayı değil, bir karar isteriz: çıkış 1 ya da 0 olsun. Op-amp'in kendi kazancı çok büyük olduğu için fark çok küçük bile olsa çıkış hemen besleme sınırına gider. Yükseltmede ise çıkışın büyüklüğünü seçilmiş bir sayıda tutmak isteriz; bunu geri besleme yapar.

#### 67. Mesafe sensörü

**Bu slaytta:** animasyon sensörden çıkan ses atımını, cisimden yansımasını ve geri dönüşünü gösterir; büyük sayı gidiş-dönüş süresidir. Cisim farklı uzaklıklara kayar ve her seferinde sayı değişir.

**Çalışma:** T (verici) 40 kHz'lik kısa bir ses gönderir; R (alıcı) yankıyı dinler. Kart aradaki süreyi ölçer ve d = 343 m/s × t ÷ 2 hesabını yapar.

**Örnek:** 2,9 ms → 343 × 0,0029 ÷ 2 ≈ 0,50 m.

**Neden ÷ 2?** Ses gidip geri döndüğü için yolun yarısı mesafedir.

**40.000 Hz:** İnsan kulağı yaklaşık 20.000 Hz'e kadar duyar; bu sesi duyamayız.

**Doğada:** Yarasalar ve yunuslar aynı yöntemle yön bulur.

**Fizik nedir slaytını hatırlayın:** gök gürültüsünde de yol = hız × süre hesabını yapmıştık. Orada ses yalnızca bize doğru geliyordu; burada gidip döndüğü için sonucu 2'ye böleriz. Sensör süreyi milyonda bir saniye hassasiyetle ölçer.

**Sınıfa soru:** Hava ısınınca ölçüm nasıl değişir? **Cevap:** 343 m/s, 20 °C havanın değeri. Hava 1 °C ısındıkça ses yaklaşık 0,6 m/s hızlanır; 30 °C'de yaklaşık 349 m/s olur. 50 cm uzaktaki cisme gidiş-dönüş 2 × 0,50 = 1,00 m yol vardır: 1,00 m ÷ 349 m/s ≈ 2,87 ms. Ses hızlı olduğu için yankı daha erken döner. Kart hâlâ 343 ile hesaplarsa 343 × 0,00287 ÷ 2 ≈ 0,49 m bulur, yani cismi biraz yakın ölçer. Hassas cihazlar sıcaklığı da ölçüp hızı buna göre düzeltir.

**Geçiş:** Sırada sensörün kartla nasıl konuştuğuna bakıyoruz.

#### 68. Sensör karta nasıl konuşur?

**Bu slaytta:** Animasyon kendiliğinden altı görünümü sırayla gezer: analog, dijital, darbe, I2C, SPI, UART. Her görünümde ESP32 kartı solda, sensör sağda; her tel gerilimini zaman içinde çizen bir şerit olarak görünür. Mavi çizgi karttan çıkan, turuncu çizgi sensörden gelen sinyaldir. Üstteki başlık hangi yöntemde olduğumuzu ve kaç tel kullandığını gösterir; alttaki cümle her görünümde değişir. Zaman çok yavaşlatılmıştır. 1 = akım geçiyor (3,3 V), 0 = geçmiyor (0 V).

**Konu:** Sensörün ölçtüğü değer ESP32'ye nasıl ulaşır? Cevap: teller üzerinden, gerilim olarak. Kartın pinleri birer metal uçtur; sensörden gelen şeyin ne anlama geldiğine sensör ile kart önceden anlaşmak zorundadır. Bu anlaşmaya haberleşme kuralı (protokol) denir. Animasyonda her tel, gerilimini zaman içinde çizen bir şerit olarak görünür: şeridin üst çizgisi 3,3 V (1), alt çizgisi 0 V (0). Mavi çizgi karttan çıkan, bakır çizgi sensörden gelen sinyaldir. Slayttaki zamanlar çok yavaşlatılmıştır; gerçekte bu bitler mikrosaniyeler sürer.

**Bağlantı:** "Analogdan sayıya" slaydında ADC'nin gerilimi sayıya çevirdiğini görmüştük; burada o gerilimin telden karta nasıl geldiğine bakıyoruz. Bir sonraki slayt, bitlerin neden tek tek (seri) gönderildiğini ve paralel göndermenin neden zorlaştığını anlatır.

**Analog:** LDR (ışığa duyarlı direnç) ya da potansiyometre gibi sensörler pine 0 V ile 3,3 V arasında herhangi bir gerilim verir; ışık arttıkça gerilim de değişir. Telde sayı yoktur, yalnızca bir düzey vardır. Sayıya çevirmek karttaki ADC'nin işidir: ESP32'nin ADC'si 12 bittir, yani 0 V'u 0, 3,3 V'u 4.095 sayar. Örnek: 1,90 V ÷ 3,3 V × 4.095 ≈ 2.358. Güç telleri (3,3 V ve GND) her sensörde ayrıca vardır; görselde yalnızca sinyal teli çizildi. Çoğu analog sensör tek sinyal teli kullanır.

**Dijital:** Düğme ya da PIR (hareket) sensörü yalnızca iki durum bildirir. Düğme basılınca pin 3,3 V'a bağlanır (1), bırakılınca bir direnç pini 0 V'a indirir (0). PIR hareket görünce çıkışını birkaç saniye 1 tutar. Burada önemli olan düzeyin değeri değil, ne zaman değiştiğidir. Pin tek bir telden 0 ya da 1 okur; ara gerilimlerin anlamı yoktur.

**Darbe (HC-SR04):** Bilgi, bir darbenin genişliğinde taşınır. Kart TRIG pinine yaklaşık 10 µs'lik kısa bir 1 gönderir; sensör ultrason darbesi yollar ve ses bir engele çarpıp dönene kadar ECHO pinini 1 tutar. ECHO'nun 1 kaldığı süre t'dir. Ses 343 m/s ile yol alır ve gidip döndüğü için mesafe d = 343 × t ÷ 2'dir. Örnek: t = 2,9 ms ise d = 343 × 0,0029 ÷ 2 ≈ 0,50 m. Ayrıntı "Mesafe sensörü" slaydındadır. Uyum notu: HC-SR04'ün ECHO çıkışı çoğu modelde 5 V verir, ESP32 pinleri ise 3,3 V ister; bu yüzden araya iki dirençli bir gerilim bölücü konur. Bu, 5 V'luk sinyali 3,3 V'a indirmenin yoludur.

**I2C:** İki tel: SDA (veri) ve SCL (saat). Aynı iki tele birden çok sensör bağlanabilir; her sensörün kendi adresi vardır (kapı numarası gibi, 7 bitlik). Bir işlem şöyle ilerler. START: SCL 1'deyken SDA 1'den 0'a iner, "şimdi konuşacağım" demektir. Kart 7 bitlik adresi gönderir (1001000 = 64 + 8 = 72 = 0x48), ardından bir R/W biti: 1 ise "oku", 0 ise "yaz". Adresi tutan sensör SDA hattını bir saat tıkı boyunca 0 yapar; buna ACK (onay) denir. Sonra sensör veri baytını en büyük bitten başlayarak (MSB) gönderir: 0001 1010 = 16 + 8 + 2 = 26, yani 26 °C. Kart son baytı aldığında NACK (SDA'yı bırakır, hat 1 olur) ile "yeter" der ve STOP gelir: SCL 1'deyken SDA 0'dan 1'e çıkar. Saat telinin işi şudur: SDA'daki gerilimin hangi anda bir bit sayılacağını belirler; her bit, SCL yükselirken okunur. Çekme dirençleri (pull-up) hatları boştayken 3,3 V'ta tutar; cihazlar hattı yalnızca 0'a çekebilir (açık savak, open drain), 1'i dirençler sağlar. Bu yüzden iki cihaz aynı anda konuşmaya kalkarsa kısa devre olmaz. Standart hız 100 kHz, hızlı kip 400 kHz'dir.

**SPI:** Dört tel: SCK (saat), MOSI (karttan sensöre veri), MISO (sensörden karta veri) ve CS (cihaz seç). Birden çok cihaz varsa SCK, MOSI ve MISO ortaktır, ama her cihaza ayrı bir CS teli gider. CS 0 olan cihaz seçilmiştir, yalnızca o konuşur; seçilmeyen cihaz MISO hattını bırakır (animasyonda kesik çizgi). Her saat tıkında bir bit MOSI ile gider, bir bit MISO ile gelir; iki yön aynı anda çalışır, bu yüzden SPI çok hızlıdır (MHz düzeyinde, onlarca MHz'e kadar çıkabilir). Bedeli tel sayısıdır: her yeni cihaz için bir CS teli daha gerekir. Animasyonda komut 1010 0101 gider, cevap olarak 0001 1010 = 26 gelir.

**UART:** İki tel: TX (gönder) ve RX (al). Bağlantı çapraz yapılır: kartın TX'i sensörün RX'ine, kartın RX'i sensörün TX'ine gider; biri konuşurken öteki dinler. Saat teli yoktur; iki taraf hızı (baud, saniyedeki bit sayısı) önceden anlaşır. Hat boşta 1'dedir. Bir karakter bir çerçeve halinde gider: 1 başlangıç biti (0), 8 veri biti (önce en küçük bit, LSB) ve 1 bitiş biti (1). Örnek: A harfi = 0x41 = 0100 0001 = 64 + 1 = 65 (ASCII); hatta sırayla 1000 0010 gider. 9.600 baud'da 1 bit = 1 ÷ 9.600 ≈ 104 µs, 10 bit = 1,04 ms'dir. Hızlar farklı olursa alıcı bitleri yanlış anda okur ve anlamsız harfler çıkar. Bilgisayarla konuşurken kullanılan seri ekran da UART'tır (genellikle 115.200 baud).

**Neden üç yöntem var?** Her yöntem üç şeyden birini seçer: tel sayısı, hız ve cihaz sayısı. UART en az telle iki cihazı birbirine bağlar ama saat yoktur, hızı sınırlıdır. I2C yalnızca iki telle onlarca cihaz bağlar (adres sayesinde) ama orta hızdadır. SPI en hızlıdır ama cihaz başına bir tel daha ister. Sensör üreticisi hangisini seçmişse kart da onu konuşur; öğrencinin bilmesi gereken, hangi telin ne taşıdığıdır. Pin türlerinin çok olmasının nedeni de budur: bazı pinler analog okur, bazıları 0 ya da 1 okur, bazıları I2C, SPI ya da UART için ayrılmıştır.

**Kodda nasıl görünür?** Arduino ve Deneyap yazılımında bu yöntemlerin her birinin hazır bir kütüphanesi vardır: analogRead ve digitalRead pinleri okur, Wire I2C'yi, SPI kütüphanesi SPI'yi, Serial ise UART'ı sürer. Bu işlevleri çağırdığınızda kart yukarıdaki bitleri ve saatleri sizin yerinize üretir. Kodlama başka eğitmenlerce anlatıldığı için burada yalnızca adlarını duyurmak yeterlidir.

**Sınıfa soru:** Aynı iki telde iki sensör varsa karta ikisinin cevabı karışmaz mı? **Cevap:** Karışmaz. Kart önce adresi gönderir; yalnızca o adrese sahip sensör ACK verir ve konuşur. Öteki sensör adresin kendisine ait olmadığını görür ve hattı bırakır. Kapı numarası gibi: kapıyı çalan "48 numara" derse yalnızca 48 numara cevap verir.

**Güvenlik:** ESP32 pinleri 3,3 V ister; 5 V'luk bir sinyal gerilim bölücü olmadan doğrudan pine bağlanmaz. Sınıfta yalnızca düşük gerilimli, pil ya da USB ile çalışan kartlar kullanılır.

#### 69. Kart dışarıya nasıl komut verir? PWM

**Bu slaytta:** Pin yalnızca 0 V ya da 3,3 V verir; yine de LED'i karartmak, motoru yavaşlatmak mümkündür: pini çok hızlı açıp kapatırız. Gösterim beş durak gezer: (1) darbe ve görev oranı, ortalama gerilim = görev oranı × 3,3 V; (2) LED parlaklığı, göz ortalamayı görür; (3) motor, pin yalnızca transistörü yönetir; (4) servo, açıyı darbenin genişliği belirler; (5) buzzer, perdeyi frekans belirler. Sağdaki sürgüyü oynatırsanız gösterim o an gösterilen durakta kalır ve görev oranınızı izler.

**Konu:** Önceki slaytlarda sensörlerin bilgiyi karta nasıl getirdiğini gördük (giriş). Bu slayt tersini anlatır: kart LED'i, motoru, servoyu ve buzzer'ı nasıl yönetir (çıkış). Sorun şudur: ESP32 pini yalnızca iki gerilim verir, 0 V ve 3,3 V. Ara bir değer, örneğin 1,65 V, veremez. Yine de LED'in parlaklığını ya da motorun hızını ayarlayabiliyoruz. Çözüm PWM'dir (darbe genişlik ayarı, İngilizcesi pulse width modulation): pini çok hızlı açıp kapatırız ve açık kalma oranını değiştiririz.

**Terimler (Darbe görünümü):** Pin saniyede 1.000 kez aynı döngüyü yineler. Bir döngünün süresi periyottur (T); frekans f = 1 ÷ T, yani 1 ÷ 0,001 s = 1.000 Hz (periyot ve frekans daha önceki slaytta tanıtıldı). Pinin bir döngüde 3,3 V'ta kaldığı süre açık süredir. Açık süre ÷ periyot oranına görev oranı (İngilizcesi duty cycle) denir ve yüzde olarak söylenir. Örnek: açık süre 0,5 ms, periyot 1 ms ise görev oranı 0,5 ÷ 1 = 0,5, yani %50. Görsel çok yavaşlatılmıştır; gerçekte bir döngü 1 ms sürer.

**Ortalama gerilim neden görev oranı × 3,3 V?** Bir döngüde pin T sürenin d kadarını 3,3 V'ta, geri kalanını 0 V'ta geçirir. Ortalama, gerilimin zaman içindeki ortalamasıdır: (3,3 V × açık süre + 0 V × kapalı süre) ÷ T = 3,3 V × (açık süre ÷ T) = görev oranı × 3,3 V. Örnek: %50 için 0,5 × 3,3 V = 1,65 V; %25 için 0,25 × 3,3 V ≈ 0,83 V; %100 için 3,3 V; %0 için 0 V. Pin hiçbir an 1,65 V vermez; yalnızca ortalaması 1,65 V'tur. Not ortalaması gibi düşünülebilir: hiç 6,5 almadan ortalamanız 6,5 olabilir.

**LED görünümü:** Pin, bir seri dirençle (330 Ω) LED'i sürer. LED açıkken akım, bildiğimiz I = V ÷ R hesabıyla (3,3 V − 2,0 V) ÷ 330 Ω ≈ 3,9 mA bulunur. Kırmızı LED'in üzerindeki gerilim yaklaşık 2 V alınmıştır; renge göre 1,8 V ile 3 V arasında değişir. Bu akım pinin sınırının çok altındadır. LED saniyede 1.000 kez yanıp söner; gözün ayırt edebildiği yaklaşık 50 ile 60 yanıp sönmeye göre çok hızlıdır. Göz ışığı kısa süreler içinde toplar ve ortalamayı görür; bu yüzden %50 görev oranında LED yarı parlak görünür. Görselde LED'in her an ya tam yanık ya tam sönük olduğuna dikkat ettirin. Ortalama akım = görev oranı × 3,9 mA. PWM frekansı çok düşük olursa (örneğin saniyede 20 kez) yanıp sönme gözle görülür; bu yüzden birkaç yüz hertzin üstü seçilir.

**Motor görünümü:** Bir motor büyüklüğüne göre yüzlerce mA ister. ESP32 pininin mutlak üst sınırı yaklaşık 40 mA, önerilen akım ise 20 mA kadardır. Motoru doğrudan pine bağlarsak pin (ve belki kart) zarar görür. Bu yüzden pin yalnızca bir transistörü (MOSFET) yönetir. Transistör, elektrikle kumanda edilen bir anahtardır (Transistör slaydı): kapı ucuna 3,3 V gelince iletir, 0 V gelince iletmez; kapıya çok küçük bir akım yeter. Motorun akımı ise motorun kendi pilinden geçer: pil artısı → motor → transistör → pil eksisi. Böylece pin darbeleri motor akımını saniyede 1.000 kez açıp kapatır ve motor ortalama gerilimi görür: %60 için 0,6 × 6 V = 3,6 V. Motorun dönen kütlesi (eylemsizlik) darbeleri ortalar; dönüş titremez, yalnızca hız görev oranına göre değişir. Not: 3,3 V ile tam açılabilen "mantık seviyeli" bir MOSFET seçilir.

**Ortak GND:** Kartın GND'si ile motor pilinin eksi ucu mutlaka birbirine bağlanmalıdır. Gerilim her zaman iki nokta arasındaki farktır ("GND nedir?" slaydı). Transistörün kapısı, pindeki 3,3 V'u kaynak ucuna göre görür. Kaynak ucu kartın GND'sine bağlı değilse kapı ile kaynak arasındaki gerilim belirsiz olur ve transistör doğru çalışmaz. Ortak GND, pin sinyaline ve motor devresine aynı sıfır noktasını verir. Pilin artı ucu kartın 3,3 V hattına bağlanmaz.

**Diyot (geri tepme, flyback):** Motor bir bobindir (Elektromıknatıs slaydı). Bobinden akım geçerken çevresinde manyetik alan depolanır; transistör akımı aniden kesince bu alan çöker ve bobin akımı sürdürmek ister: iki ucu arasında kısa süreli, çok büyük bir gerilim sıçraması oluşur ve transistörü bozabilir. Diyot motora ters yönde (katodu artı hatta bakacak biçimde) paralel bağlanır. Motor çalışırken diyot gerilimi tersten görür ve iletmez; transistör kapanınca akım diyot üzerinden motorun içinde dönerek yavaşça sönümlenir. Görselde transistör kapanınca diyot yolundan kısa süre akan bakır renkli noktalar bunu gösterir. Öğrenci için yeterli cümle: "diyot, motor kapanırken oluşan gerilim sıçramasını yutar".

**Servo görünümü:** Servo, içinde motor, dişli ve kontrol devresi olan bir konum motorudur: hız değil açı ister. Kart servoya 20 ms'de bir (50 Hz, saniyede 50 kez) bir darbe yollar; darbenin genişliği açıyı belirler: 1 ms yaklaşık 0°, 1,5 ms 90°, 2 ms 180°. Açı = (darbe − 1 ms) ÷ 1 ms × 180°. Görev oranı burada yalnızca %5 ile %10 arasındadır (1 ÷ 20 ve 2 ÷ 20); önemli olan oran değil darbenin genişliğidir. Slayttaki sürgü bu görünümde darbe genişliğini 1 ms (sürgü %0) ile 2 ms (sürgü %100) arasında seçer. Gerçek servolarda uç değerler ürüne göre biraz değişir (örneğin 0,5 ms ile 2,5 ms).

**Ton görünümü:** Pasif buzzer'a frekansı değişen bir kare dalga verilir; zar bu hızla titrer ve ses çıkar. Perdeyi frekans belirler: 440 Hz pes bir ses (la notası), 880 Hz bir oktav yukarıdaki tiz sestir. Görev oranı %50'de tutulur; değiştirmek perdeyi değiştirmez (sürgüyle deneyebilirsiniz). Özet: frekans = perde, görev oranı = parlaklık ya da hız. Sağdaki ses dalgaları 880 Hz'te iki kat sık çizilmiştir: aynı sürede iki kat titreşim, dalga boyu yarı. Not: aktif buzzer'ın içinde kendi osilatörü vardır ve yalnızca açılıp kapanır; ton için pasif buzzer gerekir.

**ESP32 ile nasıl yapılır:** ESP32'nin içinde LEDC adı verilen bir PWM donanımı vardır ve hemen hemen her çıkış pinine bağlanabilir. Darbeleri işlemci tek tek üretmez: frekans ve görev oranı bir kez yazılır, donanım darbeleri kendi başına üretir; işlemci başka işlerle uğraşabilir. Kodlama başka eğitmenlerce anlatıldığı için burada yalnızca bu yeteneğin var olduğunu söylemek yeterlidir.

**Sayılar:** Pin 3,3 V · pin akımı en çok 20 mA önerilir (mutlak üst sınır yaklaşık 40 mA) · küçük bir motor yaklaşık 300 mA (görselde örnek) · PWM frekansı 1.000 Hz (T = 1 ms) · LED akımı (3,3 − 2,0) V ÷ 330 Ω ≈ 3,9 mA · servo: 50 Hz, 20 ms, 1 ms = 0°, 1,5 ms = 90°, 2 ms = 180° · buzzer 440 Hz (T = 2,27 ms) ve 880 Hz (T = 1,14 ms).

**Güvenlik:** Sınıfta yalnızca düşük gerilimli, pil ya da USB ile çalışan düzenekler kullanılır. Pilin iki ucunu bir telle birleştirmeyin (kısa devre: tel, pil ve motor ısınır, pil zarar görür). Motor devresini şebeke ya da yüksek gerilimli bir adaptörle beslemeyin. Motoru doğrudan ESP32 pinine bağlamak da denenmez; pin ve kart bozulabilir. Slayttaki 6 V yalnızca örnektir.

**Sınıfa soru 1:** Pin hiç 1,65 V vermiyorsa LED neden yarı parlak yanıyor? **Cevap:** LED saniyede 1.000 kez tam yanıp tam sönüyor; gözümüz bu kadar hızlı değişimi ayırt edemiyor ve ortalamayı görüyor. Yarı zaman yanık olduğu için yarı parlaklık gibi görünüyor.

**Sınıfa soru 2:** Motor neden doğrudan pine bağlanmaz, transistör ne işe yarar? **Cevap:** Motor yüzlerce mA ister, pin ise en çok 20 mA önerilen akımı verebilir. Transistör, pinin küçük akımıyla açılıp kapanan bir anahtardır; büyük akımı motorun kendi pili taşır. Kartın GND'si ile pilin eksi ucu ortak olmalıdır.

**Sınıfa soru 3:** %25 görev oranında pinin ortalama gerilimi kaç volttur? **Cevap:** 0,25 × 3,3 V ≈ 0,83 V (%75'te 0,75 × 3,3 V ≈ 2,48 V). Sürgüyle doğrulayın.

### 5 · Bilgisayar

#### 70. Elektriğe yön vermek

**Bu slaytta:** Gösterim dört kodu sırayla dener (00, 01, 10, 11). Soldaki iki büyük anahtar iki biti gösterir. İlk bit ilk makası, ikinci bit ikinci makası çevirir; elektrik 9 V'luk pilden seçilen yoldan giderek dört lambadan yalnızca birini yakar. Demiryolu makasları gibi: anahtarlar yolu seçer.

**Ana fikir:** Bilgisayar başka bir şey değildir: elektriği yönlendiren anahtarlar. Bilgisayar, milyarlarca anahtarla elektriğin hangi yoldan gideceğine karar veren bir makinedir. Her 1, akımın geçtiği; her 0, akımın geçmediği bir anahtardır. İki bitlik bir kod dört yoldan birini seçer. Kontrol telinde 3,3 V varsa bit 1, yoksa 0'dır.

**Bitleri kim ayarlar?** İnsan eli değil, başka transistörler. Bir transistörün çıkışı bir sonrakinin kapısına bağlanır; böylece milyarlarca anahtar birbirini yönetir.

**Sonraki adım:** Bu bölümde bu basit fikirden mantık kapılarına, piksellere, gigabaytlara ve uydulara kadar gideceğiz.

#### 71. Mantık işlemleri

**Bu slaytta:** Gösterim önce VE kapısını, sonra VEYA kapısını, en son DEĞİL kapısını anlatır ve her birinde girişlerin bütün olasılıklarını dener. Altyazı o an hangi kapının, hangi girişlerle çalıştığını söyler. Anahtarlar seri bağlanınca VE, paralel bağlanınca VEYA olur. Bu kararları veren küçük devrelere mantık kapısı denir.

**VE:** İki anahtar seri: ikisi de kapalıysa (1 ve 1) lamba yanar. Örnek: Çamaşır makinesi kapak kapalı VE başlat düğmesine basıldıysa çalışır.

**VEYA:** İki anahtar paralel: biri bile kapalıysa lamba yanar. Örnek: Ön kapının VEYA arka kapının düğmesine basılınca aynı zil çalar.

**DEĞİL:** Girişin tersi. Örnek: Hava aydınlık DEĞİL ise sokak lambası yanar. Gösterimde anahtar lambanın yanına paralel bağlıdır: anahtar kapanınca akım lambayı atlar ve lamba söner. Gerçekte bu anahtarın yerini bir transistör alır: giriş 1 olunca kanal açılır, çıkış 0 olur. Seri direnç akımı sınırlar.

**Sınıfa soru:** Hava karanlıkken VE hareket varken yanan bahçe lambasını hangi kapılarla kurarız? **Cevap:** Işık sensörünün çıkışını DEĞİL kapısıyla tersine çevirir, hareket sensörüyle birlikte VE kapısına bağlarız.

**Sonraki slayt:** Bu kapılarla toplama yapabilir miyiz?

#### 72. Sekiz anahtar, bir harf

**Bu slaytta:** Sekiz büyük anahtar sırayla DENEYAP kelimesinin harflerini kurar. Her harf için önce anahtarlar açılıp kapanır, sonra açık olanların değerleri toplanır, toplam bir harfe dönüşür. Altındaki cümle ekrandakini kendisi anlatır.

**Bit ve bayt:** Her anahtar bir bittir: akım geçiyorsa 1, geçmiyorsa 0. Sekiz bit bir bayttır.

**Basamak değerleri:** 128, 64, 32, 16, 8, 4, 2, 1: sağdan sola gidince her değer bir öncekinin iki katıdır. Onluk sayılarda basamaklar 1, 10, 100 diye gider; ikilikte 1, 2, 4, 8 diye. 1 olan anahtarların değerlerini toplarız: 01000100 = 64 + 4 = 68 = D.

**256 değer:** Sekiz anahtarın hepsi 1 ise 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255. Bir bayt 0'dan 255'e kadar, yani 256 değer taşır; renk kanalları da (0–255) bu yüzden böyledir. Örnek: 00000101 = 4 + 1 = 5.

**Harfler:** Bilgisayarlar harfleri sayılarla saklar (ASCII). Türkçe karakterler (ğ, ş, ı) bu tabloda yoktur; onlar için daha uzun kodlar (UTF-8) kullanılır, iki bayt tutarlar.

**Sınıfa soru:** 01000001 hangi sayıdır, hangi harfe karşılık gelir? **Cevap:** 64 + 1 = 65, yani A.

**Geçiş:** Şimdi bu anahtarların bilgisayarın içinde nerede durduğuna bakalım.

#### 73. Bilgisayar nasıl toplar?

**Bu slaytta:** Gösterim dört toplamayı sırayla yapar: 0 + 0, 0 + 1, 1 + 0, 1 + 1. İkilik sistemde 1 + 1 = 10'dur ("bir-sıfır" diye okunur): toplam 0, elde 1. Onluk toplamada da 5 + 7 = 12'dir: 2 yazılır, 1 elde kalır. Sağdaki büyük iki rakam ikilik sonucu gösterir: soldaki elde, sağdaki toplam.

**Yarım toplayıcı:** İki bitin toplamı en fazla 2'dir; ikilik sistemde 2 = 10. Toplam basamağı ÖZEL VEYA ile, elde basamağı VE ile bulunur. ÖZEL VEYA: girişler farklıysa 1, aynıysa 0. VE: ikisi de 1 ise 1. İki basamaklı örnek: 3 + 1 → 11 + 01 = 100 (sağdan sola, elde taşınır).

**Büyük sayılar:** Bu devre yalnızca iki biti toplar; önceki basamaktan gelen eldeyi alamaz, bu yüzden adı yarım toplayıcıdır. İki yarım toplayıcı ve bir VEYA kapısı birleşince üç biti (A, B ve gelen elde) toplayan tam toplayıcı olur. Tam toplayıcılar zincir gibi yan yana dizilir; her basamağın eldesi bir sonrakine aktarılır.

**Milyarlarca:** İşlemcideki toplama devreleri bunun gibi mantık kapılarından kurulur. 64 bitlik bir işlemci bunu saniyede milyarlarca kez yapar.

#### 74. Kapılar nasıl hatırlar?

**Bu slaytta:** Gösterim beş adımlı bir hikâye anlatır. (1) Tek VEYA-DEĞİL kapısı: çıkış yalnızca şimdiki girişlere bağlıdır, hafıza yoktur. (2) İki kapının çıkışı birbirine dolanınca SR mandalı olur: S ile 1 yazılır, R ile 0 yazılır, girişler bırakılınca değer yerinde kalır. (3) Sekiz mandal bir bayt eder; 01000001 ASCII tablosunda A harfidir. (4) RAM hücresi: bir transistör ve bir kondansatör; yük sızdığı için sürekli yenilenir, güç gidince unutur. (5) Flash hücresi: yüzen kapıda hapsolan elektronlar güç olmadan da hatırlatır. Her aşamada ekrandaki cümle o aşamayı anlatır. Bayt görünümünde bir mandalın üstüne tıklayarak biti değiştirebilirsiniz; gösterim bu sırada durur.

**Soru:** Bir mantık kapısının çıkışı yalnızca o andaki girişlere bağlıdır; VE kapısında iki giriş de 1 ise çıkış 1'dir, girişler değişince çıkış da değişir. Peki bilgisayar bir sayıyı nasıl aklında tutar? Cevap: kapıların çıkışını kendi girişlerine geri bağlayarak. Bu görselde beş görünüm var: tek kapı, geri beslemeli mandal, bayt, RAM hücresi ve flash hücresi. Sağ üstteki etiket (basitleştirilmiş model) gerçek devrenin sadeleştirildiğini söyler.

**Tek kapı (VEYA-DEĞİL, NOR):** VEYA kapısının çıkışı DEĞİL kapısından geçmiş hâlidir. Girişlerden biri 1 ise çıkış 0, ikisi de 0 ise çıkış 1 olur. S = 1 yapıp tekrar S = 0 yapınca çıkış yine 1'dir: kapı önceki girişleri hatırlamaz. Kapı bir fonksiyon gibidir, aynı girişlere hep aynı cevabı verir. 1 = akım geçiyor, 0 = akım geçmiyor anlaşmamız burada da geçerlidir.

**Geri besleme, SR mandalı:** İki NOR kapısı çapraz bağlanır: üst kapının çıkışı (Q) alt kapının girişine, alt kapının çıkışı (Q değil) üst kapının girişine gider. Girişlerden biri S (set, kur), öbürü R (reset, sıfırla). Doğruluk tablosu: S = 0, R = 0: önceki değer korunur · S = 1, R = 0: Q = 1 · S = 0, R = 1: Q = 0 · S = 1, R = 1: yasak durum. Yürüyüş: S = 1 yapılınca alt kapının çıkışı 0 olur; bu 0 üst kapının girişine gider, üst kapının iki girişi de 0 olduğundan Q = 1 olur. Q = 1 geri dönüp alt kapıyı 0'da tutar. Şimdi S = 0 yapılsa bile alt kapının öbür girişi (Q) hâlâ 1'dir, çıkış 0 kalır, üst kapı yine Q = 1 verir. Bu, kendi kendini tutan bir döngüdür; hafıza budur. R = 1 yapılınca durum tersine döner ve Q = 0 olur. S = 1 ve R = 1 birlikte verilince iki kapı da 0 üretir (Q ve Q değil aynı anda 0, mantıksız). Girişler aynı anda bırakılırsa hangi kapının önce toparlanacağı belli olmaz, Q rastgele 0 ya da 1 olur: bu yüzden bu durum yasaktır ve görselde Q "belirsiz" diye işaretlenir. Bakır renkli teller geri besleme döngüsüdür.

**Flip-flop:** Mandala bir saat girişi eklenirse flip-flop olur. Saat tıkladığı anda giriş okunur ve değer yalnızca o anda değişir; böylece milyarlarca bit aynı tıkta birlikte güncellenir. İşlemcinin program sayacı ve yazmaçları flip-flop dizileridir: sayıları orada tutulur, bir sonraki tıkta yenisi yazılır.

**Bayt:** Sekiz mandal yan yana bir bayttır. Bir mandala tıklayınca S ya da R darbesi verilir ve o bit değişir. 01000001 = 64 + 1 = 65 ve ASCII tablosunda A harfidir ("Sekiz anahtar, bir harf" slaytındaki gibi); orada anahtarları elle çeviriyorduk, burada her anahtarın yerinde kendi kendini tutan bir mandal var.

**RAM hücresi (DRAM):** Bir biti 1 transistör ve 1 kondansatörle saklar: kondansatör yüklüyse 1, boşsa 0. Transistör anahtardır; kelime hattı onu açınca bit hattından kondansatöre yük girer (yazma) ya da yükün durumuna bakılır (okuma). Kondansatör, "Kondansatör" slaytındaki iki plakanın çok küçüğüdür. Yalıtkan mükemmel olmadığı için yük zamanla sızar ve okuma sınırının altına inerse bit kaybolur. Bu yüzden her 64 ms'de bir her satır okunup geri yazılır (yenileme). 1.000 ms ÷ 64 ms ≈ 16 yenileme / s ("Bilgisayarın içi" slaytındaki sayı). Görselde zaman yaklaşık 37 kat yavaşlatılmıştır (64 ms ≈ 2,4 s). Elektrik gidince yenileme durur, yük boşalır, bit unutulur. Grafikteki kesikli çizgi okuma sınırıdır: yük bunun altına inerse 1 diye okunamaz. S = 1 yük yazar, R = 1 yükü boşaltır, canvas'taki güç düğmesi elektriği keser.

**Flash hücresi (SSD):** Hücre de bir transistördür, ama kapısı ikiye bölünmüştür: denetim kapısı ile kanal arasında yalıtkan oksitle çevrili bir yüzen kapı vardır. Yazmak için yüksek gerilim uygulanır ve elektronlar ince oksiti (kuantum tünellemesi ile) geçip yüzen kapıya girer; gerilim kalkınca oksit onları dışarı bırakmaz. Okumak için denetim kapısına orta bir gerilim verilir: yüzen kapıda elektron varsa kanalı kapatır (akım geçmez, 0), yoksa kanal akım geçirir (1). Gerçek flash bellekte de böyledir; görselde S = 1 hücreyi siler (1), R = 1 elektron hapseder (0). Elektronlar yıllarca kalır, bu yüzden güç olmadan hatırlar. Karşılığı: yüksek gerilimle yazma yavaştır ve oksit her yazışta biraz yıpranır, bu yüzden SSD'ler RAM kadar hızlı ve ömürlü olmaz.

**Sayılar (hepsi yaklaşık):** Mandal / SRAM hücresi yaklaşık 6 transistör kullanır (çapraz bağlı iki DEĞİL kapısı için 4, bit hatlarına bağlamak için 2); çok hızlıdır, işlemci önbelleğinde ve yazmaçlarda bulunur, elektrik gidince unutur. DRAM hücresi 1 transistör + 1 kondansatör olduğu için aynı alana çok daha fazla bit sığar: RAM bu yüzden gigabaytlarca olabilir. Ama yenileme gerekir ve elektrik gidince unutur. Flash hücresi tek yüzen kapılı transistördür, yavaştır, güç olmadan hatırlar. Sıralama: yazmaç (en hızlı, en az) → önbellek (SRAM) → RAM (DRAM) → SSD (flash; en yavaş, en çok).

**Bağlantılar:** "Kondansatör" slaytında yükün plakalarda nasıl durduğunu görmüştük; DRAM hücresi o kondansatörün çok küçüğüdür. "Bilgisayarın içi" slaytındaki RAM unutur / SSD hatırlar cümlesinin nedeni bu slayttır. Sonraki slayt "İşlemcinin içinde ne olur?" bu hafıza parçalarını (program sayacı, yazmaçlar, bellek) bir araya getirip komutların nasıl işlendiğini gösterir.

**Sınıfa soru:** Bir kilobayt (1.024 bayt) bilgiyi mandallarla saklasak kaç mandal ve yaklaşık kaç transistör gerekir? **Cevap:** Her bayt 8 bit, her bit 1 mandal: 1.024 × 8 = 8.192 mandal. Mandal başına yaklaşık 6 transistör sayarsak 8.192 × 6 ≈ 49.000 transistör. Bir gigabayt için bu sayı milyarları aşar; DRAM'in hücre başına 1 transistör + 1 kondansatör kullanması bu yüzden değerlidir.

**Sınıfa soru:** RAM saniyede yaklaşık 16 kez yenileniyor; SSD'nin neden yenilenmeye gerek yok? **Cevap:** RAM'de bit, kondansatörün plakalarındaki yüktür ve yalıtkan mükemmel olmadığı için yük sızar; yenilemeyen hücre unutur. SSD'de elektronlar yalıtkan oksitle tamamen çevrili yüzen kapıda hapistir, sızmazlar; bu yüzden güç olmadan da yıllarca durur.

#### 75. İşlemcinin içinde ne olur?

**Bu slaytta:** Dört kutu (bellek, denetim birimi, yazmaçlar, ALU) ve altta dört aşama şeridi: Getir, Çöz, Yürüt, Yaz. Animasyon kendiliğinden üç komutu (R1 ← 5, R2 ← 7, R1 ← R1 + R2) sırayla çalıştırır. Turuncu bitler komut ve denetim işaretlerini, mavi bitler veriyi taşır. Alttaki cümle her aşamada değişir. 1 = akım geçiyor, 0 = geçmiyor.

**Konu:** bir bilgisayar programı gerçekte nasıl çalışır? Bu slayt, bu derslerde öğrendiğimiz her parçayı tek bir zincirde birleştirir: transistör, mantık kapısı, toplayıcı, ALU, işlemci. Görsel basitleştirilmiş ve yavaşlatılmıştır; gerçek işlemci bunu saniyede milyarlarca kez yapar. Bellekteki komut kodları (0001 0101 gibi) açıklama için uydurulmuştur, gerçek bir işlemcinin kodu değildir.

**Komut nedir:** komut, bellekte duran bir sayıdır (bit dizisi). İşlemci bu sayının ne anlama geldiğini bilir; örneğin “R1’e 5 koy” ya da “R1 ile R2’yi topla”. Program, bu komutların bellekte arka arkaya dizilmiş halidir. Üç satırlık örnek: (1) R1 ← 5, (2) R2 ← 7, (3) R1 ← R1 + R2. (Sonucu belleğe yazmak da dördüncü bir komut olabilir; çizimde yer almıyor.) Hesap: 5 + 7 = 12; ikilikte 0101 + 0111 = 1100, çünkü 8 + 4 = 12.

**Dört aşama:** **1. Getir:** program sayacı (hangi komutun sırada olduğunu tutan sayı) adresi program belleğine gönderir; komut komut kaydına gelir. **2. Çöz:** denetim birimi komutun bit desenine bakar ve hangi parçaların çalışacağını belirleyen işaretleri yakar (hangi yazmaç okunacak, ALU toplayacak mı, sonuç nereye yazılacak). **3. Yürüt:** ALU işi yapar; toplamada R1 ve R2’deki bitler toplayıcıya girer. **4. Yaz:** sonuç yazmaca (ya da veri belleğine) geri yazılır ve program sayacı bir sonraki satıra geçer. Sonra döngü yeniden başlar. Animasyon üç satırı sırayla dolaştırır; ilk iki satır hızlı, toplama satırı daha yavaş oynar. Alttaki şerit hangi aşamada olduğumuzu gösterir.

**ALU ve toplayıcı:** ALU (aritmetik mantık birimi) işlemcinin hesap yapan parçasıdır. İçinde toplayıcılar ve VE, VEYA, ÖZEL VEYA gibi mantık işlemleri vardır. “Bilgisayar nasıl toplar?” slaytındaki yarım toplayıcıyı hatırlayın: toplam basamağı ÖZEL VEYA ile, elde VE ile bulunuyordu. ALU’da bu devreler yan yana dizilir; her basamağın eldesi bir sonraki basamağa geçer (iki yarım toplayıcıdan yapılan tam toplayıcılar). Mantık kapılarının her biri de “Transistör” slaytındaki gibi birkaç transistörden oluşur.

**Yazmaç neden var:** yazmaç, işlemcinin içindeki çok küçük ve çok hızlı not kâğıtlarıdır. ALU yalnızca yazmaçlardaki sayılarla çalışır. Her toplama için RAM’e gidip gelmek çok yavaş olurdu; işlemci üzerinde çalıştığı sayıları yazmaçta tutar.

**Önbellek (cache):** RAM, işlemciye göre uzak ve yavaştır. Önbellek, işlemciye çok yakın duran küçük ve hızlı bir bellektir; sık kullanılan komut ve veriler oraya kopyalanır. Çalışma masası benzetmesi: yazmaç elinizdeki kalem, önbellek masanın üstündeki defter, RAM masanın çekmecesi, depolama (SSD) odanın kitaplığıdır. Görselde önbellek, saat ve program sayacı ayrı kutu olarak yoktur; konu fazla dağılmasın diye çıkarıldı (program sayacı, bellekteki turuncu ok olarak görünür).

**Çekirdek:** bir çekirdek, böyle bir döngüyü (komut kaydı, denetim birimi, yazmaçlar, ALU) tek başına döndürebilen bir işlemcidir. ESP32’de bu parçalardan iki tane vardır: iki çekirdek, iki ayrı komut dizisini aynı anda çalıştırabilir. Bu yüzden çekirdek sayısı fiziksel bir şeydir: aynı çip üzerindeki ayrı devre kopyaları.

**Saat ve tık:** bütün bu parçaların aynı ritimde çalışması gerekir. Saat, düzenli aralıklarla 1 ve 0 arasında gidip gelen bir sinyaldir; her yükselişi bir “tık”tır ve her tıkta devre bir adım atar. ESP32 kartında saati 40 MHz’lik bir kristal verir; işlemci bunu çarparak en çok 240 MHz’e çıkarır (saniyede 240 milyon tık). Bilgisayardaki 3 GHz, saniyede 3 milyar tık demektir (1 tık ≈ 0,33 nanosaniye). Animasyon çok yavaşlatılmıştır; gerçekte bir aşama milyarda bir saniye düzeyindedir.

**Zincir:** transistör → mantık kapısı → toplayıcı → ALU → işlemci çekirdeği → ESP32 modülü → geliştirme kartı. “Geliştirme kartı” slaytındaki ESP32 modülünün içindeki işlemci, bu slayttaki blokların hepsini barındırır. Kartın üzerindeki bakır yollar, o işlemcinin 3,3 V ile 1 ve 0 olarak konuştuğu pinlere ulaşır.

**Program nerede durur:** programın komutları flash belleğindedir (ESP32 modülünde örneğin 4 MB). Flash, “Bilgisayarın içi” slaytındaki SSD gibi, elektrik kesilse de unutmaz; bu yüzden kartı fişten çekip yeniden taktığınızda program yine oradadır. RAM ise elektrik kesilince unutur; işlemin ara sonuçları ve değişkenler orada durur. Yazmaçtaki 12 de elektrik kesilince kaybolur; kalıcı olması için flash’a ayrıca yazılması gerekir.

**Sınıfa soru:** İşlemci bir saniyede nasıl 3 milyar iş yapabiliyor? **Cevap:** Aslında “3 milyar iş” değil, 3 milyar tık: her tık küçük bir adımdır. Bir işlem (toplama gibi) birkaç adım sürer. Ayrıca işlemci bir komutun bitmesini beklemez: biri yürütülürken sonraki çözülür, ondan sonraki getirilir; yani adımlar çamaşırhanedeki gibi üst üste biner (buna boru hattı denir). Birkaç çekirdek ve çok küçük bir tık süresiyle toplamda milyarlarca işlem çıkar.

**Sınıfa ikinci soru:** Elektrik gidince RAM’deki sayı neden kaybolur, program neden kaybolmaz? **Cevap:** RAM bitleri kondansatörlerde yük olarak tutar, yük sızar ve elektrik olmadan tazelenemez. Flash bitleri yalıtkan bir katmanla çevrili hücrelerde tutar, yük orada yıllarca kalır.

**Sırada:** bu çip, yani bu kadar transistör, nasıl yapılıyor? Bir sonraki slayt “Kumdan çipe”: kum nasıl silisyuma, silisyum nasıl milyarlarca transistörlü bir çipe dönüşür.

#### 76. Kumdan çipe

**Bu slaytta:** animasyon beş aşamayı sırayla, yavaşça gösterir: kum, silisyum külçe, 300 mm'lik plaka, paketlenmiş çip ve çipin yüzeyindeki transistörler. Sağ alttaki beş nokta hangi aşamada olduğumuzu gösterir; sol alttaki çubuk o aşamanın gerçek ölçeğidir. Gösterim hızlandırılmış ve basitleştirilmiştir; gerçek üretim haftalar sürer.

**Kum:** kumun ana maddesi silisyum dioksittir (SiO₂). Kum ve kuvarstan çok saf silisyum elde edilir.

**Külçe:** silisyum arıtılır, eritilir (yaklaşık 1.414 °C) ve dönen bir tohum kristalinden yavaşça çekilerek tek parça bir külçe büyütülür (Czochralski yöntemi).

**Plaka (wafer):** külçe yaklaşık 0,8 mm kalınlıkta dilimlenir ve ayna gibi parlatılır. 30 cm çapındaki bir plakadan yüzlerce çip çıkar. Işıkla desen basma, aşındırma ve katkılama adımları yüzlerce kez tekrarlanır. Sonra istenen yere istenen kadar fosfor ya da bor katılır.

**Saflık:** %99,9999999: bir milyar atomda yalnızca bir yabancı atom.

**Çip:** plaka kesilir; her çip koruyucu bir kılıfa yerleştirilir ve altındaki yüzlerce minik lehim topuyla karta bağlanır.

**Transistörler:** çipin yüzeyinde milyarlarca minik anahtar açılıp kapanır: her biri 1 ya da 0. Bugünkü transistörler yalnızca birkaç on nanometre büyüklüğündedir; tırnak büyüklüğünde bir çipte on milyarlarca transistör bulunur. Görselde anahtarların açılıp kapanması çok yavaşlatılmıştır; gerçekte saniyede milyarlarca kez olur.

**Geçiş:** Çipi yaptık; şimdi bu çipi kullanan bir kartın, bir bilgisayarın içine bakacağız.

#### 77. Bilgisayarın içi

**Bu slaytta:** Prizden gelen elektrik güç kaynağında doğru akıma çevrilir ve anakartın üzerindeki parçalara dağıtılır. Gösterim kendi kendine elektriği keser ve geri verir: RAM boşalır, SSD hatırlar.

**Güç kaynağı:** 230 V AC'yi 12 V, 5 V ve 3,3 V DC'ye çevirir (diyotlar, transformatör, kondansatörler).

**RAM:** Her biti minicik bir kondansatörde yük olarak tutar. Yük sızdığı için her 64 ms'de bir, yani saniyede yaklaşık 16 kez (1.000 ÷ 64 ≈ 16) tazelenir; elektrik kesilince bilgi kaybolur.

**SSD:** Elektronları yalıtkan bir katmanla çevrili hücrelere hapseder; güç olmadan yıllarca kalabilir.

**Ölçek:** Güç kaynağı ve priz gerçek boyutlarından küçük çizilmiştir; model basitleştirilmiştir.

**Sınıfa soru:** Elektrik kesilince kaydetmediğiniz ödev neden kaybolur? **Cevap:** Üzerinde çalıştığınız şey RAM'dedir; kaydetmek onu SSD'ye yazmaktır.

**Geçiş:** Sırada ekranın nasıl görüntü ürettiği var.

#### 78. Piksel nedir?

**Bu slaytta:** Ekrandan tek piksele yaklaşılır; pikselin içinde üç küçük ışık (kırmızı, yeşil, mavi) görülür. Sonra üç ışığın parlaklığı sırayla değişir ve gözümüzün gördüğü renk sağdaki kartta belirir: yalnızca kırmızı, yalnızca yeşil, yalnızca mavi, kırmızı + yeşil = sarı, üçü birden = beyaz. Sürgü yoktur; renkleri animasyon kendisi karıştırır.

**Karışım:** Işıklar üst üste eklenir: kırmızı + yeşil = sarı; üçü birden beyaz. Boya karışımından farklıdır: boyalar ışığı soğurur, ekran ışık yayar.

**Sayı:** Her renk 8 bitle (256 kademe, 0–255) kontrol edilir: 256 × 256 × 256 = 16.777.216 renk.

**Göz:** Gözümüzdeki üç tür koni hücresi kırmızıya, yeşile ve maviye duyarlıdır; ekran gözümüzü bu üç rengi karıştırarak kandırır.

**Sınıfa soru:** Kırmızıyı ve yeşili en yüksek, maviyi sıfır yaparsak hangi renk çıkar? **Cevap:** Sarı.

**Geçiş:** Sırada kaç piksel olduğunun, yani çözünürlüğün ne değiştirdiğine bakacağız.

#### 79. Çözünürlük ve yenileme hızı

**Bu slaytta:** Aynı resim önce 16 × 9 piksel, sonra her adımda genişlik ve yükseklik ikiye katlanarak gösterilir; piksel sayısı her adımda 4 katına çıkar. Sonra Full HD ve 4K karşılaştırılır; 4K görüntünün içine dört Full HD sığar. Son bölümde top 10, 30 ve 60 Hz ile hareket eder.

**Çözünürlük:** Full HD 1920 × 1080 = 2.073.600 piksel; 4K 3840 × 2160 = 8.294.400 piksel, yani dört katı. “4K” adı genişlikteki yaklaşık 4.000 (3840) pikselden gelir; piksel sayısının 4 katı olması ayrı bir sonuçtur (2 kat geniş × 2 kat yüksek).

**Yenileme hızı:** 60 Hz ekran saniyede 60 yeni görüntü çizer. Film aslında hızla değişen fotoğraflardır; göz bunları hareket olarak algılar. Alttaki şeritte bir saniyenin kaç görüntüye bölündüğü görülür.

**Akıcı görmenin sırrı:** Hareketli görüntü aslında durağan karelerin ardışık gösterilmesidir; beyin bunları kesintisiz hareket olarak birleştirir (görünür hareket). Sinema yaklaşık 24 kare/sn ile akıcı görünür, ama göz yaklaşık 60 ila 90 Hz altındaki yanıp sönmeyi titreme olarak fark eder; bu yüzden sinema projektörü her kareyi 2 ya da 3 kez parlatır. Ekranda yenileme hızı (Hz) ekranın saniyede kaç kez görüntüyü yenilediğidir, fps ise kaynağın (oyun, video) saniyede kaç kare ürettiğidir; 60 Hz ekran 30 fps videoyu her kareyi iki kez göstererek oynatır. Prizin 50 Hz'i ve lambanın 100 Hz titremesi de aynı konudur (“Doğru ve alternatif akım” slaydı): göz belli bir hızın üstündeki değişimi ayırt edemez.

**Sınıfa soru:** 4K ekranda Full HD'nin kaç katı piksel vardır? **Cevap:** 8.294.400 ÷ 2.073.600 = 4, yani 4 katı.

**Geçiş:** Bu kadar pikselin bilgisayarda ne kadar yer tuttuğunu sıradaki slaytta ölçeceğiz.

#### 80. Bit, bayt, gigabayt

**Bu slaytta:** Beş basamaklı bir merdiven kurulur: bayt, kilobayt, megabayt, gigabayt, terabayt. Her basamağın üstünde gündelik bir nesne durur: harf, yarım sayfa yazı, fotoğraf, film, kütüphane. Basamaklar arasındaki ×1000 işareti her adımın bin kat olduğunu gösterir.

**Basamaklar:** 1 bayt bir harf. 1 KB yaklaşık yarım sayfa yazı (1.000 harf). 1 MB bir kitabın yazısı ya da bir fotoğrafın küçük bir sürümü. 1 GB yaklaşık 15–30 dakikalık HD film; 2 saatlik bir film birkaç GB tutar. 1 TB bir kütüphane.

**Ham boyut:** Full HD bir kare 2.073.600 piksel × 3 bayt ≈ 6 MB; 12 MP bir fotoğraf 12.000.000 × 3 = 36 MB. Telefon dosyayı sıkıştırır (benzer renkleri kısa yazar), bu yüzden bir fotoğraf yaklaşık 3 MB tutar. Örnek: 128 GB'lık telefon, 128.000 MB ÷ 3 MB ≈ 42.000 fotoğraf.

**1.000 mi 1.024 mü?** Bilgisayarlar ikilik sistemle çalıştığı için bazı yerlerde 1 KB = 1.024 bayt kullanılır: 10 tane 2'yi çarparsak (2 × 2 × … × 2) 2¹⁰ = 1.024 çıkar, yani ikilik sistemde “bin”e en yakın sayı budur. Bu yüzden 1 TB'lık bir disk (1.000.000.000.000 bayt) bilgisayarda 1.000.000.000.000 ÷ 1.073.741.824 ≈ 931 GB görünür.

**Sınıfa soru:** 64 GB'lık bir telefona 4 MB'lık kaç şarkı sığar? **Cevap:** 64.000 ÷ 4 = 16.000.

**Geçiş:** Sırada bilgisayar özelliklerinde sık gördüğümüz GHz, çekirdek ve RAM var.

#### 81. GHz, çekirdek, RAM

**Bu slaytta:** Üç kısa gösterim art arda oynar. Önce GHz: 1 GHz ve 3 GHz'lik iki işlemcinin saat dalgası ve her tıkta dolan kutular. Sonra çekirdek: sekiz iş, tek çekirdekte sırayla, dört çekirdekte aynı anda yapılır. Son olarak RAM ve depolama: işlemci RAM'e hızlı, SSD'ye daha yavaş ulaşır; kaydedilen iş SSD'ye gider, elektrik kesilince RAM boşalır. Gösterimler çok yavaşlatılmıştır.

**GHz:** İşlemcinin saati. Her tıkta işlemci işi bir adım ilerletir (transistörler, taşıdıkları değerleri bir sonraki adıma aktarır); 3 GHz saniyede 3 milyar tık demektir: 1 tık = 1 s ÷ 3.000.000.000 ≈ 0,33 nanosaniye (saniyenin milyarda biri).

**Dikkat:** Yalnızca GHz'e bakmak yanıltır: bir komutun kaç tık sürdüğü ve kaç çekirdek olduğu da önemlidir. 4 çekirdek × 3 GHz, tek çekirdeğin 12 GHz'i demek değildir.

**Çekirdek:** Aynı çipteki bağımsız işlemciler. 4 çekirdek aynı anda 4 iş yapabilir; iş bölünebiliyorsa daha çabuk biter.

**RAM ve depolama:** RAM çalışma masası (küçük, çok hızlı, elektrik kesilince unutur); SSD raf (büyük, daha yavaş, hatırlar). Bir program açtığınızda raftaki kitabın bir kopyası masaya açılır; asıl kitap rafta kalır. Elektrik kesilince yalnızca masadaki kopya kaybolur.

**Sınıfa soru:** 4 çekirdekli 3 GHz'lik bir işlemci, tek çekirdekli 12 GHz'lik bir işlemciyle aynı mıdır? **Cevap:** Hayır; çekirdekler işi bölüşür ama her biri yine 3 GHz hızındadır ve her iş bölünemez.

**Geçiş:** Bilgisayar bölümünün sonuna geldik; bir sonraki bölümde bütün bunların birlikte nasıl çalıştığına bakacağız.

#### 82. Telefon bataryası

**Bu slaytta:** animasyon bir lityum iyon pilin kesitini gösterir. Sağda metal oksit katmanları, solda grafit katmanları, ortada iyonların geçtiği ince bir ayırıcı (separatör) vardır. Turuncu toplar lityum iyonlarıdır (Li⁺), mavi toplar elektronlardır. Önce şarj, sonra kullanım gösterilir; ortadaki turuncu ok iyonların yönünü, üstteki gösterge pilin doluluğunu verir. Şarj aletinin gücü (5, 18, 65 W) sağ alttaki düğmelerle seçilir; güç büyüdükçe pil daha hızlı dolar. Hareket hızlandırılmıştır.

**Çalışma:** şarjda lityum iyonları metal oksit tarafından grafit tarafına geçer, elektronlar dış devreden aynı yöne gider. Dolu pilde iyonların çoğu grafitin katmanları arasındadır (grafit altın rengine yaklaşır). Kullanımda her ikisi geri döner ve elektronlar telefonun içinden geçerken iş yapar. İyonlar ayırıcıdan geçebilir, elektronlar geçemez: bu yüzden elektronlar dış devreden dolaşmak zorundadır.

**mAh ve Wh:** mAh = akım × süre: 5.000 mAh, 500 mA'i 10 saat verebilir. Wh = watt × saat; enerji = yük × gerilim. Lityum iyon hücre yaklaşık 3,85 V'tur (alkalin pil 1,5 V).

**Hesap:** 5.000 mAh × 3,85 V = 19.250 mWh ≈ 19,3 Wh. 18 W'lık şarj aletiyle ideal süre 19,3 ÷ 18 ≈ 1,1 saat. Gerçekte pil dolmaya yaklaştıkça şarj yavaşlatılır (görselde de son %20 yavaş dolar); bu pili korur. Telefon ortalama 2 W çekerse 19,3 ÷ 2 ≈ 9,6 saat dayanır (örnek bir kullanım).

**Sınıfa soru:** Neden pilinizi sıcak bir arabada bırakmamalısınız? **Cevap:** Yüksek sıcaklık pildeki kimyasalları bozar ve kapasitesini kalıcı olarak azaltır.

**Sonraki slayt:** telefonların ve bilgisayarların birbiriyle konuşmasına, yani veri yolculuğuna geçiyoruz.

#### 83. Dokunmatik ekran ve tırnak

**Bu slaytta:** animasyon sırayla parmak, tırnak ve yün eldivenle dokunmayı gösterir. Camın altında satır ve sütunlar hâlinde saydam iletken çizgiler (indiyum kalay oksit, ITO) vardır; aralarında elektrik alanı oluşur. İletken parmak yaklaşınca alan çizgileri parmağa yönelir; çip bu küçük değişimi ölçer ve dokunulan sütun ve satırı hesaplar. Sağ üstteki çubuk sinyal değişimini ve eşiği gösterir.

**Saydam iletken:** ITO bir metal oksittir; o kadar ince sürülür ki ışığı geçirir ama serbest elektronları sayesinde iletir.

**Tırnak ve eldiven:** elektrik alanı yalıtkanların içinden geçer; ekran camı da yalıtkandır. Algılanması için alan çizgilerini çekebilen iletken parmağın cama çok yakın olması gerekir. Tırnakla dokununca iletken parmak ucu tırnağın kalınlığı kadar uzakta kalır; kalın yün eldiven de uzak tutar. Dokunmatik eldivenlerin parmak uçlarında iletken iplik bulunur.

**Hatırlayın:** tırnak keratindir ve yalıtkandır; parmak vücut sıvılarındaki iyonlar sayesinde iletkendir.

**Sınıfa soru:** Ekranın camı yalıtkan; parmak camın üstünden nasıl algılanır? **Cevap:** Elektrik alanı camın içinden geçer; ekran camı değil, camın hemen üstündeki iletken parmağı algılar.

**Sınıfa soru:** Ekran ıslakken neden kendi kendine dokunuyor gibi davranır? **Cevap:** Su damlaları da içlerindeki iyonlar sayesinde alanı değiştirir; ekran onları parmak sanır.

#### 84. İnternet hızı

**Bu slaytta:** animasyon sırayla 16, 100 ve 1.000 Mbps'lik bağlantıları gösterir. Soldaki borudan tek tek bitler (1 ve 0) akar; 8 bit bir kutuda birleşip 1 bayt olur; baytlar 4 GB'lık filmin çubuğunu doldurur. Büyük sayı, indirmenin geçen süresidir. Sağ alttaki düğmelerle bir bağlantı hızı seçilebilir. Gösterim hızlandırılmıştır: çubuk her hızda 8 saniyede dolar, sayı gerçek süreyi gösterir.

**Küçük b, büyük B:** internet hızı bit ile (küçük “b”, Mbps), dosya boyutu bayt ile (büyük “B”, MB, GB) ölçülür. 1 B = 8 b.

**Bölme:** 100 Mbps ÷ 8 = 12,5 MB/s. 4 GB'lık (4.000 MB) bir film: 4.000 ÷ 12,5 = 320 saniye = 5 dakika 20 saniye (ideal koşulda). 1.000 Mbps ÷ 8 = 125 MB/s ve 4.000 ÷ 125 = 32 saniye.

**Sınıfa soru:** 16 Mbps bağlantıda aynı film ne kadar sürer? **Cevap:** 16 ÷ 8 = 2 MB/s; 4.000 ÷ 2 = 2.000 s ≈ 33 dakika.

**Sonraki slayt:** bitler kabloda ve havada nasıl yolculuk eder, onu görelim.

#### 85. Veri kabloda nasıl yolculuk eder?

**Bu slaytta:** Animasyon kendiliğinden dört görünümü sırayla gezer: paralel (8 tel), seri (tek tel), UART (start, 8 veri biti, stop) ve fark (USB D+ ve D−, gürültülü hatta). Üstteki zincir (ESP32 kartı, USB-seri çevirici, bilgisayar) verinin yolunu gösterir; yol boyunca aktif bağlantı turuncu yanar. Alttaki cümle her görünümde değişir. Sağdaki iki düğme UART görünümünde 9.600 ve 115.200 baud hızlarını karşılaştırmak içindir. 1 = akım geçiyor, 0 = akım geçmiyor.

**Paralel görünümün maliyeti:** 8 veri teli demek 8 kat bakır, 8 kat bağlantı ucu, daha kalın kablo demektir. Sağdaki "saat hızı" göstergesi hız arttıkça paralelde yanlış okunan bit sayısının arttığını izlemek içindir.

**Konu:** Önceki slaytlarda sensörün bilgisinin kartın içinde nasıl taşındığını (analog gerilim, ADC, I2C gibi hatlar) gördük. Bu slayt, bilginin karttan dışarı, bilgisayara nasıl çıktığını anlatıyor. Zincir şöyle: ESP32 kartı, kart üzerindeki USB-seri çevirici çip, USB kablosu, bilgisayar. Üstteki üç kutu bu zinciri gösterir. ESP32 çipi USB'yi doğrudan konuşmaz; iki tel ve bir hız anlaşmasıyla çalışan basit bir dil (UART: TX ve RX telleri) kullanır. Çevirici çip bu dili USB'nin D+ ve D− çiftine çevirir ve tersini yapar. Bilgisayardaki seri monitör (Arduino IDE'deki mercek simgeli pencere) bu akışı yazı olarak gösterir: kodda “şunu yaz” dediğimiz her şey bu yoldan geçer. Bu derslerde kod yazmıyoruz; yalnızca yolu görüyoruz.

**Paralel görünüm:** Bir bayt 8 bittir (Bit, bayt, gigabayt slaytı). 'A' harfi 01000001 olarak saklanır. En doğal yol 8 tel kullanmaktır: her bit kendi telinden, hepsi aynı anda gider. Yazıcıların eski kabloları böyleydi. Ama saat hızlanınca bit çok kısalır; tellerin boyu, kaplaması, lehim noktaları birbirinden milimetrik farklı olduğu için bitler karşıya aynı anda varmaz. Animasyonda her tel biraz kaymış durumda: yavaş saatte kayma bitin yanında önemsiz, hızlı saatte bitin kendisinden büyük olur ve alıcı komşu bitin değerini okur (turuncu hücreler, “bit yanlış”). Üstelik 8 tel, 8 kat bakır, 8 kat bağlantı ucu, daha kalın kablo demektir. Animasyon yavaşlatılmıştır; gerçekte olay nanosaniyelerde olur.

**Seri görünüm:** Aynı bayt tek telden, bit bit gider. Her bit için saat bir tık atar. Sınıfa şu söylenebilir: paralelde 1 tıkta 8 bit gider, seride 8 tıkta; bu yüzden tık çok hızlı olmalıdır. Karşılığında tek tel olduğu için teller arası kayma sorunu yoktur. Bit bayt hesabını İnternet hızı slaytındaki gibi düşünün: hız, saniyede kaç bit geçtiğidir (bit/s); bayta çevirmek için 8'e bölünür (örneğin 1.000.000 bit/s ÷ 8 = 125.000 bayt/s). Animasyonda bitler sağa doğru akar; önce gönderilen bit karşıya önce varır çünkü önce gönderilen bit karşıya önce varır ve en öndedir; alıcıdaki hücreler ise bayt gibi (en büyük bit solda) dizilir. Sırayla en küçük bit önce gider (UART'taki gibi).

**UART görünümü:** UART saat teli kullanmaz; iki taraf hızı önceden anlaşır, buna baud denir. Hat boştayken 1'dedir (akım geçiyor). Bir karakter gelecekse hat bir bit süresi 0'a iner: bu start bitidir, alıcıya “şimdi başlıyorum” der. Sonra 8 veri biti gelir, önce en küçük bit (D0). 'A' = 01000001 olduğu için sırayla 1 0 0 0 0 0 1 0 gider. En sonda hat 1'e döner: stop biti. Toplam 10 bit. Aritmetik: 115.200 baud demek saniyede 115.200 bit demek. Bir bitin süresi 1 ÷ 115.200 = 8,68 µs (mikrosaniye, saniyenin milyonda biri). 10 bit = 86,8 µs. Saniyede 115.200 ÷ 10 = 11.520 karakter. Aynı hesap 9.600 baud için: 1 bit = 104,2 µs, 10 bit = 1,04 ms, saniyede 960 karakter. Sağdaki düğmelerle iki hızı karşılaştırın (düğmeye basılınca animasyon UART görünümünde kalır): şeritte 1 milisaniyede 115.200 baud'da 11,52 karakter, 9.600 baud'da 0,96 karakter sığar. Önemli: gönderen ve alan aynı baud'a ayarlı olmazsa bitleri yanlış yerden okur ve ekranda anlamsız karakterler görünür (seri monitörde sık görülen hata budur). Animasyon yavaşlatılmıştır: imleç gerçek süreyi yaklaşık 14.000 kat uzatarak gezer.

**Fark (USB) görünümü:** USB kablosunda veri için tek tel değil, D+ ve D− adlı bir çift tel vardır (USB-C kablosunun içi slaytında göstermiştik). Bu iki tel birbirinin tersi gerilimi taşır: biri yükselirken öteki alçalır. Alıcı her telin değerine ayrı ayrı bakmaz, farkını alır: D+ − D−. Kablodan geçen gürültü (motor, telefon, fluoresan lamba gibi kaynaklardan gelen istenmeyen dalgalanma) iki tele de aynı büyüklükte bindiği için fark değişmez. Tek telde ise Neden dijital? slaytındaki eşik kayar: 0 olan bit eşiğin üstüne çıkar, 1 olan eşiğin altına düşer ve alıcı bitleri yanlış okur. Soldaki panel tek teli, sağdaki panel iki telli farkı gösterir; gri bant aynı gürültü patlamasıdır. Çiftin bükümlü olmasının nedeni: iki tel birbirinin yanından dolanırsa gürültü kaynağına eşit uzaklıkta kalırlar, böylece gürültü ikisine de gerçekten aynı bindirilir. Gerçek sistemlerde fark mükemmel sıfır olmaz, ama çok küçük kalır.

**Zincirin bağlantısı:** Karttaki çevirici çip (CH340 veya CP210x türü) bilgisayarın USB tarafında D+ ve D−'yi, ESP32 tarafında TX ve RX'i kullanır. 3,3 V mantık ile USB'nin farklı seviyelerini o çevirir. Kartın USB-C girişinden gelen 5 V kartın regülatöründe 3,3 V'a indirilir.

**Sınıfa soru:** Seri haberleşme paralelden yavaş değil mi? 8 tel yerine tek tel kullanıyoruz. **Cevap:** Hayır. Tek tel çok hızlı saatle çalışır: aynı baytı 8 kat daha kısa bitlerle yollar. Paralelde ise teller arası küçük gecikme farkları hızı sınırlar; hız arttıkça bit kısalır ve kayma bitin yanında büyür. Bu yüzden günümüzde USB, SATA, PCI Express, Ethernet gibi hızlı bağlantıların hepsi seridir.

**Sınıfa soru 2:** Neden D+ ve D− iki ayrı tel, tek tel ve toprak yetmez mi? **Cevap:** Tek tel + toprak olsaydı gürültü yalnızca tele binerdi ve alıcı eşiğe göre yanlış okurdu. İki tel çift olunca gürültü ikisine de aynı biner, alıcı farkı aldığı için çıkarma sonucu değişmez.

**Sonrası:** Bu bitler kabloyla gitmek zorunda değil. Sıradaki Kablosuz dünya slaytında aynı bitler radyo dalgaları olarak havadan da gidiyor: yine bit, yine saat, yine eşik; yalnızca taşıyıcı değişiyor. Gerçekte denenmez notu: kablo uçlarını, USB portunu veya şarj aletlerini açmak ya da kısa devre yapmak gerekmez, bu slayttaki her şey bir görselden okunur.

#### 86. Kablosuz dünya

**Bu slaytta:** animasyon sırayla beş bandı gösterir: FM radyo, Wi-Fi 2,4 GHz, 5G, Wi-Fi 5 GHz ve görünür ışık. Solda antendeki elektronlar yukarı aşağı salınır; bu salınım sağa doğru ilerleyen bir dalga yaratır. Mavi çizgi elektrik alanı, turuncu çizgi manyetik alandır. Üstteki şerit frekansın nerede olduğunu gösterir (sağa doğru artar). Dalganın altındaki turuncu çubuk dalga boyudur (λ), koyu çubuk ise gündelik bir nesnenin boyudur: dalga boyunu bu nesneyle karşılaştırın. Dalganın görüntüsü hep aynı ölçekte çizilir; frekans arttıkça gerçekte λ küçülür ve nesne çubuğu buna göre değişir. Titreşimler yavaşlatılmıştır.

**Elektromanyetik dalga:** antendeki elektronlar saniyede milyonlarca, hatta milyarlarca kez ileri geri salınınca çevrelerinde değişen bir elektrik alanı ve onunla birlikte değişen bir manyetik alan oluşur; bu ikili ışık hızında yayılır. Radyo, Wi-Fi, 5G ve ışık aynı ailedendir; farkları frekanslarıdır (saniyedeki titreşim sayısı, Hz).

**Bölme:** λ = c ÷ f. Wi-Fi 2,4 GHz: 300.000.000 ÷ 2.400.000.000 = 0,125 m = 12,5 cm. Dalga boyu, bir dalga tepesinden diğerine olan mesafedir. FM radyo (100 MHz): 300.000.000 ÷ 100.000.000 = 3 m. 5G (3,5 GHz): ≈ 8,6 cm. Wi-Fi 5 GHz: 6 cm. Görünür ışık (≈ 500 THz): 600 nm; bir saç teli bundan yaklaşık 100 kat kalındır.

**Tarih:** 1865'te Maxwell bu dalgaları denklemleriyle öngördü; 1887'de Hertz laboratuvarında üretti.

**Sınıfa soru:** Mikrodalga fırın neden Wi-Fi'yi bozabilir? **Cevap:** İkisi de yaklaşık 2,4 GHz'te çalışır; fırından sızan küçük bir dalga Wi-Fi'yi karıştırabilir.

**Sınıfa soru:** 5G ve Wi-Fi zararlı mı? **Cevap:** Bir fotonun enerjisi frekansıyla orantılıdır. Wi-Fi fotonu, görünür ışık fotonunun yaklaşık 200.000'de biri kadar enerji taşır (500 THz ÷ 2,4 GHz ≈ 200.000; 5G'de 500 THz ÷ 3,5 GHz ≈ 140.000); atomlardan elektron koparamaz. Bilinen tek etkisi çok hafif ısınmadır; cihazların gücü bu ısınmanın zararsız kalacağı düzeyde tutan uluslararası sınırlarla belirlenir.

**Sonraki slayt:** bir 1 ve bir 0 bu dalgaya nasıl yazılır?

#### 87. Bir 1 ve bir 0 dalgaya nasıl yazılır?

**Bu slaytta:** Dört görünüm sırayla gösterilir: taşıyıcı dalga, genlik (AM), frekans (FM) ve gürültülü yol. Üstte gönderilen bitler, ortada dalga, altta alıcının okuduğu bitler vardır.

**Soru:** “Anten 1'i nasıl gönderir?” Anten bir bit göndermez; yalnızca titreşen bir elektrik ve manyetik dalga yayar. Bu dalgaya taşıyıcı denir; tek başına bilgi taşımaz, çünkü hep aynıdır. Bilgiyi dalganın bir özelliğini bite göre değiştirerek yazarız. Buna modülasyon denir.

**Genlik (AM):** güçlü salınım = 1, zayıf salınım = 0. Alıcı gelen dalganın gücünü ölçer ve bir eşikle karşılaştırır: eşiğin üstü 1, altı 0. **Frekans (FM):** sık salınım = 1, seyrek salınım = 0; güç sabit kalır. Alıcı dalganın ne kadar sık salındığını ölçer. FM radyonun adındaki FM, frekans modülasyonu demektir.

**Gürültü:** yolda dalgaya küçük bozulmalar karışır. Ama güçlü ile zayıf arasındaki fark eşiği aşacak kadar büyük olduğundan alıcı aynı bitleri okur. Bu, “Neden dijital?” slaytında göreceğimiz fikrin aynısıdır.

**Gerçek hızlar:** görseldeki salınımlar çok yavaşlatılmıştır; gerçekte bir Wi-Fi dalgası saniyede 2,4 milyar kez salınır ve her bit bu salınımlardan binlercesini kullanır. Gerçek sistemler genlik, frekans ve fazı birlikte kullanır (örneğin Wi-Fi ve 5G); burada fikri en yalın biçimde gösteriyoruz.

**Sınıfa soru:** Radyoda iki istasyon aynı anda yayın yapınca neden karışmaz? **Cevap:** Her istasyonun taşıyıcı frekansı farklıdır; radyonun düğmesi hangi frekansı dinleyeceğini seçer.

**Geçiş:** Sırada, alıcının neden bir eşikle karar verdiğini gösteren “Neden dijital?” slaytı var.

#### 88. Neden dijital?

**Bu slaytta:** iki satır, beşer kopya. Üstte analog kayıt (turuncu), altta dijital kayıt (mavi). Her kopyalamada iki satıra da aynı küçük gürültü karışır (oklardaki küçük dalgacık). Analog satırda gürültü kaydın parçası olur ve kopyadan kopyaya birikir; dördüncü kopya orijinalden belirgin biçimde farklıdır. Dijital satırda alıcı kesik çizgiyle gösterilen bir eşik kullanır: eşiğin üstü 1, altı 0. Gürültü küçük olduğundan bit değerleri değişmez ve alıcı temiz bir sinyal yeniden üretir; dördüncü kopya orijinalle aynıdır. Hareket yavaşlatılmıştır.

**Gürültü:** analog sinyale binen her bozulma bilginin parçası olur ve kopyadan kopyaya birikir. Dijital alıcı bir eşik kullanarak 1 ile 0'ı ayırır ve sinyali temiz biçimde yeniden üretir.

**Eşik:** alıcı bir sınır koyar: örneğin 3,3 V ÷ 2 = 1,65 V'un üstü 1, altı 0 sayılır. Küçük bozulmalar bu sınırı aşamaz ve silinir; dijital bilgi kayıpsız yeniden üretilir.

**Sınıfa soru:** Kırık telefon oyunu analog mu, dijital mi? **Cevap:** Analog; her aktarımda küçük bozulmalar birikir. Herkes yalnızca “evet” ya da “hayır” söyleseydi mesaj bozulmazdı.

**Sonraki slayt:** bu bitlerin dünya turu bittikten sonra göklere çıkışına bakacağız.

#### 89. Bir mesajın yolculuğu

**Bu slaytta:** kamera “Merhaba!” diyen bir telefondan karşıdaki telefona kadar mesajı takip eder. Sol üstteki yazı mesajın o anda neden yapılmış olduğunu söyler: ses, elektrik sinyali, bitler (1 ve 0), radyo dalgası, ışık. Mavi kutucuk, sekiz bitlik bir mesaj parçasıdır. Alttaki çizgi yolculuğun beş durağını gösterir. Her durak yaklaşık altı saniye sürer; hareket çok yavaşlatılmıştır.

**1. Telefon:** mikrofon ses basıncını gerilime (elektrik sinyaline) çevirir, telefon onu sayılara, yani bitlere çevirir. **2. Baz istasyonu:** telefonun anteni bitleri radyo dalgasına çevirir; baz istasyonu bu dalgayı yakalar.

**3. Fiber kablo:** modem ve fiber kablo bitleri ışık atımlarıyla taşır. Fiber optik kablolarda mesaj, saç teli inceliğindeki cam liflerin içinde ilerleyen ışık atımlarıdır. Işık, lifin ortasıyla çevresi arasındaki sınıra çok yatık bir açıyla çarptığında dışarı geçemez, tamamen içeri yansır (tam yansıma); görselde ışığın zikzak çizmesi bundandır. Kıtaları denizin altındaki fiber kablolar bağlar.

**4. Uydu:** çok uzak ya da kablonun ulaşamadığı yerlere sinyal bir yer istasyonundan uyduya çıkıp başka bir istasyona inebilir; bu yolda da bilgi radyo dalgasıdır. **5. Karşı telefon:** bitler yeniden elektriğe, hoparlör aracılığıyla sese dönüşür.

**Sınıfa soru:** İstanbul'daki bir arkadaşa mesaj ne kadar sürede ulaşır? **Cevap:** Isparta–İstanbul kablo yolu yaklaşık 600 km olsun. Işık kabloda saniyede yaklaşık 200.000 km gider: 600 ÷ 200.000 = 0,003 s, yani saniyenin binde 3'ü. Gecikmenin çoğu cihazlarda, sinyal işlenirken oluşur.

**Sonraki slayt:** bir bitin yolculukta neden bozulmadığını, “Neden dijital?” sorusuyla görelim.

#### 90. Bir dokunuşun yolculuğu

**Bu slaytta:** Bu slayt yeni bir şey öğretmez; bu derslerde ayrı ayrı gördüğümüz parçaları tek bir olayda birleştirir: telefon ekranına dokunmak. Üstteki şeritte dokuz istasyon vardır; bakır renkli atım dokunuşun izlediği yolu gösterir ve her istasyonda yaklaşık 3 saniye durur. Altta o istasyonun büyük kartı görünür: simgesi, örnek değeri ve hangi dersle bağlantılı olduğu. Dokuz istasyondan sonra "mesaj gönderince" izi gelir: sayı, radyo dalgası, baz istasyonu, fiber kablo, uydu ya da yer hattı, karşı telefon. Kartlardaki tüm değerler örnektir; model basitleştirilmiş ve yavaşlatılmıştır. Ekrandaki cümle kısa özettir; her istasyonun tam açıklaması aşağıdadır.

**1. Parmak (Dokunmatik ekran slaytı):** Parmağın içindeki su saf su değil, tuzlu sudur: içinde çözünmüş iyonlar vardır, bu yüzden vücut elektriği iletir. Parmak camın yüzüne yaklaşınca, camın altındaki iletken çizgilerle bir kondansatör gibi davranır: iki iletken ve aralarında yalıtkan cam (Kondansatör slaytındaki düzenin aynısı). Bu aşama analogdur: sürekli değişen küçük bir yük ve sığa vardır, henüz sayı yoktur. Örnekteki "yaklaşık 1 pF" yalnızca büyüklük fikri vermek içindir.

**2. Kapasitif ızgara (yine Dokunmatik ekran slaytı):** Cam altında yatay ve dikey çok ince iletken çizgiler dik kesişir; her kesişim küçük bir kondansatördür. Parmak o kesişimin elektrik alanını değiştirir, kesişimin sığası kayar ve ölçülen gerilim çok az değişir. Örnekte bu fark yaklaşık 0,05 V'tur. Hâlâ analogdur ve çok küçüktür; bu yüzden zincirin gürültüye en açık noktası budur.

**3. Gürültü süzme (Gürültü nedir? slaytı):** 0,05 V gibi küçük bir farkı şarj cihazı, Wi-Fi, ekranın kendi çalışması ve şebeke kolayca bozar. Denetleyici aynı ölçümü art arda örneğin 16 kez alır ve ortalar: rastgele sapmalar bir artı bir eksi olarak birbirini götürür, gerçek değişim kalır. Rastgele gürültü ortalamada örnek sayısının karekökü kadar azalır: √16 = 4, yani gürültü yaklaşık 4 kat küçülür. Süzgeç çok hızlı titreşimleri keser, sonra küçük fark yükseltilir. Gürültünün en çok önem taşıdığı adım budur, çünkü sinyal hem analog hem çok küçüktür.

**4. ADC (Analogdan sayıya slaytı):** Analog dünya burada sona erer. 12 bitlik ADC, 0 ile 3,3 V arasını 4.096 basamağa böler (0'dan 4.095'e). Yükseltilmiş gerilim örnekte 1,65 V'tur: 1,65 ÷ 3,3 × 4.095 ≈ 2.048; ikili yazılışı 1000 0000 0000'dır. Bu andan sonra bilgi sayıdır ve gürültüye karşı çok daha dayanıklıdır. GND burada çok önemlidir: ADC gerilimi GND'ye göre ölçer, GND kayarsa sayı da kayar (GND nedir? slaytı).

**5. Veri yolu (Sensör karta nasıl konuşur? slaytı):** 2.048 sayısı iki bayttır: 0000 1000 ve 0000 0000. Bu baytlar I2C ile (iki tel: SDA veri, SCL saat) ya da SPI ile (daha hızlı, dört tel) işlemciye gider. Teldeki gerilim yalnızca iki düzeydir: 1 = akım geçiyor, 0 = akım geçmiyor. Alıcı saatin her tıkında teli okur. Dijital sinyal gürültüye karşı sağlamdır; yine de iki cihazın GND'si ortak değilse okunan düzeyler anlamını yitirir.

**6. İşlemci (İşlemcinin içinde ne olur? slaytı):** İşlemci komutları getir, çöz, yürüt, yaz adımlarıyla işler. Sayıyı alır, hangi çizgilerin kesiştiğini ve dokunuşun yerini hesaplar; örnekte x = 540, y = 1.120. Hesabı ALU yapar; ALU toplayıcılardan, toplayıcılar mantık kapılarından, kapılar transistörlerden oluşur. Hepsi dijitaldir.

**7. Bellek (Kapılar nasıl hatırlar? slaytı):** Koordinat RAM'e yazılır; bellek hücrelerinde yük varsa 1, yoksa 0 okunur. RAM'in içeriği elektrik kesilince kaybolur; programın kendisi ise flash bellekte durur ve elektrik kesilince de kalır. İşlemci hesaplar, bellek hatırlar; ikisi veri yoluyla konuşur. Bellek de dijitaldir.

**8. Ekran (Piksel nedir? slaytı):** İşlemci hangi piksellerin nasıl yanacağına karar verir. Her piksel kırmızı, yeşil ve mavi alt pikselden oluşur; örnek karışım 200-80-40'tır. Parlaklık PWM ile ayarlanır: ışık saniyede binlerce kez açılıp kapanır, açık kalma oranı (örnekte %60) parlaklığı belirler; göz bu hızlı titreşimi ayırt edemez, ortalamasını görür. Bu adımda sayı yeniden analog bir şeye, yani ışığa dönüşür. Ekran, yolun en çok enerji harcayan adımıdır.

**9. Güç (GND nedir? slaytı):** Hepsini besleyen pil (örnekte 3,7 V) ve regülatördür; regülatör gerilimi 3,3 V'a düşürür. Pilin eksi ucu ortak GND'dir: her istasyonun ölçtüğü gerilim bu sıfır noktasına göredir. GND bozulursa hepsi birlikte kayar. Slayttaki alttaki ince çizgi bu bağlantıyı gösterir: bu istasyon yolun üzerinde değil, yolun altındadır ve her istasyona bağlıdır.

**Mesaj gönderince (alt iz):** Dokunuşla bir mesaj yazıp gönderdiğimizde işlemci mesajı yine sayılara çevirir. Radyo çipi bu sayıları modülasyonla radyo dalgasına yazar (Bir 1 ve bir 0 dalgaya nasıl yazılır? slaytı). Dalga baz istasyonuna gider, oradan fiber kablo ve gerekirse uydu ya da yer hattıyla karşı tarafa ulaşır (Bir mesajın yolculuğu slaytı); karşı telefon aynı basamakları tersten yapar. Bu kısımda bilgiyi taşıyan şey tellerdeki elektronlar değil, radyo dalgası ve fiberde ışıktır.

**Analog ve dijital özeti:** 1, 2, 3 analogdur (yük, gerilim, küçük fark); 4 sınırdır (analog gerilim sayıya dönüşür); 5, 6, 7 dijitaldir (bitler); 8 yeniden analogdur (ışık); 9 analogdur (pilin doğru gerilimi). Gürültü en çok 2 ve 3'te önemlidir, çünkü sinyal çok küçük ve analogdur; sayıya döndükten sonra 1 ile 0 arasındaki fark büyük olduğundan gürültü bit değerini nadiren bozar. GND her adımda önemlidir, çünkü her gerilim bir referansa göre ölçülür.

**Hız:** Slayttaki hareket çok yavaşlatılmıştır. Gerçekte dokunuştan koordinatın bulunmasına kadar olan yol birkaç milisaniye sürer. Ekran saniyede 60 kez yenilenir: 1 ÷ 60 ≈ 0,0167 s = 16,7 ms. Yani ekranda her kare 16,7 ms sürer; dokunuş bundan kısa sürede işlenir ve sonraki karede sonucu görürüz. Bu yüzden dokunuş anında olmuş gibi hissedilir.

**Sınıfa soru 1:** Dokunmatik ekran neden eldivenle çalışmaz? **Cevap:** Sıradan eldiven yalıtkandır ve parmakla cam arasına girer; parmağın iyonlu suyu ızgaranın elektrik alanını yeterince değiştiremez ve 0,05 V gibi bir fark ortaya çıkmaz. Parmak uçlarında iletken iplik olan eldivenler çalışır. Sıradan plastik kalem de aynı nedenle çalışmaz; ekran kalemlerinin ucu iletkendir.

**Sınıfa soru 2:** Dokunuşun yolunda en çok hangi adımlar elektronları, hangileri yalnızca bilgiyi taşır? **Cevap:** Güç (9) ve ekran (8) en çok enerji taşıyan adımlardır: elektronlar orada iş yapar. Veri yolu, işlemci ve bellek (5, 6, 7) çok az enerjiyle yalnızca 1 ve 0 desenlerini taşır; bilgi desendedir, elektrik o deseni kuran araçtır. Mesaj izinde ise bilgiyi taşıyan şey elektron değil, radyo dalgası ve fiberde ışıktır.

**Güvenlik:** Burada denenecek tehlikeli bir şey yoktur; pil ve ekran sökülmez, şarj aleti açılmaz. Sınıfta eldiven ya da kalem denemesi yalnızca kendi telefonlarına dokunarak yapılır.

#### 91. Göklere

**Bu slaytta:** animasyon üç sahneden oluşur. Önce Dünya kendi ekseni çevresinde döner (gösterim hızlandırılmıştır: 1 saniye ≈ 1 saat). Sonra kamera uzaklaşır ve ekvatorun yaklaşık 35.786 km yukarısındaki yer durağan yörünge ölçekli olarak görünür; Türksat uydusu Dünya ile birlikte döner ve yerden bakınca hep aynı noktada durur. Son sahnede Ankara'dan uyduya çıkan ve Avrupa'ya inen bir sinyal 10 kat yavaşlatılmış olarak gösterilir; sağ üstteki sayı gerçek süredir (yaklaşık 0,24 s). Uydu görünür olsun diye büyütülerek çizilmiştir.

**Yer durağan yörünge:** ekvatorun yaklaşık 35.786 km yukarısında bir uydu, Dünya'nın kendi ekseni etrafında dönme süresiyle (yaklaşık 24 saat) aynı sürede bir tur atar. Yerden bakınca hareketsiz görünür; çanak antenler bu yüzden sabit durur. Yörüngenin yarıçapı Dünya yarıçapının yaklaşık 6,6 katıdır.

**Uyduların içi:** güneş panelleri ışığı elektriğe çevirir, piller gölgede enerji sağlar, devreler ve transistörler sinyali işler: bu derslerde öğrendiğimiz her şey göklerde de çalışır. 2024'te Türksat 6A, Türkiye'nin yerli olarak geliştirdiği ilk haberleşme uydusu olarak yörüngeye yerleşti.

**Gecikme:** bir sinyalin uyduya çıkıp inmesi yaklaşık çeyrek saniye sürer. Hesap: alçak yörünge (550 km) için 2 × 550 ÷ 300.000 ≈ 0,004 s; yer durağan yörünge için 2 × 35.786 ÷ 300.000 ≈ 0,24 s.

**GPS:** GPS uyduları yaklaşık 20.200 km yükseklikte dolanır. Telefon en az dört uydudan gelen sinyallerin varış sürelerini karşılaştırır; her süreyi ışık hızıyla çarparak uzaklığı bulur (yol = hız × süre; şimşekteki ve mesafe sensöründeki hesabın aynısı). Bir uyduyla bir küre, iki uyduyla bir daire, üç uyduyla iki nokta kalır; dördüncü uydu telefonun saatindeki hatayı düzeltir ve konumu kesinleştirir.

**Sınıfa soru:** Uydu neden düşmez? **Cevap:** Aslında sürekli düşer, ama yana doğru saniyede yaklaşık 3 km hızla gittiği için Dünya'nın eğriliğini hep ıskalar.

**Kapanış:** atomdaki elektrondan göklerdeki uyduya aynı elektrik çalışıyor.

### Köprü ve kapanış

#### 92. Algoritmaya ilk adım

**Bu slaytta:** animasyon üç durumu sırayla gösterir. Solda sokak, sağda karar kartı var. Lambanın başındaki ışık sensörü (LDR) ve direkteki hareket sensörü (PIR) kartın solundaki iki kutuya bağlanır: “Karanlık mı?” ve “Hareket var mı?”. Kutular 1 (evet, akım geçiyor) ya da 0 (hayır) gösterir. VE kapısı yalnızca ikisi de 1 ise lambaya 1 gönderir. Durumlar: gündüz ve yoldan biri geçiyor (0 VE 1 = 0), gece ve sokak boş (1 VE 0 = 0), gece ve biri yaklaşıyor (1 VE 1 = 1, lamba yanar). Altta o anki işlem yazılıdır.

**Algoritma:** bir işi yapmak için sırası belli, açık ve sonlu adımlar. Burada plan: sensör ölçer, mantık karar verir, devre uygular. Algoritmanın bir bilgisayar programı olmak zorunda olmadığını söyleyin: yemek tarifi de bir algoritmadır, yeter ki adımlar açık olsun. “Göz kararı tuz ekle” bir bilgisayar için belirsizdir; “5 gram tuz ekle” açıktır.

**Tanıdıklarımız:** ışık sensörü (ışığı lüks, lx birimiyle ölçeriz; gündüz birkaç bin lx, gece birkaç lx), VE kapısı, transistör ve lamba. Hareket sensörü ise vücudun yaydığı görünmez kızılötesi ışıktaki değişimi algılar. Görselde ışık 20 lx'in altındaysa “karanlık” 1 sayılır.

**Sonraki dersler:** algoritma ve kodlamayı sonraki derslerde diğer eğitmenlerimizle derinleştireceksiniz. Bu slayt yalnızca köprüdür; ayrıntıya girmeyin.

**Sonraki slayt:** bu derslerde öğrendiklerimizin özetine ve sık yapılan yanlışlara geçiyoruz.

#### 93. Sık yapılan yanlışlar

Bu slayt bir tekrar ve pekiştirme noktasıdır. Her maddeyi bir öğrenciye okutup “neden yanlış?” diye sorun, sonra doğrusunu öğrenciden alın. Cevaplar derste geçtiği slaytlarda ayrıntılıdır.

**01 Pil:** “Pil” slaytı ve “Pilin gerilimi nereden gelir?” bölümü. Elektronlar bakır telde zaten vardır; pil yalnızca onları iten bir gerilim yaratır.

**02 Hız:** “Elektrik nasıl yol alır?” slaytı: elektronun kayma hızı saatte yaklaşık 18 cm, enerjinin yayılması ışık hızının yaklaşık üçte ikisi.

**03 Akım harcanmaz:** “Elektrik bir döngü ister”: aynı akım bütün devreden geçer ve pile döner; tükenen şey enerjidir.

**04 ve 05 Güvenlik:** “Prize elimi sokarsam?” ve “Doğanın matematiği” slaytları. Kuşun durumu, gerilimin iki nokta arasında olmasından kaynaklanır; bu, kuşu taklit etmenin güvenli olduğu anlamına gelmez.

**06 Yön:** “Neden hâlâ eski yönü kullanıyoruz?” slaytı: adları Franklin verdi, elektronu Thomson buldu.

**07 GND:** “GND nedir?” ve “Evdeki toprak” slaytları.

**08 GHz:** “GHz, çekirdek, RAM” slaytındaki “Dikkat” notu: 4 çekirdek × 3 GHz, 12 GHz demek değildir.

**09 Dijital:** “Gürültü nedir?” ve “Neden dijital?” slaytları: dijital bilgi eşikle korunur ama gürültü yeterince büyükse bit yine bozulur.

**10 Isı:** “Direnç nedir?” ve “Akkor lamba nasıl çalışır?” slaytları: ısı direncin sonucudur; bilgisayarlarda ise istenmeyen bir kayıptır ve soğutucu gerektirir.

#### 94. Özet

Her cümleyi bir öğrenciye okutun ve kendi örneğiyle açıklamasını isteyin.

#### 95. Kapanış

Soruları alın. G tuşuyla slayt haritasını açıp merak edilen konuya dönebilirsiniz; simülasyon laboratuvarı da açık kalabilir.

**Arka plan:** kapaktaki elektrik alanı. Akan noktalar elektron değildir; alanın yönünü (artıdan eksiye) gösterir. Bu alana bırakılan bir elektron ise tersine, artı yüke doğru çekilir.

---

## Kaynaklar
- IEC 60479-1: akımın insan ve hayvan vücuduna etkileri.
- CODATA: temel fizik sabitleri (elektron yükü ve kütlesi).
- IEC 60062 (direnç renk kodu) ve IEC 60617 (devre sembolleri).
- Elektromanyetizma tarihi: Coulomb (1785), Volta (1800), Ohm (1827), Faraday (1831), Maxwell (1865), Hertz (1887).
